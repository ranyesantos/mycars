import { AppError } from './AppError'

/** Upstream FIPE API failure — maps to HTTP 502. */
export class FipeApiError extends AppError {
  constructor(message: string) {
    super('FIPE_API_ERROR', message, 502)
  }
}
