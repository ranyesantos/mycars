# PostgreSQL Migration — Design Spec

**Date:** 2026-06-27

**Status:** Approved

## Motivation

Replace the SQLite database with PostgreSQL for the application runtime while using PGlite (in-process WASM PostgreSQL) for automated tests. This keeps tests self-contained and fast (no external PostgreSQL server needed) while the application benefits from a real PostgreSQL instance in production.

Existing data is not preserved — this is a fresh migration.

## Architecture

```
Runtime:
  PrismaClient({ adapter: PrismaPg(connectionString) })  →  PostgreSQL server
       ↑
  server.ts / repositories import PrismaClient from generated directory

Tests:
  PrismaClient({ adapter: createPgliteAdapter() })  →  PGlite (in-process WASM PostgreSQL)
       ↑
  test files use test-helpers.ts which creates PGlite-backed PrismaClient
```

Key design decisions:
- **Single `provider = "postgresql"`** in `schema.prisma` — no dual-provider complexity.
- **Two adapters, one PrismaClient API** — runtime uses `@prisma/adapter-pg`, tests use `prisma-pglite`.
- **Tests are fully isolated** — PGlite creates a fresh in-memory database per test suite, no shared state with the application database.

## Changes by layer

### Schema (`prisma/schema.prisma`)

| Setting | Before | After |
|---------|--------|-------|
| Datasource provider | `sqlite` | `postgresql` |
| Generator provider | `prisma-client-js` | `prisma-client` |
| Generator output | (default) | `../src/generated/prisma` |

The models (Vehicle, VehicleYear, TechnicalSpecs, Job, CronRun) remain structurally unchanged — PostgreSQL native types map cleanly from the existing schema.

### Packages

| Action | Package | Reason |
|--------|---------|--------|
| Add (dep) | `@prisma/adapter-pg` | Official Prisma 7 adapter for PostgreSQL runtime |
| Add (dep) | `@electric-sql/pglite` | PGlite engine for tests |
| Add (dev) | `prisma-pglite` | Prisma-PGlite adapter for test environment |
| Remove | `@prisma/adapter-better-sqlite3` | No longer needed |
| Remove | `better-sqlite3` | No longer needed |

### Import paths

Every file that imports `PrismaClient` or Prisma types changes from `@prisma/client` to the generated output path. Files affected:

- `db/index.ts`
- `db/test-helpers.ts`
- `server.ts`
- `vehicleSearch.repository.ts`
- `favoriteVehicle.repository.ts`
- `scrapeDetails.repository.ts`
- `vehicleDetail.repository.ts`
- `vehicleSearch.test.ts`
- `favoriteVehicle.test.ts`
- `scrapeDetails.test.ts`
- `vehicleDetail.test.ts`

### Runtime DB setup (`db/index.ts`)

Replace the SQLite adapter with the PostgreSQL adapter:

```typescript
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

let db: PrismaClient | null = null

export function getDb(): PrismaClient {
  if (db) return db

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const adapter = new PrismaPg({ connectionString: url })
  db = new PrismaClient({ adapter })
  return db
}
```

### Test helpers (`db/test-helpers.ts`)

Replace the SQLite test helpers with PGlite equivalents:

```typescript
import { PrismaClient } from '../generated/prisma/client'
import { createPgliteAdapter } from 'prisma-pglite'

export async function createTestDb(): Promise<PrismaClient> {
  const adapter = await createPgliteAdapter({
    prismaConfigPath: 'prisma.config.ts',
    resetDatabase: true,
  })
  return new PrismaClient({ adapter })
}

export async function clearTestDb(db: PrismaClient): Promise<void> {
  await db.job.deleteMany()
  await db.technicalSpecs.deleteMany()
  await db.vehicleYear.deleteMany()
  await db.vehicle.deleteMany()
}

export async function closeTestDb(db: PrismaClient | undefined): Promise<void> {
  if (db) {
    await db.$disconnect()
  }
}
```

