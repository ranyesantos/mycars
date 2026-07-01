# Scraping Feature

**Slug:** `scrape-details`
**Phase:** 1, Slice 4
**Status:** In development

---

## Purpose

Enriches vehicles tracked in the system with detailed technical specifications extracted from external web pages. A user provides the URL of a vehicle's detail page, the system scrapes it asynchronously, and the extracted data is saved against the specific vehicle year.

This allows admins to see things like engine displacement, power, torque, transmission type, fuel consumption, dimensions, equipment lists, and dozens of other specifications, all stored and queryable without leaving the app.

---

## Admin Flow

```
User sees favorited vehicle card
  → clicks "Add technical details"
  → pastes the URL of the vehicle's detail page
  → submits
  → sees "Scraping in progress..."
  → card updates automatically when done
```

Behind the scenes:

```
POST /api/scraping  →  202 Accepted immediately
                        └─ BullMQ job enqueued
                           └─ Worker picks it up (concurrency: 1)
                              └─ Fetches page HTML
                              └─ Extracts all spec label:value pairs
                              └─ UPSERTs into technical_specs + marks job done
                              └─ Frontend polls status → updates card
```

---

## Architecture

### Slice structure

```
backend/src/features/scrape-details/
  scrapeDetails.routes.ts        // HTTP layer
  scrapeDetails.service.ts       // Validation, idempotency, enqueue
  scrapeDetails.validator.ts     // Request validation (zod)
  scrapeDetails.types.ts         // Shared types for the slice
  scrapeDetails.repository.ts    // DB access (jobs, vehicles, years, specs)
  scrapeDetails.test.ts          // Integration tests
  scraper/
    scraper.ts                   // Pure function: url → ScrapedVehicleDetails
    scraper.types.ts             // ScrapedVehicleDetails interface
    scraper.test.ts              // Unit tests with static HTML
  worker/
    worker.ts                    // BullMQ worker + recovery sweeper
  index.ts
```

### Separation of concerns

| Layer | Knows about... | Doesn't know about... |
|---|---|---|
| Routes | HTTP status codes, request parsing | Business logic, DB |
| Service | Validation, idempotency, enqueue | HTTP parsing, HTML structure |
| Repository | SQL queries, transactions | Business rules, queues |
| Scraper | HTML parsing, label mapping | DB, queues, HTTP routes |
| Worker | BullMQ lifecycle, logging | HTML parsing, HTTP routes |

### The scraper is site-agnostic

The scraper walks all `.ent-ficha-group` sections on any page, collects every label→value pair into a flat map, and stores everything in `raw_data`. Known labels (like "Potência máxima") are mapped to typed DB columns.

Adding a different data source means writing a new scraper implementation with the same `scrape(url: string): Promise<ScrapedVehicleDetails>` interface. The worker, service, and routes don't change.

---

## API

### `POST /api/scraping`

| Status | When |
|---|---|
| 202 | Job enqueued successfully |
| 200 | Duplicate — same vehicle year + URL already queued |
| 400 | Validation error (bad vehicleId, yearCode, or domain) |
| 404 | Vehicle or year not found |
| 503 | Queue unavailable (Redis down) — job will resume automatically |

**Idempotency:** A hash of `vehicleYearId + url` prevents duplicate enqueues. If the same year and URL are submitted while a job is still active (pending/processing/retrying), the existing `jobId` is returned.

### `GET /api/scraping/:jobId/status`

Returns `{ jobId, status, error }`. Statuses: `pending`, `processing`, `retrying`, `done`, `failed`.

---

## Job Lifecycle

```
POST /api/scraping
  │
  ├─ Validates vehicleId, yearCode, URL domain
  ├─ Computes idempotency key → checks for existing active job
  ├─ Creates job row in main database → status: "pending"
  ├─ Enqueues to BullMQ
  │   ├─ Success → returns 202
  │   └─ Redis down → returns 503 (row stays "pending")
  │
Worker picks up job
  ├─ Status → "processing"
  ├─ Scraper.scrape(url)
  │   ├─ Success → TRANSACTION: upsert technical_specs + mark "done"
  │   └─ Error → throw (BullMQ retries)
  │
  ├─ Retry 1: status → "retrying", wait 1 min
  ├─ Retry 2: status → "retrying", wait 5 min
  ├─ Retry 3: status → "retrying", wait 10 min
  └─ Exhausted → status → "failed" with error message

Recovery Sweeper (runs every 30s in worker)
  ├─ Finds pending jobs older than 1 minute
  ├─ Tries to enqueue them to Redis
  ├─ If Redis is down and job is older than 1 hour → mark "failed"
  └─ Otherwise leave "pending" → try again next sweep
```

---

## Data Model

### `technical_specs` (one row per vehicle year)

| Column | Source label |
|---|---|
| `engine` | "Cilindrada" |
| `power_hp` | "Potência máxima" |
| `torque` | "Torque máximo" |
| `transmission` | "Câmbio" |
| `fuel_type` | "Combustível" |
| `consumption_city` | "Urbano (G)" |
| `consumption_highway` | "Rodoviário (G)" |
| `raw_data` | ALL label:value pairs as JSON |

The typed columns are for frequently queried fields. `raw_data` contains everything, dimensions, weight, suspension, brakes, equipment, and any new fields the site may add in the future, with zero schema changes.

### `jobs` (generic, one row per enqueued job)

`type = 'scrape_details'`, `payload` contains `{ vehicleYearId, url }`.

---

## Retry Policy

| Attempt | Backoff | Cumulative wait |
|---|---|---|
| 1 | — (first try) | 0 |
| 2 | 1 minute | 1 min |
| 3 | 5 minutes | 6 min |
| 4 (failed) | 10 minutes | 16 min |

After 3 total attempts, the job enters `failed` state and stays visible for manual inspection. No automatic retry beyond this point.

---

## Resilience

- **Redis down:** The Express API returns 503, the job row stays `pending`, and the recovery sweeper enqueues it when Redis returns
- **Worker crash:** BullMQ holds the job in Redis. When the worker restarts, it picks up where it left off
- **Scraping failure:** Automatic retries with exponential backoff, then permanent failure with error message
- **Site change:** If the page structure changes and no recognized fields are found, the scraper throws. The job retries 3 times, then fails. The error message is stored.
- **Worker/API independence:** The worker and Express server share only the main database and Redis connection. If the worker crashes, the API continues serving requests normally
