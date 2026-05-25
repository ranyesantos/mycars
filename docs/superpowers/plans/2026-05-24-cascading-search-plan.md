# Cascading Search & Favorites Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cascading brand→model search on the main page, move favorites to `/favorites` route, keep "Add by FIPE" dialog accessible from both pages.

**Architecture:** Extend the existing `vehicle-search` backend slice with new FIPE API methods and 4 cascading routes. Frontend gets `react-router-dom` with two pages, `browse-vehicles` components ported from prototype, and React Query hooks for cascading data fetching.

**Tech Stack:** Express + TypeScript + Prisma/SQLite (backend), React + Vite + TypeScript + TanStack Query + shadcn/ui + react-router-dom (frontend), Zod (validation), Supertest + Vitest (testing).

---

### Task 1: Extend `IFipeClient` types and interface

**Files:**
- Modify: `backend/src/shared/services/fipe/fipe.types.ts`

**Standards:** `docs/IA/standards/solid.md`

- [ ] **Step 1: Add new types and methods to the interface**

Read the current file. Add the following new types after the existing `FipeYearDetail` interface:

```typescript
export interface FipeBrand {
  code: string
  name: string
}

export interface FipeModel {
  code: number
  name: string
}

export interface FipePriceDetail {
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

Add these four method signatures to the `IFipeClient` interface (after `fetchYearDetail`):

```typescript
fetchBrands(type: string): Promise<FipeBrand[]>
fetchModels(type: string, brandCode: string): Promise<FipeModel[]>
fetchYearsByBrandModel(type: string, brandCode: string, modelCode: number): Promise<FipeYear[]>
fetchPriceByBrandModel(type: string, brandCode: string, modelCode: number, yearCode: string): Promise<FipePriceDetail | null>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: errors in `fipe.client.ts` about missing interface implementations (will be fixed in Task 2).

---

### Task 2: Implement new methods in `FipeClient`

**Files:**
- Modify: `backend/src/shared/services/fipe/fipe.client.ts`

- [ ] **Step 1: Implement the four new methods**

Read the current file. The existing FIPE API base URL pattern is `${this.baseUrl}/${type}/...`. Add these methods after `fetchYearDetail`:

```typescript
/** Fetch all brands for a vehicle type. Empty array on failure. */
async fetchBrands(type: string): Promise<FipeBrand[]> {
  const url = `${this.baseUrl}/${type}/brands`
  const response = await this.request(url)

  if (response.status === 404) {
    return []
  }

  return (await response.json()) as FipeBrand[]
}

/** Fetch all models for a brand. Empty array on 404. */
async fetchModels(type: string, brandCode: string): Promise<FipeModel[]> {
  const url = `${this.baseUrl}/${type}/brands/${brandCode}/models`
  const response = await this.request(url)

  if (response.status === 404) {
    return []
  }

  return (await response.json()) as FipeModel[]
}

/** Fetch available years for a brand/model combination. Empty array on 404. */
async fetchYearsByBrandModel(
  type: string,
  brandCode: string,
  modelCode: number,
): Promise<FipeYear[]> {
  const url = `${this.baseUrl}/${type}/brands/${brandCode}/models/${modelCode}/years`
  const response = await this.request(url)

  if (response.status === 404) {
    return []
  }

  return (await response.json()) as FipeYear[]
}

/** Fetch price detail for a specific brand/model/year. Returns null on 404. */
async fetchPriceByBrandModel(
  type: string,
  brandCode: string,
  modelCode: number,
  yearCode: string,
): Promise<FipePriceDetail | null> {
  const url = `${this.baseUrl}/${type}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
  const response = await this.request(url)

  if (response.status === 404) {
    return null
  }

  return (await response.json()) as FipePriceDetail
}
```

Make sure to import the new types from `./fipe.types`:
```typescript
import type { FipeYear, FipeYearDetail, FipeBrand, FipeModel, FipePriceDetail, IFipeClient } from './fipe.types'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors.

---

### Task 3: Extend `vehicle-search` validator

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.validator.ts`

- [ ] **Step 1: Add validators for cascading search params**

Read the current file. Add new schemas and middleware after the existing exports:

```typescript
const brandCodeSchema = z
  .string()
  .min(1, 'Brand code is required')

