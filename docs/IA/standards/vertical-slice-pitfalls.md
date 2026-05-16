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
