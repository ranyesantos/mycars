# FIPE Progressive Caching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two backend endpoints that search the FIPE API with progressive caching — years list on first call, per-year detail on second call — so no FIPE API response is ever fetched twice.

**Architecture:** Vertical slice under `features/vehicle-search/` with route, service, repository, types. A shared `FipeClient` class wraps the external HTTP calls and is injected into the service via constructor DI, making tests mockable. Repository uses better-sqlite3 and is also constructor-injected.

**Tech Stack:** Express 4, TypeScript 5.7, better-sqlite3, vitest, supertest, Node built-in fetch

---

## File Structure

```
backend/src/
├── shared/services/fipe/
│   ├── fipe.types.ts          # FIPE API response shapes
│   ├── fipe.client.ts         # HTTP wrapper for FIPE API (fetch)
│   └── fipe.client.test.ts    # Unit tests (mocked fetch)
├── features/vehicle-search/
│   ├── vehicleSearch.types.ts         # Vehicle + VehicleYear types
│   ├── vehicleSearch.repository.ts    # DB queries
│   ├── vehicleSearch.service.ts       # Business logic (cache-or-fetch)
│   ├── vehicleSearch.routes.ts        # Express router (factory)
│   └── vehicleSearch.test.ts          # Tests (repo + service + route)
├── db/migrations/
│   ├── 001_initial.sql                # (existing)
│   └── 002_add_fipe_details.sql       # NEW: 4 columns on vehicle_years
└── server.ts                          # MODIFIED: register new routes
```

**DI wiring:** `server.ts` creates a real `FipeClient`, `VehicleSearchRepository` from `getDb()`, and `VehicleSearchService`, then passes them to the route factory. Tests create in-memory SQLite databases and mock FipeClient.

---

### Task 1: Create migration 002

**Files:**
- Create: `backend/src/db/migrations/002_add_fipe_details.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
ALTER TABLE vehicle_years ADD COLUMN fuel TEXT;
ALTER TABLE vehicle_years ADD COLUMN reference_month TEXT;
ALTER TABLE vehicle_years ADD COLUMN fuel_acronym TEXT;
ALTER TABLE vehicle_years ADD COLUMN fetched_at DATETIME;
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && npm run migrate
```
Expected: `[migrate] Ran: 002_add_fipe_details.sql` followed by `[migrate] All migrations applied.`

- [ ] **Step 3: Verify columns exist**

```bash
cd backend && npx tsx -e "
import { getDb } from './src/db/index.js'
const db = getDb()
const cols = db.prepare('PRAGMA table_info(vehicle_years)').all()
console.log(cols.map((c: any) => c.name))
"
```
Expected output includes: `fuel`, `reference_month`, `fuel_acronym`, `fetched_at`

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/002_add_fipe_details.sql
git commit -m "feat: add FIPE detail columns to vehicle_years table"
```

---

### Task 2: Create FIPE client types

**Files:**
- Create: `backend/src/shared/services/fipe/fipe.types.ts`

- [ ] **Step 1: Write the types file**

```typescript
export interface FipeYear {
  code: string
  name: string
}

export interface FipeYearDetail {
  vehicleType: number
  price: string
  brand: string
  model: string
  modelYear: number
  fuel: string
  codeFipe: string
  referenceMonth: string
  fuelAcronym: string
}
```

These match exactly the JSON shapes returned by `https://fipe.parallelum.com.br/api/v2/:type/:fipeCode/years` (array of `{ code, name }`) and `.../years/:yearCode` (the single-object shape from `response.json`).

- [ ] **Step 2: Commit**

```bash
git add backend/src/shared/services/fipe/fipe.types.ts
git commit -m "feat: add FIPE API response types"
```

---

### Task 3: Create FIPE client

