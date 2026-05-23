import type { Request, Response, NextFunction } from 'express'

/** Wraps an async route handler so rejected promises are forwarded to next(err). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
