# Scraping Feature Design

**Date:** 2026-06-10
**Branch:** feat/details-scraping
**Phase:** Phase 1, Slice 4 — scrape-details

---

## Overview

Enrich favorited vehicles with technical specifications scraped from an external site. A user provides the URL, the backend validates and enqueues a job, a worker scrapes the page asynchronously, and results are saved to the database.

The worker runs as a separate process using BullMQ + Redis for job queuing with automatic retries.

---

## Database Schema

### `technical_specs` table (renamed from `scraping_details`)

Belongs to `vehicle_years`, not `vehicles` — specs vary per year variant. One-to-one relationship via unique `vehicle_year_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `vehicle_year_id` | INTEGER FK UNIQUE | References `vehicle_years(id)`, ON DELETE CASCADE |
| `source_url` | TEXT NOT NULL | The URL that was scraped |
| `engine` | TEXT? | Mapped from label "Cilindrada" |
| `power_hp` | TEXT? | Mapped from label "Potência máxima" |
| `torque` | TEXT? | Mapped from label "Torque máximo" |
| `transmission` | TEXT? | Mapped from label "Câmbio" |
| `fuel_type` | TEXT? | Mapped from label "Combustível" |
| `consumption_city` | TEXT? | Mapped from label "Urbano (G)" |
| `consumption_highway` | TEXT? | Mapped from label "Rodoviário (G)" |
| `raw_data` | TEXT? | Full JSON of all label:value pairs from the page |
| `scraped_at` | DATETIME NOT NULL | |

UPSERT on `vehicle_year_id` — re-scraping the same year overwrites the previous result.

### `jobs` table (generic)

Used by all job types (scraping, future price updates, notifications).

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `job_id` | TEXT UNIQUE | UUID v4 — used for status polling |
| `type` | TEXT NOT NULL | `'scrape_details'` for this feature |
| `status` | TEXT NOT NULL | `pending` → `processing` → `retrying` → `done` / `failed` |
| `payload` | TEXT NOT NULL | JSON — type-specific data |
| `idempotency_key` | TEXT UNIQUE | `hash(vehicleYearId + url)` for scraping |
| `attempts` | INTEGER DEFAULT 0 | |
| `error` | TEXT? | Error message on failure |
| `created_at` | DATETIME NOT NULL | |
| `updated_at` | DATETIME NOT NULL | |

---

## Slice Structure

```
backend/src/features/scrape-details/
  scrapeDetails.routes.ts        // POST /api/scraping, GET /api/scraping/:jobId/status
  scrapeDetails.service.ts       // validates, checks idempotency, enqueues
  scrapeDetails.validator.ts     // zod schema for { vehicleId, yearCode, url }
  scrapeDetails.types.ts         // EnqueueScrapingInput, JobStatusResponse, etc.
  scrapeDetails.repository.ts    // reads/writes the jobs table
  scrapeDetails.test.ts          // integration tests
  scraper/
    scraper.ts                   // fetch HTML + extract fields via Cheerio
    scraper.types.ts             // ScrapedVehicleDetails, ExtractedField
    scraper.test.ts              // unit tests for extraction
  worker/
    worker.ts                    // BullMQ worker process entry point
  index.ts                       // public exports
```

Shared code (used by both Express server and worker):

```
backend/src/shared/
  queue/
    connection.ts               // Redis IORedis connection
    scrapingQueue.ts             // BullMQ Queue instance