const modelCodeSchema = z
  .string()
  .min(1, 'Model code is required')
  .regex(/^\d+$/, 'Model code must be a number')

const brandsParamsSchema = z.object({
  type: vehicleTypeSchema,
})

const modelsParamsSchema = z.object({
  type: vehicleTypeSchema,
  brandCode: brandCodeSchema,
})

const yearsByModelParamsSchema = z.object({
  type: vehicleTypeSchema,
  brandCode: brandCodeSchema,
  modelCode: modelCodeSchema,
})

const priceByModelParamsSchema = z.object({
  type: vehicleTypeSchema,
  brandCode: brandCodeSchema,
  modelCode: modelCodeSchema,
  yearCode: yearCodeSchema,
})

export function validateBrandsParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = brandsParamsSchema.safeParse(req.params)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request parameters', details))
  }
  next()
}

export function validateModelsParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = modelsParamsSchema.safeParse(req.params)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request parameters', details))
  }
  next()
}

export function validateYearsByModelParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = yearsByModelParamsSchema.safeParse(req.params)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request parameters', details))
  }
  next()
}

export function validatePriceByModelParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = priceByModelParamsSchema.safeParse(req.params)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request parameters', details))
  }
  next()
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

---

### Task 4: Add cascading search types

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.types.ts`

- [ ] **Step 1: Add response types**

Read the current file. Add after the existing types:

```typescript
export interface BrandResponse {
  code: string
  name: string
}

export interface ModelResponse {
  code: number
  name: string
}

export interface CascadingYear {
  code: string
  name: string
}

export interface BrandModelPriceResponse {
  fipeCode: string
  brand: string
  model: string
  modelYear: number
  price: string
  fuel: string
  referenceMonth: string
  fuelAcronym: string
  vehicleType: number
}
```

---

### Task 5: Add service methods to `VehicleSearchService`

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.service.ts`

**Standards:** `docs/IA/standards/vertical-slice-pitfalls.md`

- [ ] **Step 1: Add four new service methods**

Read the current file. Add `BrandResponse`, `ModelResponse`, `CascadingYear`, and `BrandModelPriceResponse` to the imports from `./vehicleSearch.types`. Then add these methods after `getYearDetail`:

```typescript
/** List all brands for a vehicle type. */
async getBrands(type: string): Promise<BrandResponse[]> {
  const brands = await this.fipeClient.fetchBrands(type)
  return brands.map((b) => ({ code: b.code, name: b.name }))
}

/** List all models for a brand. */
async getModels(type: string, brandCode: string): Promise<ModelResponse[]> {
  const models = await this.fipeClient.fetchModels(type, brandCode)
  return models.map((m) => ({ code: m.code, name: m.name }))
}

/** List available years for a brand/model combination. No DB write — FIPE code not yet known. */
async getYearsByBrandModel(
  type: string,
  brandCode: string,
  modelCode: number,
): Promise<CascadingYear[]> {
  const years = await this.fipeClient.fetchYearsByBrandModel(type, brandCode, modelCode)
  return years.map((y) => ({ code: y.code, name: y.name }))
}

/** Fetch price detail by brand/model/year. Does find-or-create of vehicle + year in DB, then caches price data. */
async getPriceByBrandModel(
  type: string,
  brandCode: string,
  modelCode: number,
  yearCode: string,
): Promise<BrandModelPriceResponse> {
  const detail = await this.fipeClient.fetchPriceByBrandModel(type, brandCode, modelCode, yearCode)
  if (!detail) {
    throw new NotFoundError('YEAR_NOT_AVAILABLE', `No price data for year ${yearCode}`)
  }

  // Find or create vehicle
  let vehicle = await this.repository.findByFipeCode(detail.codeFipe)
  if (!vehicle) {
    const vehicleId = await this.repository.createVehicleWithYears(detail.codeFipe, type, [
      { code: yearCode, name: `${detail.modelYear} ${detail.fuel}` },
    ])
    const years = await this.repository.findYearsByVehicleId(vehicleId)
    const yearRow = years[0]
    await this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })
    if (!vehicle) {
      await this.repository.updateVehicleBrandModel(vehicleId, detail.brand, detail.model)
    }
  } else {
    // Vehicle exists — check if year exists
    const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)
    if (!yearRow) {
      await this.repository.createYears(vehicle.id, [{ code: yearCode, name: `${detail.modelYear} ${detail.fuel}` }])
      const createdYears = await this.repository.findYearsByVehicleId(vehicle.id)
      const created = createdYears.find((y) => y.yearCode === yearCode)
      if (created) {
        await this.repository.updateYearDetail(created.id, {
          price: detail.price,
          fuel: detail.fuel,
          referenceMonth: detail.referenceMonth,
          fuelAcronym: detail.fuelAcronym,
        })
      }
    } else {
      await this.repository.updateYearDetail(yearRow.id, {
        price: detail.price,
        fuel: detail.fuel,
        referenceMonth: detail.referenceMonth,
        fuelAcronym: detail.fuelAcronym,
      })
      if (!vehicle.brand) {
        await this.repository.updateVehicleBrandModel(vehicle.id, detail.brand, detail.model)
      }
    }
  }

  return {
    fipeCode: detail.codeFipe,
    brand: detail.brand,
    model: detail.model,
    modelYear: detail.modelYear,
    price: detail.price,
    fuel: detail.fuel,
    referenceMonth: detail.referenceMonth,
    fuelAcronym: detail.fuelAcronym,
    vehicleType: detail.vehicleType,
  }
}
```

