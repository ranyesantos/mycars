# Add by FIPE & Favoriting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement "add by FIPE code" dialog and vehicle favoriting by creating a new `favorite-vehicle` backend slice and porting prototype components from `frontend_preview/` to the React+Vite frontend.

**Architecture:** New `favorite-vehicle` vertical slice in the backend (repository → routes, no service layer needed). Frontend gets shadcn/ui, React Query hooks for server state, and presentational/container component pairs following the project's frontend standards.

**Tech Stack:** Express + TypeScript + Prisma/SQLite (backend), React + Vite + TypeScript + TanStack Query + shadcn/ui (frontend), Zod (validation), Supertest + Vitest (testing).

---

### Task 1: Create the `favorite-vehicle` repository

**Files:**
- Create: `backend/src/features/favorite-vehicle/favoriteVehicle.repository.ts`

**Standards:** `docs/IA/standards/database.md`, `docs/IA/standards/vertical-slice.md`

- [ ] **Step 1: Write the file**

```typescript
import type { PrismaClient, Vehicle } from '@prisma/client'

export type FavoriteWithYears = Vehicle & {
  years: { yearCode: string; yearLabel: string; price: string | null; fuel: string | null; referenceMonth: string | null; fuelAcronym: string | null }[]
}

export class FavoriteVehicleRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Find a vehicle by FIPE code, or null if not found. */
  async findByFipeCode(fipeCode: string): Promise<Vehicle | null> {
    return this.db.vehicle.findUnique({ where: { fipeCode } })
  }

  /** Set the favorited flag on a vehicle. */
  async setFavorite(vehicleId: number, favorited: boolean): Promise<void> {
    await this.db.vehicle.update({
      where: { id: vehicleId },
      data: { favorited: favorited ? 1 : 0 },
    })
  }

  /** List all favorited vehicles with their years eagerly loaded. */
  async listFavorites(): Promise<FavoriteWithYears[]> {
    return this.db.vehicle.findMany({
      where: { favorited: 1 },
      include: {
        years: {
          select: {
            yearCode: true,
            yearLabel: true,
            price: true,
            fuel: true,
            referenceMonth: true,
            fuelAcronym: true,
          },
          orderBy: { yearCode: 'asc' },
        },
      },
    }) as Promise<FavoriteWithYears[]>
  }
}
```

---

### Task 2: Create the `favorite-vehicle` validator

**Files:**
- Create: `backend/src/features/favorite-vehicle/favoriteVehicle.validator.ts`

**Standards:** `docs/IA/standards/api.md`, `docs/IA/standards/vertical-slice-pitfalls.md`

- [ ] **Step 1: Write the file**

```typescript
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../shared/errors/ValidationError'

const vehicleTypeSchema = z.enum(['cars', 'motorcycles'], {
  errorMap: () => ({ message: 'Vehicle type must be cars or motorcycles' }),
})

const fipeCodeSchema = z
  .string()
  .min(1, 'FIPE code is required')
  .regex(/^\d{6,7}-\d{1,2}$/, 'Invalid FIPE code format (expected XXXXXX-X or XXXXXXX-X)')

const favoriteParamsSchema = z.object({
  type: vehicleTypeSchema,
  fipeCode: fipeCodeSchema,
})

export function validateFavoriteParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = favoriteParamsSchema.safeParse(req.params)

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

---

### Task 3: Create the `favorite-vehicle` types

**Files:**
- Create: `backend/src/features/favorite-vehicle/favoriteVehicle.types.ts`

- [ ] **Step 1: Write the file**

```typescript
export interface FavoriteResponse {
  fipeCode: string
  vehicleType: string
  brand: string | null
  model: string | null
  favorited: boolean
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}
```

---

### Task 4: Create the `favorite-vehicle` routes

**Files:**
- Create: `backend/src/features/favorite-vehicle/favoriteVehicle.routes.ts`

**Standards:** `docs/IA/standards/api.md`

- [ ] **Step 1: Write the file**

```typescript
import { Router } from 'express'
import type { FavoriteVehicleRepository } from './favoriteVehicle.repository'
import { validateFavoriteParams } from './favoriteVehicle.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { FavoriteResponse } from './favoriteVehicle.types'

