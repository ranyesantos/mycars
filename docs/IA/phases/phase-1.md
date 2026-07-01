## Phase 1 — MVP
 
> Goal: a working application users can actually use. All external calls are synchronous. No queues, no cron. Ship this.
 
### Slice 1 · search-by-fipe
 
**What it does:** user opens a modal, types a FIPE code, selects vehicle type, and the app fetches from the FIPE API (or returns from cache) and shows available years.
 
**Backend**
 
- `GET /api/vehicle/:type/:fipeCode`
  - Check SQLite for existing record → return with `source: "cache"` if found
  - Otherwise call `https://fipe.parallelum.com.br/api/v2/:type/:fipeCode/years`
  - Save vehicle + years to DB → return with `source: "api"`
  - Return `404` with friendly message if FIPE code does not exist
**Frontend**
 
- `SearchModal.tsx` — input for FIPE code + dropdown for vehicle type
- Loading, error, and empty states
- On success: show returned years, confirm to add to list
---
 
### Slice 2 · list-vehicles
 
**What it does:** main screen showing all saved vehicles as cards.
 
**Backend**
 
- `GET /api/vehicles` — returns all saved vehicles joined with their years and scraping status
- Optional query params: `?favorited=true`, `?type=cars`
**Frontend**
 
- `VehicleList.tsx` — grid of cards
- `VehicleCard.tsx` — shows brand, model, year options, latest price, favorite toggle, and scraping CTA
---
 
### Slice 3 · favorite-vehicle
 
**What it does:** user marks a vehicle as favorite. Only favorited vehicles can receive scraping enrichment.
 
**Backend**
 
- `PATCH /api/vehicle/:id/favorite` — toggles `favorited` field in DB
**Frontend**
 
- `FavoriteButton.tsx` — heart/star icon inside VehicleCard
- Optimistic UI: toggle state immediately, revert on error
---
 
### Slice 4 · scrape-details
#### Context

Favorited vehicles can be enriched with technical details (engine, power, torque, transmission, fuel type, consumption etc) scraped from siteCarros123.com.br.

Because scraping an external page is slow and unpredictable, the operation runs asynchronously via BullMQ. The HTTP request returns immediately with a jobId. The admin polls a status endpoint to track progress. The frontend updates the vehicle card when the job completes.

The scraping target follows this URL pattern: https://www.siteCarros123.com.br/{type}/{brand}/{model-slug}/{year}

The admin provides the full URL manually. The backend validates it belongs to the allowed domain before enqueuing.

This slice must be read alongside:
- docs/standards/vertical-slice.md
- docs/standards/api.md
- docs/standards/database.md
- docs/standards/queue.md
- 
---

#### What it does

Receives a URL and a vehicleId from the admin, validates both, enqueues a BullMQ scraping job, and returns 202 immediately. A worker processes the job asynchronously, scrapes the target page with Axios + Cheerio, and saves the extracted details to the scraping_details table via a DB transaction. The frontend polls the job status and updates the vehicle card when done.

---

#### Worker (scrapeDetails.worker.ts)

Runs as a separate process, started independently from the Express server.
concurrency: 1 — one job at a time, scraping is I/O heavy and the target
site must not be hammered with parallel requests.

BullMQ configuration:
  attempts: 3
  backoff: { type: 'exponential', delay: 60_000 }
  → attempt 1 fails → wait 1 min  → attempt 2
  → attempt 2 fails → wait 5 min  → attempt 3
  → attempt 3 fails → wait 10 min → job moves to failed state

---

##### Startup

On worker process start:
- Establish Redis connection
- Register the worker against the 'scraping' queue
- Log "Scraping worker running" to confirm the process is alive
- The worker stays alive and listens for jobs continuously —
  it does not exit after processing a job

---

##### For each job received

**Step 1 — Mark as processing**

UPDATE scraping_jobs SET status = 'processing', updated_at = NOW() WHERE job_id = job.data.jobId

This happens before any scraping attempt so the frontend polling reflects the real state immediately.

**Step 2 — Scrape the page**

Call scrapeDetails.scraper.ts with job.data.url.

The scraper is responsible for:
- Fetching the page HTML via Axios with a browser-like User-Agent header
  and a 10 second timeout
- Loading the HTML into Cheerio
- Extracting the following fields (null if not found on the page):
    engine, powerHp, torque, transmission,
    fuelType, consumptionCity, consumptionHighway
- Returning a ScrapedDetails object with all fields + rawData

The worker does not contain any parsing logic — it only calls scrape(url) and receives ScrapedDetails back. If scrape() throws for any reason (network error, timeout, parsing failure, unexpected page structure), the error propagates to Step 4.

**Step 3 — Persist (success path)**

