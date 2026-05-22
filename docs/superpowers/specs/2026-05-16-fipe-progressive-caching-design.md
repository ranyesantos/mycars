# FIPE Progressive Caching — Design

**Date:** 2026-05-16
**Context:** Phase 1 MVP, 1k FIPE API requests/month (free tier)

## Problem

The FIPE API requires two calls per vehicle: one to get the years list, another for each year's details (price, fuel, brand, model, reference month). On the free tier's 1k monthly cap, fetching all years eagerly would burn 10+ calls per vehicle. We need to cache both response types so no data is fetched twice.

## Decision: Progressive two-phase caching

- Phase 1 cache (years list) on search, phase 2 cache (per-year detail) on demand.
- Once fetched, data lives in SQLite forever, subsequent requests hit the DB, not the FIPE API.

## Schema change — migration 002

```sql
ALTER TABLE vehicle_years ADD COLUMN fuel TEXT;
ALTER TABLE vehicle_years ADD COLUMN reference_month TEXT;
ALTER TABLE vehicle_years ADD COLUMN fuel_acronym TEXT;
ALTER TABLE vehicle_years ADD COLUMN fetched_at DATETIME;
```

`vehicles.brand` and `vehicles.model` stay on the `vehicles` table. They are populated from the first per-year detail response if null.

## API endpoints

### `GET /api/vehicle/:type/:fipeCode` — fetch years list

1. Query `vehicles` by fipe_code. If found and has year entries, return from DB (`source: "cache"`).
2. If not found, call `https://fipe.parallelum.com.br/api/v2/:type/:fipeCode/years` (1 API call).
3. Insert vehicle row (brand/model null) and `vehicle_years` rows (year_code + year_label only).
4. Return the new vehicle with years (`source: "api"`).
5. Return 404 if the FIPE code does not exist.

### `GET /api/vehicle/:type/:fipeCode/years/:yearCode` — fetch year detail

1. Query `vehicle_years` joined to `vehicles` by fipe_code + year_code.
2. If `fetched_at` is not null, return cached detail (`source: "cache"`).
3. If not cached, call `https://fipe.parallelum.com.br/api/v2/:type/:fipeCode/years/:yearCode` (1 API call).
4. Update `vehicle_years` with price, fuel, reference_month, fuel_acronym, fetched_at.
5. Populate `vehicles.brand` and `vehicles.model` if still null.
6. Return enriched year detail (`source: "api"`).
7. Return 404 if the year code does not exist for that vehicle.

### Unchanged endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/vehicles` | List all saved vehicles (joined with year counts) |
| `PATCH` | `/api/vehicle/:id/favorite` | Toggle favorite |
| `POST` | `/api/scraping` | Scrape vehicle details (Slice 4) |

## Frontend (MVP scope)

- **SearchModal:** user enters FIPE code + vehicle type. Backend fetches years list. User confirms to save. Years are cached server-side.
- **VehicleCard:** shows the vehicle's brand, model, favorited status. Since the per-year detail fetch happens server-side when the vehicle is processed, the card always has complete data. No inline per-year fetching UI in MVP.
- States: loading, error, empty for search. Favorite toggle with optimistic UI.

## Per-year detail caching trigger

In MVP, the `years/:yearCode` endpoint exists and is fully functional, but the frontend does not call it interactively. It can be called:
- Server-side during the search flow if you choose to pre-fetch
- By a future UI enhancement without backend changes

## Cost analysis (1k requests/month)

| Scenario | API calls | Vehicles/month |
|---|---|---|
| Search only (years list) | 1 per vehicle | ~1000 |
| Search + 1 year detail | 2 per vehicle | ~500 |
| Search + all years (avg 8 years) | 9 per vehicle | ~110 |

Progressive caching keeps us in the first two rows. No eager pre-fetch.
