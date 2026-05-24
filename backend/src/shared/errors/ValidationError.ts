import { AppError } from './AppError'

/** Input validation failure — maps to HTTP 400. Carries per-field details. */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown[]) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}
