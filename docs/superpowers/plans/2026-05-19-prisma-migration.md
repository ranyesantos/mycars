# Prisma ORM Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace better-sqlite3 with Prisma ORM across all repositories while keeping the vertical slice architecture and DI pattern intact.

**Architecture:** PrismaClient singleton replaces Database.Database. Repositories go async. DB types come from `@prisma/client` instead of hand-written interfaces. Migrations handled by `prisma migrate`. Tests use `prisma db push` against a temp SQLite file.

**Tech Stack:** Prisma 7.x, SQLite, Express, TypeScript, Vitest

---

### Task 1: Install Prisma and create schema

**Files:**
- Create: `backend/prisma/schema.prisma`
- Modify: `backend/package.json`

- [ ] **Step 1: Install Prisma dependencies**

```bash
cd backend && npm install @prisma/client && npm install -D prisma
```

- [ ] **Step 2: Create the Prisma schema file**

Create `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Vehicle {
  id           Int              @id @default(autoincrement())
  fipeCode     String           @unique @map("fipe_code")
  vehicleType  String           @map("vehicle_type")
  brand        String?
  model        String?
  favorited    Int              @default(0)
  fetchedAt    DateTime         @default(now()) @map("fetched_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")
  years        VehicleYear[]
  scrapes      ScrapingDetail[]

  @@map("vehicles")
}

model VehicleYear {
  id             Int       @id @default(autoincrement())
  vehicleId      Int       @map("vehicle_id")
  yearCode       String    @map("year_code")
  yearLabel      String    @map("year_label")
  price          String?
  fuel           String?
  referenceMonth String?   @map("reference_month")
  fuelAcronym    String?   @map("fuel_acronym")
  fetchedAt      DateTime? @map("fetched_at")
  priceUpdatedAt DateTime? @map("price_updated_at")
  vehicle        Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@map("vehicle_years")
}

model ScrapingDetail {
  id                 Int      @id @default(autoincrement())
  vehicleId          Int      @map("vehicle_id")
  sourceUrl          String   @map("source_url")
  engine             String?
  powerHp            String?  @map("power_hp")
  torque             String?
  transmission       String?
  fuelType           String?  @map("fuel_type")
  consumptionCity    String?  @map("consumption_city")
  consumptionHighway String?  @map("consumption_highway")
  rawData            String?  @map("raw_data")
  scrapedAt          DateTime @default(now()) @map("scraped_at")
  vehicle            Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@map("scraping_details")
}

model Job {
  id        Int      @id @default(autoincrement())
  type      String
  payload   String
  status    String   @default("pending")
  attempts  Int      @default(0)
  error     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("jobs")
}

model CronRun {
  id              Int      @id @default(autoincrement())
  type            String
  vehiclesUpdated Int?     @map("vehicles_updated")
  status          String
  ranAt           DateTime @default(now()) @map("ran_at")

  @@map("cron_runs")
}
```

- [ ] **Step 3: Create .env file for DATABASE_URL**

Create `backend/.env`:

```
DATABASE_URL="file:../vehicles.db"
```

- [ ] **Step 4: Generate Prisma client and run initial migration**

```bash
cd backend && npx prisma generate && npx prisma migrate dev --name init
```

Expected: creates `backend/prisma/migrations/<timestamp>_init/` with generated SQL.

- [ ] **Step 5: Update package.json scripts**

Modify `backend/package.json`:
- Replace `"migrate": "tsx src/db/migrate.ts"` with `"migrate": "npx prisma migrate deploy"`
- Add `"db:push": "npx prisma db push"` (for test setup)
- Add `"db:studio": "npx prisma studio"` (optional DX)

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/prisma/ backend/.env
git commit -m "chore: add Prisma ORM with initial schema and migration"
```

---

### Task 2: Rewrite db/index.ts as PrismaClient singleton

**Files:**
- Rewrite: `backend/src/db/index.ts`
- Delete: `backend/src/db/migrate.ts`
- Delete: `backend/src/db/migrations/` (entire directory)

- [ ] **Step 1: Rewrite db/index.ts**

```typescript
import { PrismaClient } from '@prisma/client'

let db: PrismaClient | null = null

