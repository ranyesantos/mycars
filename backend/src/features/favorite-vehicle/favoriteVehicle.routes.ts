import { Router } from 'express'
import type { FavoriteVehicleRepository } from './favoriteVehicle.repository'
import { validateFavoriteParams } from './favoriteVehicle.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { FavoriteResponse, FavoriteWithYears } from './favoriteVehicle.types'

function toFavoriteResponse(item: FavoriteWithYears): FavoriteResponse {
  return {
    fipeCode: item.fipeCode,
    vehicleType: item.vehicleType,
    brand: item.brand,
    model: item.model,
    favorited: true,
    years: item.years.map((y) => ({
      yearCode: y.yearCode,
      yearLabel: y.yearLabel,
      price: y.price,
      fuel: y.fuel,
      referenceMonth: y.referenceMonth,
      fuelAcronym: y.fuelAcronym,
    })),
  }
}

export function createFavoriteVehicleRoutes(
  repository: FavoriteVehicleRepository,
): Router {
  const router = Router()

  // POST /api/favorites/:type/:fipeCode — favorite a vehicle
  router.post(
    '/api/favorites/:type/:fipeCode',
    validateFavoriteParams,
    asyncHandler(async (req, res) => {
      const fipeCode: string = req.params.fipeCode as string

      const vehicle = await repository.findByFipeCode(fipeCode)
      if (!vehicle) {
        throw new NotFoundError(
          'VEHICLE_NOT_FOUND',
          `No vehicle found with FIPE code ${fipeCode}`,
        )
      }

      await repository.setFavorite(vehicle.id, true)

      const favorite = await repository.findByFipeCodeWithYears(fipeCode)

      res.json({
        success: true,
        data: toFavoriteResponse(favorite!),
      })
    }),
  )

  // DELETE /api/favorites/:type/:fipeCode — unfavorite a vehicle
  router.delete(
    '/api/favorites/:type/:fipeCode',
    validateFavoriteParams,
    asyncHandler(async (req, res) => {
      const fipeCode: string = req.params.fipeCode as string

      const vehicle = await repository.findByFipeCode(fipeCode)
      if (!vehicle) {
        throw new NotFoundError(
          'VEHICLE_NOT_FOUND',
          `No vehicle found with FIPE code ${fipeCode}`,
        )
      }

      await repository.setFavorite(vehicle.id, false)

      res.json({
        success: true,
        data: {
          fipeCode: vehicle.fipeCode,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand,
          model: vehicle.model,
          favorited: false,
          years: [],
        },
      })
    }),
  )

  // GET /api/favorites — list all favorited vehicles
  router.get(
    '/api/favorites',
    asyncHandler(async (_req, res) => {
      const favorites = await repository.listFavorites()

      res.json({
        success: true,
        data: favorites.map(toFavoriteResponse),
      })
    }),
  )

  return router
}
