import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../shared/errors/ValidationError'

const vehicleTypeSchema = z.enum(['cars', 'trucks', 'motorcycles'])

const fipeCodeSchema = z
  .string()
  .min(1, 'FIPE code is required')
  .regex(/^\d{6,7}-\d{1,2}$/, 'Invalid FIPE code format (expected XXXXXX-X)')

const yearCodeSchema = z
  .string()
  .min(1, 'Year code is required')
  .regex(/^\d{4}-\d{1,2}$/, 'Invalid year code format (expected YYYY-D)')

const vehicleSearchParamsSchema = z.object({
  type: vehicleTypeSchema,
  fipeCode: fipeCodeSchema,
})

const yearDetailParamsSchema = z.object({
  type: vehicleTypeSchema,
  fipeCode: fipeCodeSchema,
  yearCode: yearCodeSchema,
})

export function validateVehicleSearchParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = vehicleSearchParamsSchema.safeParse(req.params)

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))

    return next(new ValidationError('Invalid request parameters', details))
  }

  next()
}

export function validateYearDetailParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = yearDetailParamsSchema.safeParse(req.params)

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))

    return next(new ValidationError('Invalid request parameters', details))
  }

  next()
}
