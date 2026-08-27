-- 1. stock_movements traceability
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stock_movements_order_id_idx ON public.stock_movements(order_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements(product_id);

-- 2. new movement reasons
ALTER TYPE stock_reason ADD VALUE IF NOT EXISTS 'cancellation';
ALTER TYPE stock_reason ADD VALUE IF NOT EXISTS 'reversal';

-- 3. idempotency marker for cancellations
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz;

-- 4. uniqueness of order numbering per business
CREATE UNIQUE INDEX IF NOT EXISTS orders_user_order_seq_key ON public.orders(user_id, order_seq);
CREATE UNIQUE INDEX IF NOT EXISTS orders_user_order_number_key ON public.orders(user_id, order_number);
