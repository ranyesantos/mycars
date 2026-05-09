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

## Standards — read before starting any task

- Each file must be read in full before working on anything that touches its concern. Do not rely on memory from a previous session.

### Working on a route, controller or API endpoint?
→ read docs/standards/api.md
- Covers: HTTP status codes, rate limiting, idempotency, request validation, response envelope, error handling patterns.

### Working on a service, repository or database query?
→ sometimes read docs/standards/code-quality.md
→ always read docs/standards/database.md
-  Covers: when to use transactions, batch operations, the
  db.transaction() pattern, rules for better-sqlite3.

### Creating, modifying or reviewing any slice?
→ read docs/standards/vertical-slice.md
-  Covers: good practices, naming, public interface via index.ts, slice internal structure, how slices communicate.

→ read docs/standards/vertical-slice-pitfalls.md
  Covers: fat service problem, cross-slice duplication, shared
  repository misuse, unnecessary service layer, HTTP coupling.

### Working on any frontend file (component, hook, context, page)?
→ read docs/standards/frontend.md
  Covers: component design, presentational vs container split,
  TypeScript props, custom hooks, React Query usage, shadcn/ui rules,
  forms with react-hook-form + zod, performance rules, accessibility.

→ read docs/standards/frontend-pitfalls.md
  Covers: prop drilling solutions, bad practices to avoid (useEffect
  misuse, index as key, boolean trap, anonymous inline functions,
  overusing memoization, untyped props).

### Working on a service class, repository or dependency wiring?
→ read docs/standards/solid.md
  Covers: SOLID principles as applied in this project, DI pattern,
  composition root, interface design, reusability rules.

### Writing or reviewing any test file?
→ read docs/standards/testing.md
  Covers: test naming, unit vs integration scope, mocking strategy,
  what not to test.

### Writing or reviewing any non-test code?
→ read docs/standards/code-quality.md
  Covers: naming conventions, function size, abstraction levels,
  comments, async patterns, reusability rules (rule of three).

### When multiple standards apply
Most tasks touch more than one concern. Read all relevant files.

Examples:
  Creating a new slice from scratch
    → vertical-slice.md + vertical-slice-pitfalls.md + api.md
      + database.md + code-quality.md

  Building a new frontend feature (modal, card, hook)
    → frontend.md + frontend-pitfalls.md + code-quality.md

  Implementing a service with external API call + DB write
    → vertical-slice.md + api.md + database.md + solid.md
## Non-negotiable rules (always apply, no exceptions)
- Never use `any` in TypeScript
- Never put business logic inside a route handler
- Never import from another slice's internal folder
- Never store API responses in useState — use React Query
- Always delegate errors to the central error handler via next(err)
- Always type component props with an explicit interface
- Always handle loading, error and success states in every async component
- Always read the relevant standards file before writing code

## What NOT to do
- Do not add business logic inside route handlers
- Do not query the DB directly from a route — always use a repository
- Do not change the DB schema without updating the migration file
- Do not call external APIs from anywhere except service files

## Useful materials
- The development phases can be seen into docs/phases
- Initial database schema can been seen into docs/initial-database-schema
- ADRs can be seen into docs/ADRs.md
