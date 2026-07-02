## Overview

A web application to search, favorite and track Brazilian vehicles using the FIPE table. Users search vehicles by their FIPE code, save them to a local database, optionally enrich them with detailed specs via web scraping, and have their prices automatically updated every month.

**Stack:** React + TypeScript (frontend) · Express + TypeScript (backend) · PostgreSQL + Prisma 7 (database)
**Architecture:** Vertical slice · Modular

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `typescript` | Type safety |
| `prisma` + `@prisma/adapter-pg` | ORM and PostgreSQL driver |
| `@electric-sql/pglite` + `prisma-pglite` | In-memory PostgreSQL for tests |
| `axios` | HTTP client for FIPE API calls |
| `cheerio` | HTML parsing for web scraping |
| `bullmq` + `ioredis` | Job queue for async scraping |
| `zod` | Request validation |
| `dotenv` | Environment variable management |
| `uuid` | Idempotency keys for jobs |
| `cors` | Allow frontend requests |

### Frontend
| Package | Purpose |
|---|---|
| `react` + `vite` | UI framework and dev server |
| `typescript` | Type safety |
| `axios` | HTTP client to call the backend |
| `@tanstack/react-query` | Server state management |
| `shadcn/ui` | UI component library |
| `react-hook-form` + `zod` | Form management and validation |

### External APIs
| API | Usage |
|---|---|
| `https://fipe.parallelum.com.br/api/v2` | FIPE vehicle data and pricing |
| Vehicle detail source | Scraping target for technical specifications |

### Testing
| Tool | Purpose |
|---|---|
| `vitest` | Test runner |
| `supertest` | HTTP integration tests |
| `PGlite` | In-memory PostgreSQL for isolated test suites |

### CI/CD
GitHub Actions pipeline — typecheck, test, and build on push to `main`/`dev` and pull requests.

---

## Architecture

Code is organized by feature (vertical slice). Each feature in `features/<slice-name>/` owns its route, service, repository, types, and validators. Shared infrastructure (database, queue, FIPE client, error handling) lives in `shared/`.

**Backend slices:**
`vehicle-search` · `vehicle-detail` · `favorite-vehicle` · `scrape-details`

**Frontend slices:**
`add-by-fipe` · `browse-vehicles` · `favorite-vehicle` · `vehicle-detail`
