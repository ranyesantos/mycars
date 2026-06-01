# Cascading Search & Favorites Routing — Design Spec

**Date:** 2026-05-24
**Status:** approved

## Overview

Implement cascading brand → model search on the main page, move the favorites list to a `/favorites` route, and keep the "Add by FIPE" dialog accessible from both pages. Port the SearchFilters, VehicleTypeTabs, and result grid from the prototype, connecting them to the Express backend.

## Backend: Extend `vehicle-search` slice

### Extend `IFipeClient` (`shared/services/fipe/fipe.types.ts`)

New types:
```typescript
export interface FipeBrand { code: string; name: string }
export interface FipeModel { code: number; name: string }
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

New methods on `IFipeClient`:
```typescript
fetchBrands(type: string): Promise<FipeBrand[]>
fetchModels(type: string, brandCode: string): Promise<FipeModel[]>
fetchYearsByBrandModel(type: string, brandCode: string, modelCode: number): Promise<FipeYear[]>
fetchPriceByBrandModel(type: string, brandCode: string, modelCode: number, yearCode: string): Promise<FipePriceDetail | null>
```

### Implement in `FipeClient` (`shared/services/fipe/fipe.client.ts`)

Each new method calls the corresponding FIPE API endpoint:
- `GET /api/v2/{type}/brands`
- `GET /api/v2/{type}/brands/{code}/models`
- `GET /api/v2/{type}/brands/{code}/models/{code}/years`
- `GET /api/v2/{type}/brands/{code}/models/{code}/years/{code}`

All follow the existing pattern: handle 404 gracefully, throw `FipeApiError` (502) on other failures.

### New routes in `vehicleSearch.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/vehicle/:type/brands` | List all brands for a vehicle type |
| `GET` | `/api/vehicle/:type/brands/:brandCode/models` | List models for a brand |
| `GET` | `/api/vehicle/:type/brands/:brandCode/models/:modelCode/years` | List available years from FIPE API. No DB write (FIPE code not yet known). |
| `GET` | `/api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode` | Get price detail from FIPE API (includes FIPE code). Then find-or-create vehicle + year in DB, cache price data. Returns price detail with FIPE code. |

### New service methods in `VehicleSearchService`

- `getBrands(type)` → calls `fipeClient.fetchBrands(type)`, returns `FipeBrand[]`
- `getModels(type, brandCode)` → calls `fipeClient.fetchModels(type, brandCode)`, returns `FipeModel[]`
- `getYearsByBrandModel(type, brandCode, modelCode)` → fetches years from FIPE API. Returns year list only — no DB write (FIPE code not known until price detail is fetched)
- `getPriceByBrandModel(type, brandCode, modelCode, yearCode)` → fetches price detail from FIPE API (includes FIPE code). Does a find-or-create: if vehicle with that FIPE code doesn't exist, creates it + the year row. If it exists but year is missing, adds the year. Updates year with price/fuel data. Returns price detail including `codeFipe`

### New validator

Extend `vehicleSearch.validator.ts` with zod schemas for the new route params (same `type` schema, add `brandCode` and `modelCode` validators).

### Response format

All responses follow the standard envelope `{ success: true, data: ... }`. Errors delegate to central error handler via `next(err)`.

---

## Frontend

### Dependencies

- `react-router-dom` for client-side routing

### File structure

```
src/
  App.tsx                        — BrowserRouter + layout shell
  pages/
    HomePage.tsx                 — main page: type tabs + filters + results
    FavoritesPage.tsx            — favorites page: list + add by FIPE button
  features/
    browse-vehicles/
      VehicleTypeTabs.tsx        — tabs: Cars / Motorcycles
      SearchFilters.tsx          — cascading brand → model selects
      VehicleResultList.tsx      — grid of year result cards
      VehicleResultCard.tsx      — single year card with favorite button
      index.ts
    add-by-fipe/                 — unchanged
    favorite-vehicle/            — unchanged
  hooks/
    useBrowseVehicles.ts         — React Query hooks for brands/models/years/price
    useFavorites.ts              — unchanged
    useVehicleSearch.ts          — unchanged
  services/
    vehicleSearchApi.ts          — extend with brands/models/years/price API calls
    favoriteApi.ts               — unchanged
    types.ts                     — add cascading search types
```

### Routes

| Path | Component | Content |
|------|-----------|---------|
| `/` | `HomePage` | VehicleTypeTabs, SearchFilters (brand→model), VehicleResultList (year cards), "Add by FIPE" button in header |
| `/favorites` | `FavoritesPage` | FavoriteListContainer, "Add by FIPE" button, back-link to home |

### App.tsx shell

```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h1>MyCars</h1>
                <p>Track vehicle prices from the FIPE table</p>
              </div>
              <div className="flex items-center gap-2">
                <NavLink to="/">Search</NavLink>
                <NavLink to="/favorites">Favorites</NavLink>
                <AddByFipeDialog />
              </div>
            </header>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
            </Routes>
          </div>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

### Data flow

1. User selects vehicle type (cars/motorcycles) → `useQuery` fetches brands (`GET /api/vehicle/:type/brands`)
2. User selects brand → `useQuery` fetches models (`GET /api/vehicle/:type/brands/:code/models`)
3. User selects model → `useQuery` fetches years (`GET /api/vehicle/:type/brands/:code/models/:code/years`) — no DB write yet, FIPE code is not known.
4. Years are displayed as a grid of `VehicleResultCard` components (year label + favorite button)
5. User clicks favorite on a year card → sequential flow:
   - Fetch price detail (`GET /api/vehicle/:type/brands/:code/models/:code/years/:yearCode`) — returns FIPE code + price. Backend does find-or-create of vehicle + year in DB.
   - Then POST favorite (`POST /api/favorites/:type/:fipeCode`) using the FIPE code from step above
6. Card shows "Saved" badge on success
7. On `/favorites` page, `FavoriteListContainer` fetches `GET /api/favorites` and displays the favorited vehicles grouped by FIPE code

### State management

- **Server state**: brands, models, years, prices → React Query (`useQuery` with enabled flag for cascading)
- **UI state**: selected `vehicleType`, `brandCode`, `modelCode` → `useState` in `HomePage`
- **Saved year tracking**: local `Set<string>` state in result list (same pattern as dialog)

### Loading/error/empty states

| State | Behavior |
|-------|----------|
| Brands loading | Skeleton in select |
| Models loading | Skeleton in select |
| Years loading | Skeleton grid (3-4 cards) |
| No model selected | "Select a model to see available years" placeholder |
| API error | Inline error banner with retry |
| Empty brand/list | Disabled select with "No results" |
| Favorite click error | Toast notification |

---

## Out of scope

- Price history / price change badges on favorites page
- Vehicle detail page (`/vehicle/...`)
- Truck vehicle type
- FIPE API reference month parameter (uses latest by default)

---

## Testing

### Backend (extend `vehicleSearch.test.ts`)

- should list brands for cars
- should list models for a valid brand
- should list years for a valid brand/model and cache in DB
- should return price detail for a valid brand/model/year
- should return empty array when brand does not exist
- should return empty array when model does not exist

### Frontend

Visual verification by running the app end-to-end.
