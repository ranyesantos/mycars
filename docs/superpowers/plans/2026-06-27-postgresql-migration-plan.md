# PostgreSQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SQLite with PostgreSQL for runtime and PGlite for automated tests, keeping tests self-contained and fast.

**Architecture:** Two Prisma adapters — `@prisma/adapter-pg` for runtime, `prisma-pglite` (`createPgliteAdapter`) for tests. Single `provider = "postgresql"` schema with `prisma-client` generator. Test helpers swap from SQLite file-based to in-memory PGlite WASM PostgreSQL.

**Tech Stack:** Prisma 7, `@prisma/adapter-pg`, `@electric-sql/pglite`, `prisma-pglite`, Vitest, Express, TypeScript

## Global Constraints

- Provider: `postgresql` (single source of truth in schema.prisma)
- Generator: `prisma-client` with output `../src/generated/prisma`
- All imports from `@prisma/client` change to the generated output path
- Tests use PGlite embedded PostgreSQL — no external PostgreSQL server needed
- `.env` contains `DATABASE_URL` (not visible to agents)
- `better-sqlite3` and `@prisma/adapter-better-sqlite3` are removed
- No `any` in TypeScript, all async functions have explicit return types
- Commit messages must NOT include "Co-authored-by: Claude" trailer

---

### Task 1: Install new packages and remove old ones

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `@prisma/adapter-pg` (runtime dep), `@electric-sql/pglite` (runtime dep), `prisma-pglite` (dev dep) available in node_modules
- Removes: `@prisma/adapter-better-sqlite3`, `better-sqlite3`

- [ ] **Step 1: Install new packages**

```bash
cd backend && npm i @prisma/adapter-pg @electric-sql/pglite && npm i -D prisma-pglite
```

- [ ] **Step 2: Remove old packages**

```bash
cd backend && npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
```

- [ ] **Step 3: Verify package.json reflects changes**

```bash
cd backend && node -e "const p = require('./package.json'); console.log('adapter-pg:', !!p.dependencies['@prisma/adapter-pg']); console.log('pglite:', !!p.dependencies['@electric-sql/pglite']); console.log('prisma-pglite:', !!p.devDependencies['prisma-pglite']); console.log('old sqlite adapter:', !!p.dependencies['@prisma/adapter-better-sqlite3']); console.log('old better-sqlite3:', !!p.dependencies['better-sqlite3'])"
```

Expected output: adapter-pg: true, pglite: true, prisma-pglite: true, old sqlite adapter: false, old better-sqlite3: false

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json && git commit -m "chore: swap sqlite deps for postgres adapter and pglite"
```

---

### Task 2: Update Prisma schema for PostgreSQL

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: Schema with `provider = "postgresql"` and `prisma-client` generator outputting to `../src/generated/prisma`
- No model changes — Vehicle, VehicleYear, TechnicalSpecs, Job, CronRun stay identical

- [ ] **Step 1: Update datasource and generator blocks**

Replace the first 7 lines of `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

The rest of the file (models) stays exactly the same.

- [ ] **Step 2: Run prisma generate**

```bash
cd backend && npx prisma generate
```

Expected: Generates client into `backend/src/generated/prisma/`. Verify the directory exists:

```bash
ls backend/src/generated/prisma/
```

- [ ] **Step 3: Add generated directory to .gitignore**

