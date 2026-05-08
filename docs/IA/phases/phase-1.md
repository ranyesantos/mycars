## Phase 1 — MVP
 
> Goal: a working application users can actually use. All external calls are synchronous. No queues, no cron. Ship this.
 
### Slice 1 · search-by-fipe
 
**What it does:** user opens a modal, types a FIPE code, selects vehicle type, and the app fetches from the FIPE API (or returns from cache) and shows available years.
 
**Backend**
 
- `GET /api/vehicle/:type/:fipeCode`
  - Check SQLite for existing record → return with `source: "cache"` if found
  - Otherwise call `https://fipe.parallelum.com.br/api/v2/:type/:fipeCode/years`
  - Save vehicle + years to DB → return with `source: "api"`
  - Return `404` with friendly message if FIPE code does not exist
**Frontend**
 
- `SearchModal.tsx` — input for FIPE code + dropdown for vehicle type
- Loading, error, and empty states
- On success: show returned years, confirm to add to list
---
 
### Slice 2 · list-vehicles
 
**What it does:** main screen showing all saved vehicles as cards.
 
**Backend**
 
- `GET /api/vehicles` — returns all saved vehicles joined with their years and scraping status
- Optional query params: `?favorited=true`, `?type=cars`
**Frontend**
 
- `VehicleList.tsx` — grid of cards
- `VehicleCard.tsx` — shows brand, model, year options, latest price, favorite toggle, and scraping CTA
---
 
### Slice 3 · favorite-vehicle
 
**What it does:** user marks a vehicle as favorite. Only favorited vehicles can receive scraping enrichment.
 
**Backend**
 
- `PATCH /api/vehicle/:id/favorite` — toggles `favorited` field in DB
**Frontend**
 
- `FavoriteButton.tsx` — heart/star icon inside VehicleCard
- Optimistic UI: toggle state immediately, revert on error
---
 
### Slice 4 · scrape-details
 
**What it does:** for favorited vehicles only, user provides a carrosnaweb.com.br URL and the backend scrapes the detail page to enrich the vehicle with specs.
 
**Backend**
 
- `POST /api/scraping` — body: `{ vehicleId: number, url: string }`
  - Validate that the vehicle exists and is favorited
  - Fetch URL with Axios (with a browser-like User-Agent header)
  - Parse HTML with Cheerio
  - Extract: engine, power, torque, transmission, fuel type, city/highway consumption
  - Save to `scraping_details` table
  - Return the parsed data
**Frontend**
 
- `ScrapingModal.tsx` — URL input, only accessible from favorited VehicleCards
- Show enriched details on the card after successful scraping
- Show a "details not yet added" state when `scraping_details` is empty
### Phase 1 API Summary
 
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/vehicles` | List all saved vehicles |
| `GET` | `/api/vehicle/:type/:fipeCode` | Search/fetch from FIPE |
| `PATCH` | `/api/vehicle/:id/favorite` | Toggle favorite |
| `POST` | `/api/scraping` | Scrape vehicle details |
 
---
 