Make sure `NotFoundError` is imported at the top:
```typescript
import { NotFoundError } from '../../shared/errors/NotFoundError'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

---

### Task 6: Add cascading search routes

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.routes.ts`

- [ ] **Step 1: Add four new routes**

Read the current file. Import the new validators and add these routes BEFORE the existing routes (to avoid path conflicts — the specific `/brands` path must match before `/:fipeCode`):

```typescript
import {
  validateVehicleSearchParams,
  validateYearDetailParams,
  validateBrandsParams,
  validateModelsParams,
  validateYearsByModelParams,
  validatePriceByModelParams,
} from './vehicleSearch.validator'
```

Add these routes right after `const router = Router()` (before the existing `GET /api/vehicle/:type/:fipeCode`):

```typescript
// GET /api/vehicle/:type/brands — list all brands
router.get(
  '/api/vehicle/:type/brands',
  validateBrandsParams,
  asyncHandler(async (req, res) => {
    const { type } = req.params as Record<string, string>
    const result = await service.getBrands(type)

    res.json({
      success: true,
      data: result,
    })
  }),
)

// GET /api/vehicle/:type/brands/:brandCode/models — list models for a brand
router.get(
  '/api/vehicle/:type/brands/:brandCode/models',
  validateModelsParams,
  asyncHandler(async (req, res) => {
    const { type, brandCode } = req.params as Record<string, string>
    const result = await service.getModels(type, brandCode)

    res.json({
      success: true,
      data: result,
    })
  }),
)

// GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years — list years
router.get(
  '/api/vehicle/:type/brands/:brandCode/models/:modelCode/years',
  validateYearsByModelParams,
  asyncHandler(async (req, res) => {
    const { type, brandCode, modelCode } = req.params as Record<string, string>
    const result = await service.getYearsByBrandModel(type, brandCode, Number(modelCode))

    res.json({
      success: true,
      data: result,
    })
  }),
)

// GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode — price detail
router.get(
  '/api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode',
  validatePriceByModelParams,
  asyncHandler(async (req, res) => {
    const { type, brandCode, modelCode, yearCode } = req.params as Record<string, string>
    const result = await service.getPriceByBrandModel(type, brandCode, Number(modelCode), yearCode)

    res.json({
      success: true,
      data: result,
    })
  }),
)
```

**Important:** These new routes must come BEFORE the existing `GET /api/vehicle/:type/:fipeCode` route to avoid Express matching `brands` as a `:fipeCode` parameter.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 3: Run existing tests to verify no regressions**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```

Expected: All 17 tests pass.

---

### Task 7: Write backend tests for cascading search

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.test.ts`

- [ ] **Step 1: Add test cases for cascading routes**

Read the current file. Look for the "Vehicle Search Routes" `describe` block. Add a new `describe` block after the existing route tests (before the closing `})` of the outer describe):

