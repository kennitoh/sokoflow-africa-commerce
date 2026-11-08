# Customer debt and repayment tracking

## Scope
Add the requested database-only debt and repayment foundation. Leave screens, `cancel_order`, public checkout, stock logic, and existing order payment normalization behavior unchanged.

## Build
- Add an immutable, owner-scoped payments ledger with idempotency, void audit fields, and allocation records; add a separate immutable customer opening-balance ledger.
- Add owner-authenticated functions for opening balances, customer repayments, order-specific payments, and voiding entries. Allocate incoming money to the oldest eligible debt first, preserve excess as account credit, and serialize repayments per customer.
- Add a customer balance read model derived from orders and ledger records, with cancelled-order part-payments represented as account credit.
- Backfill each existing order with positive `amount_paid` into one marked migrated payment record without changing orders, statuses, or stock; make the backfill idempotent.
- Keep all write access behind authenticated functions and enforce owner-only reads with row-level security.

## Verification
- Capture per-business paid-order totals before and after the backfill.
- Exercise required accounting, idempotency, cancellation-credit, concurrency, tenant-isolation, and signed-out authorization cases using temporary test data only; clean up all test records afterward.
- Verify the existing payment-status function and trigger remain unchanged, then check the build and latest diagnostic logs.

## Technical details
- Use Lovable Cloud's existing public-schema migration flow with explicit grants, RLS policies, scoped `SECURITY DEFINER` functions, and no anon execution.
- Do not change application screens or the existing cancellation, storefront, checkout, or stock functions.
