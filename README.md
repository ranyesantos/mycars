## Overview
 
An web application to search, favorite and track Brazilian vehicles using the FIPE table. Users search vehicles by their FIPE code, save them to a local database, optionally enrich them with detailed specs via web scraping, and have their prices automatically updated every month.
 
**Stack:** React + TypeScript (frontend) · Express + TypeScript (backend) · SQLite (database)  
**Architecture:** Vertical slice · Modular · Local-first
 
---

## Tech Stack
 
### Backend
| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `typescript` | Type safety |
| `better-sqlite3` | SQLite driver (sync, simple, local) |
| `axios` | HTTP client for FIPE API calls |
| `cheerio` | HTML parsing for web scraping |
| `node-cron` | Monthly price update scheduler (Phase 3) |
| `bullmq` + `redis` | Job queue for async processing (Phase 2) |
| `cors` | Allow frontend requests |
 
### Frontend
| Package | Purpose |
|---|---|
| `react` + `vite` | UI framework and dev server |
| `typescript` | Type safety |
| `axios` | HTTP client to call the backend |
| `react-query` | Server state management (optional but recommended) |
 
### External APIs
| API | Usage |
|---|---|
| `https://fipe.parallelum.com.br/api/v2` | FIPE vehicle data and pricing |
| `https://www.carrosnaweb.com.br` | Vehicle detail scraping (Phase 1, optional) |
 
---
 
## Folder Structure
 
```
project/
├── shared/
│   └── types/
│       ├── vehicle.types.ts          ← Shared between frontend and backend
│       ├── fipe.types.ts
│       └── scraping.types.ts
│
├── backend/
│   ├── src/
│   │   ├── server.ts                 ← Express app entry point
│   │   ├── db/
│   │   │   ├── index.ts              ← SQLite connection
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql
│   │   ├── shared/
│   │   │   ├── middleware/
│   │   │   │   └── errorHandler.ts
│   │   │   └── utils/
│   │   │       └── logger.ts
│   │   └── features/                 ← Vertical slices
│   │       ├── search-by-fipe/
│   │       │   ├── searchByFipe.route.ts
│   │       │   ├── searchByFipe.service.ts
│   │       │   ├── searchByFipe.repository.ts
│   │       │   └── searchByFipe.types.ts
│   │       ├── list-vehicles/
│   │       │   ├── listVehicles.route.ts
│   │       │   └── listVehicles.repository.ts
│   │       ├── favorite-vehicle/
│   │       │   ├── favoriteVehicle.route.ts
│   │       │   └── favoriteVehicle.repository.ts
│   │       ├── scrape-details/
│   │       │   ├── scrapeDetails.route.ts
│   │       │   ├── scrapeDetails.service.ts
│   │       │   ├── scrapeDetails.repository.ts
│   │       │   └── scrapeDetails.types.ts
│   │       └── update-prices/        ← Phase 3
│   │           ├── updatePrices.cron.ts
│   │           ├── updatePrices.service.ts
│   │           └── updatePrices.route.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── services/
    │   │   └── api.ts                ← Axios instance
    │   ├── hooks/
    │   │   └── useVehicles.ts
    │   └── features/                 ← Mirrors backend slices
    │       ├── search-by-fipe/
    │       │   ├── SearchModal.tsx
    │       │   └── SearchModal.types.ts
    │       ├── list-vehicles/
    │       │   ├── VehicleList.tsx
    │       │   └── VehicleCard.tsx
    │       ├── favorite-vehicle/
    │       │   └── FavoriteButton.tsx
    │       └── scrape-details/
    │           └── ScrapingModal.tsx
    ├── package.json
    └── tsconfig.json
```
 