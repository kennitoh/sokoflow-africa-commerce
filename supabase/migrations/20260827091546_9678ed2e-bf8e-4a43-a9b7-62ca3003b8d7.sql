-- Concurrency-safe order numbering (advisory lock per business)
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  next_seq integer;
begin
  if new.order_seq is null or new.order_seq = 0 then
    perform pg_advisory_xact_lock(hashtext('sokoflow_order_seq:' || new.user_id::text));
    select coalesce(max(order_seq), 0) + 1 into next_seq
    from public.orders where user_id = new.user_id;
    new.order_seq := next_seq;
    new.order_number := 'SF-' || lpad(next_seq::text, 4, '0');
  elsif new.order_number is null or new.order_number = '' then
    new.order_number := 'SF-' || lpad(new.order_seq::text, 4, '0');
  end if;
  return new;
end;
$function$;

-- Atomic order creation
CREATE OR REPLACE FUNCTION public.create_order(p_order jsonb, p_items jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  if coalesce((p_order->>'customer_id'), '') <> '' then
    if not exists (
      select 1 from public.customers
      where id = (p_order->>'customer_id')::uuid and user_id = v_uid
    ) then
      raise exception 'Customer not found';
    end if;
  end if;

  -- validate ownership, quantities and stock (locking product rows)
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
    v_subtotal, v_discount, v_delivery_fee, v_total,
    case when v_payment_status = 'paid' then v_total else v_amount_paid end,
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

-- Idempotent cancellation with exact stock restoration
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_rec record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order from public.orders
  where id = p_order_id and user_id = v_uid
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'cancelled' or v_order.stock_restored_at is not null then
    return v_order;
  end if;

  -- restore exactly the net quantity previously deducted for this order
  for v_rec in
    select product_id, variant_id, -sum(change)::integer as qty
    from public.stock_movements
    where order_id = v_order.id and user_id = v_uid
    group by product_id, variant_id
    having -sum(change) > 0
  loop
    update public.products
    set stock = stock + v_rec.qty
    where id = v_rec.product_id and user_id = v_uid;

    insert into public.stock_movements (user_id, product_id, variant_id, order_id, change, reason, note)
    values (v_uid, v_rec.product_id, v_rec.variant_id, v_order.id, v_rec.qty, 'cancellation',
            'Cancelled order ' || v_order.order_number);
  end loop;

  update public.orders
  set status = 'cancelled', stock_restored_at = now()
  where id = v_order.id and user_id = v_uid
  returning * into v_order;

  insert into public.activity_log (user_id, entity_type, entity_id, action, message)
  values (v_uid, 'order', v_order.id, 'status_cancelled',
          'Order ' || v_order.order_number || ' cancelled and stock restored');

  return v_order;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;
