# Queue System

**Slug:** `queue`

**Status:** Active

---

## Purpose

Provides asynchronous job processing for operations that are too slow or unreliable to run during an HTTP request. The queue system decouples request handling from execution, giving users instant feedback while work happens in the background.

---

## Why Queues

Some operations don't belong in the request-response cycle:

| Operation | Why queued |
|---|---|
| Scraping vehicle details | External HTTP call + HTML parsing (latency unpredictable, can fail) |
| Future: Price batch updates | Touches hundreds of rows, needs transaction integrity |
| Future: Notifications | Fire-and-forget (don't block the user on email delivery) |

The alternative is synchronous execution, which blocks the user for seconds and has no retry capability if something fails.

---

## Architecture

```
┌─────────────────────┐     ┌──────────┐     ┌─────────────────────┐
│   Express API       │     │  Redis   │     │   Worker Process    │
│                     │     │ (BullMQ) │     │                     │
│  POST /api/scraping │────▶│          │────▶│  picks up job       │
│  returns 202        │     │  queue   │     │  executes           │
│                     │     │          │     │  retries on failure  │
└─────────┬───────────┘     └──────────┘     └──────────┬──────────┘
          │                                              │
          │     ┌──────────────────────┐                 │
          └────▶│    DB (jobs)        │◀────────────────┘
                │  canonical state     │
                │  status polling      │
                └──────────────────────┘
```

### Two stores, two roles

**Redis (BullMQ)** handles job execution mechanics (enqueuing, dequeuing, retry timing, backoff). It is fast, push-based, and ephemeral.

**DB (`jobs` table)** is the durable record of every job. It is what the status endpoint queries, what idempotency checks run against, and what survives Redis restarts.

### Why not Redis-only?

Redis alone can't do SQL-like queries. "Find all active jobs for vehicle X" or "show me pending jobs older than 1 minute" requires scanning keys or maintaining secondary indexes. DB handles these naturally. The jobs table also survives if Redis loses data.

---

## The `jobs` Table

A single generic table for all job types. No separate tables per queue.

| Column | Purpose |
|---|---|
| `id` | Internal PK |
| `job_id` | UUID v4 — public identifier for status polling |
| `type` | Job type discriminator: `scrape_details`, future `price_update`, `notification`, etc. |
| `status` | `pending` → `processing` → `retrying` → `done` / `failed` |
| `payload` | JSON — type-specific data. Schema varies per `type` |
| `idempotency_key` | UNIQUE — prevents duplicate enqueues per business key |
| `attempts` | Retry counter, incremented by worker |
| `error` | Error message from the last failed attempt |
| `created_at` | When the job row was inserted |
| `updated_at` | Last status transition |

### Status state machine

```
pending ──→ processing ──→ done
  │             │
  │             ├──→ retrying ──→ processing  (loop, up to 3 attempts)
  │             │
  │             └──→ failed  (all attempts exhausted)
  │
  └──→ failed  (recovery abandoned — Redis down > 1 hour)
```

### How to add a new job type

1. **Pick a `type` string** (e.g., `price_update`)
2. **Define the payload shape** (e.g., `{ batchId: string, vehicleIds: number[] }`)
3. **Define the idempotency key formula** (e.g., `hash(batchId)`)
4. **Create a worker** that handles `type = 'price_update'` (lives in its feature slice)
5. **Create a service** that inserts into `jobs` and enqueues to BullMQ (lives in its feature slice)

No schema changes, no migrations, no changes to shared infrastructure.

---

## Retry Policy

All jobs use BullMQ's built-in retry mechanics:

- **Max attempts:** 3 total (1 initial + 2 retries)
- **Backoff:** Exponential (1 minute, then 5 minutes)
- **After exhaustion:** Job moves to `failed` state, stored in BullMQ's failed set for manual inspection
- **No automatic retry** after the 3 attempts are exhausted

### Non-retryable errors (future enhancement)

Some errors should skip retries because they'll never resolve:
- HTTP 404 from the target page
- Domain mismatch
- Malformed input that passed validation but fails at the worker

These can be thrown as a `NonRetryableError` subclass, the worker calls `job.discard()` to skip remaining attempts and move directly to `failed`.

---

## Recovery Sweeper

Each worker process runs a lightweight sweeper for its queue type. It handles the gap between DB and Redis:

### The problem

When `POST /api/scraping` is called but Redis is down:
1. The DB row is created with `status = 'pending'`
2. The BullMQ enqueue fails
3. The API returns 503, but the row is orphaned

### The solution

Every 30 seconds, the worker queries:

```sql
SELECT * FROM jobs
WHERE type = 'scrape_details'
  AND status = 'pending'
  AND created_at < datetime('now', '-1 minute')
ORDER BY created_at ASC
```

For each stale row:
- Try to enqueue to Redis
- If Redis is up → job goes into the normal flow
- If Redis is still down:
  - Job ≤ 1 hour old → leave `pending`, try again next sweep
  - Job > 1 hour old → mark `failed` with reason "Queue unavailable for over 1 hour"

This means jobs recover automatically when Redis returns, but don't accumulate forever if Redis is permanently lost.

---

## Shared Infrastructure

### `backend/src/shared/queue/connection.ts`

Singleton IORedis connection used by both the Express server (for enqueuing) and workers (for consuming). Created lazily on first use.

### `backend/src/shared/queue/scrapingQueue.ts`

BullMQ Queue factory. Exposes an `IScrapingQueue` interface so tests can mock it. The queue name constant (`'scraping'`) is shared so enqueuer and consumer reference the same queue.

Future job types add their own queue files following the same pattern:
```
shared/queue/
  connection.ts
  scrapingQueue.ts
  priceUpdateQueue.ts    // future
  notificationQueue.ts    // future
```

---

## Worker Concurrency

All workers use `concurrency: 1` — one job at a time per queue type. This is deliberate:

- Scraping involves HTTP calls to external sites, parallel requests risk triggering bot protection
- The app is single-user or low-concurrency, throughput is not a bottleneck
- Sequential execution makes debugging and logging simpler

If higher throughput is needed later, concurrency can be increased per queue without changing anything else.

---

## Monitoring

- **Status endpoint:** `GET /api/scraping/:jobId/status` returns current job state
- **Worker logs:** All state transitions are logged as structured JSON to stdout
- **Bull Board (optional):** Mounted at `/admin/queues` for visual queue inspection
- **Failed jobs:** Stored in BullMQ's failed set, visible in Bull Board, with error messages
