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
- 502 Bad Gateway — upstream service (FIPE API) unreachable or returned an error

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