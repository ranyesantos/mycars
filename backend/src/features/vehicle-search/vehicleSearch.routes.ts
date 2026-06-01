import { Router } from 'express'
import type { VehicleSearchService } from './vehicleSearch.service'
import {
  validateVehicleSearchParams,
  validateYearDetailParams,
  validateBrandsParams,
  validateModelsParams,
  validateYearsByModelParams,
  validatePriceByModelParams,
} from './vehicleSearch.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'

export function createVehicleSearchRoutes(
  service: VehicleSearchService,
): Router {
  const router = Router()

  // GET /api/vehicle/:type/brands
  router.get(
    '/api/vehicle/:type/brands',
    validateBrandsParams,
    asyncHandler(async (req, res) => {
      const { type } = req.params as Record<string, string>
      const result = await service.getBrands(type)
      res.json({ success: true, data: result })
    }),
  )

  // GET /api/vehicle/:type/brands/:brandCode/models
  router.get(
    '/api/vehicle/:type/brands/:brandCode/models',
    validateModelsParams,
    asyncHandler(async (req, res) => {
      const { type, brandCode } = req.params as Record<string, string>
      const result = await service.getModels(type, brandCode)
      res.json({ success: true, data: result })
    }),
  )

  // GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years
  router.get(
    '/api/vehicle/:type/brands/:brandCode/models/:modelCode/years',
    validateYearsByModelParams,
    asyncHandler(async (req, res) => {
      const { type, brandCode, modelCode } = req.params as Record<string, string>
      const result = await service.getYearsByBrandModel(type, brandCode, Number(modelCode))
      res.json({ success: true, data: result })
    }),
  )

  // GET /api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode
  router.get(
    '/api/vehicle/:type/brands/:brandCode/models/:modelCode/years/:yearCode',
    validatePriceByModelParams,
    asyncHandler(async (req, res) => {
      const { type, brandCode, modelCode, yearCode } = req.params as Record<string, string>
      const result = await service.getPriceByBrandModel(type, brandCode, Number(modelCode), yearCode)
      res.json({ success: true, data: result })
    }),
  )

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