**Files:**
- Create: `backend/src/shared/services/fipe/fipe.client.ts`
- Create: `backend/src/shared/services/fipe/fipe.client.test.ts`
- Create: `backend/src/shared/services/fipe/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FipeClient } from './fipe.client.js'
import type { FipeYear, FipeYearDetail } from './fipe.types.js'

function mockFetch(response: unknown, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(response),
  })
}

describe('FipeClient', () => {
  let client: FipeClient
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    client = new FipeClient('https://fipe.parallelum.com.br/api/v2')
    fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof global.fetch
  })

  describe('fetchYears', () => {
    it('should return parsed years array on success', async () => {
      const mockYears: FipeYear[] = [
        { code: '2012-1', name: '2012 Gasolina' },
        { code: '2013-1', name: '2013 Gasolina' },
      ]
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockYears),
      })

      const result = await client.fetchYears('cars', '005490-9')

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://fipe.parallelum.com.br/api/v2/cars/005490-9/years',
      )
      expect(result).toEqual(mockYears)
    })

    it('should return empty array when FIPE code does not exist (404)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      })

      const result = await client.fetchYears('cars', '000000-0')

      expect(result).toEqual([])
    })

    it('should throw on unexpected HTTP errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({}),
      })

      await expect(client.fetchYears('cars', '005490-9')).rejects.toThrow(
        'FIPE API error: 500 Internal Server Error',
      )
    })

    it('should throw on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(client.fetchYears('cars', '005490-9')).rejects.toThrow(
        'FIPE API request failed: ECONNREFUSED',
      )
    })
  })

  describe('fetchYearDetail', () => {
    it('should return parsed year detail on success', async () => {
      const mockDetail: FipeYearDetail = {
        vehicleType: 1,
        price: 'R$ 55.119,00',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        modelYear: 2023,
        fuel: 'Flex',
        codeFipe: '005490-9',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      }
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockDetail),
      })

      const result = await client.fetchYearDetail('cars', '005490-9', '2023-5')

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://fipe.parallelum.com.br/api/v2/cars/005490-9/years/2023-5',
      )
      expect(result).toEqual(mockDetail)
    })

    it('should return null when year not found (404)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      })

      const result = await client.fetchYearDetail('cars', '005490-9', '9999-9')

      expect(result).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/shared/services/fipe/fipe.client.test.ts
```
Expected: FAIL — `FipeClient is not a constructor` or similar

- [ ] **Step 3: Write the FipeClient implementation**

```typescript
import type { FipeYear, FipeYearDetail } from './fipe.types.js'

export class FipeClient {
  constructor(private readonly baseUrl: string) {}

  async fetchYears(type: string, fipeCode: string): Promise<FipeYear[]> {
    const url = `${this.baseUrl}/${type}/${fipeCode}/years`
    const response = await this.request(url)

    if (response.status === 404) {
      return []
    }

    return (await response.json()) as FipeYear[]
  }

  async fetchYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<FipeYearDetail | null> {
    const url = `${this.baseUrl}/${type}/${fipeCode}/years/${yearCode}`
    const response = await this.request(url)

    if (response.status === 404) {
      return null
    }

    return (await response.json()) as FipeYearDetail
  }

  private async request(url: string): Promise<Response> {
    let response: Response

    try {
      response = await fetch(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`FIPE API request failed: ${message}`)
    }

    if (!response.ok && response.status !== 404) {
      throw new Error(`FIPE API error: ${response.status} ${response.statusText}`)
    }

    return response
  }
}
```

- [ ] **Step 4: Write the index.ts barrel export**

```typescript
export { FipeClient } from './fipe.client.js'
export type { FipeYear, FipeYearDetail } from './fipe.types.js'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx vitest run src/shared/services/fipe/fipe.client.test.ts
```
Expected: all 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/shared/services/fipe/
git commit -m "feat: add FipeClient for FIPE API HTTP calls with DI support"
```

---

### Task 4: Create vehicle search types

**Files:**
- Create: `backend/src/features/vehicle-search/vehicleSearch.types.ts`

- [ ] **Step 1: Write the types file**

```typescript
export interface Vehicle {
  id: number
  fipe_code: string
  vehicle_type: 'cars' | 'trucks' | 'motorcycles'
  brand: string | null
  model: string | null
  favorited: number
  fetched_at: string
  updated_at: string
}

