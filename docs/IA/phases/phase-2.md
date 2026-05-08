## Phase 2 — Queues
 
> Goal: make external calls (FIPE API + scraping) resilient and non-blocking. Build after MVP is stable.
 
### Design principle to apply in Phase 1
 
Keep all external calls inside isolated service files (`fipe.service.ts`, `scraper.service.ts`). The routes call the service, the service calls the API. When Phase 2 arrives, the change is contained: the route enqueues a job instead of calling the service directly, and a worker calls the service. Routes and repositories stay untouched.
 
### Queue options
 
| Option | When to use |
|---|---|
| **SQLite-backed job table** | Local-first, no extra infrastructure, simple retry logic |
| **BullMQ + Redis** | If scalability or multi-worker processing ever becomes a requirement |
 
Start with the SQLite approach. Migrate to BullMQ only if needed.
 
### Tasks
 
- [ ] Create `jobs` table in DB (already in schema above)
- [ ] Write a `JobQueue` class: `enqueue(type, payload)`, `process(type, handler)`
- [ ] Wrap `fipe.service.ts` call with enqueue in `search-by-fipe` slice
- [ ] Wrap `scraper.service.ts` call with enqueue in `scrape-details` slice
- [ ] Worker processes jobs one at a time with 1.5s delay between FIPE calls
- [ ] Retry failed jobs up to 3 times with exponential backoff
- [ ] `GET /api/jobs/:id/status` — so frontend can poll for completion
- [ ] Update frontend cards to show pending/processing/done states
### Job types
 
```typescript
type JobType = 'fipe_fetch' | 'scrape' | 'price_update'
 
interface Job {
  id: number
  type: JobType
  payload: string       // JSON
  status: 'pending' | 'processing' | 'done' | 'failed'
  attempts: number
  error?: string
}
```
 