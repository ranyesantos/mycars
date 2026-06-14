import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../shared/errors/ValidationError'

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
          const allowedDomain = process.env.SCRAPING_ALLOWED_DOMAIN
          return host === allowedDomain || host.endsWith('.' + allowedDomain)
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
