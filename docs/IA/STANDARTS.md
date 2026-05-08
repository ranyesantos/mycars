# Engineering Standards

## API design

### HTTP status codes
- 200 OK — successful GET or PATCH
- 201 Created — successful POST that creates a resource
- 204 No Content — successful DELETE
- 400 Bad Request — malformed input or failed validation
- 404 Not Found — resource does not exist
- 409 Conflict — duplicate resource (e.g. FIPE code already saved)
- 422 Unprocessable Entity — input is valid but semantically wrong
- 429 Too Many Requests — rate limit hit
- 500 Internal Server Error — unhandled server failure

Never return 200 with an error body. Never return 500 for client mistakes.

### Idempotency
- GET and PATCH must always be idempotent
- POST /api/vehicle (search/save) must be idempotent on fipe_code:
  if the vehicle already exists, return the existing record with 200,
  not a duplicate or a 409
- POST /api/scraping is idempotent per vehicle_id + url:
  re-scraping the same URL updates the existing scraping_details row

### Rate limiting
- Apply rate limiting at the Express level using express-rate-limit
- Default: 60 requests per minute per IP
- Scraping routes: 5 requests per minute per IP (heavier operation)
- When rate limit is exceeded, return 429 with Retry-After header

### Request validation
- Validate all incoming request bodies and params before they reach the service
- Use zod for schema validation
- Return 400 with a structured error listing all invalid fields

### Response envelope
All responses follow this shape:
```json
{
  "success": true,
  "data": { ... }
}
{
  "success": false,
  "error": {
    "code": "VEHICLE_NOT_FOUND",
    "message": "No vehicle found with FIPE code 001004-9",
    "details": []       ← validation errors go here
  }
}
```

## Error handling

### Central error handler
All errors must be delegated to the central Express error handler.
Never catch an error and send a response directly inside a route or service.

Pattern:
  route catches thrown error → passes to next(error) → errorHandler middleware responds

Errors thrown from services must be typed:
```typescript
class AppError extends Error {
    constructor(
        public readonly code: string,
        public readonly message: string,
        public readonly statusCode: number,
        public readonly details?: unknown[]
    ) { super(message) }
}
```

Common error codes: VEHICLE_NOT_FOUND · FIPE_API_ERROR · SCRAPING_FAILED ·
  VEHICLE_NOT_FAVORITED · DUPLICATE_VEHICLE · VALIDATION_ERROR

### Never swallow errors
- Do not use empty catch blocks.
- Do not log an error and return undefined silently.
- Always either re-throw or throw a new AppError with context.

## Dependency Injection

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

## SOLID (applied pragmatically)

### S — Single responsibility
Each file does one thing. A repository only touches the database.
A service only contains business logic. A route only handles HTTP concerns.
If a service method is doing more than one conceptual thing, split it.

### O — Open/closed
Design services around interfaces, not concrete implementations.
FipeClient should be an interface. The real implementation uses Axios.
A mock implementation is used in tests. The service doesn't know the difference.

### I — Interface segregation
Keep interfaces narrow. A repository used by one slice should not expose
methods only another slice needs. Split repositories if necessary.

### D — Dependency inversion
High-level modules (services) depend on abstractions (interfaces),
not on concrete classes (repositories, HTTP clients).
This is enforced by the DI pattern above.

Note: L (Liskov) is not a priority in this codebase — inheritance is rarely used.

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

## Testing (when writing tests)
- Unit test service logic with mocked repositories and HTTP clients
- Name tests: "should [expected behaviour] when [condition]"
- One assertion per test where possible
- Do not test implementation details — test behaviour and outcomes
## Vertical slice — known pitfalls and rules

### 1. Fat service
A service that validates input, calls external APIs, parses responses,
and writes to the DB in a single method is doing too much.

Rule: a service method orchestrates — it does not implement.
If a method exceeds ~20 lines, extract the excess into a named collaborator
that lives in the same slice folder.

Allowed files within a slice:
  - *.service.ts      ← orchestrates, calls collaborators
  - *.validator.ts    ← domain assertions and input rules
  - *.parser.ts       ← data transformation (e.g. Cheerio parsing)
  - *.repository.ts   ← DB access only
  - *.http.ts         ← raw external HTTP calls