```typescript
describe('GET /api/vehicle/:type/brands', () => {
  it('should return 200 with brands list', async () => {
    fipeClient.fetchBrands = vi.fn().mockResolvedValue([
      { code: '59', name: 'VW - VolksWagen' },
      { code: '1', name: 'Fiat' },
    ])

    const response = await request(app).get('/api/vehicle/cars/brands')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.data[0].code).toBe('59')
  })

  it('should return 400 when vehicle type is invalid', async () => {
    const response = await request(app).get('/api/vehicle/boats/brands')

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/vehicle/:type/brands/:brandCode/models', () => {
  it('should return 200 with models list', async () => {
    fipeClient.fetchModels = vi.fn().mockResolvedValue([
      { code: 5940, name: 'Gol 1.0 Flex 12V 5p' },
    ])

    const response = await request(app).get('/api/vehicle/cars/brands/59/models')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveLength(1)
  })
})

describe('GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years', () => {
  it('should return 200 with years list', async () => {
    fipeClient.fetchYearsByBrandModel = vi.fn().mockResolvedValue([
      { code: '2012-1', name: '2012 Gasolina' },
    ])

    const response = await request(app).get(
      '/api/vehicle/cars/brands/59/models/5940/years',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveLength(1)
  })
})

describe('GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode', () => {
  it('should return 200 with price detail and create vehicle in DB', async () => {
    fipeClient.fetchPriceByBrandModel = vi.fn().mockResolvedValue({
      vehicleType: 1,
      price: 'R$ 22.000,00',
      brand: 'VW - VolksWagen',
      model: 'Gol 1.0 Flex 12V 5p',
      modelYear: 2012,
      fuel: 'Gasolina',
      codeFipe: '005490-9',
      referenceMonth: 'maio de 2026',
      fuelAcronym: 'G',
    })

    const response = await request(app).get(
      '/api/vehicle/cars/brands/59/models/5940/years/2012-1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.fipeCode).toBe('005490-9')
    expect(response.body.data.price).toBe('R$ 22.000,00')
  })

  it('should return 404 when year not available', async () => {
    fipeClient.fetchPriceByBrandModel = vi.fn().mockResolvedValue(null)

    const response = await request(app).get(
      '/api/vehicle/cars/brands/59/models/5940/years/9999-9',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the new tests**

```bash
cd backend && npx vitest run src/features/vehicle-search/vehicleSearch.test.ts
```

Expected: All tests pass (17 existing + 7 new = 24 tests).

- [ ] **Step 3: Run the full test suite**

```bash
cd backend && npx vitest run
```

Expected: All tests pass across all test files.

---

### Task 8: Extend frontend types and API service

**Files:**
- Modify: `frontend/src/services/types.ts`
- Modify: `frontend/src/services/vehicleSearchApi.ts`

- [ ] **Step 1: Add cascading search types**

Read `frontend/src/services/types.ts`. Add after the `YearDetailResponse` interface:

```typescript
export interface Brand {
  code: string
  name: string
}

export interface Model {
  code: number
  name: string
}

export interface CascadingYear {
  code: string
  name: string
}

export interface BrandModelPriceResponse {
  fipeCode: string
  brand: string
  model: string
  modelYear: number
  price: string
  fuel: string
  referenceMonth: string
  fuelAcronym: string
  vehicleType: number
}
```

- [ ] **Step 2: Add API functions**

Read `frontend/src/services/vehicleSearchApi.ts`. Add these functions after `getYearDetail`:

```typescript
export async function getBrands(
  vehicleType: VehicleType,
): Promise<Brand[]> {
  const response = await api.get(`/api/vehicle/${vehicleType}/brands`)
  return response.data.data
}

export async function getModels(
  vehicleType: VehicleType,
  brandCode: string,
): Promise<Model[]> {
  const response = await api.get(`/api/vehicle/${vehicleType}/brands/${brandCode}/models`)
  return response.data.data
}

export async function getYearsByBrandModel(
  vehicleType: VehicleType,
  brandCode: string,
  modelCode: number,
): Promise<CascadingYear[]> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`,
  )
  return response.data.data
}

export async function getPriceByBrandModel(
  vehicleType: VehicleType,
  brandCode: string,
  modelCode: number,
  yearCode: string,
): Promise<BrandModelPriceResponse> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
  )
  return response.data.data
}
```

