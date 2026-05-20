import { Router } from 'express'
import type { VehicleSearchService } from './vehicleSearch.service.js'
import {
  validateVehicleSearchParams,
  validateYearDetailParams,
} from './vehicleSearch.validator.js'

export function createVehicleSearchRoutes(
  service: VehicleSearchService,
): Router {
  const router = Router()

  router.get(
    '/api/vehicle/:type/:fipeCode',
    validateVehicleSearchParams,
    async (req, res, next) => {
      try {
        const { type, fipeCode } = req.params as Record<string, string>
        const result = await service.searchByFipeCode(type, fipeCode)

        res.json({
          success: true,
          data: result,
        })
      } catch (err) {
        next(err)
      }
    },
  )

  router.get(
    '/api/vehicle/:type/:fipeCode/years/:yearCode',
    validateYearDetailParams,
    async (req, res, next) => {
      try {
        const { type, fipeCode, yearCode } = req.params as Record<string, string>
        const result = await service.getYearDetail(type, fipeCode, yearCode)

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
