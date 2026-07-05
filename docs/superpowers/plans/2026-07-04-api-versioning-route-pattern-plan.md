# API Versioning & Route Pattern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the `/api` prefix and version into a single mount point (`/api/v1`), strip prefixes from all route files, and add a shared `API_V1` constant on the frontend.

**Architecture:** New `routes.ts` file aggregates feature routers under resource paths. `server.ts` mounts the aggregated router at `/api/v1`. Route files define paths relative to their resource. Frontend gets a single `API_V1` constant in `api.ts`.

**Tech Stack:** Express + TypeScript (backend), React + Axios (frontend), Supertest + Vitest (tests)

## Global Constraints

- `/api/health` stays unversioned — infrastructure endpoint
- Response envelope (`{ success, data }`) unchanged
- No business logic in route files — already satisfied, no changes needed
- All existing tests must pass with updated URLs

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/routes.ts` | Create | Route aggregation under resource paths |
| `backend/src/server.ts` | Modify | Wire `createApiRoutes()`, mount at `/api/v1` |
| `backend/src/features/vehicle-search/vehicleSearch.routes.ts` | Modify | Strip `/api/vehicle` prefix from 6 routes |
| `backend/src/features/favorite-vehicle/favoriteVehicle.routes.ts` | Modify | Strip `/api/favorites` prefix from 3 routes |
| `backend/src/features/scrape-details/scrapeDetails.routes.ts` | Modify | Strip `/api/scraping` prefix from 2 routes, update pollUrl |
| `backend/src/features/vehicle-detail/vehicleDetail.routes.ts` | Modify | Strip `/api/vehicles` prefix from 1 route |
| `backend/src/server.test.ts` | Modify | Update describe string (path stays `/api/health`) |
| `backend/src/features/vehicle-search/vehicleSearch.test.ts` | Modify | 13 URL string replacements |
| `backend/src/features/favorite-vehicle/favoriteVehicle.test.ts` | Modify | 7 URL string replacements |
| `backend/src/features/scrape-details/scrapeDetails.test.ts` | Modify | 8 URL string replacements |
| `backend/src/features/vehicle-detail/vehicleDetail.test.ts` | Modify | 4 URL string replacements |
| `frontend/src/services/api.ts` | Modify | Add `API_V1` export |
| `frontend/src/services/vehicleSearchApi.ts` | Modify | 6 URL replacements using `API_V1` |
| `frontend/src/services/favoriteApi.ts` | Modify | 3 URL replacements using `API_V1` |
| `frontend/src/services/vehicleDetailApi.ts` | Modify | 1 URL replacement using `API_V1` |

---

### Task 1: Create `routes.ts` — route aggregation

**Files:**
- Create: `backend/src/routes.ts`

**Interfaces:**
- Produces: `export function createApiRoutes(routers: { vehicleSearch: Router; favorites: Router; scrapeDetails: Router; vehicleDetail: Router }): Router`

- [ ] **Step 1: Create the file**

```ts
import { Router } from 'express'

