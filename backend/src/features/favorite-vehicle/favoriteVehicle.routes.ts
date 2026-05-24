import { Router } from 'express'
import type { FavoriteVehicleRepository } from './favoriteVehicle.repository'
import { validateFavoriteParams } from './favoriteVehicle.validator'
import { asyncHandler } from '../../shared/utils/asyncHandler'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { FavoriteResponse } from './favoriteVehicle.types'

function toFavoriteResponse(
  repo: Awaited<
    ReturnType<FavoriteVehicleRepository['listFavorites']>
  >[number],
): FavoriteResponse {
  return {
    fipeCode: repo.fipeCode,
    vehicleType: repo.vehicleType,
    brand: repo.brand,
    model: repo.model,
    favorited: true,
    years: repo.years.map((y) => ({
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
      const { fipeCode } = req.params as Record<string, string>

      const vehicle = await repository.findByFipeCode(fipeCode)
      if (!vehicle) {
        throw new NotFoundError(
          'VEHICLE_NOT_FOUND',
          `No vehicle found with FIPE code ${fipeCode}`,
        )
      }

      await repository.setFavorite(vehicle.id, true)

      const favorites = await repository.listFavorites()
      const favorite = favorites.find((f) => f.fipeCode === fipeCode)

      res.json({
        success: true,
        data: favorite
          ? toFavoriteResponse(favorite)
          : {
              fipeCode,
              vehicleType: vehicle.vehicleType,
              brand: vehicle.brand,
              model: vehicle.model,
              favorited: true,
              years: [],
            },
      })
    }),
  )

  // DELETE /api/favorites/:type/:fipeCode — unfavorite a vehicle
  router.delete(
    '/api/favorites/:type/:fipeCode',
    validateFavoriteParams,
    asyncHandler(async (req, res) => {
      const { fipeCode } = req.params as Record<string, string>

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
