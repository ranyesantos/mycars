import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../shared/errors/ValidationError'

const vehicleTypeSchema = z.enum(['cars', 'motorcycles'], {
  message: 'Vehicle type must be cars or motorcycles',
})

const fipeCodeSchema = z
  .string()
  .min(1, 'FIPE code is required')
  .regex(/^\d{6,7}-\d{1,2}$/, 'Invalid FIPE code format (expected XXXXXX-X or XXXXXXX-X)')

const favoriteParamsSchema = z.object({
  type: vehicleTypeSchema,
  fipeCode: fipeCodeSchema,
})

export function validateFavoriteParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = favoriteParamsSchema.safeParse(req.params)

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request parameters', details))
  }

  next()
}
