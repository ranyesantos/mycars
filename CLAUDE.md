# Vehicle Tracker — Agent Instructions

## Stack
- Backend: Express + TypeScript · Port 3001
- Frontend: React + Vite + TypeScript · Port 5173
- Database: SQLite via better-sqlite3 · File: /backend/vehicles.db
- External: FIPE API at https://fipe.parallelum.com.br/api/v2
 
## Commands
- `cd backend && npm run dev` — start backend
- `cd frontend && npm run dev` — start frontend
- `cd backend && npm run migrate` — run DB migrations
- `npm run lint` — lint both projects
 
## Architecture
- Vertical slice: each feature lives in its own folder under /features/
- Every slice contains: route · service · repository · types (only what it needs)
- Shared types live in /shared/types/ — import from there, never duplicate
- Routes never contain business logic — always delegate to services
- Services never import from routes or other services directly
- Repositories are the only files that touch the database
 
## Conventions
- File naming: camelCase for modules, PascalCase for React components
- All async functions must have explicit return types
- Never use `any` in TypeScript
- Always use named exports, never default exports (except React components)
- Add a // [REVIEWED] comment on any block that should not be changed by the agent

## Standards
- Follow /docs/STANDARDS.md strictly — it covers API design, error handling,
  DI, SOLID application, code quality, and vertical slice pitfalls
- When in doubt about any of these, read the relevant section before writing code
- Never create a route without: input validation, typed response, error delegation to middleware
- Never let a service exceed ~20 lines without extracting a named collaborator
- Never import a file from another slice's folder
 
## What NOT to do
- Do not add business logic inside route handlers
- Do not query the DB directly from a route — always use a repository
- Do not change the DB schema without updating the migration file
- Do not call external APIs from anywhere except service files

## Useful materials
- The development phases can be seen into docs/phases
- Initial database schema can been seen into docs/initial-database-schema
- ADRs can be seen into docs/ADRs.md
