import type { PrismaClient, Vehicle } from '@prisma/client'
import type { FavoriteWithYears } from './favoriteVehicle.types'

export class FavoriteVehicleRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Find a vehicle by FIPE code, or null if not found. */
  async findByFipeCode(fipeCode: string): Promise<Vehicle | null> {
    return this.db.vehicle.findUnique({ where: { fipeCode } })
  }

  /** Find a vehicle by FIPE code with its years eagerly loaded. */
  async findByFipeCodeWithYears(
    fipeCode: string,
  ): Promise<FavoriteWithYears | null> {
    return this.db.vehicle.findUnique({
      where: { fipeCode },
      include: {
        years: {
          select: {
            yearCode: true,
            yearLabel: true,
            price: true,
            fuel: true,
            referenceMonth: true,
            fuelAcronym: true,
          },
          orderBy: { yearCode: 'asc' },
        },
      },
    }) as Promise<FavoriteWithYears | null>
  }

  /** Set the favorited flag on a vehicle. */
  async setFavorite(vehicleId: number, favorited: boolean): Promise<void> {
    await this.db.vehicle.update({
      where: { id: vehicleId },
      data: { favorited: favorited ? 1 : 0 },
    })
  }

  /** List all favorited vehicles with their years eagerly loaded. */
  async listFavorites(): Promise<FavoriteWithYears[]> {
    return this.db.vehicle.findMany({
      where: { favorited: 1 },
      include: {
        years: {
          select: {
            yearCode: true,
            yearLabel: true,
            price: true,
            fuel: true,
            referenceMonth: true,
            fuelAcronym: true,
          },
          orderBy: { yearCode: 'asc' },
        },
      },
    }) as Promise<FavoriteWithYears[]>
  }
}