`clearTestDb` becomes a simple cascade delete — no filesystem cleanup (no `.db` or `.db-journal` files to remove).

### Environment files

**`.env`** (unchanged format, new content):
```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:5432/mycars
REDIS_HOST=

SCRAPING_ALLOWED_DOMAIN=www.fichacompleta.com.br
```

**`.env.test`** (adds PGlite data directory):
```
DATABASE_DIR=.dev/pglite
SCRAPING_ALLOWED_DOMAIN=test-allowed-domain.test
```

### Vitest config (`vitest.config.ts`)

Drop the hardcoded `DATABASE_URL` from the test env — PGlite doesn't use a connection string:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### Prisma config (`prisma.config.ts`)

Update to use `@prisma/adapter-pg` for runtime migrations. The `prisma-pglite` CLI wrapper provides its own adapter for test schema pushes, so it does not appear here:

```typescript
import { defineConfig, env } from '@prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env.DATABASE_URL })
    },
  },
})
```

### CI workflow (`.github/workflows/continuous-integration.yml`)

Simplified — no SQLite file mocking, no migration deploy against a file path. PGlite handles the database in-process during tests:

- **Typecheck job**: Same structure. `prisma generate` no longer needs a DATABASE_URL mock — the `prisma-client` generator reads the schema file directly without connecting to a database.
- **Test job**: `npm ci` → `prisma generate` → `npm test`. PGlite creates an in-memory database per suite — no external PostgreSQL service container needed.
- **Build job**: Same structure as before. `DATABASE_URL` only needed if the build step itself makes database calls (it currently does not).

### Test repositories

All repositories remain unchanged in structure — they still accept `PrismaClient` via constructor DI. No repository methods change. The only difference is the PrismaClient instance passed in is backed by PGlite instead of SQLite, and the queries run against PostgreSQL dialect.

### Test files

Each test file's `beforeAll` / `beforeEach` / `afterAll` hooks stay structurally identical:

```
beforeAll  → createTestDb()    (now async, creates PGlite-backed PrismaClient)
beforeEach → clearTestDb()     (now async, DELETE FROM cascade)
afterAll   → closeTestDb()     (now async, $disconnect only)
```

The test assertions remain identical — Prisma's query API is the same regardless of the underlying adapter.

## Migration sequence

1. Install new packages: `npm i @prisma/adapter-pg @electric-sql/pglite && npm i -D prisma-pglite`
2. Remove old packages: `npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3`
3. Update `schema.prisma`: change provider to `postgresql`, generator to `prisma-client` with output
4. Run `npx prisma generate` to produce the new client
5. Update all imports from `@prisma/client` to the generated path
6. Rewrite `db/index.ts` with `PrismaPg` adapter
7. Rewrite `db/test-helpers.ts` with `createPgliteAdapter`
8. Update `prisma.config.ts`
9. Update `vitest.config.ts` — remove `DATABASE_URL` from env
10. Update `.env.test` — add `DATABASE_DIR`
11. Update CI workflow
12. Run `npx prisma migrate dev --name init` against the PostgreSQL instance to create tables
13. Run lint + tests, verify all pass
14. Update `.gitignore` if needed (remove `*.db` entries if no longer relevant)

## What does NOT change

- Repository method signatures and implementations
- Service layer (already async, no changes needed)
- Route handlers
- Error handling middleware
- Zod validators
- FIPE client
- Queue/worker system
- All type definitions for API responses
- Test assertion logic

## Known limitations

- `prisma-pglite` can only push schemas to new databases. For existing PGlite databases with new migrations, a reset is required. This is fine for tests (each suite creates a fresh DB) but worth noting for any local dev use of PGlite.
- `prisma-pglite` requires the `prisma-client` generator (not `prisma-client-js`), which changes all import paths.
- The `earlyAccess: true` flag in `prisma.config.ts` is required by `prisma-pglite` for migration support.
