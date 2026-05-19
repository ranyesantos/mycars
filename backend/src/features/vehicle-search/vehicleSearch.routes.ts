import { Router } from 'express'
import type { VehicleSearchService } from './vehicleSearch.service.js'

export function createVehicleSearchRoutes(
  service: VehicleSearchService,
): Router {
  const router = Router()

  router.get('/api/vehicle/:type/:fipeCode', async (req, res, next) => {
    try {
      const result = await service.searchByFipeCode(
        req.params.type,
        req.params.fipeCode,
      )

      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  })

  router.get(
    '/api/vehicle/:type/:fipeCode/years/:yearCode',
    async (req, res, next) => {
      try {
        const result = await service.getYearDetail(
          req.params.type,
          req.params.fipeCode,
          req.params.yearCode,
        )

        res.json({
          success: true,
          data: result,
        })
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
