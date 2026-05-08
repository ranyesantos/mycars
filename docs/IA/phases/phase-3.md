## Phase 3 — Monthly Price Cron
 
> Goal: automatically refresh FIPE prices for all saved vehicles once a month. Requires Phase 2 to be done first.
 
### How it works
 
The cron job does not call the FIPE API directly. It queries all saved vehicles from the DB and enqueues one `price_update` job per vehicle. The same queue worker from Phase 2 processes these jobs, respecting rate limits automatically.
 
### Tasks
 
- [ ] Install `node-cron`
- [ ] Create `update-prices/` slice:
  - `updatePrices.cron.ts` — registers the monthly schedule
  - `updatePrices.service.ts` — fetches vehicles and enqueues jobs
  - `updatePrices.route.ts` — `POST /api/admin/trigger-update` for manual runs
- [ ] Create `cron_runs` table for run history (already in schema)
- [ ] On job completion, update `vehicle_years.price` and `price_updated_at`
- [ ] Show "prices last updated X days ago" in the frontend list header
### Cron schedule
 
```typescript
// Runs at 08:00 on the 1st of every month
cron.schedule('0 8 1 * *', () => updatePricesService.run())
```