export interface VehicleYear {
  id: number
  vehicle_id: number
  year_code: string
  year_label: string
  price: string | null
  fuel: string | null
  reference_month: string | null
  fuel_acronym: string | null
  fetched_at: string | null
  price_updated_at: string | null
}

export interface VehicleWithYears extends Vehicle {
  years: Pick<VehicleYear, 'year_code' | 'year_label' | 'price' | 'fetched_at'>[]
}

export interface YearDetailResponse {
  vehicleId: number
  fipeCode: string
  vehicleType: string
  yearCode: string
  yearLabel: string
  brand: string | null
  model: string | null
  price: string
  fuel: string
  referenceMonth: string
  fuelAcronym: string
  source: 'cache' | 'api'
}

export interface SearchResponse {
  fipeCode: string
  vehicleType: string
  brand: string | null
  model: string | null
  years: { code: string; name: string }[]
  source: 'cache' | 'api'
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/features/vehicle-search/vehicleSearch.types.ts
git commit -m "feat: add vehicle search types"
```

---

### Task 5: Create vehicle search repository

**Files:**
- Create: `backend/src/features/vehicle-search/vehicleSearch.repository.ts`

- [ ] **Step 1: Write the failing test in the test file**

Create `backend/src/features/vehicle-search/vehicleSearch.test.ts`. This file will grow across tasks 5, 6, and 7 — all imports are included now so later tasks only append describe blocks:

```typescript
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import request from 'supertest'
import { VehicleSearchRepository } from './vehicleSearch.repository.js'
import { VehicleSearchService } from './vehicleSearch.service.js'
import { createVehicleSearchRoutes } from './vehicleSearch.routes.js'
import { FipeClient } from '../shared/services/fipe/fipe.client.js'
import type { FipeYear, FipeYearDetail } from '../shared/services/fipe/fipe.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrationsOn(db: Database.Database): void {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  db.exec(
    `CREATE TABLE IF NOT EXISTS migrations (
      name    TEXT PRIMARY KEY,
      ran_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run(file)
  }
}

describe('VehicleSearchRepository', () => {
  let db: Database.Database
  let repo: VehicleSearchRepository

  beforeAll(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrationsOn(db)
  })

  beforeEach(() => {
    repo = new VehicleSearchRepository(db)
    db.exec('DELETE FROM vehicle_years')
    db.exec('DELETE FROM vehicles')
  })

  afterAll(() => {
    db.close()
  })

  describe('findByFipeCode', () => {
    it('should return null when vehicle does not exist', () => {
      const result = repo.findByFipeCode('005490-9')
      expect(result).toBeNull()
    })

    it('should return vehicle when it exists', () => {
      const id = repo.createVehicle('005490-9', 'cars')
      const result = repo.findByFipeCode('005490-9')
      expect(result).not.toBeNull()
      expect(result!.id).toBe(id)
      expect(result!.fipe_code).toBe('005490-9')
      expect(result!.vehicle_type).toBe('cars')
    })
  })

  describe('createVehicle', () => {
    it('should insert a new vehicle and return its id', () => {
      const id = repo.createVehicle('005490-9', 'cars')
      expect(typeof id).toBe('number')
      expect(id).toBeGreaterThan(0)

      const vehicle = repo.findByFipeCode('005490-9')
      expect(vehicle!.brand).toBeNull()
      expect(vehicle!.model).toBeNull()
      expect(vehicle!.favorited).toBe(0)
    })

    it('should throw on duplicate FIPE code', () => {
      repo.createVehicle('005490-9', 'cars')
      expect(() => repo.createVehicle('005490-9', 'trucks')).toThrow()
    })
  })

  describe('createYears', () => {
    it('should insert year rows for a vehicle', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      const years = [
        { code: '2012-1', name: '2012 Gasolina' },
        { code: '2013-1', name: '2013 Gasolina' },
      ]
      repo.createYears(vehicleId, years)

      const result = repo.findYearsByVehicleId(vehicleId)
      expect(result).toHaveLength(2)
      expect(result[0].year_code).toBe('2012-1')
      expect(result[0].price).toBeNull()
      expect(result[0].fetched_at).toBeNull()
    })
  })

  describe('findYearsByVehicleId', () => {
    it('should return empty array when vehicle has no years', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      const result = repo.findYearsByVehicleId(vehicleId)
      expect(result).toEqual([])
    })
  })

  describe('findVehicleWithYears', () => {
    it('should return vehicle with years joined', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

      const result = repo.findVehicleWithYears('005490-9')
      expect(result).not.toBeNull()
      expect(result!.years).toHaveLength(1)
      expect(result!.years[0].year_code).toBe('2012-1')
    })
  })

  describe('findYearByCode', () => {
    it('should return null when year does not exist', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      const result = repo.findYearByCode(vehicleId, '2012-1')
      expect(result).toBeNull()
    })

    it('should return year row when it exists', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

      const result = repo.findYearByCode(vehicleId, '2012-1')
      expect(result).not.toBeNull()
      expect(result!.year_code).toBe('2012-1')
    })
  })

  describe('updateYearDetail', () => {
    it('should update price, fuel, and timestamp fields', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = repo.findYearsByVehicleId(vehicleId)
      const yearId = years[0].id

      repo.updateYearDetail(yearId, {
        price: 'R$ 55.119,00',
        fuel: 'Flex',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const updated = repo.findYearByCode(vehicleId, '2023-5')
      expect(updated!.price).toBe('R$ 55.119,00')
      expect(updated!.fuel).toBe('Flex')
      expect(updated!.reference_month).toBe('maio de 2026')
      expect(updated!.fuel_acronym).toBe('F')
      expect(updated!.fetched_at).not.toBeNull()
    })
  })

  describe('updateVehicleBrandModel', () => {
    it('should set brand and model on a vehicle', () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.updateVehicleBrandModel(vehicleId, 'VW - VolksWagen', 'Gol 1.0 Flex 12V 5p')

      const vehicle = repo.findByFipeCode('005490-9')
      expect(vehicle!.brand).toBe('VW - VolksWagen')
      expect(vehicle!.model).toBe('Gol 1.0 Flex 12V 5p')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: FAIL — `VehicleSearchRepository is not a constructor`

- [ ] **Step 3: Write the repository implementation**

```typescript
import type Database from 'better-sqlite3'
import type { Vehicle, VehicleYear, VehicleWithYears } from './vehicleSearch.types.js'

export class VehicleSearchRepository {
  constructor(private readonly db: Database.Database) {}

