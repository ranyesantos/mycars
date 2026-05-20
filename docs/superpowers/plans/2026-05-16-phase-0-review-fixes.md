# Phase 0 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical, important, and minor issues found in the Phase 0 code review.

**Architecture:** Seven sequential tasks. Tasks 1-2 are tightly coupled (same files), running sequentially. Tasks 3, 5, 6, 7 are independent and can run in any order after Task 2.

**Tech Stack:** better-sqlite3, Express, TypeScript, React, vitest

**Skipped:** Task 4 (React Query) per user request.

---

### Task 1: Switch database driver from sql.js to better-sqlite3

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/db/index.ts`
- Modify: `backend/src/db/migrate.ts`

**Context:** CLAUDE.md, README.md, ADR-001, and `docs/IA/standarts/database.md` all specify `better-sqlite3` as the database driver, but `backend/package.json` depends on `sql.js`. better-sqlite3 is synchronous (no async init), writes directly to the file (no manual saveDb), and has a native `db.transaction()` wrapper.

- [ ] **Step 1: Install better-sqlite3 and remove sql.js**

```bash
cd backend && npm uninstall sql.js @types/sql.js && npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

- [ ] **Step 2: Rewrite db/index.ts for better-sqlite3**

```typescript
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'vehicles.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export { DB_PATH }
```

- [ ] **Step 3: Rewrite migrate.ts for better-sqlite3**

```typescript
import { getDb } from './index.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrations(): void {
  const db = getDb()

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    console.log(`[migrate] Ran: ${file}`)
  }

  console.log('[migrate] All migrations applied.')
}

runMigrations()
```

- [ ] **Step 4: Verify server starts and migration works**

```bash
cd backend && rm -f vehicles.db && npm run migrate && timeout 3 npm run dev || true
```

- [ ] **Step 5: Run backend tests**

```bash
cd backend && npm test
```

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/db/index.ts backend/src/db/migrate.ts
git commit -m "fix: switch database driver from sql.js to better-sqlite3"
```

---

### Task 2: Add migration tracking table

**Files:**
- Create: `backend/src/db/migrations/002_migration_tracking.sql`
- Modify: `backend/src/db/migrate.ts`

- [ ] **Step 1: Create migration tracking table migration**

```sql
CREATE TABLE IF NOT EXISTS migrations (
  name       TEXT PRIMARY KEY,
  ran_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Update migrate.ts with tracking logic**

```typescript
import { getDb } from './index.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrations(): void {
  const db = getDb()

  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    name    TEXT PRIMARY KEY,
    ran_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((r: unknown) => (r as { name: string }).name)
  )

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file)
    console.log(`[migrate] Ran: ${file}`)
  }

  console.log('[migrate] All migrations applied.')
}

runMigrations()
```

- [ ] **Step 3: Verify idempotent migration**

```bash
cd backend && npm run migrate && npm run migrate
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/002_migration_tracking.sql backend/src/db/migrate.ts
git commit -m "feat: add migration tracking so each .sql file runs exactly once"
```

---

### Task 3: Fix error handler middleware position

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add route registration comment, error handler stays last**

```typescript
import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler.js'
import { logger } from './shared/utils/logger.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

// Error handler must be last
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
  })
}

export { app }
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "fix: ensure error handler middleware is registered last"
```

---

### Task 5: Create TASKS.md

**Files:**
- Create: `TASKS.md`

- [ ] **Step 1: Create TASKS.md**

```markdown
# Tasks

## Phase 0 — Foundation & Setup

- [x] Initialize monorepo with `/backend` and `/frontend`
- [x] Configure TypeScript in both
- [x] Set up ESLint + Prettier with shared config
- [x] Create `shared/types/` and reference it from both sides
- [x] Write `001_initial.sql` migration and `npm run migrate` script
- [x] Set up Express server with CORS and error handler middleware
- [x] Set up Vite + React with Axios base instance
- [x] Write `CLAUDE.md`
- [x] Write ADR-001 and ADR-002

## Phase 1 — MVP

See `docs/IA/phases/phase-1.md`

## Phase 2 — Queues

See `docs/IA/phases/phase-2.md`

## Phase 3 — Monthly Price Cron

See `docs/IA/phases/phase-3.md`
```

- [ ] **Step 2: Commit**

```bash
git add TASKS.md
git commit -m "docs: add TASKS.md with Phase 0 completion status"
```

---

### Task 6: Rename standards directory to fix typo

**Files:**
- Rename: `docs/IA/standarts/` → `docs/IA/standards/`

- [ ] **Step 1: Rename with git mv**

```bash
cd docs/IA && git mv standarts standards
```

- [ ] **Step 2: Commit**

```bash
git add docs/IA/standards/ docs/IA/standarts/
git commit -m "docs: fix typo in standards directory name"
```

---

### Task 7: Fix test naming to follow convention

**Files:**
- Modify: `backend/src/server.test.ts`

- [ ] **Step 1: Update test name**

Change description from "should return 200 with status ok" to "should return 200 with status ok when the server is running"

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './server.js'

describe('GET /api/health', () => {
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

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.test.ts
git commit -m "test: update healthcheck test name to follow naming convention"
```
