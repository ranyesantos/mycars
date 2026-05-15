import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError.js'
import { logger } from '../utils/logger.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
      },
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
