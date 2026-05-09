## Code quality

### Naming
- Variables and functions: camelCase, descriptive, no abbreviations
  - searchVehicleByFipeCode - correct
  - srchVeh - unacceptable
- Boolean variables: prefix with is/has/can/should
  - isLoading
  - hasScrapeData
  - canFavorite
- Functions: verb + noun
  - fetchVehicleYears
  - saveScrapingDetails
  - toggleFavorite

### Function design
- Max ~20 lines per function. If it's longer, extract a helper.
- One level of abstraction per function — don't mix high-level logic
  with low-level DB calls in the same function body.
- Avoid boolean parameters — they're a sign a function does two things.
  - Bad:  processVehicle(vehicle, true)
  - Good: saveNewVehicle(vehicle) / updateExistingVehicle(vehicle)

### Async
- Always use async/await, never raw .then() chains
- Always add explicit return types to async functions
- Never use Promise.all without handling partial failures if one rejection
  should not crash the entire operation

### Comments
- Comment the WHY, not the WHAT
  - Rate limit FIPE API — max 60 req/min per their docs - correct
  - Loop through vehicles - unacceptable
- Every public method on a service or repository gets a one-line JSDoc

### Reusability
- If the same logic appears in two places, extract it on the third occurrence
  (rule of three — not on the second)
- Generic utilities go in /shared/utils/
- Feature-specific helpers stay inside their slice folder


### Dependency Injection

Services receive their dependencies (repositories, external clients) as
constructor parameters — never import and instantiate them internally.

// Correct
``` javascript
class SearchByFipeService {
  constructor(
    private readonly vehicleRepo: VehicleRepository,
    private readonly fipeClient: FipeClient
  ) {}
}
```

// Wrong — creates hidden coupling, untestable
``` javascript
class SearchByFipeService {
  private vehicleRepo = new VehicleRepository()
}
```

Wire dependencies in a central composition root (server.ts or a
dedicated container.ts) so the dependency graph is visible in one place.