  findByFipeCode(fipeCode: string): Vehicle | null {
    return (
      (this.db
        .prepare('SELECT * FROM vehicles WHERE fipe_code = ?')
        .get(fipeCode) as Vehicle) ?? null
    )
  }

  createVehicle(fipeCode: string, vehicleType: string): number {
    const result = this.db
      .prepare('INSERT INTO vehicles (fipe_code, vehicle_type) VALUES (?, ?)')
      .run(fipeCode, vehicleType)
    return Number(result.lastInsertRowid)
  }

  createYears(
    vehicleId: number,
    years: { code: string; name: string }[],
  ): void {
    const stmt = this.db.prepare(
      'INSERT INTO vehicle_years (vehicle_id, year_code, year_label) VALUES (?, ?, ?)',
    )

    const insert = this.db.transaction(
      (rows: { code: string; name: string }[]) => {
        for (const row of rows) {
          stmt.run(vehicleId, row.code, row.name)
        }
      },
    )

    insert(years)
  }

  findYearsByVehicleId(vehicleId: number): VehicleYear[] {
    return this.db
      .prepare('SELECT * FROM vehicle_years WHERE vehicle_id = ?')
      .all(vehicleId) as VehicleYear[]
  }

  findVehicleWithYears(fipeCode: string): VehicleWithYears | null {
    const vehicle = this.findByFipeCode(fipeCode)
    if (!vehicle) return null

    const years = this.db
      .prepare(
        `SELECT year_code, year_label, price, fetched_at
         FROM vehicle_years WHERE vehicle_id = ?
         ORDER BY year_code`,
      )
      .all(vehicle.id) as VehicleWithYears['years']

    return { ...vehicle, years }
  }

