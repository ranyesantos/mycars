import type { Prisma, PrismaClient, Vehicle, VehicleYear } from '@prisma/client'

export type VehicleWithYearsPayload = Prisma.VehicleGetPayload<{
  include: {
    years: {
      select: {
        yearCode: true
        yearLabel: true
        price: true
        fetchedAt: true
      }
    }
  }
}>

export class VehicleSearchRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByFipeCode(fipeCode: string): Promise<Vehicle | null> {
    return this.db.vehicle.findUnique({ where: { fipeCode } })
  }

  async createVehicle(
    fipeCode: string,
    vehicleType: string,
  ): Promise<number> {
    const result = await this.db.vehicle.create({
      data: { fipeCode, vehicleType },
    })
    return result.id
  }

  async createVehicleWithYears(
    fipeCode: string,
    vehicleType: string,
    years: { code: string; name: string }[],
  ): Promise<number> {
    const vehicle = await this.db.vehicle.create({
      data: {
        fipeCode,
        vehicleType,
        years: {
          create: years.map((row) => ({
            yearCode: row.code,
            yearLabel: row.name,
          })),
        },
      },
    })
    return vehicle.id
  }

  async createYears(
    vehicleId: number,
    years: { code: string; name: string }[],
  ): Promise<void> {
    await this.db.$transaction(
      years.map((row) =>
        this.db.vehicleYear.create({
          data: {
            vehicleId,
            yearCode: row.code,
            yearLabel: row.name,
          },
        }),
      ),
    )
  }

  async findYearsByVehicleId(
    vehicleId: number,
  ): Promise<VehicleYear[]> {
    return this.db.vehicleYear.findMany({ where: { vehicleId } })
  }

  async findVehicleWithYears(
    fipeCode: string,
  ): Promise<VehicleWithYearsPayload | null> {
    return this.db.vehicle.findUnique({
      where: { fipeCode },
      include: {
        years: {
          select: {
            yearCode: true,
            yearLabel: true,
            price: true,
            fetchedAt: true,
          },
          orderBy: { yearCode: 'asc' },
        },
      },
    })
  }

  async findYearByCode(
    vehicleId: number,
    yearCode: string,
  ): Promise<VehicleYear | null> {
    return this.db.vehicleYear.findFirst({
      where: { vehicleId, yearCode },
    })
  }

  async updateYearDetail(
    yearId: number,
    data: {
      price: string
      fuel: string
      referenceMonth: string
      fuelAcronym: string
    },
  ): Promise<void> {
    await this.db.vehicleYear.update({
      where: { id: yearId },
      data: {
        price: data.price,
        fuel: data.fuel,
        referenceMonth: data.referenceMonth,
        fuelAcronym: data.fuelAcronym,
        fetchedAt: new Date(),
      },
    })
  }

  async updateVehicleBrandModel(
    vehicleId: number,
    brand: string,
    model: string,
  ): Promise<void> {
    await this.db.vehicle.update({
      where: { id: vehicleId },
      data: { brand, model },
    })
  }
}