export function getDb(): PrismaClient {
  if (db) return db

  db = new PrismaClient()
  return db
}
```

- [ ] **Step 2: Delete old migration files**

```bash
Remove-Item -Recurse -Force "backend/src/db/migrations"
Remove-Item -Force "backend/src/db/migrate.ts"
```

- [ ] **Step 3: Delete old database file**

```bash
Remove-Item -Force "backend/vehicles.db"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/index.ts
git rm backend/src/db/migrate.ts backend/src/db/migrations/001_initial.sql backend/src/db/migrations/002_migration_tracking.sql backend/src/db/migrations/003_add_fipe_details.sql
git commit -m "refactor: replace better-sqlite3 singleton with PrismaClient"
```

---

### Task 3: Rewrite VehicleSearchRepository with Prisma

**Files:**
- Rewrite: `backend/src/features/vehicle-search/vehicleSearch.repository.ts`

- [ ] **Step 1: Write the repository with Prisma queries**

```typescript
import type { PrismaClient } from '@prisma/client'

export class VehicleSearchRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByFipeCode(fipeCode: string) {
    return this.db.vehicle.findUnique({ where: { fipeCode } })
  }

  async createVehicle(fipeCode: string, vehicleType: string) {
    const result = await this.db.vehicle.create({
      data: { fipeCode, vehicleType },
    })
    return result.id
  }

  async createYears(
    vehicleId: number,
    years: { code: string; name: string }[],
  ): Promise<void> {
    await this.db.$transaction(
      years.map((row) =>
        this.db.vehicleYear.create({
          data: {
            vehicleId,
            yearCode: row.code,
            yearLabel: row.name,
          },
        }),
      ),
    )
  }

  async findYearsByVehicleId(vehicleId: number) {
    return this.db.vehicleYear.findMany({ where: { vehicleId } })
  }

  async findVehicleWithYears(fipeCode: string) {
    return this.db.vehicle.findUnique({
      where: { fipeCode },
      include: {
        years: {
          select: {
            yearCode: true,
            yearLabel: true,
            price: true,
            fetchedAt: true,
          },
          orderBy: { yearCode: 'asc' },
        },
      },
    })
  }

  async findYearByCode(vehicleId: number, yearCode: string) {
    return this.db.vehicleYear.findFirst({
      where: { vehicleId, yearCode },
    })
  }

  async updateYearDetail(
    yearId: number,
    data: {
      price: string
      fuel: string
      referenceMonth: string
      fuelAcronym: string
    },
  ): Promise<void> {
    await this.db.vehicleYear.update({
      where: { id: yearId },
      data: {
        price: data.price,
        fuel: data.fuel,
        referenceMonth: data.referenceMonth,
        fuelAcronym: data.fuelAcronym,
        fetchedAt: new Date(),
      },
    })
  }

  async updateVehicleBrandModel(
    vehicleId: number,
    brand: string,
    model: string,
  ): Promise<void> {
    await this.db.vehicle.update({
      where: { id: vehicleId },
      data: { brand, model },
    })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: errors about missing imports in files that reference old types — that's expected for Task 4.

- [ ] **Step 3: Commit**

```bash
git add backend/src/features/vehicle-search/vehicleSearch.repository.ts
git commit -m "refactor: rewrite VehicleSearchRepository with Prisma queries"
```

---

### Task 4: Update VehicleSearchService and types

**Files:**
- Rewrite: `backend/src/features/vehicle-search/vehicleSearch.types.ts`
- Modify: `backend/src/features/vehicle-search/vehicleSearch.service.ts`
- Modify: `backend/src/features/vehicle-search/index.ts`

- [ ] **Step 1: Slim down types file to response-only types**

Replace `backend/src/features/vehicle-search/vehicleSearch.types.ts`:

```typescript
export type VehicleType = 'cars' | 'trucks' | 'motorcycles'

export interface YearDetailResponse {
  vehicleId: number
  fipeCode: string
  vehicleType: VehicleType
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
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: { code: string; name: string }[]
  source: 'cache' | 'api'
}
```

- [ ] **Step 2: Update index.ts exports**

Replace `backend/src/features/vehicle-search/index.ts`:

```typescript
export { createVehicleSearchRoutes } from './vehicleSearch.routes'
export type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'
```

- [ ] **Step 3: Update service to use Prisma types and await repo calls**

Replace `backend/src/features/vehicle-search/vehicleSearch.service.ts`:

```typescript
import { AppError } from '../../shared/errors/AppError'
import type { IFipeClient } from '../../shared/services/fipe/fipe.types'
import type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'
import type { VehicleSearchRepository } from './vehicleSearch.repository'

export class VehicleSearchService {
  constructor(
    private readonly fipeClient: IFipeClient,
    private readonly repository: VehicleSearchRepository,
  ) {}

  async searchByFipeCode(
    type: string,
    fipeCode: string,
  ): Promise<SearchResponse> {
    const cached = await this.repository.findVehicleWithYears(fipeCode)

    if (cached && cached.years.length > 0) {
      return {
        fipeCode,
        vehicleType: cached.vehicleType as VehicleType,
        brand: cached.brand,
        model: cached.model,
        years: cached.years.map((y) => ({ code: y.yearCode, name: y.yearLabel })),
        source: 'cache',
      }
    }

    const years = await this.fetchYearsSafely(type, fipeCode)

    if (years.length === 0) {
      throw new AppError(
        'FIPE_CODE_NOT_FOUND',
        'No vehicles found for this FIPE code',
        404,
      )
    }

    const vehicleId = cached
      ? cached.id
      : await this.repository.createVehicle(fipeCode, type)

    await this.repository.createYears(vehicleId, years)

    return {
      fipeCode,
      vehicleType: type as VehicleType,
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
    const vehicle = await this.repository.findByFipeCode(fipeCode)

    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404)
    }

    const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)

    if (!yearRow) {
      throw new AppError('YEAR_NOT_FOUND', 'Year not found for this vehicle', 404)
    }

    if (yearRow.fetchedAt) {
      return {
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicleType as VehicleType,
        yearCode: yearRow.yearCode,
        yearLabel: yearRow.yearLabel,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price!,
        fuel: yearRow.fuel!,
        referenceMonth: yearRow.referenceMonth!,
        fuelAcronym: yearRow.fuelAcronym!,
        source: 'cache',
      }
    }

    const detail = await this.fetchYearDetailSafely(type, fipeCode, yearCode)

    if (!detail) {
      throw new AppError(
        'YEAR_NOT_AVAILABLE',
        'Year detail not available for this vehicle',
        404,
      )
    }

    await this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })

    if (!vehicle.brand) {
      await this.repository.updateVehicleBrandModel(
        vehicle.id,
        detail.brand,
        detail.model,
      )
    }

    return {
      vehicleId: vehicle.id,
      fipeCode,
      vehicleType: vehicle.vehicleType as VehicleType,
      yearCode: yearRow.yearCode,
      yearLabel: yearRow.yearLabel,
      brand: detail.brand,
      model: detail.model,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
      source: 'api',
    }
  }

  private async fetchYearsSafely(type: string, fipeCode: string) {
    try {
      return await this.fipeClient.fetchYears(type, fipeCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }

  private async fetchYearDetailSafely(
    type: string,
    fipeCode: string,
    yearCode: string,
  ) {
    try {
      return await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors (service and repository should now be consistent).

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/vehicle-search/
git commit -m "refactor: update service and types for Prisma async repository"
```

---

### Task 5: Verify server.ts DI wiring (no changes needed)

**Files:**
- Verify: `backend/src/server.ts` (no changes required — import path and DI pattern are preserved)

- [ ] **Step 1: Verify server.ts needs no changes**

The import `import { getDb } from './db/index'` stays the same. `getDb()` now returns `PrismaClient` (from Task 2) instead of `Database.Database`. The constructor `new VehicleSearchRepository(db)` now receives a `PrismaClient` (from Task 3). The DI wiring is identical — only the types underneath changed.

Read `backend/src/server.ts` to confirm the file is unchanged and compiles without modifications.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors across the entire project.

- [ ] **Step 3: Commit**

No commit needed — no files changed.

---

### Task 6: Update tests for Prisma

**Files:**
- Rewrite: `backend/src/features/vehicle-search/vehicleSearch.test.ts`
- Modify: `backend/src/server.test.ts`

- [ ] **Step 1: Create test helper for Prisma database setup**

Create `backend/src/db/test-helpers.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

export function createTestDb(): PrismaClient {
  // Push schema to test database
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })

  return new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  })
}

export async function clearTestDb(db: PrismaClient): Promise<void> {
  await db.vehicleYear.deleteMany()
  await db.vehicle.deleteMany()
}

export async function closeTestDb(db: PrismaClient): Promise<void> {
  await db.$disconnect()
  try { fs.unlinkSync(TEST_DB_PATH) } catch { /* ignore */ }
  try { fs.unlinkSync(TEST_DB_PATH + '-journal') } catch { /* ignore */ }
}
```

- [ ] **Step 2: Rewrite vehicleSearch.test.ts**

Replace `backend/src/features/vehicle-search/vehicleSearch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { VehicleSearchRepository } from './vehicleSearch.repository'
import { VehicleSearchService } from './vehicleSearch.service'
import { createVehicleSearchRoutes } from './vehicleSearch.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'
import type { FipeYear, FipeYearDetail, IFipeClient } from '../../shared/services/fipe/fipe.types'

function createMockFipeClient(overrides?: Partial<IFipeClient>): IFipeClient {
  return {
    fetchYears: vi.fn().mockResolvedValue([]),
    fetchYearDetail: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as IFipeClient
}

describe('VehicleSearchService', () => {
  let db: PrismaClient
  let repo: VehicleSearchRepository
  let fipeClient: IFipeClient
  let service: VehicleSearchService

  beforeAll(async () => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    service = new VehicleSearchService(fipeClient, repo)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  describe('searchByFipeCode', () => {
    it('should return cached vehicle when already in DB', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

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

      const vehicle = await repo.findByFipeCode('005490-9')
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
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = await repo.findYearsByVehicleId(vehicleId)
      await repo.updateYearDetail(years[0].id, {
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
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])

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

      const vehicle = await repo.findByFipeCode('005490-9')
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
      await repo.createVehicle('005490-9', 'cars')

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when FIPE API returns null for year', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '9999-9', name: '9999 Unknown' }])
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

describe('Vehicle Search Routes', () => {
  let db: PrismaClient
  let repo: VehicleSearchRepository
  let fipeClient: IFipeClient
  let app: express.Express

  beforeAll(async () => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    const service = new VehicleSearchService(fipeClient, repo)
    app = express()
    app.use(express.json())
    app.use(createVehicleSearchRoutes(service))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
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
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

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

    it('should return 400 when vehicle type is invalid', async () => {
      const response = await request(app).get('/api/vehicle/boats/005490-9')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when FIPE code format is invalid', async () => {
      const response = await request(app).get('/api/vehicle/cars/abc')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/vehicle/:type/:fipeCode/years/:yearCode', () => {
    it('should return 200 with year detail from API', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
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
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = await repo.findYearsByVehicleId(vehicleId)
      await repo.updateYearDetail(years[0].id, {
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

    it('should return 400 when year code format is invalid', async () => {
      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/invalid',
      )

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
```

- [ ] **Step 3: Verify server.test.ts still works**

`backend/src/server.test.ts` only tests `/api/health`. It imports `app` from `server.ts`, which calls `getDb()` at module level. With the vitest env config from Step 3a setting `DATABASE_URL=file:../test.db`, PrismaClient instantiates without error — Prisma connects lazily, so no schema validation happens at import time. The health endpoint doesn't touch the database, so no schema needs to exist.

The existing `server.test.ts` code works without changes:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './server'

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

- [ ] **Step 3a: Update vitest config with DATABASE_URL env**

The project already has `backend/vitest.config.ts`. Merge in the `env` setting so tests use the test database:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'file:../test.db',
    },
  },
})
```

This ensures `server.ts` (which calls `getDb()` at module level) uses the test database when imported by tests, and the healthcheck test works without requiring a real database.

- [ ] **Step 4: Run tests**

```bash
cd backend && npx vitest run
```

Expected: all 18 tests pass (5 service tests + 9 route tests + 1 health check + 3 FipeClient tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/test-helpers.ts backend/src/features/vehicle-search/vehicleSearch.test.ts backend/vitest.config.ts
git commit -m "test: update tests for Prisma with sqlite test database"
```