```

---

## API

### `POST /api/scraping`

Enqueue a scraping job.

**Request body:**
```json
{
  "vehicleId": 42,
  "yearCode": "2012-1",
  "url": "https://..."
}
```

**Responses:**

| Case | Status | Body |
|---|---|---|
| Valid, new job enqueued | 202 | `{ success: true, data: { jobId, pollUrl } }` |
| Duplicate (same idempotency key, pending/processing/retrying) | 200 | `{ success: true, data: { jobId, status: "already_queued" } }` |
| Vehicle not found | 404 | `{ error: { code: "VEHICLE_NOT_FOUND" } }` |
| Year not found for vehicle | 404 | `{ error: { code: "YEAR_NOT_FOUND" } }` |
| Invalid URL domain | 400 | `{ error: { code: "VALIDATION_ERROR" } }` |
| Validation error | 400 | `{ error: { code: "VALIDATION_ERROR", message, details } }` |

**Validation rules:**
- `vehicleId` — positive integer, must exist in `vehicles`
- `yearCode` — string matching `YYYY-N` format, must exist in `vehicle_years` for that vehicle
- `url` — valid HTTPS URL, domain must match the allowed scraping target

**Idempotency:** `idempotencyKey = hash(vehicleYearId + url)`. `vehicleYearId` is resolved from `vehicleId + yearCode` during validation. If a job with this key exists and has status `pending`, `processing`, or `retrying`, return 200 with the existing `jobId` — do not enqueue a duplicate.

**Service flow:**
1. Validate request (zod)
2. Verify vehicle exists (404 if not)
3. Find vehicle year row by vehicleId + yearCode (404 if not)
4. Verify URL domain is allowed (400 if not)
5. Compute idempotency key, check for existing active job (200 if duplicate)
6. Generate UUID v4 `jobId`
7. INSERT into `jobs` with status `pending`
8. Enqueue BullMQ job with `{ jobId, vehicleYearId, url }`
9. Return 202 with `jobId`

### `GET /api/scraping/:jobId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "status": "processing",
    "error": null
  }
}
```

Returns 404 if `jobId` doesn't exist.

---

## Scraper

### Contract

```typescript
function scrape(url: string): Promise<ScrapedVehicleDetails>
```

It has no knowledge of the database, BullMQ, or the worker. It receives a URL and returns extracted data or throws.

### Extracted fields (typed)

| Label on page | Maps to DB column |
|---|---|
| `"Cilindrada"` | `engine` |
| `"Potência máxima"` | `powerHp` |
| `"Torque máximo"` | `torque` |
| `"Câmbio"` | `transmission` |
| `"Combustível"` | `fuelType` |
| `"Urbano (G)"` | `consumptionCity` |
| `"Rodoviário (G)"` | `consumptionHighway` |

The label mapping is defined as a static lookup table in the scraper file. The scraper walks all `.ent-ficha-group` sections, collects every `ent-spec-label` → `ent-spec-value` pair, maps known labels to typed columns, and stores **everything** in `rawData` as a JSON object.

### Behavior

- Axios GET with browser-like User-Agent, 10 second timeout
- Cheerio loads the HTML
- Walks all section groups, extracts all pairs
- Returns `ScrapedVehicleDetails` with typed fields + full rawData
- Throws on: network error, timeout, empty page, or all extracted fields being null

The scraper does NOT reference the target site by name — extraction is driven by CSS class structure and label text matching. A different site would require a different label map or a different scraper implementation, but the interface stays the same.

---

## Worker

### Process lifecycle

- Runs as a separate process: `node worker.ts` (started independently from Express)
- On startup: establishes Redis connection, registers worker on `scraping` queue, logs "Scraping worker running"
- Listens continuously — does not exit after processing a job

### BullMQ configuration

- `concurrency: 1` — one job at a time
- `attempts: 3`
- `backoff: { type: 'exponential', delay: 60000 }` — attempt 1 fails → wait 1min → attempt 2 → wait 5min → attempt 3 → failed

### Per-job flow

**Step 1 — Mark as processing**

UPDATE `jobs` SET `status = 'processing'`, `updated_at = NOW()` WHERE `job_id = ?`

**Step 2 — Scrape**

Call `scraper.scrape(job.data.url)`. The worker contains no parsing logic — it only calls `scrape()` and receives `ScrapedVehicleDetails`.

**Step 3 — Persist (success path)**

Single DB transaction containing two writes:

1. UPSERT into `technical_specs` ON CONFLICT(`vehicle_year_id`) DO UPDATE — all typed fields + rawData, with `scraped_at` timestamp
2. UPDATE `jobs` SET `status = 'done'`, `updated_at = NOW()` WHERE `job_id = ?`

Both writes succeed or neither does. If the transaction throws, the error propagates → BullMQ triggers retry.

**Step 4 — Retry and failure path**

On each retry attempt: UPDATE `jobs` SET `status = 'retrying'`, `updated_at = NOW()` WHERE `job_id = ?`

BullMQ handles retries automatically when the worker throws. The worker must NOT catch errors — always throw.

After all attempts exhausted (worker `'failed'` event):

UPDATE `jobs` SET `status = 'failed'`, `error = ?`, `updated_at = NOW()` WHERE `job_id = ?`

BullMQ retains the job in the failed state for manual inspection. No automatic retry after this point.

### Logging

The worker logs these events (using `console.log`):

- Job received: `{ jobId, vehicleYearId, url, attempt }`
- Scraping started: `{ jobId, url }`
- Scraping completed: `{ jobId, fieldsFilled }`
- Transaction committed: `{ jobId }`
- Job failed (retrying): `{ jobId, attempt, error }`
- Job permanently failed: `{ jobId, totalAttempts: 3, error }`

Do not log `rawData` — it is too large and provides no diagnostic value in logs.

### Worker independence

The worker and Express API share only the database, the Redis connection, and the scraper module. If the worker crashes or Redis goes down, the Express API continues to function normally. The worker is a separate process — failures are isolated.

---

## Dependencies

### New packages required

```
bullmq          — job queue
ioredis          — Redis client (BullMQ peer dependency)
axios            — HTTP client for scraper
cheerio          — HTML parsing
uuid             — jobId generation
```

### Infrastructure

- Redis must be installed and running (default port 6379)
- Bull Board mounted at `/admin/queues` for queue monitoring (separate middleware on Express)

---

## Acceptance Criteria

- [ ] POST /api/scraping returns 404 if vehicleId does not exist
- [ ] POST /api/scraping returns 404 if yearCode does not exist for the vehicle
- [ ] POST /api/scraping returns 400 if URL domain is not the allowed target
- [ ] POST /api/scraping returns 202 with jobId on valid request
- [ ] POST /api/scraping returns 200 with existing jobId if a job for the same vehicleId + yearCode + url is already pending, processing or retrying
- [ ] Worker updates job status to "processing" before scraping begins
- [ ] Worker saves details and updates job to "done" in a single transaction
- [ ] If the transaction fails, the error propagates and BullMQ retries
- [ ] Worker retries up to 3 times with exponential backoff on failure
- [ ] After 3 failed attempts, job status is set to "failed" with error message
- [ ] Re-scraping the same vehicle year updates the existing technical_specs row
- [ ] GET /api/scraping/:jobId/status returns current job state
- [ ] The worker and Express API must work independently — if the worker or Redis fails, the Express API continues to function
- [ ] `raw_data` stores all extracted label:value pairs as JSON
