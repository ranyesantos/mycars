## Vertical slice — good practices

### Slices are features, not entities
Name slices after what the user does, not after the data model.

  // Wrong — entity-centric naming
  features/
    vehicles/
    scraping/

  // Correct — feature-centric naming
  features/
    search-by-fipe/
    list-vehicles/
    favorite-vehicle/
    scrape-details/

This keeps the slice boundary aligned with a real user action.
When a requirement changes, you know exactly which slice owns it.

---

### Each slice owns its own types
Define types inside the slice that owns them. Only promote a type
to shared/types/ when two or more slices depend on it.

  // Owned by the slice — stays inside it
  features/scrape-details/scrapeDetails.types.ts

  // Used by multiple slices — promoted to shared
  shared/types/vehicle.types.ts

Never define a type in shared/ preemptively. Wait until the second
slice needs it, then move it.

---

### The public interface of a slice
A slice exposes only what other parts of the app need to consume.
Everything else is private to the slice.

Use an index.ts to define the public surface explicitly:

  // features/scrape-details/index.ts
  export { ScrapeDetailsRoute } from './scrapeDetails.route'
  // nothing else is exported — parser, http, validator are private

If a file is not exported from index.ts, it cannot be imported
from outside the slice. This is the slice boundary enforced in code.

---

### One route file per slice
Each slice registers its own routes. The server file only mounts them.
Routes are never defined in server.ts.

  // server.ts — mounts only, contains no route definitions
  app.use('/api/vehicle', searchByFipeRoutes)
  app.use('/api/vehicles', listVehiclesRoutes)
  app.use('/api/scraping', scrapeDetailsRoutes)

  // features/scrape-details/scrapeDetails.route.ts — owns its routes
  router.post('/', asyncHandler(async (req, res) => { ... }))

---

### Slice internal structure scales with complexity
Start with the minimum files needed. Add collaborators only when
the complexity justifies them.

  // Simple slice — just a route and a repository, no logic needed
  favorite-vehicle/
    favoriteVehicle.route.ts
    favoriteVehicle.repository.ts

  // Complex slice — full collaborator structure
  scrape-details/
    scrapeDetails.route.ts
    scrapeDetails.service.ts
    scrapeDetails.validator.ts
    scrapeDetails.parser.ts
    scrapeDetails.http.ts
    scrapeDetails.repository.ts
    scrapeDetails.types.ts
    scrapeDetails.test.ts
    index.ts

Never create empty files to match a template. Every file in a slice
must have a reason to exist.

---

### Tests live inside the slice
Test files belong next to the code they test, inside the slice folder.
Never put all tests in a separate top-level /tests/ folder — it
recreates the same cross-folder navigation problem that vertical
slice is designed to eliminate.

  features/scrape-details/
    scrapeDetails.service.ts
    scrapeDetails.service.test.ts   ← right next to what it tests
    scrapeDetails.parser.ts
    scrapeDetails.parser.test.ts

---

### Slices communicate through the domain, never directly
If slice A needs something from slice B, it goes through the shared
domain layer — not by importing slice B's internal files.

  // Wrong — direct slice-to-slice import
  import { vehicleRepository } from '../search-by-fipe/searchByFipe.repository'

  // Correct — through shared domain
  import { vehicleRepository } from '../../shared/repositories/vehicleRepository'

If you find yourself importing from another slice's folder, that is
a signal that the imported piece belongs in shared/.

---

### Keep the slice focused on one user goal
A slice should answer one question: what is the user trying to do?
If a slice starts handling two unrelated user goals, split it.

The signal that a slice needs splitting:
- The route file has more than one route that serve different purposes
- The service has two public methods that share no logic
- The slice name requires an "and" to describe it
  (e.g. search-and-save-vehicle → should be two slices)

---

### Document the slice's purpose
Each non-trivial slice gets a one-paragraph comment at the top of
its service file explaining what it does, what external systems it
touches, and any non-obvious decisions:

  // scrapeDetails.service.ts
  //
  // Handles enriching a favorited vehicle with technical specs
  // fetched from carrosnaweb.com.br via HTML scraping.
  //
  // Only vehicles marked as favorited can be enriched.
  // Scraping is synchronous in Phase 1 — will be queued in Phase 2.
  // Re-scraping the same vehicle+url updates the existing record (upsert).