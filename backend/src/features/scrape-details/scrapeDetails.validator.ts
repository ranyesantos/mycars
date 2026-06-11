import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../shared/errors/ValidationError'

const ALLOWED_DOMAIN = 'fichacompleta.com.br'

const enqueueScrapingSchema = z.object({
  vehicleId: z
    .number({ message: 'vehicleId must be a number' })
    .int('vehicleId must be an integer')
    .positive('vehicleId must be positive'),
  yearCode: z
    .string()
    .min(1, 'yearCode is required')
    .regex(/^\d{4}-\d{1,2}$/, 'Invalid yearCode format (expected YYYY-D)'),
  url: z
    .string()
    .min(1, 'url is required')
    .url('url must be a valid URL')
    .refine(
      (url) => {
        try {
          const host = new URL(url).hostname
          return host === ALLOWED_DOMAIN || host.endsWith('.' + ALLOWED_DOMAIN)
        } catch {
          return false
        }
      },
      { message: 'URL domain is not allowed' },
    ),
})

export function validateEnqueueScraping(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = enqueueScrapingSchema.safeParse(req.body)

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return next(new ValidationError('Invalid request body', details))
  }

  next()
}