function toFavoriteResponse(repo: Awaited<ReturnType<FavoriteVehicleRepository['listFavorites']>>[number]): FavoriteResponse {
  return {
    fipeCode: repo.fipeCode,
    vehicleType: repo.vehicleType,
    brand: repo.brand,
    model: repo.model,
    favorited: true,
    years: repo.years.map((y) => ({
      yearCode: y.yearCode,
      yearLabel: y.yearLabel,
      price: y.price,
      fuel: y.fuel,
      referenceMonth: y.referenceMonth,
      fuelAcronym: y.fuelAcronym,
    })),
  }
}

export function createFavoriteVehicleRoutes(
  repository: FavoriteVehicleRepository,
): Router {
  const router = Router()

  // POST /api/favorites/:type/:fipeCode — favorite a vehicle
  router.post(
    '/api/favorites/:type/:fipeCode',
    validateFavoriteParams,
    asyncHandler(async (req, res) => {
      const { fipeCode } = req.params

      const vehicle = await repository.findByFipeCode(fipeCode)
      if (!vehicle) {
        throw new NotFoundError('VEHICLE_NOT_FOUND', `No vehicle found with FIPE code ${fipeCode}`)
      }

      await repository.setFavorite(vehicle.id, true)

      const favorites = await repository.listFavorites()
      const favorite = favorites.find((f) => f.fipeCode === fipeCode)

      res.json({
        success: true,
        data: favorite ? toFavoriteResponse(favorite) : { fipeCode, vehicleType: vehicle.vehicleType, brand: vehicle.brand, model: vehicle.model, favorited: true, years: [] },
      })
    }),
  )

  // DELETE /api/favorites/:type/:fipeCode — unfavorite a vehicle
  router.delete(
    '/api/favorites/:type/:fipeCode',
    validateFavoriteParams,
    asyncHandler(async (req, res) => {
      const { fipeCode } = req.params

      const vehicle = await repository.findByFipeCode(fipeCode)
      if (!vehicle) {
        throw new NotFoundError('VEHICLE_NOT_FOUND', `No vehicle found with FIPE code ${fipeCode}`)
      }

      await repository.setFavorite(vehicle.id, false)

      res.json({
        success: true,
        data: {
          fipeCode: vehicle.fipeCode,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand,
          model: vehicle.model,
          favorited: false,
          years: [],
        },
      })
    }),
  )

  // GET /api/favorites — list all favorited vehicles
  router.get(
    '/api/favorites',
    asyncHandler(async (_req, res) => {
      const favorites = await repository.listFavorites()

      res.json({
        success: true,
        data: favorites.map(toFavoriteResponse),
      })
    }),
  )

  return router
}
```

---

### Task 5: Create the `favorite-vehicle` index

**Files:**
- Create: `backend/src/features/favorite-vehicle/index.ts`

- [ ] **Step 1: Write the file**

```typescript
export { createFavoriteVehicleRoutes } from './favoriteVehicle.routes'
export type { FavoriteResponse } from './favoriteVehicle.types'
```

---

### Task 6: Wire the `favorite-vehicle` slice into `server.ts`

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add imports and wiring**

Add after the existing `vehicleSearch` DI block (after line 21):

```typescript
import { FavoriteVehicleRepository } from './features/favorite-vehicle/favoriteVehicle.repository'
import { createFavoriteVehicleRoutes } from './features/favorite-vehicle/index'
```

Add after `const vehicleSearchService = ...` line:

```typescript
const favoriteVehicleRepo = new FavoriteVehicleRepository(db)
```

Add after the existing `app.use(createVehicleSearchRoutes(...))` line:

```typescript
app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
```

The complete DI section of `server.ts` will look like:

```typescript
// Dependencies — manual DI (composition root)
const fipeClient = new FipeClient('https://fipe.parallelum.com.br/api/v2')
const db = getDb()
const vehicleSearchRepo = new VehicleSearchRepository(db)
const vehicleSearchService = new VehicleSearchService(fipeClient, vehicleSearchRepo)
const favoriteVehicleRepo = new FavoriteVehicleRepository(db)

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})
app.use(createVehicleSearchRoutes(vehicleSearchService))
app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
```

---

### Task 7: Write backend tests

**Files:**
- Create: `backend/src/features/favorite-vehicle/favoriteVehicle.test.ts`

**Standards:** `docs/IA/standards/testing.md`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { FavoriteVehicleRepository } from './favoriteVehicle.repository'
import { createFavoriteVehicleRoutes } from './favoriteVehicle.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'
import { VehicleSearchRepository } from '../vehicle-search/vehicleSearch.repository'

describe('Favorite Vehicle Routes', () => {
  let db: PrismaClient
  let repo: FavoriteVehicleRepository
  let vehicleSearchRepo: VehicleSearchRepository
  let app: express.Express

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new FavoriteVehicleRepository(db)
    vehicleSearchRepo = new VehicleSearchRepository(db)
    app = express()
    app.use(express.json())
    app.use(createFavoriteVehicleRoutes(repo))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  describe('POST /api/favorites/:type/:fipeCode', () => {
    it('should favorite a vehicle when vehicle exists', async () => {
      await vehicleSearchRepo.createVehicleWithYears('005490-9', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      const response = await request(app).post('/api/favorites/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.favorited).toBe(true)
      expect(response.body.data.years).toHaveLength(1)
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).post('/api/favorites/cars/005490-9')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 400 when vehicle type is invalid', async () => {
      const response = await request(app).post('/api/favorites/boats/005490-9')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when FIPE code format is invalid', async () => {
      const response = await request(app).post('/api/favorites/cars/abc')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/favorites/:type/:fipeCode', () => {
    it('should unfavorite a vehicle', async () => {
      await vehicleSearchRepo.createVehicleWithYears('005490-9', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      // First, favorite it
      await request(app).post('/api/favorites/cars/005490-9')

      // Then unfavorite
      const response = await request(app).delete('/api/favorites/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.favorited).toBe(false)
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).delete('/api/favorites/cars/005490-9')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })
  })

  describe('GET /api/favorites', () => {
    it('should list only favorited vehicles', async () => {
      await vehicleSearchRepo.createVehicleWithYears('005490-9', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])
      await vehicleSearchRepo.createVehicleWithYears('001004-9', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      // Favorite only one
      await request(app).post('/api/favorites/cars/005490-9')

      const response = await request(app).get('/api/favorites')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].fipeCode).toBe('005490-9')
    })

    it('should return empty array when no favorites', async () => {
      const response = await request(app).get('/api/favorites')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(0)
    })
  })
})
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
cd backend && npx vitest run src/features/favorite-vehicle/favoriteVehicle.test.ts
```

