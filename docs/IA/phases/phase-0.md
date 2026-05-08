## Phase 0 — Foundation & Setup
 
> Goal: working skeleton that both agents and developers can build on top of confidently.
 
### Tasks
 
- [ ] Initialize monorepo with `/backend` and `/frontend`
- [ ] Configure TypeScript in both (`tsconfig.json`)
- [ ] Set up ESLint + Prettier with shared config
- [ ] Create `shared/types/` and reference it from both sides
- [ ] Write `001_initial.sql` migration and a `npm run migrate` script
- [ ] Set up Express server with CORS and error handler middleware
- [ ] Set up Vite + React with Axios base instance
- [ ] Write `CLAUDE.md` (see section 9)
- [ ] Write `TASKS.md` and initial `ADR-001` and `ADR-002` (see section 10)
### Deliverable
 
Both servers start (`npm run dev` on each side), frontend can reach backend healthcheck at `GET /api/health`, database file is created with all tables.
 
---