Add to `backend/.gitignore` (create the file if it doesn't exist):

```
generated/
```

```bash
echo "generated/" >> backend/.gitignore
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/.gitignore backend/src/generated/ && git commit -m "feat: switch prisma schema to postgresql provider with prisma-client generator"
```

---

### Task 3: Update prisma.config.ts for PostgreSQL adapter

**Files:**
- Modify: `backend/prisma.config.ts`

**Interfaces:**
- Consumes: `@prisma/adapter-pg` (from Task 1)
- Produces: Prisma config with `earlyAccess: true`, PostgreSQL adapter for migrations

- [ ] **Step 1: Rewrite prisma.config.ts**

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

- [ ] **Step 2: Verify the config is valid**

```bash
cd backend && npx prisma validate --config=prisma.config.ts
```

Expected: "The datasource is valid" or no error output.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma.config.ts && git commit -m "feat: update prisma config with postgresql adapter and earlyAccess"
```

---

### Task 4: Rewrite runtime DB singleton (db/index.ts)

**Files:**
- Modify: `backend/src/db/index.ts`

**Interfaces:**
- Consumes: `@prisma/adapter-pg` (from Task 1), generated client path (from Task 2)
- Produces: `getDb(): PrismaClient` — lazily-created singleton with PrismaPg adapter

- [ ] **Step 1: Rewrite db/index.ts**

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

- [ ] **Step 2: Verify TypeScript compiles for this file**

```bash
cd backend && npx tsc --noEmit src/db/index.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/index.ts && git commit -m "feat: replace sqlite adapter with PrismaPg in db singleton"
```

---

### Task 5: Rewrite test helpers for PGlite (db/test-helpers.ts)

**Files:**
- Modify: `backend/src/db/test-helpers.ts`

**Interfaces:**
- Consumes: `prisma-pglite` (from Task 1), generated client path (from Task 2)
- Produces: `createTestDb(): Promise<PrismaClient>`, `clearTestDb(db): Promise<void>`, `closeTestDb(db): Promise<void>`
- Behavior: `createTestDb` creates a fresh PGlite-backed PrismaClient with schema pushed. `clearTestDb` deletes all rows (cascade order). `closeTestDb` disconnects — no filesystem cleanup needed.

- [ ] **Step 1: Rewrite test-helpers.ts**

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

- [ ] **Step 2: Verify TypeScript compiles for this file**

```bash
cd backend && npx tsc --noEmit src/db/test-helpers.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/test-helpers.ts && git commit -m "feat: rewrite test helpers to use pglite adapter"
```

---

### Task 6: Update vitest config and test environment

**Files:**
- Modify: `backend/vitest.config.ts`
- Modify: `backend/vitest.setup.ts`
- Modify: `backend/.env.test`

**Interfaces:**
- Produces: Vitest config without hardcoded DATABASE_URL, .env.test with DATABASE_DIR for PGlite

- [ ] **Step 1: Update vitest.config.ts**

Remove the `env` block containing `DATABASE_URL`:

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

- [ ] **Step 2: Verify vitest.setup.ts is correct (already loads .env.test)**

The current content is:
```typescript
import { config } from 'dotenv'

config({ path: '.env.test', override: true, quiet: true })
```

This is correct — no changes needed. It loads `.env.test` which provides `DATABASE_DIR` for PGlite.

- [ ] **Step 3: Update .env.test**

```
DATABASE_DIR=.dev/pglite
SCRAPING_ALLOWED_DOMAIN=test-allowed-domain.test
```

- [ ] **Step 4: Commit**

```bash
git add backend/vitest.config.ts backend/.env.test && git commit -m "chore: update vitest config for pglite, add DATABASE_DIR to test env"
```

---

### Task 7: Refactor server.ts to support dependency injection for tests

**Files:**
- Modify: `backend/src/server.ts`

**Interfaces:**
- Produces: `createApp(db: PrismaClient): express.Express` factory function
- Reason: The old `server.ts` called `getDb()` at module load, which fails in test mode because there's no PostgreSQL server. The factory pattern lets tests provide a PGlite-backed PrismaClient. Production code continues to work via the module-level `createApp(getDb())` bootstrap that only runs when `NODE_ENV !== 'test'`.
- Critical: The `app` export is removed — `server.test.ts` uses `createApp(db)` directly. This ensures module-level code never calls `getDb()` in test mode.

- [ ] **Step 1: Rewrite server.ts with createApp factory**

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import type { PrismaClient } from './generated/prisma/client'
import { errorHandler } from './shared/middleware/errorHandler'
import { logger } from './shared/utils/logger'
import { FipeClient } from './shared/services/fipe/index'
import { VehicleSearchRepository } from './features/vehicle-search/vehicleSearch.repository'
import { VehicleSearchService } from './features/vehicle-search/vehicleSearch.service'
import { createVehicleSearchRoutes } from './features/vehicle-search/index'
import { FavoriteVehicleRepository } from './features/favorite-vehicle/favoriteVehicle.repository'
import { createFavoriteVehicleRoutes } from './features/favorite-vehicle/index'
import { ScrapeDetailsRepository } from './features/scrape-details/index'
import { ScrapeDetailsService } from './features/scrape-details/index'
import { createScrapeDetailsRoutes } from './features/scrape-details/index'
import { getScrapingQueue } from './shared/queue/scrapingQueue'
import { VehicleDetailRepository } from './features/vehicle-detail/index'
import { createVehicleDetailRoutes } from './features/vehicle-detail/index'
import { getDb } from './db/index'

export function createApp(db: PrismaClient): express.Express {
  const app = express()

  app.use(cors({ origin: 'http://localhost:5173' }))
  app.use(express.json())

  // Dependencies — manual DI (composition root)
  const fipeClient = new FipeClient('https://fipe.parallelum.com.br/api/v2')
  const vehicleSearchRepo = new VehicleSearchRepository(db)
  const vehicleSearchService = new VehicleSearchService(fipeClient, vehicleSearchRepo)
  const favoriteVehicleRepo = new FavoriteVehicleRepository(db)
  const scrapeDetailsRepo = new ScrapeDetailsRepository(db)
  const scrapingQueue = getScrapingQueue()
  const scrapeDetailsService = new ScrapeDetailsService(scrapeDetailsRepo, scrapingQueue)
  const vehicleDetailRepo = new VehicleDetailRepository(db)

  // Routes — register before errorHandler
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } })
  })
  app.use(createVehicleSearchRoutes(vehicleSearchService))
  app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
  app.use(createScrapeDetailsRoutes(scrapeDetailsService))
  app.use(createVehicleDetailRoutes(vehicleDetailRepo))

  // Error handler must be last
  app.use(errorHandler)

  return app
}

// Production bootstrap — only runs outside test mode
// In tests, server.test.ts calls createApp(db) with a PGlite-backed client
console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV !== 'test') {
  const app = createApp(getDb())
  app.listen(3001, () => {
    logger.info('Server running on http://localhost:3001')
  })
}
```

Key changes from the original:
1. The app setup is wrapped in `createApp(db: PrismaClient)` factory
2. `db` is required (not optional) — tests always pass their PGlite client
3. `import type { PrismaClient }` from generated path instead of `@prisma/client`
4. Production bootstrap is guarded by `NODE_ENV !== 'test'`, so `getDb()` is never called in tests
5. The `app` export is removed — `server.test.ts` imports `createApp` only

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors. If there are errors in other files (unrelated to server.ts), those are expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts && git commit -m "feat: refactor server to createApp factory supporting DI for tests"
```

---

### Task 8: Update all repository import paths

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.repository.ts:1`
- Modify: `backend/src/features/favorite-vehicle/favoriteVehicle.repository.ts:1`
- Modify: `backend/src/features/favorite-vehicle/favoriteVehicle.types.ts:1`
- Modify: `backend/src/features/scrape-details/scrapeDetails.repository.ts:1`
- Modify: `backend/src/features/vehicle-detail/vehicleDetail.repository.ts:1`

**Interfaces:**
- Each file changes its Prisma import from `@prisma/client` to the generated path
- File locations relative to `src/generated/prisma/client`:
  - From `src/features/vehicle-search/` → `../../generated/prisma/client`
  - From `src/features/favorite-vehicle/` → `../../generated/prisma/client`
  - From `src/features/scrape-details/` → `../../generated/prisma/client`
  - From `src/features/vehicle-detail/` → `../../generated/prisma/client`

- [ ] **Step 1: Update vehicleSearch.repository.ts import**

Change line 1 from:
```typescript
import type { Prisma, PrismaClient, Vehicle, VehicleYear } from '@prisma/client'
```
To:
```typescript
import type { Prisma, PrismaClient, Vehicle, VehicleYear } from '../../generated/prisma/client'
```

- [ ] **Step 2: Update favoriteVehicle.repository.ts import**

Change line 1 from:
```typescript
import type { PrismaClient, Vehicle } from '@prisma/client'
```
To:
```typescript
import type { PrismaClient, Vehicle } from '../../generated/prisma/client'
```

- [ ] **Step 3: Update favoriteVehicle.types.ts import**

Change line 1 from:
```typescript
import type { Vehicle } from '@prisma/client'
```
To:
```typescript
import type { Vehicle } from '../../generated/prisma/client'
```

- [ ] **Step 4: Update scrapeDetails.repository.ts import**

Change line 1 from:
```typescript
import type { PrismaClient } from '@prisma/client'
```
To:
```typescript
import type { PrismaClient } from '../../generated/prisma/client'
```

- [ ] **Step 5: Update vehicleDetail.repository.ts import**

Change line 1 from:
```typescript
import type { PrismaClient, TechnicalSpecs } from '@prisma/client'
```
To:
```typescript
import type { PrismaClient, TechnicalSpecs } from '../../generated/prisma/client'
```

- [ ] **Step 6: Verify TypeScript compiles for all repository files**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors in the modified repository files.

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/vehicle-search/vehicleSearch.repository.ts backend/src/features/favorite-vehicle/favoriteVehicle.repository.ts backend/src/features/favorite-vehicle/favoriteVehicle.types.ts backend/src/features/scrape-details/scrapeDetails.repository.ts backend/src/features/vehicle-detail/vehicleDetail.repository.ts && git commit -m "feat: update repository imports to generated prisma client path"
```

---

### Task 9: Update all test file import paths

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.test.ts`
- Modify: `backend/src/features/favorite-vehicle/favoriteVehicle.test.ts`
- Modify: `backend/src/features/scrape-details/scrapeDetails.test.ts`
- Modify: `backend/src/features/vehicle-detail/vehicleDetail.test.ts`
- Modify: `backend/src/server.test.ts`

**Interfaces:**
- Each test file changes its Prisma type import from `@prisma/client` to the generated path
- Test files in `src/features/<slice>/` use relative path `../../generated/prisma/client`
- Test files must also make `createTestDb` calls `await` (it's now async), and `beforeAll` becomes async

- [ ] **Step 1: Update vehicleSearch.test.ts**

Two changes:
- Line 2: Change import from `import type { PrismaClient } from '@prisma/client'` to `import type { PrismaClient } from '../../generated/prisma/client'`
- Line 31-32: Change `beforeAll(() => { db = createTestDb() })` to `beforeAll(async () => { db = await createTestDb() })`
- Line 172: Same pattern — `beforeAll(async () => { db = await createTestDb() })`

- [ ] **Step 2: Update favoriteVehicle.test.ts**

Two changes:
- Line 2: Change import from `import type { PrismaClient } from '@prisma/client'` to `import type { PrismaClient } from '../../generated/prisma/client'`
- Line 17-18: Change `beforeAll(() => { db = createTestDb() })` to `beforeAll(async () => { db = await createTestDb() })`

- [ ] **Step 3: Update scrapeDetails.test.ts**

Two changes:
- Line 2: Change import from `import type { PrismaClient } from '@prisma/client'` to `import type { PrismaClient } from '../../generated/prisma/client'`
- Line 27-28: Change `beforeAll(() => { db = createTestDb() })` to `beforeAll(async () => { db = await createTestDb() })`

- [ ] **Step 4: Update vehicleDetail.test.ts**

Two changes:
- Line 2: Change import from `import type { PrismaClient } from '@prisma/client'` to `import type { PrismaClient } from '../../generated/prisma/client'`
- Line 15-16: Change `beforeAll(() => { db = createTestDb() })` to `beforeAll(async () => { db = await createTestDb() })`

- [ ] **Step 5: Update server.test.ts**

The server.test.ts imports `app` from `server.ts`. Since `server.ts` now exports `createApp`, the test should use PGlite:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { PrismaClient } from './generated/prisma/client'
import { createApp } from './server'
import { createTestDb, closeTestDb } from './db/test-helpers'

describe('GET /api/health', () => {
  let db: PrismaClient
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    db = await createTestDb()
    app = createApp(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  it('should return 200 with status ok when the server is running', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })
})
```

- [ ] **Step 6: Run tests to verify all test files compile and pass**

```bash
cd backend && npx vitest run
```

Expected: All tests pass. If any fail, fix and re-run before committing.

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/vehicle-search/vehicleSearch.test.ts backend/src/features/favorite-vehicle/favoriteVehicle.test.ts backend/src/features/scrape-details/scrapeDetails.test.ts backend/src/features/vehicle-detail/vehicleDetail.test.ts backend/src/server.test.ts && git commit -m "feat: update test imports and async beforeAll for pglite"
```

---

### Task 10: Update CI workflow

**Files:**
- Modify: `.github/workflows/continuous-integration.yml`

**Interfaces:**
- Removes: SQLite file mock `DATABASE_URL: "file:../test.db"`
- Simplifies: `prisma generate` no longer needs a DATABASE_URL mock — the `prisma-client` generator reads the schema file directly
- Test job: drops `prisma migrate deploy` step (PGlite handles schema via `createPgliteAdapter` in-process)

- [ ] **Step 1: Update CI workflow**

Remove the `DATABASE_URL: "file:../test.db"` env vars from typecheck and test-backend jobs. Remove the `prisma migrate deploy` step from test-backend:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

env:
  NODE_VERSION: 22.x

jobs:

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Generate Prisma client
        run: cd backend && npx prisma generate

      - name: Type check backend
        run: cd backend && npx tsc --noEmit

      - name: Type check frontend
        run: cd frontend && npx tsc --noEmit

  test-backend:
    name: Test (Backend)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Generate Prisma client
        run: cd backend && npx prisma generate

      - name: Run tests
        run: cd backend && npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [typecheck, test-backend]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Generate Prisma client
        run: cd backend && npx prisma generate

      - name: Build backend
        run: cd backend && npm run build

      - name: Build frontend
        run: cd frontend && npm run build
```

Key changes:
- Removed `env: DATABASE_URL: "file:../test.db"` from typecheck's `Generate Prisma client` step
- Removed `env: DATABASE_URL: "file:../test.db"` from test-backend's `Generate Prisma client` step
- Removed the `Run migrations` step from test-backend (PGlite handles schema internally)
- Removed `env: DATABASE_URL: "file:../test.db"` from build's `Generate Prisma client` step

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/continuous-integration.yml && git commit -m "ci: remove sqlite file mocks, simplify for postgresql + pglite"
```

---

### Task 11: Run full verification

**Files:** None (verification only)

**Interfaces:** None

- [ ] **Step 1: Run TypeScript type check**

```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors across all files.

- [ ] **Step 2: Run all tests**

```bash
cd backend && npx vitest run
```

Expected: All tests pass with PGlite in-memory database.

- [ ] **Step 3: Run lint**

```bash
cd backend && npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors (frontend is unchanged).

- [ ] **Step 5: Verify no remaining references to old packages**

```bash
cd backend && grep -r "better-sqlite3" src/ || echo "No better-sqlite3 references found"
cd backend && grep -r "from '@prisma/client'" src/ || echo "No @prisma/client imports found"
```

Expected: No references to `better-sqlite3` or `@prisma/client` imports in src/.

- [ ] **Step 6: Commit verification result**

```bash
git add -A && git diff --cached --stat && git commit -m "chore: final verification — all tests pass with postgresql + pglite"
```