  findYearByCode(vehicleId: number, yearCode: string): VehicleYear | null {
    return (
      (this.db
        .prepare('SELECT * FROM vehicle_years WHERE vehicle_id = ? AND year_code = ?')
        .get(vehicleId, yearCode) as VehicleYear) ?? null
    )
  }

  updateYearDetail(
    yearId: number,
    data: {
      price: string
      fuel: string
      referenceMonth: string
      fuelAcronym: string
    },
  ): void {
    this.db
      .prepare(
        `UPDATE vehicle_years
         SET price = ?, fuel = ?, reference_month = ?, fuel_acronym = ?, fetched_at = datetime('now')
         WHERE id = ?`,
      )
      .run(data.price, data.fuel, data.referenceMonth, data.fuelAcronym, yearId)
  }

  updateVehicleBrandModel(
    vehicleId: number,
    brand: string,
    model: string,
  ): void {
    this.db
      .prepare('UPDATE vehicles SET brand = ?, model = ? WHERE id = ?')
      .run(brand, model, vehicleId)
  }
}
```

- [ ] **Step 4: Run repository tests to verify they pass**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: all 8 repository tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/vehicle-search/
git commit -m "feat: add VehicleSearchRepository with in-memory test support"
```

---

### Task 6: Create vehicle search service

**Files:**
- Create: `backend/src/features/vehicle-search/vehicleSearch.service.ts`
- Modify: `backend/src/features/vehicle-search/vehicleSearch.test.ts` (append service tests)

- [ ] **Step 1: Append service tests to the test file**

All imports were already added in Task 5. Append the mock factory and describe block after the repository `describe` block, before the closing of the file:

```typescript
function createMockFipeClient(overrides?: Partial<FipeClient>): FipeClient {
  return {
    fetchYears: vi.fn().mockResolvedValue([]),
    fetchYearDetail: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as FipeClient
}

describe('VehicleSearchService', () => {
  let db: Database.Database
  let repo: VehicleSearchRepository
  let fipeClient: FipeClient
  let service: VehicleSearchService

  beforeAll(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrationsOn(db)
  })

  beforeEach(() => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    service = new VehicleSearchService(fipeClient, repo)
    db.exec('DELETE FROM vehicle_years')
    db.exec('DELETE FROM vehicles')
  })

  afterAll(() => {
    db.close()
  })

  describe('searchByFipeCode', () => {
    it('should return cached vehicle when already in DB', async () => {
      repo.createVehicle('005490-9', 'cars')
      repo.createYears(1, [{ code: '2012-1', name: '2012 Gasolina' }])

      const result = await service.searchByFipeCode('cars', '005490-9')

      expect(result.source).toBe('cache')
      expect(result.fipeCode).toBe('005490-9')
      expect(result.years).toHaveLength(1)
      expect(fipeClient.fetchYears).not.toHaveBeenCalled()
    })

    it('should fetch from API when vehicle not in DB', async () => {
      const mockYears: FipeYear[] = [
        { code: '2012-1', name: '2012 Gasolina' },
        { code: '2013-1', name: '2013 Gasolina' },
      ]
      fipeClient.fetchYears = vi.fn().mockResolvedValue(mockYears)

      const result = await service.searchByFipeCode('cars', '005490-9')

      expect(result.source).toBe('api')
      expect(result.years).toHaveLength(2)
      expect(fipeClient.fetchYears).toHaveBeenCalledWith('cars', '005490-9')

      // Should be cached now
      const vehicle = repo.findByFipeCode('005490-9')
      expect(vehicle).not.toBeNull()
    })

    it('should throw 404 when FIPE code does not exist', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([])

      await expect(
        service.searchByFipeCode('cars', '000000-0'),
      ).rejects.toMatchObject({
        code: 'FIPE_CODE_NOT_FOUND',
        statusCode: 404,
      })
    })
  })

  describe('getYearDetail', () => {
    it('should return cached year detail when fetched_at is set', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = repo.findYearsByVehicleId(vehicleId)
      repo.updateYearDetail(years[0].id, {
        price: 'R$ 55.119,00',
        fuel: 'Flex',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const result = await service.getYearDetail('cars', '005490-9', '2023-5')

      expect(result.source).toBe('cache')
      expect(result.price).toBe('R$ 55.119,00')
      expect(fipeClient.fetchYearDetail).not.toHaveBeenCalled()
    })

    it('should fetch from API when year not cached', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])

      const mockDetail: FipeYearDetail = {
        vehicleType: 1,
        price: 'R$ 55.119,00',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        modelYear: 2023,
        fuel: 'Flex',
        codeFipe: '005490-9',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      }
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue(mockDetail)

      const result = await service.getYearDetail('cars', '005490-9', '2023-5')

      expect(result.source).toBe('api')
      expect(result.price).toBe('R$ 55.119,00')
      expect(result.brand).toBe('VW - VolksWagen')

      // Should have updated vehicle brand/model
      const vehicle = repo.findByFipeCode('005490-9')
      expect(vehicle!.brand).toBe('VW - VolksWagen')
      expect(vehicle!.model).toBe('Gol 1.0 Flex 12V 5p')
    })

    it('should throw 404 when vehicle does not exist', async () => {
      await expect(
        service.getYearDetail('cars', '005490-9', '2023-5'),
      ).rejects.toMatchObject({
        code: 'VEHICLE_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when year code not in DB', async () => {
      repo.createVehicle('005490-9', 'cars')

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when FIPE API returns null for year', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '9999-9', name: '9999 Unknown' }])
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue(null)

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_AVAILABLE',
        statusCode: 404,
      })
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: FAIL — `VehicleSearchService is not a constructor`

- [ ] **Step 3: Write the service implementation**

```typescript
import { AppError } from '../../shared/errors/AppError.js'
import type { FipeClient } from '../../shared/services/fipe/fipe.client.js'
import type {
  SearchResponse,
  YearDetailResponse,
} from './vehicleSearch.types.js'
import type { VehicleSearchRepository } from './vehicleSearch.repository.js'

export class VehicleSearchService {
  constructor(
    private readonly fipeClient: FipeClient,
    private readonly repository: VehicleSearchRepository,
  ) {}