Run a single DB transaction containing exactly two writes:

  Write 1: `UPSERT into scraping_details ON CONFLICT(vehicle_id) DO UPDATE`(equivalent) Updates all fields including scraped_at timestamp Stores rawData as JSON string

  Write 2: `UPDATE scraping_jobs SET status = 'done', updated_at = NOW() WHERE job_id = job.data.jobId` (equivalent)

Both writes succeed or neither does. If the transaction throws, the error must propagate, do not catch it inside the worker. BullMQ will treat the thrown error as a job failure and trigger the retry flow in Step 4.

Do not catch the transaction error and return silently — a silent failure here would leave scraping_details empty and the job marked as done, which is worse than a retry.

After the transaction commits successfully:
- BullMQ marks the job as completed automatically
- No further action needed in the worker for this job

**Step 4 — Retry and failure path**

BullMQ handles retries automatically when the worker throws. The worker must NOT catch errors and swallow them — always throw.

On each retry attempt (before Step 1 runs again):
(equivalent of:) 
``` javascript 
- UPDATE scraping_jobs SET status = 'retrying',
    updated_at = NOW()
  WHERE job_id = job.data.jobId
``` 


Use BullMQ's job.attemptsMade to determine current attempt number for logging purposes.

When all attempts are exhausted (job.attemptsMade === 3), BullMQ emits a 'failed' event on the worker. Listen for it:

``` javascript
worker.on('failed', (job, error) => {
  scrapingRepository.updateJobStatus(
    job.data.jobId,
    'failed',
    error.message
  )
})
```

UPDATE scraping_jobs:
  SET status = 'failed',
      error = error.message,
      updated_at = NOW()
  WHERE job_id = job.data.jobId

BullMQ retains the job in the failed state — it is visible in
Bull Board at /admin/queues for manual inspection and optional
manual retry. The job is never automatically retried after this point.

---

##### Error classification (optional enhancement)

Some errors should not be retried because retrying will never fix them:
  - 404 from the target site (page does not exist)
  - Domain mismatch (url does not belong to siteCarros123.com.br)
  - HTML structure changed (all extracted fields are null)

These can be detected in the scraper and thrown as a NonRetryableError subclass. The worker checks the error type and if NonRetryableError, calls job.discard() to skip remaining attempts and move directly to failed.

---

##### Logging

The worker must log the following events:
  - Job received: { jobId, vehicleId, url, attempt: job.attemptsMade + 1 }
  - Scraping started: { jobId, url }
  - Scraping completed: { jobId, fieldsFilled: number }
  - Transaction committed: { jobId }
  - Job failed (retrying): { jobId, attempt, error: error.message }
  - Job permanently failed: { jobId, totalAttempts: 3, error: error.message }

Use console.log for now. Do not log rawData — it is too large and contains no useful diagnostic information in log output.

#### DB tables involved

scraping_jobs — tracks job lifecycle (one row per enqueued job)
scraping_details — stores extracted vehicle specs (one row per vehicle, upserted on re-scrape — UNIQUE constraint on vehicle_id)

The scraping_details table uses ON CONFLICT(vehicle_id) DO UPDATE so re-scraping the same vehicle overwrites the previous result.

--- 

#### Acceptance criteria
- [ ] POST /api/scraping returns 404 if vehicleId does not exist
- [ ] POST /api/scraping returns 400 if URL domain is not siteCarros123.com.br
- [ ] POST /api/scraping returns 202 with jobId on valid request
- [ ] POST /api/scraping returns 200 with existing jobId if a job for the same vehicleId + url is already pending, processing or retrying
- [ ] Worker updates job status to "processing" before scraping begins
- [ ] Worker saves details and updates job to "done" in a single transaction
- [ ] If the transaction fails, the error propagates and BullMQ retries
- [ ] Worker retries up to 3 times with exponential backoff on failure
- [ ] After 3 failed attempts, job status is set to "failed" with error message
- [ ] Re-scraping the same vehicle updates the existing scraping_details row
- [ ] GET /api/scraping/:jobId/status returns current job state
- [ ] GET /api/scraping/vehicle/:vehicleId returns 404 when no details exist
- [ ] ScrapingModal is only accessible from favorited vehicle cards (frontend - dont do it for now)
- [ ] ScrapingModal polls status every 3 seconds until done or failed (frontend - dont do it for now)
- [ ] VehicleCard shows "Add technical details" CTA when favorited but no details (frontend - dont do it for now)
- [ ] VehicleCard shows enriched specs when scraping_details exists (frontend - dont do it for now)
- [ ] Bull Board at /admin/queues shows scraping queue activity (frontend - dont do it for now)
- [ ] The worker and the entire application must work independly the rest of the application, so if something goes wrong on the queue or the worker, the Express API must still working
---