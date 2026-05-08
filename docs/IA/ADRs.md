### ADR-001 · SQLite over PostgreSQL
 
**Decision:** use SQLite with better-sqlite3 as the local database.
 
**Reason:** this is a local desktop application. There is no need for a database server, concurrent multi-user access, or network connectivity to a database. SQLite stores everything in a single file, requires zero configuration, and ships with the app.
 
**Consequences:** do not use PostgreSQL-specific features (JSONB, arrays, `RETURNING` clause syntax differences). If the app ever needs to be multi-user or cloud-hosted, this decision should be revisited.
 
---
 
### ADR-002 · Vertical slice over layered architecture
 
**Decision:** organize code by feature (vertical slice), not by technical layer.
 
**Reason:** each feature — search, favorite, scrape, update prices — is largely independent. Grouping all related code (route + service + repository + types) in the same folder makes it easier to understand, modify, and hand off to an AI coding agent without requiring cross-folder context.
 
**Consequences:** some duplication is acceptable within slices. Shared utilities go into `/shared/` only when genuinely used by two or more slices.
 
---
 
### ADR-003 · Synchronous calls in Phase 1, queues in Phase 2
 
**Decision:** Phase 1 calls the FIPE API and the scraper synchronously and returns the response directly to the frontend.
 
**Reason:** queues add complexity (job status polling, worker management, retry logic) that is not justified until the synchronous approach proves insufficient. The FIPE API is fast and the scraping is user-initiated, so synchronous calls are acceptable for an MVP.
 
**Consequences:** all external calls must be isolated inside service files so they can be wrapped in queue jobs later without touching routes or repositories.
 
---
 
### ADR-004 · SQLite job table over Redis/BullMQ (Phase 2 default)
 
**Decision:** implement the job queue using the existing SQLite database before considering BullMQ + Redis.
 
**Reason:** this is a local app. Adding a Redis server as a dependency increases operational complexity with no benefit at this scale. A `jobs` table with a polling worker handles the requirements cleanly.
 
**Consequences:** if the app needs concurrent workers or distributed processing in the future, migrate to BullMQ. The job schema above is designed to be compatible with that migration path.