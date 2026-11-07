CREATE OR REPLACE FUNCTION public.guarded_checkout(p_source_hash text, p_slug text, p_customer jsonb, p_items jsonb, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_owner uuid;
  v_phone_digits text := regexp_replace(coalesce(p_customer->>'phone',''), '[^0-9]', '', 'g');
  v_phone_hash text := coalesce(p_customer->>'phone_hash','');
  v_existing uuid;
  v_result jsonb;
  v_retry integer;
  v_open integer;
  v_bad record;
BEGIN
  IF p_source_hash IS NULL OR p_source_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid checkout request'; END IF;
  SELECT id, user_id INTO v_store_id, v_owner FROM stores WHERE slug = lower(p_slug) AND is_published LIMIT 1;

  IF v_store_id IS NOT NULL THEN
    SELECT o.public_token INTO v_existing FROM orders o
    WHERE o.user_id = v_owner AND o.idempotency_key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('token', v_existing, 'duplicate', true); END IF;
  END IF;

  IF v_store_id IS NOT NULL AND length(v_phone_digits) >= 7 THEN
    SELECT count(*) INTO v_open
    FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.user_id = v_owner
      AND o.channel = 'website'
      AND o.payment_status = 'unpaid'
      AND o.status IN ('pending','confirmed','packed','out_for_delivery')
      AND o.stock_restored_at IS NULL
      AND regexp_replace(coalesce(c.phone, c.whatsapp, ''), '[^0-9]', '', 'g') = v_phone_digits;
    IF v_open >= 2 THEN
      RETURN jsonb_build_object('error', 'You already have 2 open orders with this business. Please wait for one to be confirmed or delivered before ordering again.');
    END IF;
  END IF;

  -- Public order cap per product is the lower of 20 units or current stock.
  IF v_store_id IS NOT NULL AND p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    BEGIN
      FOR v_bad IN
        SELECT p.name, least(20, p.stock::numeric) AS max_qty
        FROM jsonb_to_recordset(p_items) AS l(product_id uuid, quantity numeric)
        JOIN products p ON p.id = l.product_id AND p.user_id = v_owner
        GROUP BY p.id, p.name, p.stock
        HAVING sum(l.quantity) > least(20, p.stock::numeric)
      LOOP
        IF floor(v_bad.max_qty) < 1 THEN
          RETURN jsonb_build_object('error', v_bad.name || ' is nearly sold out - please contact the business to order it.');
        END IF;
        RETURN jsonb_build_object('error', 'You can order at most ' || floor(v_bad.max_qty)::int || ' of ' || v_bad.name || ' in one order.');
      END LOOP;
    EXCEPTION WHEN invalid_text_representation OR datatype_mismatch THEN
      NULL; -- malformed items are rejected with a clear message by public_checkout
    END;
  END IF;

  v_retry := CASE
    WHEN (SELECT count(*) FROM checkout_attempts WHERE source_hash = p_source_hash AND NOT ok AND created_at > now() - interval '10 minutes') >= 15 THEN 600
    WHEN (SELECT count(*) FROM checkout_attempts WHERE source_hash = p_source_hash AND ok AND created_at > now() - interval '1 hour') >= 10 THEN 3600
    WHEN v_store_id IS NOT NULL AND length(v_phone_hash) >= 16 AND (SELECT count(*) FROM checkout_attempts WHERE store_id = v_store_id AND phone_digits = v_phone_hash AND ok AND created_at > now() - interval '1 hour') >= 5 THEN 3600
    WHEN v_store_id IS NOT NULL AND (SELECT count(*) FROM checkout_attempts WHERE store_id = v_store_id AND NOT ok AND created_at > now() - interval '10 minutes') >= 60 THEN 600
    WHEN v_store_id IS NOT NULL AND (SELECT count(*) FROM checkout_attempts WHERE store_id = v_store_id AND ok AND created_at > now() - interval '10 minutes') >= 150 THEN 600
    ELSE 0 END;
  IF v_retry > 0 THEN
    RETURN jsonb_build_object('rate_limited', true, 'retry_after', v_retry);
  END IF;

  BEGIN
    v_result := public_checkout(p_slug, p_customer, p_items, p_idempotency_key);
  EXCEPTION WHEN others THEN
    INSERT INTO checkout_attempts (source_hash, store_id, phone_digits, ok) VALUES (p_source_hash, v_store_id, nullif(v_phone_hash,''), false);
    RETURN jsonb_build_object('error', SQLERRM);
  END;
  INSERT INTO checkout_attempts (source_hash, store_id, phone_digits, ok) VALUES (p_source_hash, v_store_id, nullif(v_phone_hash,''), true);
  RETURN v_result;
END;
$$;

-- Recreate the two named schedules during database rebuilds while avoiding duplicates on existing installs.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('expire-stale-public-orders', 'purge-checkout-attempts')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'expire-stale-public-orders',
    '23 * * * *',
    'SELECT public.expire_stale_public_orders();'
  );
  PERFORM cron.schedule(
    'purge-checkout-attempts',
    '41 3 * * *',
    'DELETE FROM public.checkout_attempts WHERE created_at < now() - interval ''1 day'';'
  );
END;
$$;