Expected: 7 tests pass.

---

### Task 8: Install shadcn/ui in the frontend

**Files:**
- Modify: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`
- Create: `frontend/src/components/ui/` (generated)
- Create: `frontend/components.json`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
cd frontend && npx shadcn@latest init -d --force
```

- [ ] **Step 2: Add required shadcn components**

```bash
cd frontend && npx shadcn@latest add dialog button input label badge card skeleton scroll-area sonner --yes
```

Expected: Components appear in `frontend/src/components/ui/`.

- [ ] **Step 3: Install lucide-react for icons**

```bash
cd frontend && npm install lucide-react
```

---

### Task 9: Create frontend API service layer

**Files:**
- Create: `frontend/src/services/vehicleSearchApi.ts`
- Create: `frontend/src/services/favoriteApi.ts`
- Create: `frontend/src/services/types.ts`

- [ ] **Step 1: Write shared types**

```typescript
// frontend/src/services/types.ts
export type VehicleType = 'cars' | 'motorcycles'

export interface Year {
  code: string
  name: string
}

export interface SearchResponse {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: Year[]
}

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
}

export interface FavoriteVehicle {
  fipeCode: string
  vehicleType: string
  brand: string | null
  model: string | null
  favorited: boolean
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}

export function parsePrice(priceString: string): number {
  const cleaned = priceString
    .replace('R$ ', '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}
```