  async searchByFipeCode(
    type: string,
    fipeCode: string,
  ): Promise<SearchResponse> {
    const cached = this.repository.findVehicleWithYears(fipeCode)

    if (cached && cached.years.length > 0) {
      return {
        fipeCode,
        vehicleType: cached.vehicle_type,
        brand: cached.brand,
        model: cached.model,
        years: cached.years.map((y) => ({ code: y.year_code, name: y.year_label })),
        source: 'cache',
      }
    }

    const years = await this.fipeClient.fetchYears(type, fipeCode)

    if (years.length === 0) {
      throw new AppError(
        'FIPE_CODE_NOT_FOUND',
        'No vehicles found for this FIPE code',
        404,
      )
    }

    const vehicleId = cached
      ? cached.id
      : this.repository.createVehicle(fipeCode, type)

    this.repository.createYears(vehicleId, years)

    return {
      fipeCode,
      vehicleType: type,
      brand: cached?.brand ?? null,
      model: cached?.model ?? null,
      years: years.map((y) => ({ code: y.code, name: y.name })),
      source: 'api',
    }
  }

  async getYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<YearDetailResponse> {
    const vehicle = this.repository.findByFipeCode(fipeCode)

    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404)
    }

    const yearRow = this.repository.findYearByCode(vehicle.id, yearCode)

    if (!yearRow) {
      throw new AppError(
        'YEAR_NOT_FOUND',
        'Year not found for this vehicle',
        404,
      )
    }

