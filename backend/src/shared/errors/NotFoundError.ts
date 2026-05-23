import { AppError } from './AppError'

/** Domain error for missing resources — maps to HTTP 404. */
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404)
  }
}