- [ ] **Step 2: Write vehicleSearchApi.ts**

```typescript
// frontend/src/services/vehicleSearchApi.ts
import { api } from './api'
import type { SearchResponse, YearDetailResponse, VehicleType } from './types'

export async function searchByFipeCode(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<SearchResponse> {
  const response = await api.get(`/api/vehicle/${vehicleType}/${fipeCode}`)
  return response.data.data
}

export async function getYearDetail(
  vehicleType: VehicleType,
  fipeCode: string,
  yearCode: string,
): Promise<YearDetailResponse> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/${fipeCode}/years/${yearCode}`,
  )
  return response.data.data
}
```

- [ ] **Step 3: Write favoriteApi.ts**

```typescript
// frontend/src/services/favoriteApi.ts
import { api } from './api'
import type { FavoriteVehicle, VehicleType } from './types'

export async function getFavorites(): Promise<FavoriteVehicle[]> {
  const response = await api.get('/api/favorites')
  return response.data.data
}

export async function addFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<FavoriteVehicle> {
  const response = await api.post(`/api/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}

export async function removeFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<{ fipeCode: string; favorited: boolean }> {
  const response = await api.delete(`/api/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}
```

---

### Task 10: Create React Query hooks

**Files:**
- Create: `frontend/src/hooks/useFavorites.ts`
- Create: `frontend/src/hooks/useVehicleSearch.ts`

**Standards:** `docs/IA/standards/frontend.md`

- [ ] **Step 1: Write useFavorites hook**

```typescript
// frontend/src/hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as favoriteApi from '../services/favoriteApi'
import type { FavoriteVehicle, VehicleType } from '../services/types'

export const favoriteKeys = {
  list: ['favorites'] as const,
}

export function useFavorites(): {
  favorites: FavoriteVehicle[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: favoriteKeys.list,
    queryFn: favoriteApi.getFavorites,
  })

  return {
    favorites: data ?? [],
    isLoading,
    error: error as Error | null,
  }
}

export function useAddFavorite(): {
  addFavorite: (vehicleType: VehicleType, fipeCode: string) => void
  isPending: boolean
} {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      favoriteApi.addFavorite(vehicleType, fipeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list })
    },
  })

  return {
    addFavorite: (vehicleType, fipeCode) =>
      mutation.mutate({ vehicleType, fipeCode }),
    isPending: mutation.isPending,
  }
}

export function useRemoveFavorite(): {
  removeFavorite: (vehicleType: VehicleType, fipeCode: string) => void
  isPending: boolean
} {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      favoriteApi.removeFavorite(vehicleType, fipeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list })
    },
  })

  return {
    removeFavorite: (vehicleType, fipeCode) =>
      mutation.mutate({ vehicleType, fipeCode }),
    isPending: mutation.isPending,
  }
}
```

- [ ] **Step 2: Write useVehicleSearch hook**

```typescript
// frontend/src/hooks/useVehicleSearch.ts
import { useMutation } from '@tanstack/react-query'
import * as vehicleSearchApi from '../services/vehicleSearchApi'
import type { SearchResponse, YearDetailResponse, VehicleType } from '../services/types'

