# Roadmap — Public checkout safety follow-up

## Tasks
- [x] Register hourly stale-order expiry and daily attempt-log cleanup in a migration
- [x] Cap each public order line at the lower of 20 units or current stock; preserve a clear error
- [x] Verify current live scheduled jobs and confirm `CHECKOUT_HASH_SECRET` is configured

## Constraints
- Do not touch live order or stock data

## Customer debt and repayment tracking
- [ ] Add immutable owner-scoped payment and opening-balance ledgers, allocation records, and guarded database functions
- [ ] Backfill existing paid orders idempotently without changing orders, statuses, or stock; compare totals per business
- [ ] Verify accounting, idempotency, cancellation credit, concurrency, tenant isolation, and signed-out access using temporary data only
- [ ] Remove temporary test data and confirm existing payment normalization remains unchanged

## Constraints
- Do not change screens, `cancel_order`, public checkout, or stock logic
- Do not touch live customers, orders, or stock except the requested paid-amount backfill