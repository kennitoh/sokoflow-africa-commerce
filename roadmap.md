# Roadmap — Public checkout safety follow-up

## Tasks
- [x] Register hourly stale-order expiry and daily attempt-log cleanup in a migration
- [x] Cap each public order line at the lower of 20 units or current stock; preserve a clear error
- [x] Verify current live scheduled jobs and confirm `CHECKOUT_HASH_SECRET` is configured

## Constraints
- Do not touch live order or stock data