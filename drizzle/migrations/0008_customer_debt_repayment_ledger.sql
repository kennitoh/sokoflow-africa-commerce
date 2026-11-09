CREATE TABLE public.customer_opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  balance_date date NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','voided')),
  voided_at timestamptz,
  voided_reason text,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  CONSTRAINT customer_opening_balances_void_state CHECK (
    (status = 'recorded' AND voided_at IS NULL AND voided_reason IS NULL) OR
    (status = 'voided' AND voided_at IS NOT NULL AND nullif(trim(voided_reason), '') IS NOT NULL)
  ),
  CONSTRAINT customer_opening_balances_user_key_unique UNIQUE (user_id, idempotency_key)
);
GRANT SELECT ON public.customer_opening_balances TO authenticated;
GRANT ALL ON public.customer_opening_balances TO service_role;
ALTER TABLE public.customer_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their opening balances" ON public.customer_opening_balances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE UNIQUE INDEX customer_opening_balances_one_recorded_per_customer
  ON public.customer_opening_balances (user_id, customer_id) WHERE status = 'recorded';
CREATE INDEX customer_opening_balances_customer_date_idx
  ON public.customer_opening_balances (user_id, customer_id, balance_date, created_at);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash','mpesa','bank','other')),
  mpesa_reference text,
  note text,
  kind text NOT NULL CHECK (kind IN ('payment','refund')),
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','voided')),
  voided_at timestamptz,
  voided_reason text,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  migrated boolean NOT NULL DEFAULT false,
  CONSTRAINT payments_void_state CHECK (
    (status = 'recorded' AND voided_at IS NULL AND voided_reason IS NULL) OR
    (status = 'voided' AND voided_at IS NOT NULL AND nullif(trim(voided_reason), '') IS NOT NULL)
  ),
  CONSTRAINT payments_user_key_unique UNIQUE (user_id, idempotency_key)
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX payments_customer_date_idx ON public.payments (user_id, customer_id, created_at DESC);
CREATE INDEX payments_order_date_idx ON public.payments (user_id, order_id, created_at DESC);

