import { Router } from 'express'
import type { ScrapeDetailsService } from './scrapeDetails.service'
import { validateEnqueueScraping } from './scrapeDetails.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'

export function createScrapeDetailsRoutes(
  service: ScrapeDetailsService,
): Router {
  const router = Router()

  // POST /api/v1/scraping — enqueue a scraping job
  router.post(
    '/',
    validateEnqueueScraping,
    asyncHandler(async (req, res) => {
      const { vehicleId, yearCode, url } = req.body as {
        vehicleId: number
        yearCode: string
        url: string
      }

      const result = await service.enqueue({ vehicleId, yearCode, url })

      if (result.status === 'already_queued') {
        res.status(200).json({
          success: true,
          data: {
            jobId: result.jobId,
            status: result.status,
          },
        })
        return
      }

      res.status(202).json({
        success: true,
        data: {
          jobId: result.jobId,
          pollUrl: `/api/v1/scraping/${result.jobId}/status`,
        },
      })
    }),
  )

  // GET /api/v1/scraping/:jobId/status — get job status
  router.get(
    '/:jobId/status',
    asyncHandler(async (req, res) => {
      const { jobId } = req.params as { jobId: string }
      const result = await service.getJobStatus(jobId)

      res.status(200).json({
        success: true,
        data: result,
      })
    }),
  )

  return router
}