Make sure to import `Brand`, `Model`, `CascadingYear`, `BrandModelPriceResponse` from `./types`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

---

### Task 9: Create `useBrowseVehicles` hook

**Files:**
- Create: `frontend/src/hooks/useBrowseVehicles.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import * as vehicleSearchApi from '../services/vehicleSearchApi'
import type {
  Brand,
  Model,
  CascadingYear,
  BrandModelPriceResponse,
  VehicleType,
} from '../services/types'

export const browseKeys = {
  brands: (type: VehicleType) => ['brands', type] as const,
  models: (type: VehicleType, brandCode: string) => ['models', type, brandCode] as const,
  years: (type: VehicleType, brandCode: string, modelCode: number) =>
    ['years-by-model', type, brandCode, modelCode] as const,
}

export function useBrands(type: VehicleType): {
  brands: Brand[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.brands(type),
    queryFn: () => vehicleSearchApi.getBrands(type),
    enabled: !!type,
  })

  return { brands: data ?? [], isLoading, error: error as Error | null }
}

export function useModels(
  type: VehicleType,
  brandCode: string | null,
): {
  models: Model[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.models(type, brandCode ?? ''),
    queryFn: () => vehicleSearchApi.getModels(type, brandCode!),
    enabled: !!brandCode,
  })

  return { models: data ?? [], isLoading, error: error as Error | null }
}

export function useYearsByBrandModel(
  type: VehicleType,
  brandCode: string | null,
  modelCode: number | null,
): {
  years: CascadingYear[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.years(type, brandCode ?? '', modelCode ?? 0),
    queryFn: () => vehicleSearchApi.getYearsByBrandModel(type, brandCode!, modelCode!),
    enabled: !!modelCode,
  })

  return { years: data ?? [], isLoading, error: error as Error | null }
}

export function useFetchPriceByBrandModel(): {
  fetchPrice: (
    type: VehicleType,
    brandCode: string,
    modelCode: number,
    yearCode: string,
  ) => Promise<BrandModelPriceResponse>
  isFetching: boolean
} {
  const mutation = useMutation({
    mutationFn: ({
      type,
      brandCode,
      modelCode,
      yearCode,
    }: {
      type: VehicleType
      brandCode: string
      modelCode: number
      yearCode: string
    }) => vehicleSearchApi.getPriceByBrandModel(type, brandCode, modelCode, yearCode),
  })

  return {
    fetchPrice: (type, brandCode, modelCode, yearCode) =>
      mutation.mutateAsync({ type, brandCode, modelCode, yearCode }),
    isFetching: mutation.isPending,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

---

### Task 10: Install react-router-dom

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install react-router-dom**

```bash
cd frontend && npm install react-router-dom
```

---

### Task 11: Create `browse-vehicles` presentational components

**Files:**
- Create: `frontend/src/features/browse-vehicles/VehicleTypeTabs.tsx`
- Create: `frontend/src/features/browse-vehicles/SearchFilters.tsx`
- Create: `frontend/src/features/browse-vehicles/VehicleResultCard.tsx`
- Create: `frontend/src/features/browse-vehicles/VehicleResultList.tsx`
- Create: `frontend/src/features/browse-vehicles/index.ts`

- [ ] **Step 1: Write VehicleTypeTabs.tsx**

Port from `frontend_preview/components/vehicle-type-tabs.tsx`:

```typescript
import { Car, Bike } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { VehicleType } from '../../services/types'

interface VehicleTypeTabsProps {
  value: VehicleType
  onChange: (value: VehicleType) => void
}

export function VehicleTypeTabs({ value, onChange }: VehicleTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as VehicleType)}>
      <TabsList className="grid w-full max-w-xs grid-cols-2">
        <TabsTrigger value="cars" className="gap-2">
          <Car className="size-4" />
          Cars
        </TabsTrigger>
        <TabsTrigger value="motorcycles" className="gap-2">
          <Bike className="size-4" />
          Motorcycles
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
```

- [ ] **Step 2: Write SearchFilters.tsx**

Port from prototype but WITHOUT the year select — brand → model only:

```typescript
import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrands, useModels } from '../../hooks/useBrowseVehicles'
import type { VehicleType } from '../../services/types'

interface SearchFiltersProps {
  vehicleType: VehicleType
  selectedBrand: string
  selectedModel: string
  onBrandChange: (code: string) => void
  onModelChange: (code: string) => void
}

