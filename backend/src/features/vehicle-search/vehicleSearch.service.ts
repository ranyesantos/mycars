import { AppError } from '../../shared/errors/AppError'
import type {
  FipeYear,
  FipeYearDetail,
  IFipeClient,
} from '../../shared/services/fipe/fipe.types'
import type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'
import type { VehicleSearchRepository } from './vehicleSearch.repository'

export class VehicleSearchService {
  constructor(
    private readonly fipeClient: IFipeClient,
    private readonly repository: VehicleSearchRepository,
  ) {}

  /** Search by FIPE code, returning years from cache or the FIPE API. */
  async searchByFipeCode(
    type: string,
    fipeCode: string,
  ): Promise<SearchResponse> {
    const cached = await this.repository.findVehicleWithYears(fipeCode)

    if (cached && cached.years.length > 0) {
      return {
        fipeCode,
        vehicleType: cached.vehicleType as VehicleType,
        brand: cached.brand,
        model: cached.model,
        years: cached.years.map((y) => ({ code: y.yearCode, name: y.yearLabel })),
        source: 'cache',
      }
    }

    const years = await this.fetchYearsSafely(type, fipeCode)

    if (years.length === 0) {
      throw new AppError(
        'FIPE_CODE_NOT_FOUND',
        'No vehicles found for this FIPE code',
        404,
      )
    }

    const vehicleId = cached
      ? cached.id
      : await this.repository.createVehicleWithYears(fipeCode, type, years)

    // Persist years if vehicle was already in DB without them
    if (cached && cached.years.length === 0) {
      await this.repository.createYears(vehicleId, years)
    }

    return {
      fipeCode,
      vehicleType: type as VehicleType,
      brand: cached?.brand ?? null,
      model: cached?.model ?? null,
      years: years.map((y) => ({ code: y.code, name: y.name })),
      source: 'api',
    }
  }

  /** Get detailed info for a single year, from cache or the FIPE API. */
  async getYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<YearDetailResponse> {
    const vehicle = await this.repository.findByFipeCode(fipeCode)

    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404)
    }

    const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)

    if (!yearRow) {
      throw new AppError('YEAR_NOT_FOUND', 'Year not found for this vehicle', 404)
    }

    if (yearRow.fetchedAt) {
      return {
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicleType as VehicleType,
        yearCode: yearRow.yearCode,
        yearLabel: yearRow.yearLabel,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price ?? '',
        fuel: yearRow.fuel ?? '',
        referenceMonth: yearRow.referenceMonth ?? '',
        fuelAcronym: yearRow.fuelAcronym ?? '',
        source: 'cache',
      }
    }

    const detail = await this.fetchYearDetailSafely(type, fipeCode, yearCode)

    if (!detail) {
      throw new AppError(
        'YEAR_NOT_AVAILABLE',
        'Year detail not available for this vehicle',
        404,
      )
    }

    await this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })

    if (!vehicle.brand) {
      await this.repository.updateVehicleBrandModel(
        vehicle.id,
        detail.brand,
        detail.model,
      )
    }

    return {
      vehicleId: vehicle.id,
      fipeCode,
      vehicleType: vehicle.vehicleType as VehicleType,
      yearCode: yearRow.yearCode,
      yearLabel: yearRow.yearLabel,
      brand: detail.brand,
      model: detail.model,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
      source: 'api',
    }
  }

  /** Fetch available years from the FIPE API, wrapping errors with AppError. */
  private async fetchYearsSafely(type: string, fipeCode: string): Promise<FipeYear[]> {
    try {
      return await this.fipeClient.fetchYears(type, fipeCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }

  /** Fetch pricing and fuel details for a specific year, wrapping errors with AppError. */
  private async fetchYearDetailSafely(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<FipeYearDetail | null> {
    try {
      return await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }
}