export function createApiRoutes(routers: {
  vehicleSearch: Router
  favorites: Router
  scrapeDetails: Router
  vehicleDetail: Router
}): Router {
  const router = Router()

  router.use('/vehicles', routers.vehicleSearch)
  router.use('/favorites', routers.favorites)
  router.use('/scraping', routers.scrapeDetails)
  router.use('/vehicles', routers.vehicleDetail)

  return router
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npx tsc --noEmit src/routes.ts
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes.ts
git commit -m "feat: add createApiRoutes aggregator for /api/v1 resource mounts"
```

---

### Task 2: Update `server.ts` — wire aggregator and mount at `/api/v1`

**Files:**
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `createApiRoutes` from `./routes`
- Produces: `app.use('/api/v1', routes)` — aggregated router mounted at versioned path

- [ ] **Step 1: Add import for `createApiRoutes`**

Add this import after the existing feature imports:

```ts
import { createApiRoutes } from './routes'
```

- [ ] **Step 2: Replace individual `app.use()` calls with aggregated router**

Replace lines 41-44:

```ts
app.use(createVehicleSearchRoutes(vehicleSearchService))
app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
app.use(createScrapeDetailsRoutes(scrapeDetailsService))
app.use(createVehicleDetailRoutes(vehicleDetailRepo))
```

With:

```ts
const routes = createApiRoutes({
  vehicleSearch: createVehicleSearchRoutes(vehicleSearchService),
  favorites: createFavoriteVehicleRoutes(favoriteVehicleRepo),
  scrapeDetails: createScrapeDetailsRoutes(scrapeDetailsService),
  vehicleDetail: createVehicleDetailRoutes(vehicleDetailRepo),
})

app.use('/api/v1', routes)
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd backend && npx tsc --noEmit src/server.ts
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: mount aggregated routes at /api/v1"
```

---

### Task 3: Strip prefixes from all 4 route files

**Files:**
- Modify: `backend/src/features/vehicle-search/vehicleSearch.routes.ts`
- Modify: `backend/src/features/favorite-vehicle/favoriteVehicle.routes.ts`
- Modify: `backend/src/features/scrape-details/scrapeDetails.routes.ts`
- Modify: `backend/src/features/vehicle-detail/vehicleDetail.routes.ts`

**Interfaces:**
- Consumes: Route mount points from `routes.ts` (`/vehicles`, `/favorites`, `/scraping`)
- Produces: Relative route paths — no `/api/<resource>` prefix in any route definition

- [ ] **Step 1: `vehicleSearch.routes.ts` — strip `/api/vehicle` prefix from 6 routes**

Replace all 6 route paths. The pattern: `/api/vehicle/<rest>` → `/<rest>`:

```ts
// Line 19-21: comment + route
// GET /api/vehicle/:type/brands
// →
// GET /api/v1/vehicles/:type/brands
router.get(
  '/:type/brands',
```

```ts
// Line 30-32: comment + route
// GET /api/vehicle/:type/brands/:brandCode/models
// →
// GET /api/v1/vehicles/:type/brands/:brandCode/models
router.get(
  '/:type/brands/:brandCode/models',
```

```ts
// Line 42-44: comment + route
// GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years
// →
// GET /api/v1/vehicles/:type/brands/:brandCode/models/:modelCode/years
router.get(
  '/:type/brands/:brandCode/models/:modelCode/years',
```

```ts
// Line 53-55: comment + route
// GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode
// →
// GET /api/v1/vehicles/:type/brands/:brandCode/models/:modelCode/years/:yearCode
router.get(
  '/:type/brands/:brandCode/models/:modelCode/years/:yearCode',
```

```ts
// Line 62-64: route (no comment)
// /api/vehicle/:type/:fipeCode → /:type/:fipeCode
router.get(
  '/:type/:fipeCode',
```

```ts
// Line 76-78: route (no comment)
// /api/vehicle/:type/:fipeCode/years/:yearCode → /:type/:fipeCode/years/:yearCode
router.get(
  '/:type/:fipeCode/years/:yearCode',
```

- [ ] **Step 2: `favoriteVehicle.routes.ts` — strip `/api/favorites` prefix from 3 routes**

Route at line 33: `/api/favorites/:type/:fipeCode` → `/:type/:fipeCode`
Route at line 59: `/api/favorites/:type/:fipeCode` → `/:type/:fipeCode`
Route at line 90: `/api/favorites` → `/`

```ts
// Line 32-33 (POST)
router.post(
  '/:type/:fipeCode',
```

```ts
// Line 58-59 (DELETE)
router.delete(
  '/:type/:fipeCode',
```

```ts
// Line 89-90 (GET)
router.get(
  '/',
```

- [ ] **Step 3: `scrapeDetails.routes.ts` — strip `/api/scraping` prefix from 2 routes + update pollUrl**

Route at line 13: `/api/scraping` → `/`
Route at line 47: `/api/scraping/:jobId/status` → `/:jobId/status`

Also update the pollUrl on line 40 from `/api/scraping/` to `/api/v1/scraping/`:

```ts
// Line 13 (POST)
router.post(
  '/',
```

```ts
// Line 40 — pollUrl in response body
pollUrl: `/api/v1/scraping/${result.jobId}/status`,
```

```ts
// Line 47 (GET)
router.get(
  '/:jobId/status',
```

- [ ] **Step 4: `vehicleDetail.routes.ts` — strip `/api/vehicles` prefix from 1 route**

Route at line 213: `/api/vehicles/:fipeCode/:yearCode/specs` → `/:fipeCode/:yearCode/specs`

```ts
// Line 212-213
router.get(
  '/:fipeCode/:yearCode/specs',
```

- [ ] **Step 5: Verify all 4 files compile**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/features/
git commit -m "feat: strip /api prefix from route files — prefix now at mount point"
```

---

### Task 4: Update all backend test URLs to match new paths

**Files:**
- Modify: `backend/src/server.test.ts` (describe string only — URL stays)
- Modify: `backend/src/features/vehicle-search/vehicleSearch.test.ts`
- Modify: `backend/src/features/favorite-vehicle/favoriteVehicle.test.ts`
- Modify: `backend/src/features/scrape-details/scrapeDetails.test.ts`
- Modify: `backend/src/features/vehicle-detail/vehicleDetail.test.ts`

**Interfaces:**
- Consumes: New URL pattern — `/api/vehicle/<rest>` → `/api/v1/vehicles/<rest>`, `/api/favorites` → `/api/v1/favorites`, `/api/scraping` → `/api/v1/scraping`, `/api/vehicles` → `/api/v1/vehicles`

- [ ] **Step 1: `server.test.ts` — update describe string**

Line 7: `describe('GET /api/health',` — **no URL change needed** (health stays unversioned). Only update the describe for clarity:

```ts
describe('GET /api/health (unversioned)', () => {
```

- [ ] **Step 2: `vehicleSearch.test.ts` — replace all `/api/vehicle/` with `/api/v1/vehicles/`**

Every instance of `/api/vehicle/` in URLs becomes `/api/v1/vehicles/`. There are 13 replacements across describe strings and `request(app).get()` calls. All are pure search-and-replace.

Example — line 191:
```ts
describe('GET /api/v1/vehicles/:type/:fipeCode', () => {
```

Example — line 197:
```ts
const response = await request(app).get('/api/v1/vehicles/cars/005490-9')
```

Apply the same replacement to all lines: 191, 197, 208, 217, 225, 233, 241, 258, 277, 286, 295, 304, 311, 320, 327, 332, 339, 345, 353, 368, 380.

- [ ] **Step 3: `favoriteVehicle.test.ts` — replace all `/api/favorites` with `/api/v1/favorites`**

7 instances across describe strings and request calls.

Example — line 35:
```ts
describe('POST /api/v1/favorites/:type/:fipeCode', () => {
```

Example — line 41:
```ts
const response = await request(app).post('/api/v1/favorites/cars/900001-1')
```

- [ ] **Step 4: `scrapeDetails.test.ts` — replace all `/api/scraping` with `/api/v1/scraping`**

8 instances including the pollUrl assertion on line 82.

Line 82:
```ts
expect(response.body.data.pollUrl).toContain('/api/v1/scraping/')
```

Line 72:
```ts
.post('/api/v1/scraping')
```

Line 202:
```ts
const statusRes = await request(app).get(`/api/v1/scraping/${jobId}/status`)
```

- [ ] **Step 5: `vehicleDetail.test.ts` — replace all `/api/vehicles` with `/api/v1/vehicles`**

4 instances.

Example — line 90:
```ts
describe('GET /api/v1/vehicles/:fipeCode/:yearCode/specs', () => {
```

Example — line 94:
```ts
const response = await request(app).get(`/api/v1/vehicles/${fipeCode}/${yearCode}/specs`)
```

- [ ] **Step 6: Run all backend tests**

```bash
cd backend && npm test
```

All tests must pass. If any fail, review the URL replacements for missed instances.

- [ ] **Step 7: Commit**

```bash
git add backend/src/
git commit -m "test: update backend test URLs to /api/v1 prefixed paths"
```

---

### Task 5: Frontend — add `API_V1` constant and update all service files

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/services/vehicleSearchApi.ts`
- Modify: `frontend/src/services/favoriteApi.ts`
- Modify: `frontend/src/services/vehicleDetailApi.ts`

**Interfaces:**
- Produces: `export const API_V1 = '/api/v1'` from `api.ts`
- Consumes: `API_V1` in 10 call sites across 3 service files

- [ ] **Step 1: Add `API_V1` constant to `api.ts`**

Add the export after the `api` constant:

```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export const API_V1 = '/api/v1'
```

- [ ] **Step 2: Update `vehicleSearchApi.ts` — 6 call sites**

Import `API_V1`:
```ts
import { api, API_V1 } from './api'
```

Replace all 6 URL paths:

```ts
// Line 8 — searchByFipeCode
const response = await api.get(`${API_V1}/vehicles/${vehicleType}/${fipeCode}`)

// Line 17-18 — getYearDetail
const response = await api.get(
  `${API_V1}/vehicles/${vehicleType}/${fipeCode}/years/${yearCode}`,
)

// Line 26 — getBrands
const response = await api.get(`${API_V1}/vehicles/${vehicleType}/brands`)

// Line 34 — getModels
const response = await api.get(`${API_V1}/vehicles/${vehicleType}/brands/${brandCode}/models`)

// Line 43-44 — getYearsByBrandModel
const response = await api.get(
  `${API_V1}/vehicles/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`,
)

// Line 55-56 — getPriceByBrandModel
const response = await api.get(
  `${API_V1}/vehicles/${vehicleType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
)
```

- [ ] **Step 3: Update `favoriteApi.ts` — 3 call sites**

Import `API_V1`:
```ts
import { api, API_V1 } from './api'
```

Replace all 3 URL paths:

```ts
// Line 5 — getFavorites
const response = await api.get(`${API_V1}/favorites`)

// Line 13 — addFavorite
const response = await api.post(`${API_V1}/favorites/${vehicleType}/${fipeCode}`)

// Line 21 — removeFavorite
const response = await api.delete(`${API_V1}/favorites/${vehicleType}/${fipeCode}`)
```

- [ ] **Step 4: Update `vehicleDetailApi.ts` — 1 call site**

Import `API_V1`:
```ts
import { api, API_V1 } from './api'
```

Replace line 108:
```ts
const response = await api.get(`${API_V1}/vehicles/${fipeCode}/${yearCode}/specs`)
```

- [ ] **Step 5: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/
git commit -m "feat: add API_V1 constant and update frontend API call sites"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npm test
```

- [ ] **Step 2: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Start backend and verify health endpoint**

```bash
cd backend && npm run dev
```

In another terminal:
```bash
curl http://localhost:3001/api/health
```

Expected: `{"success":true,"data":{"status":"ok"}}`

- [ ] **Step 4: Quick smoke test — verify a v1 endpoint resolves**

```bash
curl http://localhost:3001/api/v1/vehicles/cars/brands
```

Expected: JSON response with brands array (may be empty if FIPE API is down — just check it doesn't 404).

- [ ] **Step 5: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final verification — all tests pass, manual smoke test passed"
```
