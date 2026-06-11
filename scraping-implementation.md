## Scraping job flow

### Before writing any code, read:
- docs/standards/vertical-slice.md
- docs/standards/api.md
- docs/standards/database.md
- docs/standards/queue.md
 
### Job payload shape
Every scraping job carries the following data:
- jobId: string (uuid v4) — used for status polling
- vehicleId: number — FK to vehicles.id
- url: string — the page to be scraped
- enqueuedAt: string (ISO timestamp)
- idempotencyKey: string — hash of vehicleId + url, used to detect duplicate jobs

---

### Phase 1 — HTTP layer (POST /api/scraping)

1. Admin client sends POST /api/scraping with body { vehicleId, url }

2. Backend validates the request (zod schema) and checks idempotency:
   - Query scraping_jobs by idempotencyKey
   - If a job already exists with status pending, processing or retrying:
     → return 200 OK { jobId } immediately — do not enqueue a duplicate

3. If no duplicate exists:
   - Generate a new jobId (uuid v4)
   - Compute idempotencyKey = hash(vehicleId + url)
   - INSERT into scraping_jobs with status: "pending"
   - Enqueue job to BullMQ scraping queue with:
       attempts: 3
       backoff: { type: exponential, delay: 60_000 } → 1 min, 5 min, 10 min
   - Return 202 Accepted { jobId, pollUrl: /api/scraping/:jobId/status }

---

### Phase 2 — Worker (scrapeDetails.worker.ts)

The worker runs with concurrency: 1 — one job at a time.

For each job dequeued:

1. Update scraping_jobs status → "processing"

2. Call scraper.scrape(job.data.url):
   - HTTP fetch the URL using Axios with a browser-like User-Agent header
   - Parse the HTML with Cheerio
   - Extract the target fields (engine, power, torque, transmission,
     fuel type, city/highway consumption)

---

### Phase 3a — Success path

If scraper.scrape() resolves successfully:

1. Run a single DB transaction containing both writes:
   - UPSERT into scraping_details (vehicleId + scraped fields)
   - UPDATE scraping_jobs SET status = "done"
   - Both writes succeed or neither does

2. Enqueue a notification job to the notification queue:
   - type: "scraping_complete"
   - payload: { vehicleId, brand, model, yearLabel, fipeCode }

3. BullMQ marks the job as completed automatically (no ack needed)

---

### Phase 3b — Failure path

If scraper.scrape() throws:

- BullMQ automatically retries up to 3 attempts with exponential backoff:
    attempt 1 failed → wait 1 min → attempt 2
    attempt 2 failed → wait 5 min → attempt 3
    attempt 3 failed → job moves to failed state

- On each retry, update scraping_jobs status → "retrying"

- After all attempts exhausted (job permanently failed):
  - UPDATE scraping_jobs SET status = "failed", error = error.message
  - BullMQ keeps the job in the failed state for manual inspection
    via Bull Board at /admin/queues
  - No further automatic retry

---

### Notes for implementation

- Never throw inside the transaction — if the DB write fails,
  let it propagate so BullMQ triggers the retry correctly
- The notification enqueue happens AFTER the transaction succeeds,
  BEFORE BullMQ marks the job complete — if notification enqueue
  fails, let BullMQ retry the whole job
- idempotencyKey must be checked at the HTTP layer, not the worker —
  the worker should never receive duplicate jobs
- Bull Board dashboard is available at /admin/queues for monitoring
  pending, active, completed and failed jobs across all queues