export function useVehicleSearch(): {
  searchByFipeCode: (vehicleType: VehicleType, fipeCode: string) => Promise<SearchResponse>
  isSearching: boolean
  getYearDetail: (vehicleType: VehicleType, fipeCode: string, yearCode: string) => Promise<YearDetailResponse>
  isFetchingDetail: boolean
} {
  const searchMutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      vehicleSearchApi.searchByFipeCode(vehicleType, fipeCode),
  })

  const detailMutation = useMutation({
    mutationFn: ({
      vehicleType,
      fipeCode,
      yearCode,
    }: {
      vehicleType: VehicleType
      fipeCode: string
      yearCode: string
    }) => vehicleSearchApi.getYearDetail(vehicleType, fipeCode, yearCode),
  })

  return {
    searchByFipeCode: (vehicleType, fipeCode) =>
      searchMutation.mutateAsync({ vehicleType, fipeCode }),
    isSearching: searchMutation.isPending,
    getYearDetail: (vehicleType, fipeCode, yearCode) =>
      detailMutation.mutateAsync({ vehicleType, fipeCode, yearCode }),
    isFetchingDetail: detailMutation.isPending,
  }
}
```

---

### Task 11: Create presentational components — FavoritesButton and VehicleCard

**Files:**
- Create: `frontend/src/features/favorite-vehicle/FavoritesButton.tsx`
- Create: `frontend/src/features/favorite-vehicle/VehicleCard.tsx`

**Standards:** `docs/IA/standards/frontend.md`, `docs/IA/standards/frontend-pitfalls.md`

- [ ] **Step 1: Write FavoritesButton (port from prototype, adapt from Next.js Link)**

```typescript
// frontend/src/features/favorite-vehicle/FavoritesButton.tsx
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoritesButtonProps {
  isFavorite: boolean
  onToggle: () => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function FavoritesButton({
  isFavorite,
  onToggle,
  className,
  size = 'icon',
}: FavoritesButtonProps) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'hover:bg-transparent',
        isFavorite && 'text-red-500 hover:text-red-600',
        className,
      )}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn('size-5 transition-colors', isFavorite && 'fill-current')}
      />
    </Button>
  )
}
```

- [ ] **Step 2: Write VehicleCard (port from prototype, remove Next.js Link)**

```typescript
// frontend/src/features/favorite-vehicle/VehicleCard.tsx
import { Car, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FavoritesButton } from './FavoritesButton'
import { formatPrice, parsePrice } from '../../services/types'
import type { VehicleType } from '../../services/types'

interface VehicleCardProps {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
  }[]
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function VehicleCard({
  fipeCode,
  vehicleType,
  brand,
  model,
  years,
  isFavorite,
  onToggleFavorite,
}: VehicleCardProps) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {vehicleType === 'cars' ? (
              <Car className="size-4" />
            ) : (
              <Bike className="size-4" />
            )}
            <span className="text-xs uppercase tracking-wide">{brand ?? 'Unknown'}</span>
          </div>
          <FavoritesButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
        </div>
        <CardTitle className="line-clamp-2 text-base leading-tight">
          {model ?? 'Unknown model'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {years.map((year) => (
            <div
              key={year.yearCode}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{year.yearLabel}</span>
                {year.fuel && (
                  <Badge variant="secondary" className="text-xs">
                    {year.fuel}
                  </Badge>
                )}
              </div>
              {year.price && (
                <span className="text-sm font-semibold">
                  {formatPrice(parsePrice(year.price))}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          FIPE: {fipeCode}
        </p>
      </CardContent>
    </Card>
  )
}
```

---

### Task 12: Create presentational component — FavoriteList

**Files:**
- Create: `frontend/src/features/favorite-vehicle/FavoriteList.tsx`

- [ ] **Step 1: Write FavoriteList**

```typescript
// frontend/src/features/favorite-vehicle/FavoriteList.tsx
import { VehicleCard } from './VehicleCard'
import type { FavoriteVehicle, VehicleType } from '../../services/types'

interface FavoriteListProps {
  favorites: FavoriteVehicle[]
  onRemoveFavorite: (vehicleType: VehicleType, fipeCode: string) => void
}

export function FavoriteList({ favorites, onRemoveFavorite }: FavoriteListProps) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">No favorites yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for a vehicle by FIPE code and add it to your favorites.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((fav) => (
        <VehicleCard
          key={fav.fipeCode}
          fipeCode={fav.fipeCode}
          vehicleType={fav.vehicleType as VehicleType}
          brand={fav.brand}
          model={fav.model}
          years={fav.years}
          isFavorite
          onToggleFavorite={() =>
            onRemoveFavorite(fav.vehicleType as VehicleType, fav.fipeCode)
          }
        />
      ))}
    </div>
  )
}
```

---

### Task 13: Create container component — FavoriteListContainer

**Files:**
- Create: `frontend/src/features/favorite-vehicle/FavoriteListContainer.tsx`

- [ ] **Step 1: Write FavoriteListContainer**

```typescript
// frontend/src/features/favorite-vehicle/FavoriteListContainer.tsx
import { useFavorites, useRemoveFavorite } from '../../hooks/useFavorites'
import { FavoriteList } from './FavoriteList'
import { Skeleton } from '@/components/ui/skeleton'
import type { VehicleType } from '../../services/types'