---

### Task 7: Remove better-sqlite3 dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Uninstall better-sqlite3**

```bash
cd backend && npm uninstall better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Run full test suite to verify nothing is broken**

```bash
cd backend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: remove better-sqlite3 dependency"
```

---

### Task 8: Manual smoke test

**Files:**
- None (manual verification)

- [ ] **Step 1: Run the initial migration against the real database**

```bash
cd backend && npx prisma migrate deploy
```

Expected: "All migrations have been successfully applied."

- [ ] **Step 2: Start the backend server**

```bash
cd backend && npm run dev
```

Expected: "Server running on http://localhost:3001"

- [ ] **Step 3: Test the health endpoint**

```bash
curl http://localhost:3001/api/health
```

Expected: `{"success":true,"data":{"status":"ok"}}`

- [ ] **Step 4: Test a FIPE search**

```bash
curl http://localhost:3001/api/vehicle/cars/005490-9
```

Expected: 200 with years array in response.

- [ ] **Step 5: Test year detail**

```bash
curl http://localhost:3001/api/vehicle/cars/005490-9/years/2023-5
```

Expected: 200 with price, brand, model, fuel details.

- [ ] **Step 6: Test cache (second request should return source: cache)**

```bash
curl http://localhost:3001/api/vehicle/cars/005490-9
```

Expected: `"source":"cache"` in response.

- [ ] **Step 7: Check database with Prisma Studio**

```bash
cd backend && npx prisma studio
```

Verify the `vehicles` and `vehicle_years` tables have data from the API calls above.

- [ ] **Step 8: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 9: Commit any final changes**

Only if the smoke test revealed issues that needed fixes.
