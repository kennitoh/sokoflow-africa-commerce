CREATE OR REPLACE FUNCTION public.public_checkout(p_slug text, p_customer jsonb, p_items jsonb, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store public.stores%ROWTYPE;
  v_owner uuid;
  v_existing uuid;
  v_name text := trim(coalesce(p_customer->>'name',''));
  v_phone text := trim(coalesce(p_customer->>'phone',''));
  v_phone_digits text;
  v_email text := nullif(lower(trim(coalesce(p_customer->>'email',''))), '');
  v_method text := coalesce(p_customer->>'fulfillment', 'delivery');
  v_address text := nullif(trim(coalesce(p_customer->>'address','')), '');
  v_note text := nullif(trim(coalesce(p_customer->>'note','')), '');
  v_customer_id uuid;
  v_order public.orders;
  v_token uuid := gen_random_uuid();
  v_rec record;
  v_subtotal numeric := 0;
  v_count integer;
  v_notes text;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$' THEN
    RAISE EXCEPTION 'This business page is not available';
  END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid checkout request';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE slug = p_slug AND is_published LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'This business page is not available'; END IF;
  v_owner := v_store.user_id;

  PERFORM pg_advisory_xact_lock(hashtext('sokoflow_checkout:' || v_owner::text || ':' || p_idempotency_key));
  SELECT public_token INTO v_existing FROM public.orders WHERE user_id = v_owner AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('token', v_existing, 'duplicate', true);
  END IF;

  IF length(v_name) < 2 OR length(v_name) > 100 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_phone_digits) < 7 OR length(v_phone_digits) > 15 OR length(v_phone) > 25 THEN
    RAISE EXCEPTION 'Please enter a valid phone number';
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF v_method NOT IN ('delivery','collection') THEN RAISE EXCEPTION 'Please choose delivery or collection'; END IF;
  IF v_method = 'delivery' AND (v_address IS NULL OR length(v_address) < 5) THEN
    RAISE EXCEPTION 'Please enter a delivery address';
  END IF;
  IF v_method = 'collection' THEN v_address := NULL; END IF;
  IF v_address IS NOT NULL AND length(v_address) > 500 THEN RAISE EXCEPTION 'Delivery address is too long'; END IF;
  IF v_note IS NOT NULL AND length(v_note) > 1000 THEN RAISE EXCEPTION 'Order note is too long'; END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Too many items in one order'; END IF;

  -- Session-private scratch table; clear only its own rows (scoped WHERE keeps the API's safe-delete guard satisfied).
  CREATE TEMP TABLE IF NOT EXISTS _checkout_lines (product_id uuid PRIMARY KEY, qty integer) ON COMMIT DROP;
  DELETE FROM _checkout_lines WHERE product_id IS NOT NULL;
  FOR v_rec IN SELECT value AS item FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_rec.item) <> 'object'
       OR coalesce(v_rec.item->>'product_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR coalesce(v_rec.item->>'quantity','') !~ '^[0-9]{1,4}$' THEN
      RAISE EXCEPTION 'Invalid item in cart';
    END IF;
    IF (v_rec.item->>'quantity')::integer < 1 THEN RAISE EXCEPTION 'Quantities must be at least 1'; END IF;
    INSERT INTO _checkout_lines VALUES ((v_rec.item->>'product_id')::uuid, (v_rec.item->>'quantity')::integer)
    ON CONFLICT (product_id) DO UPDATE SET qty = _checkout_lines.qty + excluded.qty;
  END LOOP;
  IF EXISTS (SELECT 1 FROM _checkout_lines WHERE qty > 999) THEN RAISE EXCEPTION 'Quantity is too large'; END IF;

  SELECT count(*) INTO v_count FROM (
    SELECT p.id FROM public.products p JOIN _checkout_lines l ON l.product_id = p.id
    WHERE p.user_id = v_owner AND p.published_to_web AND p.status = 'active'
    ORDER BY p.id FOR UPDATE OF p
  ) locked;
  IF v_count <> (SELECT count(*) FROM _checkout_lines) THEN
    RAISE EXCEPTION 'One or more products are no longer available. Please refresh the page.';
  END IF;
  FOR v_rec IN SELECT p.name, p.stock, l.qty FROM public.products p JOIN _checkout_lines l ON l.product_id = p.id LOOP
    IF v_rec.stock < v_rec.qty THEN
      IF v_rec.stock <= 0 THEN RAISE EXCEPTION '% is out of stock', v_rec.name;
      ELSE RAISE EXCEPTION 'Only % of % left in stock', v_rec.stock, v_rec.name; END IF;
    END IF;
  END LOOP;
  SELECT sum(p.price * l.qty) INTO v_subtotal FROM public.products p JOIN _checkout_lines l ON l.product_id = p.id;

  SELECT id INTO v_customer_id FROM public.customers
  WHERE user_id = v_owner AND regexp_replace(coalesce(phone, whatsapp, ''), '[^0-9]', '', 'g') = v_phone_digits
  ORDER BY created_at LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (user_id, name, phone, email, address, notes)
    VALUES (v_owner, v_name, v_phone, v_email, v_address, 'Added from public business page')
    RETURNING id INTO v_customer_id;
  END IF;

  v_notes := 'Public page order · ' || CASE WHEN v_method = 'delivery' THEN 'Delivery' ELSE 'Collection' END
    || CASE WHEN v_email IS NOT NULL THEN E'\nEmail: ' || v_email ELSE '' END
    || CASE WHEN v_note IS NOT NULL THEN E'\nCustomer note: ' || v_note ELSE '' END;

  INSERT INTO public.orders (user_id, customer_id, customer_name, channel, status, payment_status,
    subtotal, discount, delivery_fee, total, amount_paid, delivery_address, notes, public_token, idempotency_key)
  VALUES (v_owner, v_customer_id, v_name, 'website', 'pending', 'unpaid',
    v_subtotal, 0, 0, v_subtotal, 0, v_address, v_notes, v_token, p_idempotency_key)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (user_id, order_id, product_id, product_name, unit_price, quantity, total)
  SELECT v_owner, v_order.id, p.id, p.name, p.price, l.qty, p.price * l.qty
  FROM public.products p JOIN _checkout_lines l ON l.product_id = p.id;

  UPDATE public.products p SET stock = p.stock - l.qty FROM _checkout_lines l
  WHERE p.id = l.product_id AND p.user_id = v_owner;

  INSERT INTO public.stock_movements (user_id, product_id, order_id, change, reason, note)
  SELECT v_owner, l.product_id, v_order.id, -l.qty, 'order', 'Order ' || v_order.order_number
  FROM _checkout_lines l;

  IF EXISTS (SELECT 1 FROM public.products p JOIN _checkout_lines l ON l.product_id = p.id WHERE p.stock < 0) THEN
    RAISE EXCEPTION 'Stock cannot go negative';
  END IF;

  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, message)
  VALUES (v_owner, 'order', v_order.id, 'created',
    'Order ' || v_order.order_number || ' placed by ' || v_name || ' on your public page');

  RETURN jsonb_build_object('token', v_token, 'duplicate', false);
END;
$function$;