export function FavoriteListContainer() {
  const { favorites, isLoading, error } = useFavorites()
  const { removeFavorite } = useRemoveFavorite()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load favorites: {error.message}</p>
      </div>
    )
  }

  return (
    <FavoriteList
      favorites={favorites}
      onRemoveFavorite={(vehicleType: VehicleType, fipeCode: string) =>
        removeFavorite(vehicleType, fipeCode)
      }
    />
  )
}
```

---

### Task 14: Create the `favorite-vehicle` feature index

**Files:**
- Create: `frontend/src/features/favorite-vehicle/index.ts`

- [ ] **Step 1: Write the index**

```typescript
export { FavoriteListContainer } from './FavoriteListContainer'
export { VehicleCard } from './VehicleCard'
export { FavoritesButton } from './FavoritesButton'
```

---

### Task 15: Create the AddByFipeDialog (port from prototype)

**Files:**
- Create: `frontend/src/features/add-by-fipe/AddByFipeDialog.tsx`

- [ ] **Step 1: Write AddByFipeDialog**

```typescript
// frontend/src/features/add-by-fipe/AddByFipeDialog.tsx
import { useState } from 'react'
import { Loader2, Plus, Car, Bike, Search, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useVehicleSearch } from '../../hooks/useVehicleSearch'
import { useAddFavorite } from '../../hooks/useFavorites'
import type { VehicleType, Year } from '../../services/types'

type Step = 'input' | 'select-year'

interface AddByFipeDialogProps {
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline' | 'secondary'
}

