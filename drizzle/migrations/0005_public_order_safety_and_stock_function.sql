-- Enable scheduled jobs in this project
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===========================================================
-- 1. One safe stock-change function: locks the row, refuses a
--    result below zero, records the movement - all atomic.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_change integer,
  p_reason public.stock_reason DEFAULT 'manual',
  p_note text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_stock integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_change IS NULL OR p_change = 0 THEN RAISE EXCEPTION 'Stock change cannot be zero'; END IF;

  SELECT user_id, stock INTO v_user_id, v_stock
  FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND OR v_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF v_stock + p_change < 0 THEN
    RAISE EXCEPTION 'Not enough stock: only % left', v_stock;
  END IF;

  UPDATE public.products SET stock = stock + p_change, updated_at = now() WHERE id = p_product_id;

  INSERT INTO public.stock_movements (user_id, product_id, change, reason, note)
  VALUES (v_uid, p_product_id, p_change, p_reason, p_note);

  RETURN v_stock + p_change;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid, integer, public.stock_reason, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, public.stock_reason, text) TO authenticated, service_role;

-- ===========================================================
-- 2. Guard: the app can no longer change products.stock
--    directly. Only the security-definer order/stock functions
--    (postgres) or service role may move stock; owner product
--    edits get their movement from the adjustment function.
--    Initial stock on a new product records an opening-stock
--    movement so every stock change has a matching record.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.products_stock_write_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stock IS DISTINCT FROM OLD.stock THEN
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Stock must be changed through the stock adjustment function or an order';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.stock > 0 AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    INSERT INTO public.stock_movements (user_id, product_id, change, reason, note)
    VALUES (NEW.user_id, NEW.id, NEW.stock, 'restock', 'Opening stock');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_stock_write_guard ON public.products;
CREATE TRIGGER products_stock_write_guard
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_stock_write_guard();

-- ===========================================================
-- 3. Guarded public checkout:
--    - quantity cap per product: at most 20 units, and at most
--      half the current stock, whichever is lower
--    - at most 2 open, unpaid website orders per phone per business
--    - the 60-per-business limit counts only FAILED attempts;
--      successful checkouts get a separate higher limit (150)
--    - phone digits arrive pre-hashed with a server-stored secret
--    - old-row purging moves to the daily scheduled job
-- ===========================================================
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

  -- Safe retries: an already-placed order is returned without counting against limits.
  IF v_store_id IS NOT NULL THEN
    SELECT o.public_token INTO v_existing FROM orders o
    WHERE o.user_id = v_owner AND o.idempotency_key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('token', v_existing, 'duplicate', true); END IF;
  END IF;

  -- Per phone: at most 2 open, unpaid website orders per business.
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

  -- Per product quantity cap for public orders.
  IF v_store_id IS NOT NULL AND p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_bad IN
      SELECT p.name, least(20, p.stock::numeric / 2) AS max_qty
      FROM jsonb_to_recordset(p_items) AS l(product_id uuid, quantity numeric)
      JOIN products p ON p.id = l.product_id AND p.user_id = v_owner
      GROUP BY p.id, p.name, p.stock
      HAVING sum(l.quantity) > least(20, p.stock::numeric / 2)
    LOOP
      IF floor(v_bad.max_qty) < 1 THEN
        RAISE EXCEPTION '% is nearly sold out - please contact the business to order', v_bad.name;
      END IF;
      RAISE EXCEPTION 'You can order at most % of % right now', floor(v_bad.max_qty), v_bad.name;
    END LOOP;
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

-- ===========================================================
-- 4. Expire open unpaid website orders older than 24 hours.
--    Each order is cancelled through the order's own
--    cancel_order (unchanged), run as its owner, so stock
--    restoration is identical and idempotent.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.expire_stale_public_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT o.id, o.user_id
    FROM public.orders o
    WHERE o.channel = 'website'
      AND o.payment_status = 'unpaid'
      AND o.status IN ('pending','confirmed','packed','out_for_delivery')
      AND o.stock_restored_at IS NULL
      AND o.created_at < now() - interval '24 hours'
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_rec.user_id)::text, true);
      PERFORM public.cancel_order(v_rec.id);
      v_count := v_count + 1;
    EXCEPTION WHEN others THEN
      NULL; -- leave for the next run
    END;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_public_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_public_orders() TO service_role;