    if (yearRow.fetched_at) {
      return {
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicle_type,
        yearCode: yearRow.year_code,
        yearLabel: yearRow.year_label,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price!,
        fuel: yearRow.fuel!,
        referenceMonth: yearRow.reference_month!,
        fuelAcronym: yearRow.fuel_acronym!,
        source: 'cache',
      }
    }

    const detail = await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)

    if (!detail) {
      throw new AppError(
        'YEAR_NOT_AVAILABLE',
        'Year detail not available for this vehicle',
        404,
      )
    }

    this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })

    if (!vehicle.brand) {
      this.repository.updateVehicleBrandModel(
        vehicle.id,
        detail.brand,
        detail.model,
      )
    }

    return {
      vehicleId: vehicle.id,
      fipeCode,
      vehicleType: vehicle.vehicle_type,
      yearCode: yearRow.year_code,
      yearLabel: yearRow.year_label,
      brand: detail.brand,
      model: detail.model,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
      source: 'api',
    }
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: all tests PASS (8 repo + 7 service = 15 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/vehicle-search/
git commit -m "feat: add VehicleSearchService with progressive caching logic"
```

---

### Task 7: Create vehicle search routes

**Files:**
- Create: `backend/src/features/vehicle-search/vehicleSearch.routes.ts`
- Modify: `backend/src/features/vehicle-search/vehicleSearch.test.ts` (append route tests)

- [ ] **Step 1: Append route integration tests to the test file**

All imports were already added in Task 5. Append the route describe block after the service `describe` block, before the closing of the file:

```typescript
describe('Vehicle Search Routes', () => {
  let db: Database.Database
  let repo: VehicleSearchRepository
  let fipeClient: FipeClient
  let app: express.Express

  beforeAll(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrationsOn(db)
  })

  beforeEach(() => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    const service = new VehicleSearchService(fipeClient, repo)
    app = express()
    app.use(express.json())
    app.use(createVehicleSearchRoutes(service))
    db.exec('DELETE FROM vehicle_years')
    db.exec('DELETE FROM vehicles')
  })

  afterAll(() => {
    db.close()
  })

  describe('GET /api/vehicle/:type/:fipeCode', () => {
    it('should return 200 with years from API on first search', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      const response = await request(app).get('/api/vehicle/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.source).toBe('api')
      expect(response.body.data.years).toHaveLength(1)
    })

    it('should return 200 with cache on second search', async () => {
      repo.createVehicle('005490-9', 'cars')
      repo.createYears(1, [{ code: '2012-1', name: '2012 Gasolina' }])

      const response = await request(app).get('/api/vehicle/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.data.source).toBe('cache')
      expect(fipeClient.fetchYears).not.toHaveBeenCalled()
    })

    it('should return 404 when FIPE code not found', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([])

      const response = await request(app).get('/api/vehicle/cars/000000-0')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('FIPE_CODE_NOT_FOUND')
    })
  })

  describe('GET /api/vehicle/:type/:fipeCode/years/:yearCode', () => {
    it('should return 200 with year detail from API', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue({
        vehicleType: 1,
        price: 'R$ 55.119,00',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        modelYear: 2023,
        fuel: 'Flex',
        codeFipe: '005490-9',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(200)
      expect(response.body.data.price).toBe('R$ 55.119,00')
      expect(response.body.data.source).toBe('api')
    })

    it('should return 200 with cached detail on second call', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = repo.findYearsByVehicleId(vehicleId)
      repo.updateYearDetail(years[0].id, {
        price: 'R$ 55.119,00',
        fuel: 'Flex',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(200)
      expect(response.body.data.source).toBe('cache')
      expect(fipeClient.fetchYearDetail).not.toHaveBeenCalled()
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: FAIL — `createVehicleSearchRoutes is not a function`

- [ ] **Step 3: Write the route implementation**

```typescript
import { Router } from 'express'
import type { VehicleSearchService } from './vehicleSearch.service.js'

export function createVehicleSearchRoutes(
  service: VehicleSearchService,
): Router {
  const router = Router()

  router.get('/api/vehicle/:type/:fipeCode', async (req, res, next) => {
    try {
      const result = await service.searchByFipeCode(
        req.params.type,
        req.params.fipeCode,
      )

      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  })

  router.get(
    '/api/vehicle/:type/:fipeCode/years/:yearCode',
    async (req, res, next) => {
      try {
        const result = await service.getYearDetail(
          req.params.type,
          req.params.fipeCode,
          req.params.yearCode,
        )

        res.json({
          success: true,
          data: result,
        })
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
```

Key decisions:
- Route handlers delegate to `service` — no business logic
- Errors forwarded via `next(err)` — central error handler formats the response
- Response envelope matches the existing health endpoint: `{ success: true, data: ... }`
- Factory function receives `service` directly (DI at the route level)

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```
Expected: all tests PASS (8 repo + 7 service + 6 route = 21 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/vehicle-search/
git commit -m "feat: add vehicle search routes with DI factory"
```

---

### Task 8: Wire routes into server.ts

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Modify server.ts**

Read the current `server.ts`:

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

Replace with:

```typescript
import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler.js'
import { logger } from './shared/utils/logger.js'
import { FipeClient } from './shared/services/fipe/index.js'
import { VehicleSearchRepository } from './features/vehicle-search/vehicleSearch.repository.js'
import { VehicleSearchService } from './features/vehicle-search/vehicleSearch.service.js'
import { createVehicleSearchRoutes } from './features/vehicle-search/vehicleSearch.routes.js'
import { getDb } from './db/index.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Dependencies — manual DI (composition root)
const fipeClient = new FipeClient('https://fipe.parallelum.com.br/api/v2')
const db = getDb()
const vehicleSearchRepo = new VehicleSearchRepository(db)
const vehicleSearchService = new VehicleSearchService(fipeClient, vehicleSearchRepo)

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})
app.use(createVehicleSearchRoutes(vehicleSearchService))

// Error handler must be last
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
  })
}

export { app }
```

- [ ] **Step 2: Verify existing health test still passes**

```bash
cd backend && npx vitest run src/server.test.ts
```
Expected: PASS — health endpoint still works

- [ ] **Step 3: Start the server and smoke-test manually**

```bash
cd backend && npm run dev
```
Then in another terminal:
```bash
curl http://localhost:3001/api/vehicle/cars/005490-9
```
Expected: JSON response with years list (first call hits API, second hits cache)

```bash
curl http://localhost:3001/api/vehicle/cars/005490-9/years/2023-5
```
Expected: JSON response with year detail (fuel, price, etc.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: wire FIPE vehicle search routes into server"
```

---

### Task 9: Run full test suite

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npm test
```
Expected: all tests PASS (health + FIPE client + vehicle search)

- [ ] **Step 2: Run TypeScript type check**

```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors

- [ ] **Step 3: Commit any final fixes**

Only if type check or tests uncovered issues:
```bash
git add -A && git commit -m "fix: type errors and test adjustments"
```

---

## Summary

| Task | Files created | Files modified |
|------|--------------|---------------|
| 1. Migration 002 | `db/migrations/002_add_fipe_details.sql` | — |
| 2. FIPE types | `shared/services/fipe/fipe.types.ts` | — |
| 3. FIPE client | `shared/services/fipe/fipe.client.ts`, `.test.ts`, `index.ts` | — |
| 4. Vehicle search types | `features/vehicle-search/vehicleSearch.types.ts` | — |
| 5. Repository | `features/vehicle-search/vehicleSearch.repository.ts` | `vehicleSearch.test.ts` |
| 6. Service | `features/vehicle-search/vehicleSearch.service.ts` | `vehicleSearch.test.ts` |
| 7. Routes | `features/vehicle-search/vehicleSearch.routes.ts` | `vehicleSearch.test.ts` |
| 8. Wire into server | — | `server.ts` |
| 9. Full test suite | — | — |

All components follow the DI pattern — `FipeClient`, `VehicleSearchRepository`, and `VehicleSearchService` all accept their dependencies via constructor. The composition root in `server.ts` wires real instances; tests wire mocks or in-memory databases.
