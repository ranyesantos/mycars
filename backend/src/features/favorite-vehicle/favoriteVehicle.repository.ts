import type { PrismaClient, Vehicle } from '@prisma/client'

export type FavoriteWithYears = Vehicle & {
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}

export class FavoriteVehicleRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Find a vehicle by FIPE code, or null if not found. */
  async findByFipeCode(fipeCode: string): Promise<Vehicle | null> {
    return this.db.vehicle.findUnique({ where: { fipeCode } })
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