CREATE TABLE public.customer_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  opening_balance_id uuid REFERENCES public.customer_opening_balances(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_payment_allocation_one_target CHECK (
    (CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN opening_balance_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);
GRANT SELECT ON public.customer_payment_allocations TO authenticated;
GRANT ALL ON public.customer_payment_allocations TO service_role;
ALTER TABLE public.customer_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their payment allocations" ON public.customer_payment_allocations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE UNIQUE INDEX customer_payment_allocations_payment_order_unique
  ON public.customer_payment_allocations (payment_id, order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX customer_payment_allocations_payment_opening_unique
  ON public.customer_payment_allocations (payment_id, opening_balance_id) WHERE opening_balance_id IS NOT NULL;
CREATE INDEX customer_payment_allocations_order_idx ON public.customer_payment_allocations (user_id, order_id);
CREATE INDEX customer_payment_allocations_opening_idx ON public.customer_payment_allocations (user_id, opening_balance_id);

CREATE OR REPLACE FUNCTION public.guard_customer_payment_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Payment history cannot be deleted';
  END IF;
  IF current_setting('sokoflow.ledger_void', true) IS DISTINCT FROM 'on'
     OR OLD.status <> 'recorded' OR NEW.status <> 'voided'
     OR NEW.voided_at IS NULL OR nullif(trim(NEW.voided_reason), '') IS NULL
     OR (to_jsonb(NEW) - ARRAY['status','voided_at','voided_reason']) IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['status','voided_at','voided_reason']) THEN
    RAISE EXCEPTION 'Payment history is immutable; void it with a reason';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_customer_payment_ledger_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER payments_immutable BEFORE UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_payment_ledger_mutation();

CREATE OR REPLACE FUNCTION public.guard_customer_opening_balance_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Opening balance history cannot be deleted';
  END IF;
  IF current_setting('sokoflow.ledger_void', true) IS DISTINCT FROM 'on'
     OR OLD.status <> 'recorded' OR NEW.status <> 'voided'
     OR NEW.voided_at IS NULL OR nullif(trim(NEW.voided_reason), '') IS NULL
     OR (to_jsonb(NEW) - ARRAY['status','voided_at','voided_reason']) IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['status','voided_at','voided_reason']) THEN
    RAISE EXCEPTION 'Opening balance history is immutable; void it with a reason';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_customer_opening_balance_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER customer_opening_balances_immutable BEFORE UPDATE OR DELETE ON public.customer_opening_balances
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_opening_balance_mutation();

CREATE OR REPLACE FUNCTION public.guard_customer_payment_allocation_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Payment allocation history cannot be changed or deleted';
END;
$$;
REVOKE ALL ON FUNCTION public.guard_customer_payment_allocation_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER customer_payment_allocations_immutable BEFORE UPDATE OR DELETE ON public.customer_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_payment_allocation_mutation();

CREATE OR REPLACE FUNCTION public.sync_legacy_order_payment_to_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta numeric;
  v_kind text;
  v_payment_id uuid;
BEGIN
  IF current_setting('sokoflow.payment_ledger_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    v_delta := coalesce(NEW.amount_paid, 0);
  ELSE
    v_delta := coalesce(NEW.amount_paid, 0) - coalesce(OLD.amount_paid, 0);
  END IF;
  IF v_delta = 0 THEN RETURN NEW; END IF;

  v_kind := CASE WHEN v_delta > 0 THEN 'payment' ELSE 'refund' END;
  INSERT INTO public.payments (
    user_id, customer_id, order_id, amount, method, kind, status, note,
    idempotency_key, recorded_by
  ) VALUES (
    NEW.user_id, NEW.customer_id, NEW.id, abs(v_delta), 'other', v_kind, 'recorded',
    'Synchronized from existing order payment controls',
    'legacy-order-sync:' || gen_random_uuid()::text, NEW.user_id
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.customer_payment_allocations (user_id, payment_id, order_id, amount)
  VALUES (NEW.user_id, v_payment_id, NEW.id, abs(v_delta));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_legacy_order_payment_to_ledger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER orders_sync_payment_ledger AFTER INSERT OR UPDATE OF amount_paid ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_order_payment_to_ledger();

INSERT INTO public.payments (
  user_id, customer_id, order_id, amount, method, kind, status, note,
  idempotency_key, recorded_by, migrated, created_at
)
SELECT o.user_id, o.customer_id, o.id, round(o.amount_paid, 2), 'other', 'payment', 'recorded',
       'Migrated from existing order amount_paid', 'migrated-order:' || o.id::text,
       o.user_id, true, o.created_at
FROM public.orders o
WHERE o.amount_paid > 0
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

INSERT INTO public.customer_payment_allocations (user_id, payment_id, order_id, amount, created_at)
SELECT p.user_id, p.id, o.id, p.amount, p.created_at
FROM public.payments p
JOIN public.orders o ON o.id = p.order_id AND o.user_id = p.user_id
WHERE p.migrated = true AND p.idempotency_key = 'migrated-order:' || o.id::text
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_customer_opening_balance(
  p_customer_id uuid, p_amount numeric, p_balance_date date, p_note text, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance public.customer_opening_balances;
  v_customer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_balance_date IS NULL
     OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'A positive amount, date, and idempotency key are required';
  END IF;
  PERFORM 1 FROM public.customers WHERE id = p_customer_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;

  SELECT * INTO v_balance FROM public.customer_opening_balances
  WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_balance.customer_id <> p_customer_id OR v_balance.amount <> round(p_amount,2)
       OR v_balance.balance_date <> p_balance_date THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different opening balance';
    END IF;
    RETURN jsonb_build_object('opening_balance_id', v_balance.id, 'amount', v_balance.amount, 'duplicate', true);
  END IF;

  INSERT INTO public.customer_opening_balances (
    user_id, customer_id, amount, balance_date, note, idempotency_key, recorded_by
  ) VALUES (
    v_uid, p_customer_id, round(p_amount,2), p_balance_date, nullif(trim(p_note),''),
    p_idempotency_key, v_uid
  ) RETURNING * INTO v_balance;

  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, message, metadata)
  VALUES (v_uid, 'customer_opening_balance', v_balance.id, 'opening_balance_recorded',
          'Opening balance recorded for customer', jsonb_build_object('customer_id', p_customer_id, 'amount', v_balance.amount));
  RETURN jsonb_build_object('opening_balance_id', v_balance.id, 'amount', v_balance.amount, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_customer_id uuid, p_amount numeric, p_method text, p_reference text, p_note text, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.customers;
  v_payment public.payments;
  v_order record;
  v_opening record;
  v_apply numeric;
  v_remaining numeric;
  v_allocated numeric := 0;
  v_prev_setting text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_method NOT IN ('cash','mpesa','bank','other')
     OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'A positive amount, valid method, and idempotency key are required';
  END IF;
  SELECT * INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;

  SELECT * INTO v_payment FROM public.payments WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_payment.customer_id <> p_customer_id OR v_payment.amount <> round(p_amount,2)
       OR v_payment.kind <> 'payment' THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different payment';
    END IF;
    SELECT coalesce(sum(amount),0) INTO v_allocated FROM public.customer_payment_allocations WHERE payment_id = v_payment.id;
    RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'allocated',v_allocated,
      'credit_on_account',greatest(v_payment.amount-v_allocated,0),'duplicate',true,
      'status',v_payment.status);
  END IF;

  INSERT INTO public.payments (
    user_id, customer_id, amount, method, mpesa_reference, note, kind, idempotency_key, recorded_by
  ) VALUES (
    v_uid, p_customer_id, round(p_amount,2), p_method, nullif(trim(p_reference),''),
    nullif(trim(p_note),''), 'payment', p_idempotency_key, v_uid
  ) RETURNING * INTO v_payment;

  v_remaining := v_payment.amount;
  FOR v_order IN
    SELECT id, total, amount_paid
    FROM public.orders
    WHERE user_id = v_uid AND customer_id = p_customer_id AND status <> 'cancelled' AND total > amount_paid
    ORDER BY created_at, id
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_apply := least(v_remaining, greatest(v_order.total-v_order.amount_paid,0));
    IF v_apply <= 0 THEN CONTINUE; END IF;
    INSERT INTO public.customer_payment_allocations (user_id,payment_id,order_id,amount)
    VALUES (v_uid,v_payment.id,v_order.id,v_apply);
    v_prev_setting := current_setting('sokoflow.payment_ledger_sync', true);
    PERFORM set_config('sokoflow.payment_ledger_sync','on',true);
    UPDATE public.orders SET amount_paid = amount_paid + v_apply,
      payment_status = public.derive_payment_status(amount_paid + v_apply,total)
    WHERE id = v_order.id AND user_id = v_uid;
    PERFORM set_config('sokoflow.payment_ledger_sync',coalesce(v_prev_setting,'off'),true);
    v_remaining := v_remaining-v_apply;
    v_allocated := v_allocated+v_apply;
  END LOOP;

  FOR v_opening IN
    SELECT ob.id, ob.amount,
      coalesce((SELECT sum(CASE WHEN p.kind='payment' THEN a.amount ELSE -a.amount END)
                FROM public.customer_payment_allocations a
                JOIN public.payments p ON p.id=a.payment_id
                WHERE a.opening_balance_id=ob.id AND p.status='recorded'),0) AS applied
    FROM public.customer_opening_balances ob
    WHERE ob.user_id=v_uid AND ob.customer_id=p_customer_id AND ob.status='recorded'
    ORDER BY ob.balance_date, ob.created_at, ob.id
    FOR UPDATE OF ob
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_apply := least(v_remaining, greatest(v_opening.amount-v_opening.applied,0));
    IF v_apply <= 0 THEN CONTINUE; END IF;
    INSERT INTO public.customer_payment_allocations (user_id,payment_id,opening_balance_id,amount)
    VALUES (v_uid,v_payment.id,v_opening.id,v_apply);
    v_remaining := v_remaining-v_apply;
    v_allocated := v_allocated+v_apply;
  END LOOP;

  INSERT INTO public.activity_log (user_id,entity_type,entity_id,action,message,metadata)
  VALUES (v_uid,'customer_payment',v_payment.id,'payment_recorded','Customer repayment recorded',
    jsonb_build_object('customer_id',p_customer_id,'amount',v_payment.amount,'allocated',v_allocated,
      'credit_on_account',greatest(v_payment.amount-v_allocated,0)));
  RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'allocated',v_allocated,
    'credit_on_account',greatest(v_payment.amount-v_allocated,0),'duplicate',false,'status','recorded');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_payment(
  p_order_id uuid, p_amount numeric, p_method text, p_reference text, p_note text, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_payment public.payments;
  v_order public.orders;
  v_apply numeric;
  v_allocated numeric := 0;
  v_prev_setting text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_method NOT IN ('cash','mpesa','bank','other')
     OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key))=0 THEN
    RAISE EXCEPTION 'A positive amount, valid method, and idempotency key are required';
  END IF;
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id=p_order_id AND user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id=v_customer_id AND user_id=v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT * INTO v_payment FROM public.payments WHERE user_id=v_uid AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_payment.order_id <> p_order_id OR v_payment.amount <> round(p_amount,2) OR v_payment.kind <> 'payment' THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different payment';
    END IF;
    SELECT coalesce(sum(amount),0) INTO v_allocated FROM public.customer_payment_allocations WHERE payment_id=v_payment.id;
    RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'allocated',v_allocated,
      'credit_on_account',greatest(v_payment.amount-v_allocated,0),'duplicate',true,'status',v_payment.status);
  END IF;
  IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cannot record a payment against a cancelled order'; END IF;
  IF v_customer_id IS NULL AND round(p_amount,2)>greatest(v_order.total-v_order.amount_paid,0) THEN
    RAISE EXCEPTION 'Add this order to a customer before leaving credit on account';
  END IF;

  INSERT INTO public.payments (
    user_id,customer_id,order_id,amount,method,mpesa_reference,note,kind,idempotency_key,recorded_by
  ) VALUES (
    v_uid,v_customer_id,p_order_id,round(p_amount,2),p_method,nullif(trim(p_reference),''),
    nullif(trim(p_note),''),'payment',p_idempotency_key,v_uid
  ) RETURNING * INTO v_payment;
  v_apply := least(v_payment.amount,greatest(v_order.total-v_order.amount_paid,0));
  IF v_apply>0 THEN
    INSERT INTO public.customer_payment_allocations (user_id,payment_id,order_id,amount)
    VALUES (v_uid,v_payment.id,p_order_id,v_apply);
    v_prev_setting := current_setting('sokoflow.payment_ledger_sync', true);
    PERFORM set_config('sokoflow.payment_ledger_sync','on',true);
    UPDATE public.orders SET amount_paid=amount_paid+v_apply,
      payment_status=public.derive_payment_status(amount_paid+v_apply,total)
    WHERE id=p_order_id AND user_id=v_uid;
    PERFORM set_config('sokoflow.payment_ledger_sync',coalesce(v_prev_setting,'off'),true);
    v_allocated:=v_apply;
  END IF;
  INSERT INTO public.activity_log (user_id,entity_type,entity_id,action,message,metadata)
  VALUES (v_uid,'customer_payment',v_payment.id,'order_payment_recorded','Payment recorded for order',
    jsonb_build_object('order_id',p_order_id,'customer_id',v_customer_id,'amount',v_payment.amount,
      'allocated',v_allocated,'credit_on_account',greatest(v_payment.amount-v_allocated,0)));
  RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'allocated',v_allocated,
    'credit_on_account',greatest(v_payment.amount-v_allocated,0),'duplicate',false,'status','recorded');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_refund(
  p_order_id uuid, p_amount numeric, p_method text, p_reference text, p_note text, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_order public.orders;
  v_payment public.payments;
  v_prev_setting text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_method NOT IN ('cash','mpesa','bank','other')
     OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key))=0 THEN
    RAISE EXCEPTION 'A positive amount, valid method, and idempotency key are required';
  END IF;
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id=p_order_id AND user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id=v_customer_id AND user_id=v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT * INTO v_payment FROM public.payments WHERE user_id=v_uid AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_payment.order_id<>p_order_id OR v_payment.amount<>round(p_amount,2) OR v_payment.kind<>'refund' THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different refund';
    END IF;
    RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'duplicate',true,'status',v_payment.status);
  END IF;
  IF round(p_amount,2)>v_order.amount_paid THEN RAISE EXCEPTION 'Refund cannot exceed the amount paid'; END IF;

  INSERT INTO public.payments (
    user_id,customer_id,order_id,amount,method,mpesa_reference,note,kind,idempotency_key,recorded_by
  ) VALUES (
    v_uid,v_customer_id,p_order_id,round(p_amount,2),p_method,nullif(trim(p_reference),''),
    nullif(trim(p_note),''),'refund',p_idempotency_key,v_uid
  ) RETURNING * INTO v_payment;
  INSERT INTO public.customer_payment_allocations (user_id,payment_id,order_id,amount)
  VALUES (v_uid,v_payment.id,p_order_id,v_payment.amount);
  v_prev_setting := current_setting('sokoflow.payment_ledger_sync', true);
  PERFORM set_config('sokoflow.payment_ledger_sync','on',true);
  UPDATE public.orders SET amount_paid=amount_paid-v_payment.amount,
    payment_status=public.derive_payment_status(amount_paid-v_payment.amount,total)
  WHERE id=p_order_id AND user_id=v_uid;
  PERFORM set_config('sokoflow.payment_ledger_sync',coalesce(v_prev_setting,'off'),true);
  INSERT INTO public.activity_log (user_id,entity_type,entity_id,action,message,metadata)
  VALUES (v_uid,'customer_payment',v_payment.id,'order_refund_recorded','Refund recorded for order',
    jsonb_build_object('order_id',p_order_id,'customer_id',v_customer_id,'amount',v_payment.amount));
  RETURN jsonb_build_object('payment_id',v_payment.id,'amount',v_payment.amount,'duplicate',false,'status','recorded');
