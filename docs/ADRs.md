### ADR-001 · SQLite over PostgreSQL (deprecated)
 
**Decision:** use SQLite with better-sqlite3 as the local database.
 
**Reason:** this is a local desktop application. There is no need for a database server, concurrent multi-user access, or network connectivity to a database. SQLite stores everything in a single file, requires zero configuration, and ships with the app.
 
**Consequences:** do not use PostgreSQL-specific features (JSONB, arrays, `RETURNING` clause syntax differences). If the app ever needs to be multi-user or cloud-hosted, this decision should be revisited.
 
---
 
### ADR-002 · Vertical slice over layered architecture
 
**Decision:** organize code by feature (vertical slice), not by technical layer.
 
**Reason:** each feature (search, favorite, scrape, update prices) is largely independent. Grouping all related code (route + service + repository + types) in the same folder makes it easier to understand, modify, and hand off to an AI coding agent without requiring cross-folder context.
 
**Consequences:** some duplication is acceptable within slices. Shared utilities go into `/shared/` only when genuinely used by two or more slices.
 
---
 
### ADR-003 · Synchronous calls in Phase 1, queues in Phase 2
 
**Decision:** Phase 1 calls the FIPE API and the scraper synchronously and returns the response directly to the frontend.
 
**Reason:** queues add complexity (job status polling, worker management, retry logic) that is not justified until the synchronous approach proves insufficient. The FIPE API is fast and the scraping is user-initiated, so synchronous calls are acceptable for an MVP.
 
**Consequences:** all external calls must be isolated inside service files so they can be wrapped in queue jobs later without touching routes or repositories.
 
---
 
### ADR-004 · SQLite job table over Redis/BullMQ (deprecated)
 
**Decision:** implement the job queue using the existing SQLite database before considering BullMQ + Redis.
 
**Reason:** this is a local app. Adding a Redis server as a dependency increases operational complexity with no benefit at this scale. A `jobs` table with a polling worker handles the requirements cleanly.
 
**Consequences:** if the app needs concurrent workers or distributed processing in the future, migrate to BullMQ. The job schema above is designed to be compatible with that migration path.

---

### ADR-005 · BullMQ for async scraping jobs (supersedes ADR-004)

**Disclaimer** I've said before the application will not use some queue tools for now, because I wanted less complexity as possible in this application, but I think the correct implementation of queues will make the scraping flow work better and it will directly impact positively the rest of the entire application (also i want to overengineering XD)

**Decision** Use BullMQ to process vehicle detail scraping asynchronously instead of running the scraper synchronously in the HTTP request.

**Reason**
Scraping the vehicle's details involves:
- An HTTP request to an external site (latency unpredictable)
- HTML parsing (CPU bound)
- A DB write on completion
> Doing this synchronously blocks the admin's request for several seconds and has no retry capability if the scrape fails. BullMQ decouples the HTTP response from the scraping execution, gives the admin instant feedback, and handles retries automatically through dead letter queues.

**Consequences**
- The POST /api/scraping route becomes non-blocking, it enqueues a job and returns 202 Accepted immediately
- The admin polls GET ```/api/scraping/:jobId/status``` to check progress
- Failed scrapes are routed to a dead letter queue and retried up to 3 times with exponential backoff
- A worker process runs separately from the Express server

**Idempotency notes**
- Idempotency key: `sha256(vehicleYearId + url)`. A job is considered a duplicate if an existing job with the same key has status `pending`, `processing`, `retrying`, or `done` — i.e., **any completed or active job blocks re-enqueuing for the same vehicle-year + URL pair.** Once a vehicle-year/URL combination has been scraped successfully (status `done`), the system intentionally prevents re-scraping that exact combination. If updated specs are needed, the frontend should surface the existing data rather than re-scraping.


---

### ADR-006 · PostgreSQL migration (supersedes ADR-001)

**Decision:** replace SQLite with PostgreSQL using Prisma 7 as the ORM. Runtime uses `@prisma/adapter-pg`; tests use PGlite (in-process WASM PostgreSQL) via `prisma-pglite`.

**Reason:** the application now uses BullMQ + Redis for async job processing (ADR-005), which runs in a separate worker process — SQLite's single-writer limitation becomes a real constraint. PostgreSQL provides proper concurrent access, native JSONB and enums, and aligns with production deployment patterns. PGlite keeps tests self-contained and fast — no external PostgreSQL server needed in CI.

**Consequences:** single `provider = "postgresql"` schema. All Prisma imports go through the generated output path (`src/generated/prisma/client`). `better-sqlite3` and `@prisma/adapter-better-sqlite3` are removed. Runtime requires `DATABASE_URL` pointing to a PostgreSQL instance. 