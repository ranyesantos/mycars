import { Router } from 'express'
import type { VehicleSearchService } from './vehicleSearch.service'
import {
  validateVehicleSearchParams,
  validateYearDetailParams,
} from './vehicleSearch.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'

export function createVehicleSearchRoutes(
  service: VehicleSearchService,
): Router {
  const router = Router()

  router.get(
    '/api/vehicle/:type/:fipeCode',
    validateVehicleSearchParams,
    asyncHandler(async (req, res) => {
      const { type, fipeCode } = req.params as Record<string, string>
      const result = await service.searchByFipeCode(type, fipeCode)

      res.json({
        success: true,
        data: result,
      })
    }),
  )

  router.get(
    '/api/vehicle/:type/:fipeCode/years/:yearCode',
    validateYearDetailParams,
    asyncHandler(async (req, res) => {
      const { type, fipeCode, yearCode } = req.params as Record<string, string>
      const result = await service.getYearDetail(type, fipeCode, yearCode)

      res.json({
        success: true,
        data: result,
      })
    }),
  )

  return router
}
