# Add by FIPE & Favoriting — Design Spec

**Date:** 2026-05-24
**Status:** approved

## Overview

Implement "add by FIPE code" and "favoriting" in the actual React+Vite frontend, connected to the Express backend. The frontend prototype in `frontend_preview/` serves as the reference for component design and flow; the backend gets a new `favorite-vehicle` vertical slice.

## Backend: New slice `favorite-vehicle`

### Files

```
features/favorite-vehicle/
  favoriteVehicle.repository.ts   — DB reads/writes for favorites
  favoriteVehicle.routes.ts       — POST favorite, DELETE unfavorite, GET list
  favoriteVehicle.validator.ts    — zod: fipeCode + vehicleType format
  favoriteVehicle.types.ts        — response types
  index.ts                        — public surface (routes factory only)
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/favorites/:type/:fipeCode` | Favorite a vehicle. Idempotent — sets `favorited = 1`. Returns 200 with vehicle + years. Returns 404 if vehicle not in DB. |
| `DELETE` | `/api/favorites/:type/:fipeCode` | Unfavorite a vehicle. Sets `favorited = 0`. Returns 200 with `{ favorited: false }`. Returns 404 if vehicle not in DB. |
| `GET` | `/api/favorites` | List all favorited vehicles with their years eagerly loaded. Filters `WHERE favorited = 1`. |

### Repository methods

- `findByFipeCode(fipeCode)` → `Vehicle | null`
- `setFavorite(vehicleId, value: boolean)` → void (updates `favorited` to 1 or 0)
- `listFavorites()` → `Vehicle[]` with `years`

No transaction needed — single-row writes are atomic in SQLite.
No service file — the route calls repository directly (no business logic, per vertical-slice-pitfalls.md rule 4).

### Validation

- `fipeCode`: required string, regex validates FIPE code format (e.g. `001004-9`)
- `type`: must be `cars` or `motorcycles` (not `trucks` for now)

Uses existing `ValidationError` (400) and `NotFoundError` (404) from `shared/errors/`.

### Composition root (server.ts)

```typescript
const favoriteVehicleRepo = new FavoriteVehicleRepository(db)
app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
```

### Existing search endpoints reused (no changes)

`vehicle-search` slice already provides:
- `GET /api/vehicle/:type/:fipeCode` → returns available years
- `GET /api/vehicle/:type/:fipeCode/years/:yearCode` → returns price detail

These are consumed by the frontend "add by FIPE" dialog. No modifications needed.

---

## Frontend: Port prototype to Vite + React

### Dependencies to add

shadcn/ui initialized in the existing `frontend/` directory. Components needed: `dialog`, `button`, `input`, `label`, `badge`, `card`, `skeleton`, `scroll-area`, `sonner`.

### File structure

```
src/
  features/
    add-by-fipe/
      AddByFipeDialog.tsx          — ported from prototype, scraping removed
      index.ts
    favorite-vehicle/
      FavoriteListContainer.tsx    — container: fetches list, handles loading/error
      FavoriteList.tsx             — presentational: renders grouped vehicle cards
      VehicleCard.tsx              — presentational: single vehicle + its years
      FavoritesButton.tsx          — presentational: heart toggle button
      index.ts
  hooks/
    useVehicleSearch.ts            — React Query wrapper for search/year-detail
    useFavorites.ts                — React Query wrapper: useQuery (list) + useMutation (toggle)
  services/
    api.ts                         — existing axios instance
    vehicleSearchApi.ts            — searchByFipeCode(), getYearDetail()
    favoriteApi.ts                 — getFavorites(), addFavorite(), removeFavorite()
  components/
    ui/                            — shadcn/ui (generated)
```

### State management

- Server state (favorites, search results) → React Query
- UI state (dialog open, search step, selected vehicle type, tapped years) → `useState` inside `AddByFipeDialog`
- No Context needed

### "Add by FIPE" flow

1. User opens `AddByFipeDialog`, selects vehicle type, enters FIPE code
2. `GET /api/vehicle/:type/:fipeCode` fetches available years
3. User taps a year → two parallel calls:
   - `GET /api/vehicle/:type/:fipeCode/years/:yearCode` — fetches/caches price details
   - `POST /api/favorites/:type/:fipeCode` — favorites the vehicle (idempotent)
4. Dialog stays open, tapped years get a "Saved" badge (local UI state)
5. `POST` is a no-op on subsequent taps for the same FIPE code

### Favoriting list

- `FavoriteListContainer` calls `useQuery(['favorites'], getFavorites)`
- `FavoritesButton` calls `useMutation` with `DELETE /api/favorites/:type/:fipeCode` to unfavorite
- On mutation success → invalidate `['favorites']` query → list refetches

### Loading, error, success states (every async component)

| State | Behavior |
|-------|----------|
| Loading | Skeleton cards matching final layout shape |
| Error | Error message banner with Retry button |
| Success | Rendered vehicle list grouped by FIPE code |
| Empty | "No favorites yet" empty state with CTA to add |

---

## Error handling summary

| Scenario | Backend | Frontend |
|----------|---------|----------|
| FIPE code not found in DB | `NotFoundError` → 404 | Inline error in dialog |
| Invalid FIPE code format | `ValidationError` → 400 | Inline error in dialog |
| Invalid vehicle type | `ValidationError` → 400 | Inline error in dialog |
| FIPE API unreachable (search) | `FipeApiError` → 502 (existing) | Inline error in dialog |
| Toggle favorite API fails | — | Toast notification, no optimistic revert needed |

---

## Testing

### Backend (`favoriteVehicle.test.ts`)

- should favorite a vehicle when vehicle exists
- should unfavorite a vehicle
- should return 404 when vehicle not found
- should return 400 when FIPE code format is invalid
- should return 400 when vehicle type is invalid
- should list only favorited vehicles

### Frontend

Visual verification by running the app end-to-end.

---

## Out of scope

- Web scraping (scraped specs detail)
- Truck vehicle type
- User-scoped favorites (future: user_id FK)
- Price history seeding