export function SearchFilters({
  vehicleType,
  selectedBrand,
  selectedModel,
  onBrandChange,
  onModelChange,
}: SearchFiltersProps) {
  const { brands, isLoading: loadingBrands } = useBrands(vehicleType)
  const { models, isLoading: loadingModels } = useModels(
    vehicleType,
    selectedBrand || null,
  )

  // Reset model when brand changes
  useEffect(() => {
    onModelChange('')
  }, [selectedBrand])

  const handleBrandChange = (value: string) => {
    onBrandChange(value)
  }

  const handleModelChange = (value: string) => {
    onModelChange(value)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {loadingBrands ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select value={selectedBrand} onValueChange={handleBrandChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.code} value={brand.code}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loadingModels ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select
          value={selectedModel}
          onValueChange={handleModelChange}
          disabled={!selectedBrand || models.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.code} value={String(model.code)}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write VehicleResultCard.tsx**

Single year card with favorite button:

```typescript
import { Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CascadingYear } from '../../services/types'

interface VehicleResultCardProps {
  year: CascadingYear
  isSaved: boolean
  isSaving: boolean
  onFavorite: (year: CascadingYear) => void
}

export function VehicleResultCard({
  year,
  isSaved,
  isSaving,
  onFavorite,
}: VehicleResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => !isSaved && onFavorite(year)}
      disabled={isSaved || isSaving}
      className="flex w-full items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <p className="font-medium text-foreground">{year.name}</p>
      {isSaving ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : isSaved ? (
        <Badge variant="secondary">Saved</Badge>
      ) : (
        <Plus className="size-4 text-muted-foreground" />
      )}
    </button>
  )
}
```

- [ ] **Step 4: Write VehicleResultList.tsx**

Grid of result cards with loading/empty/error states:

```typescript
import { Skeleton } from '@/components/ui/skeleton'
import { VehicleResultCard } from './VehicleResultCard'
import type { CascadingYear, VehicleType } from '../../services/types'

interface VehicleResultListProps {
  years: CascadingYear[]
  isLoading: boolean
  error: string | null
  hasSelectedModel: boolean
  vehicleType: VehicleType
  brandCode: string
  modelCode: number
  savedYears: Set<string>
  savingYear: string | null
  onFavorite: (type: VehicleType, brandCode: string, modelCode: number, year: CascadingYear) => void
}

export function VehicleResultList({
  years,
  isLoading,
  error,
  hasSelectedModel,
  savedYears,
  savingYear,
  vehicleType,
  brandCode,
  modelCode,
  onFavorite,
}: VehicleResultListProps) {
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!hasSelectedModel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Select a model to see available years
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (years.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No years found for this model</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {years.map((year) => (
        <VehicleResultCard
          key={year.code}
          year={year}
          isSaved={savedYears.has(year.code)}
          isSaving={savingYear === year.code}
          onFavorite={(y) => onFavorite(vehicleType, brandCode, modelCode, y)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write index.ts**

```typescript
export { VehicleTypeTabs } from './VehicleTypeTabs'
export { SearchFilters } from './SearchFilters'
export { VehicleResultList } from './VehicleResultList'
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

---

### Task 12: Create page components

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/pages/FavoritesPage.tsx`

- [ ] **Step 1: Write HomePage.tsx**

```typescript
import { useState } from 'react'
import { VehicleTypeTabs } from '../features/browse-vehicles/VehicleTypeTabs'
import { SearchFilters } from '../features/browse-vehicles/SearchFilters'
import { VehicleResultList } from '../features/browse-vehicles/VehicleResultList'
import { useYearsByBrandModel, useFetchPriceByBrandModel } from '../hooks/useBrowseVehicles'
import { useAddFavorite } from '../hooks/useFavorites'
import type { VehicleType, CascadingYear } from '../services/types'

export function HomePage() {
  const [vehicleType, setVehicleType] = useState<VehicleType>('cars')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [savedYears, setSavedYears] = useState<Set<string>>(new Set())
  const [savingYear, setSavingYear] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modelCode = selectedModel ? Number(selectedModel) : null
  const { years, isLoading: loadingYears } = useYearsByBrandModel(
    vehicleType,
    selectedBrand || null,
    modelCode,
  )
  const { fetchPrice, isFetching: isFetchingPrice } = useFetchPriceByBrandModel()
  const { addFavorite } = useAddFavorite()

  const handleFavorite = async (
    type: VehicleType,
    brandCode: string,
    modelCode: number,
    year: CascadingYear,
  ) => {
    setSavingYear(year.code)
    setError(null)

    try {
      const priceDetail = await fetchPrice(type, brandCode, modelCode, year.code)
      addFavorite(type, priceDetail.fipeCode)
      setSavedYears((prev) => new Set(prev).add(year.code))
    } catch {
      setError('Could not save vehicle. Try again.')
    } finally {
      setSavingYear(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <VehicleTypeTabs value={vehicleType} onChange={setVehicleType} />
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <SearchFilters
          vehicleType={vehicleType}
          selectedBrand={selectedBrand}
          selectedModel={selectedModel}
          onBrandChange={setSelectedBrand}
          onModelChange={setSelectedModel}
        />
      </div>

      {savedYears.size > 0 && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {savedYears.size} {savedYears.size === 1 ? 'year' : 'years'} saved to favorites.
        </div>
      )}

      <VehicleResultList
        years={years}
        isLoading={loadingYears || isFetchingPrice}
        error={error}
        hasSelectedModel={!!selectedModel}
        vehicleType={vehicleType}
        brandCode={selectedBrand}
        modelCode={modelCode ?? 0}
        savedYears={savedYears}
        savingYear={savingYear}
        onFavorite={handleFavorite}
      />
    </div>
  )
}
```

- [ ] **Step 2: Write FavoritesPage.tsx**

```typescript
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FavoriteListContainer } from '../features/favorite-vehicle'

export function FavoritesPage() {
  return (
    <div>
      <Link to="/">
        <Button variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="size-4" />
          Back to search
        </Button>
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Heart className="size-8 text-red-500" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Favorites
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Track your saved vehicles from the FIPE table
        </p>
      </header>

      <FavoriteListContainer />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

---

### Task 13: Rewire App.tsx with routing

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Read the current file. Replace its contents:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Heart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddByFipeDialog } from './features/add-by-fipe'
import { HomePage } from './pages/HomePage'
import { FavoritesPage } from './pages/FavoritesPage'

const queryClient = new QueryClient()

function AppLayout() {
  const location = useLocation()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              MyCars
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track vehicle prices from the FIPE table
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                <Search className="size-4" />
                Search
              </Button>
            </Link>
            <Link to="/favorites">
              <Button variant={location.pathname === '/favorites' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                <Heart className="size-4" />
                Favorites
              </Button>
            </Link>
            <AddByFipeDialog triggerVariant="default" />
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </div>
    </main>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Verify the frontend builds**

```bash
cd frontend && npx vite build
```

Expected: Build succeeds.

---

### Task 14: Add `select` shadcn component

**Files:**
- Create: `frontend/src/components/ui/select.tsx` (generated)

- [ ] **Step 1: Add the select component**

```bash
cd frontend && npx shadcn@latest add select --yes
```

---

### Task 15: Run full stack verification

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verify the flow end-to-end**

1. Open http://localhost:5173 — main page with Cars/Motorcycles tabs
2. Select "Cars" → brands dropdown populates
3. Select a brand (e.g. VW) → models dropdown populates
4. Select a model → year cards grid appears
5. Click favorite on a year → "Saved" badge appears
6. Navigate to /favorites via header link → vehicle appears in grouped list
7. Click heart to unfavorite → vehicle removed from list
8. Click "Add by FIPE code" button → dialog opens, works as before
9. Navigate back to main page → search still works

- [ ] **Step 4: Run full test suite**

```bash
cd backend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Run lint**

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

---

### Task 16: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add backend/src/shared/services/fipe/ backend/src/features/vehicle-search/ backend/src/features/favorite-vehicle/ frontend/src/
git commit -m "feat: implement cascading search and favorites routing

Backend: extend FipeClient and vehicle-search slice with brand/model/year
cascading endpoints. Frontend: add react-router-dom, port VehicleTypeTabs
and SearchFilters from prototype, create HomePage and FavoritesPage routes,
wire cascading select + favorite from year results.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
