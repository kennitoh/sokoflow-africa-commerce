CREATE TABLE public.checkout_attempts (
  id bigserial PRIMARY KEY,
  source_hash text NOT NULL,
  store_id uuid,
  phone_digits text,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.checkout_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.checkout_attempts_id_seq TO service_role;
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX checkout_attempts_source_idx ON public.checkout_attempts (source_hash, created_at);
CREATE INDEX checkout_attempts_store_idx ON public.checkout_attempts (store_id, created_at);
CREATE INDEX checkout_attempts_phone_idx ON public.checkout_attempts (store_id, phone_digits, created_at);
COMMENT ON TABLE public.checkout_attempts IS 'Short-lived checkout attempt counters for abuse limits. Hashed source only; rows older than 1 day are purged. Service role only.';

CREATE OR REPLACE FUNCTION public.guarded_checkout(p_source_hash text, p_slug text, p_customer jsonb, p_items jsonb, p_idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
  v_phone text := regexp_replace(coalesce(p_customer->>'phone',''), '[^0-9]', '', 'g');
  v_existing uuid;
  v_result jsonb;
  v_retry integer;
BEGIN
  IF p_source_hash IS NULL OR length(p_source_hash) < 16 THEN RAISE EXCEPTION 'Invalid checkout request'; END IF;
  SELECT id INTO v_store_id FROM stores WHERE slug = lower(p_slug) AND is_published LIMIT 1;

  -- Safe retries: an already-placed order is returned without counting against limits.
  IF v_store_id IS NOT NULL THEN
    SELECT o.public_token INTO v_existing FROM orders o JOIN stores s ON s.user_id = o.user_id
    WHERE s.id = v_store_id AND o.idempotency_key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('token', v_existing, 'duplicate', true); END IF;
  END IF;

  DELETE FROM checkout_attempts WHERE created_at < now() - interval '1 day';

  v_retry := CASE
    WHEN (SELECT count(*) FROM checkout_attempts WHERE source_hash = p_source_hash AND NOT ok AND created_at > now() - interval '10 minutes') >= 15 THEN 600
    WHEN (SELECT count(*) FROM checkout_attempts WHERE source_hash = p_source_hash AND ok AND created_at > now() - interval '1 hour') >= 10 THEN 3600
    WHEN v_store_id IS NOT NULL AND length(v_phone) >= 7 AND (SELECT count(*) FROM checkout_attempts WHERE store_id = v_store_id AND phone_digits = v_phone AND ok AND created_at > now() - interval '1 hour') >= 5 THEN 3600
    WHEN v_store_id IS NOT NULL AND (SELECT count(*) FROM checkout_attempts WHERE store_id = v_store_id AND created_at > now() - interval '10 minutes') >= 60 THEN 600
    ELSE 0 END;
  IF v_retry > 0 THEN
    RETURN jsonb_build_object('rate_limited', true, 'retry_after', v_retry);
  END IF;

  BEGIN
    v_result := public_checkout(p_slug, p_customer, p_items, p_idempotency_key);
  EXCEPTION WHEN others THEN
    INSERT INTO checkout_attempts (source_hash, store_id, phone_digits, ok) VALUES (p_source_hash, v_store_id, nullif(v_phone,''), false);
    RETURN jsonb_build_object('error', SQLERRM);
  END;
  INSERT INTO checkout_attempts (source_hash, store_id, phone_digits, ok) VALUES (p_source_hash, v_store_id, nullif(v_phone,''), true);
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.guarded_checkout(text, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guarded_checkout(text, text, jsonb, jsonb, text) TO service_role;
REVOKE ALL ON FUNCTION public.public_checkout(text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_checkout(text, jsonb, jsonb, text) TO service_role;