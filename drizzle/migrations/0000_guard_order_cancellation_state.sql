CREATE OR REPLACE FUNCTION public.orders_guard_cancellation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  -- Cancelling must go through cancel_order() so stock is restored exactly once.
  if new.status = 'cancelled' and old.status <> 'cancelled' and new.stock_restored_at is null then
    raise exception 'Use cancel_order to cancel an order so stock is restored';
  end if;
  -- A cancelled order cannot be reactivated: its stock was already returned.
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be reopened';
  end if;
  if old.stock_restored_at is not null and new.stock_restored_at is distinct from old.stock_restored_at then
    raise exception 'Stock restoration record cannot be changed';
  end if;
  return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.orders_guard_cancellation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_guard_cancellation ON public.orders;
CREATE TRIGGER orders_guard_cancellation BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_cancellation();