END;
$$;

CREATE OR REPLACE FUNCTION public.void_customer_payment(p_payment_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_payment public.payments;
  v_customer_id uuid;
  v_alloc record;
  v_order public.orders;
  v_prev_setting text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason))=0 THEN RAISE EXCEPTION 'A reason is required to void a payment'; END IF;
  SELECT customer_id INTO v_customer_id FROM public.payments WHERE id=p_payment_id AND user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id=v_customer_id AND user_id=v_uid FOR UPDATE;
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status='voided' THEN
    RETURN jsonb_build_object('payment_id',v_payment.id,'status','voided','duplicate',true);
  END IF;

  FOR v_alloc IN
    SELECT order_id, amount FROM public.customer_payment_allocations
    WHERE payment_id=v_payment.id AND order_id IS NOT NULL ORDER BY order_id
  LOOP
    SELECT * INTO v_order FROM public.orders WHERE id=v_alloc.order_id AND user_id=v_uid FOR UPDATE;
    IF FOUND THEN
      v_prev_setting := current_setting('sokoflow.payment_ledger_sync', true);
      PERFORM set_config('sokoflow.payment_ledger_sync','on',true);
      IF v_payment.kind='payment' THEN
        UPDATE public.orders SET amount_paid=greatest(0,amount_paid-v_alloc.amount),
          payment_status=public.derive_payment_status(greatest(0,amount_paid-v_alloc.amount),total)
        WHERE id=v_order.id AND user_id=v_uid;
      ELSE
        UPDATE public.orders SET amount_paid=least(total,amount_paid+v_alloc.amount),
          payment_status=public.derive_payment_status(least(total,amount_paid+v_alloc.amount),total)
        WHERE id=v_order.id AND user_id=v_uid;
      END IF;
      PERFORM set_config('sokoflow.payment_ledger_sync',coalesce(v_prev_setting,'off'),true);
    END IF;
  END LOOP;

  PERFORM set_config('sokoflow.ledger_void','on',true);
  UPDATE public.payments SET status='voided',voided_at=now(),voided_reason=trim(p_reason)
  WHERE id=v_payment.id AND user_id=v_uid;
  PERFORM set_config('sokoflow.ledger_void','off',true);
  INSERT INTO public.activity_log (user_id,entity_type,entity_id,action,message,metadata)
  VALUES (v_uid,'customer_payment',v_payment.id,'payment_voided','Payment voided: '||trim(p_reason),
    jsonb_build_object('customer_id',v_payment.customer_id,'order_id',v_payment.order_id,
      'amount',v_payment.amount,'kind',v_payment.kind,'reason',trim(p_reason)));
  RETURN jsonb_build_object('payment_id',v_payment.id,'status','voided','duplicate',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_customer_opening_balance(p_opening_balance_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_balance public.customer_opening_balances;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason))=0 THEN RAISE EXCEPTION 'A reason is required to void an opening balance'; END IF;
  SELECT customer_id INTO v_customer_id FROM public.customer_opening_balances
  WHERE id=p_opening_balance_id AND user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opening balance not found'; END IF;
  PERFORM 1 FROM public.customers WHERE id=v_customer_id AND user_id=v_uid FOR UPDATE;
  SELECT * INTO v_balance FROM public.customer_opening_balances
  WHERE id=p_opening_balance_id AND user_id=v_uid FOR UPDATE;
  IF v_balance.status='voided' THEN
    RETURN jsonb_build_object('opening_balance_id',v_balance.id,'status','voided','duplicate',true);
  END IF;
  PERFORM set_config('sokoflow.ledger_void','on',true);
  UPDATE public.customer_opening_balances SET status='voided',voided_at=now(),voided_reason=trim(p_reason)
  WHERE id=v_balance.id AND user_id=v_uid;
  PERFORM set_config('sokoflow.ledger_void','off',true);
  INSERT INTO public.activity_log (user_id,entity_type,entity_id,action,message,metadata)
  VALUES (v_uid,'customer_opening_balance',v_balance.id,'opening_balance_voided',
    'Opening balance voided: '||trim(p_reason),
    jsonb_build_object('customer_id',v_customer_id,'amount',v_balance.amount,'reason',trim(p_reason)));
  RETURN jsonb_build_object('opening_balance_id',v_balance.id,'status','voided','duplicate',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_debt_balances()
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  total_credit_given numeric,
  total_repaid numeric,
  balance_owed numeric,
  account_credit numeric,
  oldest_unpaid_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  WITH customers_owned AS (
    SELECT c.id,c.name FROM public.customers c WHERE c.user_id=v_uid
  ), order_rollup AS (
    SELECT o.customer_id,
      coalesce(sum(o.total) FILTER (WHERE o.status<>'cancelled'),0)::numeric AS given,
      coalesce(sum(o.amount_paid) FILTER (WHERE o.status<>'cancelled'),0)::numeric AS repaid
    FROM public.orders o WHERE o.user_id=v_uid AND o.customer_id IS NOT NULL GROUP BY o.customer_id
  ), opening_live AS (
    SELECT ob.id,ob.customer_id,ob.amount,ob.balance_date,
      coalesce(sum(CASE WHEN p.kind='payment' THEN a.amount ELSE -a.amount END)
        FILTER (WHERE p.status='recorded'),0)::numeric AS applied
    FROM public.customer_opening_balances ob
    LEFT JOIN public.customer_payment_allocations a ON a.opening_balance_id=ob.id
    LEFT JOIN public.payments p ON p.id=a.payment_id
    WHERE ob.user_id=v_uid AND ob.status='recorded'
    GROUP BY ob.id,ob.customer_id,ob.amount,ob.balance_date
  ), opening_rollup AS (
    SELECT ol.customer_id,coalesce(sum(ol.amount),0)::numeric AS given,
      coalesce(sum(greatest(ol.applied,0)),0)::numeric AS repaid
    FROM opening_live ol GROUP BY ol.customer_id
  ), cash_rollup AS (
    SELECT p.customer_id,
      coalesce(sum(CASE WHEN p.kind='payment' THEN p.amount ELSE -p.amount END),0)::numeric AS net_cash
    FROM public.payments p WHERE p.user_id=v_uid AND p.status='recorded' AND p.customer_id IS NOT NULL
    GROUP BY p.customer_id
  ), active_allocations AS (
    SELECT p.customer_id,
      coalesce(sum(CASE WHEN p.kind='payment' THEN a.amount ELSE -a.amount END),0)::numeric AS applied
    FROM public.customer_payment_allocations a
    JOIN public.payments p ON p.id=a.payment_id AND p.status='recorded' AND p.user_id=v_uid
    LEFT JOIN public.orders o ON o.id=a.order_id AND o.user_id=v_uid
    LEFT JOIN public.customer_opening_balances ob ON ob.id=a.opening_balance_id AND ob.user_id=v_uid
    WHERE p.customer_id IS NOT NULL AND (
      (a.order_id IS NOT NULL AND o.status<>'cancelled') OR
      (a.opening_balance_id IS NOT NULL AND ob.status='recorded')
    )
    GROUP BY p.customer_id
  ), due_items AS (
    SELECT o.customer_id,o.created_at AS due_at
    FROM public.orders o WHERE o.user_id=v_uid AND o.status<>'cancelled'
      AND o.customer_id IS NOT NULL AND o.total>o.amount_paid
    UNION ALL
    SELECT ol.customer_id,ol.balance_date::timestamp AT TIME ZONE 'UTC'
    FROM opening_live ol WHERE ol.amount>ol.applied
  ), oldest_due AS (
    SELECT d.customer_id,min(d.due_at) AS oldest_at FROM due_items d GROUP BY d.customer_id
  )
  SELECT c.id,c.name,
    (coalesce(oroll.given,0)+coalesce(br.given,0))::numeric,
    (coalesce(oroll.repaid,0)+coalesce(br.repaid,0))::numeric,
    greatest(coalesce(oroll.given,0)+coalesce(br.given,0)-coalesce(oroll.repaid,0)-coalesce(br.repaid,0),0)::numeric,
    greatest(coalesce(cr.net_cash,0)-coalesce(aa.applied,0),0)::numeric,
    od.oldest_at
  FROM customers_owned c
  LEFT JOIN order_rollup oroll ON oroll.customer_id=c.id
  LEFT JOIN opening_rollup br ON br.customer_id=c.id
  LEFT JOIN cash_rollup cr ON cr.customer_id=c.id
  LEFT JOIN active_allocations aa ON aa.customer_id=c.id
  LEFT JOIN oldest_due od ON od.customer_id=c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_customer_opening_balance(uuid,numeric,date,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_order_refund(uuid,numeric,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.void_customer_payment(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.void_customer_opening_balance(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.customer_debt_balances() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_customer_opening_balance(uuid,numeric,date,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_refund(uuid,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_customer_payment(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_customer_opening_balance(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_debt_balances() TO authenticated;