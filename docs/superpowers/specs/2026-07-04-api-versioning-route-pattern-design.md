# API Versioning & Route Pattern — Design

## Problem

- Every route definition hardcodes `/api/<resource>` inline, duplicated across 4 route files and 10 frontend call sites.
- The `/api` prefix has no single source of truth.
- Adding API versioning (e.g., `/api/v1`) would scatter the version string across even more places.

## Goals

1. Establish a consistent route mounting pattern where the version prefix lives in one place.
2. Clean up route files so they only know about their resource path — not the prefix or version.

## Design

### New file: `backend/src/routes.ts`

Exports `createApiRoutes()`. Takes pre-built feature routers, mounts them at resource paths. One concern: route aggregation.

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

No DI, no service/repo knowledge. Just routers under resource paths.

### Modified: `backend/src/server.ts`

Composition root wires dependencies, builds feature routers, passes them to `createApiRoutes()`, mounts result at `/api/v1`.

```ts
const routes = createApiRoutes({
  vehicleSearch: createVehicleSearchRoutes(vehicleSearchService),
  favorites: createFavoriteVehicleRoutes(favoriteVehicleRepo),
  scrapeDetails: createScrapeDetailsRoutes(scrapeDetailsService),
  vehicleDetail: createVehicleDetailRoutes(vehicleDetailRepo),
})

app.get('/api/health', ...)       // health stays unversioned
app.use('/api/v1', routes)        // version lives here
```

### Modified: 4 route files

Strip the `/api/<resource>` prefix from every route definition. The resolved URL is built from the mount chain: `/api/v1` → resource path → route path.

| Feature | Before (in file) | After (in file) | Resolved URL |
|---------|------------------|------------------|-------------|
| vehicleSearch | `/api/vehicle/:type/brands` | `/:type/brands` | `/api/v1/vehicles/:type/brands` |
| vehicleSearch | `/api/vehicle/:type/brands/:brandCode/models` | `/:type/brands/:brandCode/models` | `/api/v1/vehicles/:type/brands/:brandCode/models` |
| vehicleSearch | `/api/vehicle/:type/brands/:brandCode/models/:modelCode/years` | `/:type/brands/:brandCode/models/:modelCode/years` | `/api/v1/vehicles/:type/brands/:brandCode/models/:modelCode/years` |
| vehicleSearch | `/api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode` | `/:type/brands/:brandCode/models/:modelCode/years/:yearCode` | `/api/v1/vehicles/:type/brands/:brandCode/models/:modelCode/years/:yearCode` |
| vehicleSearch | `/api/vehicle/:type/:fipeCode` | `/:type/:fipeCode` | `/api/v1/vehicles/:type/:fipeCode` |
| vehicleSearch | `/api/vehicle/:type/:fipeCode/years/:yearCode` | `/:type/:fipeCode/years/:yearCode` | `/api/v1/vehicles/:type/:fipeCode/years/:yearCode` |
| favorites | `/api/favorites` | `/` | `/api/v1/favorites` |
| favorites | `/api/favorites/:type/:fipeCode` | `/:type/:fipeCode` | `/api/v1/favorites/:type/:fipeCode` |
| scrapeDetails | `/api/scraping` | `/` | `/api/v1/scraping` |
| scrapeDetails | `/api/scraping/:jobId/status` | `/:jobId/status` | `/api/v1/scraping/:jobId/status` |
| vehicleDetail | `/api/vehicles/:fipeCode/:yearCode/specs` | `/:fipeCode/:yearCode/specs` | `/api/v1/vehicles/:fipeCode/:yearCode/specs` |

### Modified: Frontend

Single constant, 10 call sites updated across 4 files:

```ts
// shared/constants.ts (or equivalent)
export const API_V1 = '/api/v1'

// Before
api.get(`/api/vehicle/${vehicleType}/${fipeCode}`)

// After
api.get(`${API_V1}/vehicles/${vehicleType}/${fipeCode}`)
```

Files touched: `vehicleSearchApi.ts`, `favoriteApi.ts`, `vehicleDetailApi.ts`.

### What stays unchanged

- `/api/health` — infrastructure endpoint, never versioned
- Response envelope (`{ success, data }`), error handler, validators, services, repositories
- `vehicleSearch` and `vehicleDetail` both mount at `/vehicles` — their internal route definitions are distinct enough to not collide

## Tests

- Existing integration tests in `server.test.ts` and feature test files must pass without modification — route behavior is identical, only the mounting pattern changes.
- If any test references a hardcoded URL path, update it to match the new resolved paths.

## Rollout

1. Create `routes.ts`
2. Strip prefixes from all 4 route files
3. Update `server.ts` to use `createApiRoutes()` and mount at `/api/v1`
4. Add `API_V1` constant on frontend, update all 10 call sites
5. Run backend and frontend tests
6. Manual smoke test: search, favoriting, scraping, vehicle detail
