# Roadmap — Safety fixes: stock hold, safe stock-change function, checkout attempt log

## Tasks
1. [ ] Migration: enable pg_cron; `adjust_product_stock` (lock row, refuse <0, movement, atomic); products stock-write guard trigger; rewrite `guarded_checkout` (per-product public quantity cap, 2 open unpaid website orders per phone, failed-only 60/business limit, separate higher success limit); `expire_stale_public_orders` (calls cancel_order unchanged)
2. [ ] Cron schedules: hourly expiry of 24h-old open unpaid website orders; daily purge of checkout attempts older than 1 day
3. [ ] Server fn: HMAC hashing of IP + phone digits with server-stored secret; refuse when no connection address
4. [ ] App: manual stock adjustments via `adjust_product_stock`; product form stock edits routed through it; no direct `products.stock` writes
5. [ ] Scrub existing raw `phone_digits` in checkout_attempts
6. [ ] Tests (temporary test business only, then delete everything):
   - [x] two concurrent stock changes on same product
   - [x] same order sent twice (idempotency)
   - [x] cancelling same order twice
   - [x] order over quantity limit
   - [x] third open order from one phone
7. [ ] Report: hosting provider + IP header; pass/fail per test; cleanup confirmed

## Constraints from user
- Do not change how cancel_order works
- Do not touch live stock/orders; test only on temporary test business, delete everything after
- Scheduled jobs must be confirmed available (pg_cron is available → enabling it)
