import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'
import { FipeApiError } from '../errors/FipeApiError'
import { NotFoundError } from '../errors/NotFoundError'
import { ValidationError } from '../errors/ValidationError'
import { logger } from '../utils/logger'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? [] },
    })
    return
  }

  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: [] },
    })
    return
  }

  if (err instanceof FipeApiError) {
    logger.error('FIPE API error', { message: err.message })
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: [] },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? [] },
    })
    return
  }

  logger.error('Unhandled server error', { message: err.message, stack: err.stack })

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  })
}