A correct service method reads like a table of contents:
```typescript
async execute(vehicleId: number, url: string) {
    const vehicle = await this.validator.assertFavoritedVehicle(vehicleId)
    const html    = await this.http.fetch(url)
    const details = this.parser.parse(html)
    await this.repository.save(vehicleId, details)
    return details
}
```
### 2. Cross-slice duplication
When the same logic (e.g. asserting a vehicle exists) appears in more
than two slices, it must be extracted to shared/domain/.

Rule: duplicate once, tolerate it. On the third occurrence, extract.
Never copy-paste error codes, error messages or validation rules across slices.
Define them once and import.
  - shared/domain/vehicleDomain.ts  ← shared assertions
  - shared/errors/AppError.ts       ← single source of all error codes

### 3. Shared repository misuse
A slice must never import a repository from another slice's folder.
If two slices query the same table, that repository belongs in shared/.
  - shared/repositories/vehicleRepository.ts  ← used by many slices
  - features/scrape-details/scrapeDetails.repository.ts  ← private to slice
  
Importing features/search-by-fipe/searchByFipe.repository.ts from inside
features/scrape-details/ is always wrong.

### 4. Unnecessary service layer
- Do not create a service file for operations that contain no business logic.

- A service that only calls one repository method with no transformation,
validation or orchestration adds noise without value.

- For simple CRUD (e.g. toggle favorite), the route may call the repository
directly. Add a service only when logic grows.

### 5. HTTP coupling in services
#### Services must never reference req, res, next or any Express type. They take plain typed arguments and return plain typed values. This makes them callable by HTTP routes, queue workers, and cron jobs equally.

- // Correct — callable from anywhere 
    - async execute(vehicleId: number, url: string): Promise<ScrapingResult>

- // Wrong — coupled to HTTP layer 
    - async execute(req: Request, res: Response): Promise<void>

## Database transactions

### When to use
Use a transaction whenever a single operation requires more than one
DB write, and leaving them partially applied would result in corrupt
or inconsistent data.

The test: if the second write fails, does the first write leave the
database in a state that is wrong or unrecoverable? If yes, wrap both
in a transaction.

### Rules
- Never write to two or more tables in sequence without a transaction
- Never update a row and insert a related row without a transaction
- Reads do not need transactions unless they are part of a
  read-modify-write cycle that must be atomic

### Concrete cases in this project

- Use a transaction:

  - Saving a new vehicle + its years
    vehicles and vehicle_years are always inserted together.
    A vehicle row with no year rows is an incomplete record.

  - Updating prices across multiple vehicle_years rows
    The monthly cron updates many rows in one run. A partial update (some prices updated, others not) is worse than no update at all wrap the entire batch in one transaction.

  - Saving scraping details + updating vehicle.updated_at. Both writes represent the same event. They succeed or fail together.

  - Enqueueing a job + updating the triggering record's status. If the job is enqueued but the status update fails, the system will re-enqueue on restart and process the same job twice.

- Do not use a transaction:

  - Single-row writes (toggle favorite, insert one job) A single statement is atomic by definition in SQLite.

  - Read-only queries. No writes, nothing to roll back.

  - Independent writes that are safe to apply partially If two writes represent unrelated events and partial application is acceptable, a transaction adds overhead with no benefit.

### Pattern with better-sqlite3

better-sqlite3 transactions are synchronous. Use the built-in transaction() wrapper — it commits on success and rolls back on any thrown error automatically.

```typescript
const saveVehicleWithYears = db.transaction(
    (vehicle: Vehicle, years: VehicleYear[]) => {
        const { lastInsertRowid } = db
            .prepare('INSERT INTO vehicles ...')
            .run(vehicle)

        const insertYear = db.prepare('INSERT INTO vehicle_years ...')
        for (const year of years) {
            insertYear.run({ vehicleId: lastInsertRowid, ...year })
        }
    }
)

// Call it like a regular function — throws on failure, rolls back automatically
saveVehicleWithYears(vehicle, years)
```
Never manually call BEGIN / COMMIT / ROLLBACK, always use the db.transaction() wrapper so rollback on error is guaranteed.

### Batch operations
When the cron updates prices for all saved vehicles, do not open one transaction per vehicle. Wrap the entire batch in a single transaction — it is faster and guarantees all-or-nothing semantics.
``` typescript
const updateAllPrices = db.transaction((updates: PriceUpdate[]) => {
    const stmt = db.prepare(
        'UPDATE vehicle_years SET price = ?, price_updated_at = ? WHERE id = ?'
    )
    for (const update of updates) {
        stmt.run(update.price, update.updatedAt, update.id)
    }
})
```