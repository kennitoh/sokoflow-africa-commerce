-- 1. Canonical derivation of payment status from money
create or replace function public.derive_payment_status(p_amount_paid numeric, p_total numeric)
returns payment_status
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_amount_paid, 0) <= 0 then 'unpaid'::payment_status
    when coalesce(p_amount_paid, 0) >= coalesce(p_total, 0) then 'paid'::payment_status
    else 'partial'::payment_status
  end
$$;

-- 2. Validate + normalise payment on every write (source of truth)
create or replace function public.orders_normalize_payment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.amount_paid := round(coalesce(new.amount_paid, 0)::numeric, 2);
  new.total := coalesce(new.total, 0);

  if new.amount_paid < 0 then
    raise exception 'Amount paid cannot be negative';
  end if;

  if new.amount_paid > new.total + 0.005 then
    raise exception 'Amount paid (%) cannot be more than the order total (%)', new.amount_paid, new.total;
  end if;

  -- Refunds are an explicit business state; everything else is derived.
  if new.payment_status = 'refunded' then
    return new;
  end if;

  new.payment_status := public.derive_payment_status(new.amount_paid, new.total);
  return new;
end;
$$;

drop trigger if exists orders_normalize_payment on public.orders;
create trigger orders_normalize_payment
before insert or update on public.orders
for each row execute function public.orders_normalize_payment();

-- 3. create_order: clamp amount paid, keep delivery date, keep Batch 1 atomicity
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_discount numeric := coalesce((p_order->>'discount')::numeric, 0);
  v_delivery_fee numeric := coalesce((p_order->>'delivery_fee')::numeric, 0);
  v_amount_paid numeric := coalesce((p_order->>'amount_paid')::numeric, 0);
  v_payment_status payment_status := coalesce((p_order->>'payment_status')::payment_status, 'unpaid');
  v_qty integer;
  v_price numeric;
  v_product_id uuid;
  v_stock integer;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item';
  end if;
  if v_discount < 0 or v_delivery_fee < 0 then
    raise exception 'Discount and delivery fee cannot be negative';
  end if;
  if v_amount_paid < 0 then
    raise exception 'Amount paid cannot be negative';
  end if;
  if coalesce((p_order->>'customer_id'), '') <> '' then
    if not exists (
      select 1 from public.customers
      where id = (p_order->>'customer_id')::uuid and user_id = v_uid
    ) then
      raise exception 'Customer not found';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 then
      raise exception 'Quantity for % must be greater than zero', coalesce(v_item->>'product_name', 'item');
    end if;
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    if v_price < 0 then
      raise exception 'Price for % cannot be negative', coalesce(v_item->>'product_name', 'item');
    end if;
    v_subtotal := v_subtotal + (v_price * v_qty);

    if coalesce(v_item->>'product_id', '') <> '' then
      v_product_id := (v_item->>'product_id')::uuid;
      select stock, name into v_stock, v_name
      from public.products
      where id = v_product_id and user_id = v_uid
      for update;
      if v_stock is null then
        raise exception 'Product not found in your business';
      end if;
      if v_stock < v_qty then
        raise exception 'Insufficient stock for %. Only % available.', v_name, v_stock;
      end if;
      if coalesce(v_item->>'variant_id', '') <> '' then
        if not exists (
          select 1 from public.product_variants
          where id = (v_item->>'variant_id')::uuid
            and product_id = v_product_id and user_id = v_uid
        ) then
          raise exception 'Variant not found in your business';
        end if;
      end if;
    end if;
  end loop;

  v_total := greatest(0, v_subtotal - v_discount + v_delivery_fee);

  -- Amount paid can never exceed the total; 'paid' means fully settled.
  if v_payment_status = 'paid' then
    v_amount_paid := v_total;
  else
    v_amount_paid := least(v_amount_paid, v_total);
  end if;

  insert into public.orders (
    user_id, customer_id, customer_name, channel, status, payment_status,
    subtotal, discount, delivery_fee, total, amount_paid,
    delivery_address, delivery_date, notes
  ) values (
    v_uid,
    nullif(p_order->>'customer_id', '')::uuid,
    nullif(p_order->>'customer_name', ''),
    coalesce((p_order->>'channel')::sales_channel, 'whatsapp'),
    coalesce((p_order->>'status')::order_status, 'pending'),
    v_payment_status,
    v_subtotal, v_discount, v_delivery_fee, v_total, v_amount_paid,
    nullif(p_order->>'delivery_address', ''),
    nullif(p_order->>'delivery_date', '')::date,
    nullif(p_order->>'notes', '')
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_product_id := nullif(v_item->>'product_id', '')::uuid;

    insert into public.order_items (
      user_id, order_id, product_id, variant_id, product_name, variant_name,
      unit_price, quantity, total
    ) values (
      v_uid, v_order.id, v_product_id, nullif(v_item->>'variant_id', '')::uuid,
      coalesce(v_item->>'product_name', 'Item'), nullif(v_item->>'variant_name', ''),
      v_price, v_qty, v_price * v_qty
    );

    if v_product_id is not null then
      update public.products
      set stock = stock - v_qty
      where id = v_product_id and user_id = v_uid;

      insert into public.stock_movements (user_id, product_id, variant_id, order_id, change, reason, note)
      values (
        v_uid, v_product_id, nullif(v_item->>'variant_id', '')::uuid, v_order.id,
        -v_qty, 'order', 'Order ' || v_order.order_number
      );
    end if;
  end loop;

  if exists (select 1 from public.products where user_id = v_uid and stock < 0) then
    raise exception 'Stock cannot go negative';
  end if;

  insert into public.activity_log (user_id, entity_type, entity_id, action, message)
  values (
    v_uid, 'order', v_order.id, 'created',
    'Order ' || v_order.order_number || ' created for ' || coalesce(v_order.customer_name, 'walk-in customer')
  );

  return v_order;
end;
$function$;

-- 4. Bring existing rows in line with the new rules
update public.orders
set amount_paid = least(greatest(coalesce(amount_paid, 0), 0), coalesce(total, 0))
where amount_paid is null
   or amount_paid < 0
   or amount_paid > coalesce(total, 0);

update public.orders
set payment_status = public.derive_payment_status(amount_paid, total)
where payment_status <> 'refunded'
  and payment_status <> public.derive_payment_status(amount_paid, total);