export function AddByFipeDialog({
  triggerLabel = 'Add by FIPE code',
  triggerVariant = 'default',
}: AddByFipeDialogProps) {
  const { searchByFipeCode, isSearching, getYearDetail, isFetchingDetail } =
    useVehicleSearch()
  const { addFavorite } = useAddFavorite()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('input')
  const [vehicleType, setVehicleType] = useState<VehicleType>('cars')
  const [fipeCode, setFipeCode] = useState('')
  const [years, setYears] = useState<Year[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedYears, setSavedYears] = useState<Set<string>>(new Set())
  const [savingYear, setSavingYear] = useState<string | null>(null)

  const resetState = () => {
    setStep('input')
    setFipeCode('')
    setYears([])
    setError(null)
    setSavedYears(new Set())
    setSavingYear(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(resetState, 200)
    }
  }

  const normalizeFipeCode = (code: string) => {
    const trimmed = code.trim().replace(/\s+/g, '')
    if (trimmed.includes('-')) return trimmed
    if (trimmed.length === 7) {
      return `${trimmed.slice(0, 6)}-${trimmed.slice(6)}`
    }
    return trimmed
  }

  const handleFetchYears = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fipeCode.trim()) {
      setError('Please enter a FIPE code.')
      return
    }

    const normalized = normalizeFipeCode(fipeCode)
    setError(null)

    try {
      const result = await searchByFipeCode(vehicleType, normalized)

      if (result.years.length === 0) {
        setError(
          `No vehicle found for FIPE code "${normalized}". Check the code and vehicle type.`,
        )
        return
      }

      setFipeCode(normalized)
      setYears(result.years)
      setStep('select-year')
    } catch {
      setError(
        `Could not find vehicle. Verify the FIPE code "${normalized}" and selected vehicle type.`,
      )
    }
  }

  const handleSelectYear = async (year: Year) => {
    setSavingYear(year.code)
    setError(null)

    try {
      await Promise.all([
        getYearDetail(vehicleType, fipeCode, year.code),
        addFavorite(vehicleType, fipeCode),
      ])

      setSavedYears((prev) => new Set(prev).add(year.code))
    } catch {
      setError('Could not load vehicle details. Try again.')
    } finally {
      setSavingYear(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2">
          <Plus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'input' && (
          <>
            <DialogHeader>
              <DialogTitle>Add favorite by FIPE code</DialogTitle>
              <DialogDescription>
                Enter the FIPE code and select the vehicle type. We'll fetch the
                available years for you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFetchYears} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleType('cars')}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-medium transition-colors ${
                      vehicleType === 'cars'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Car className="size-4" />
                    Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleType('motorcycles')}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-medium transition-colors ${
                      vehicleType === 'motorcycles'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Bike className="size-4" />
                    Motorcycle
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fipe-code">FIPE code</Label>
                <Input
                  id="fipe-code"
                  placeholder="e.g. 001004-9"
                  value={fipeCode}
                  onChange={(e) => setFipeCode(e.target.value)}
                  autoFocus
                  disabled={isSearching}
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isSearching} className="w-full gap-2">
                  {isSearching ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Search vehicle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === 'select-year' && (
          <>
            <DialogHeader>
              <DialogTitle>Select year and fuel</DialogTitle>
              <DialogDescription>
                FIPE code <span className="font-mono">{fipeCode}</span> has{' '}
                {years.length} available {years.length === 1 ? 'option' : 'options'}.
                Tap one to add it to favorites.
              </DialogDescription>
            </DialogHeader>

            {savedYears.size > 0 && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                {savedYears.size} {savedYears.size === 1 ? 'year' : 'years'} saved to
                favorites.
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {years.map((year) => {
                const alreadySaved = savedYears.has(year.code)
                const isSaving = savingYear === year.code
                return (
                  <button
                    key={year.code}
                    type="button"
                    onClick={() => !alreadySaved && handleSelectYear(year)}
                    disabled={alreadySaved || isSaving}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="font-medium text-foreground">{year.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Code: {year.code}
                      </p>
                    </div>
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : alreadySaved ? (
                      <Badge variant="secondary">Saved</Badge>
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={resetState} className="gap-2">
                <ArrowLeft className="size-4" />
                Search another
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 16: Create the `add-by-fipe` feature index

**Files:**
- Create: `frontend/src/features/add-by-fipe/index.ts`

- [ ] **Step 1: Write the index**

```typescript
export { AddByFipeDialog } from './AddByFipeDialog'
```

---

### Task 17: Create `lib/utils.ts` (required by shadcn/ui)

**Files:**
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Write utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Install required dependencies**

```bash
cd frontend && npm install clsx tailwind-merge
```

---

### Task 18: Wire the frontend App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Rewrite App.tsx**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddByFipeDialog } from './features/add-by-fipe'
import { FavoriteListContainer } from './features/favorite-vehicle'

const queryClient = new QueryClient()

function AppContent() {
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
          <AddByFipeDialog triggerVariant="default" />
        </header>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Favorites</h2>
          <FavoriteListContainer />
        </section>
      </div>
    </main>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Update main.tsx to import global CSS**

If `main.tsx` doesn't already import a global CSS file, add at the top:

```typescript
import './globals.css'
```

- [ ] **Step 3: Create globals.css with Tailwind directives (if not generated by shadcn init)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### Task 19: Run the full stack and verify

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verify the flow end-to-end**

1. Open http://localhost:5173 — should see "MyCars" header with empty favorites
2. Click "Add by FIPE code" — dialog opens
3. Select "Car", enter `001004-9`, click "Search vehicle"
4. Year list appears — tap a year
5. Year gets "Saved" badge, dialog stays open
6. Close dialog — favorited vehicle appears in the grid
7. Click heart to unfavorite — vehicle disappears from grid
8. Refresh page — favorites persist (loaded from backend)

- [ ] **Step 4: Run lint**

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

---

### Task 20: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add backend/src/features/favorite-vehicle/ backend/src/server.ts frontend/src/
git commit -m "feat: implement add-by-fipe dialog and vehicle favoriting

Backend: new favorite-vehicle vertical slice with POST/DELETE/GET endpoints.
Frontend: port AddByFipeDialog and favorites UI from prototype, wired to
React Query with proper loading/error/empty states.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
