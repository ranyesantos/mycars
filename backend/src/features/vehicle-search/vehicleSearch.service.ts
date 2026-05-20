import { AppError } from '../../shared/errors/AppError.js'
import type { IFipeClient } from '../../shared/services/fipe/fipe.types.js'
import type {
  SearchResponse,
  VehicleType,
  YearDetailResponse,
} from './vehicleSearch.types.js'
import type { VehicleSearchRepository } from './vehicleSearch.repository.js'

/**
 * Progressive-caching FIPE search service.
 *
 * Years list is cached on first search; per-year detail (price, fuel,
 * brand, model) is cached on first detail request so no FIPE API
 * response is ever fetched twice.
 */
export class VehicleSearchService {
  constructor(
    private readonly fipeClient: IFipeClient,
    private readonly repository: VehicleSearchRepository,
  ) {}

  /** Get the available years for a FIPE code, from cache or the FIPE API. */
  async searchByFipeCode(
    type: string,
    fipeCode: string,
  ): Promise<SearchResponse> {
    const cached = this.repository.findVehicleWithYears(fipeCode)

    if (cached && cached.years.length > 0) {
      return {
        fipeCode,
        vehicleType: cached.vehicle_type,
        brand: cached.brand,
        model: cached.model,
        years: cached.years.map((y) => ({ code: y.year_code, name: y.year_label })),
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

    // TODO: wrap createVehicle + createYears in a single transaction
    // once an ORM or Unit-of-Work pattern is introduced (see database.md).
    const vehicleId = cached
      ? cached.id
      : this.repository.createVehicle(fipeCode, type)

    this.repository.createYears(vehicleId, years)

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
    const vehicle = this.repository.findByFipeCode(fipeCode)

    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404)
    }

    const yearRow = this.repository.findYearByCode(vehicle.id, yearCode)

    if (!yearRow) {
      throw new AppError(
        'YEAR_NOT_FOUND',
        'Year not found for this vehicle',
        404,
      )
    }

    if (yearRow.fetched_at) {
      return {
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicle_type,
        yearCode: yearRow.year_code,
        yearLabel: yearRow.year_label,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price!,
        fuel: yearRow.fuel!,
        referenceMonth: yearRow.reference_month!,
        fuelAcronym: yearRow.fuel_acronym!,
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

    this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })

    if (!vehicle.brand) {
      this.repository.updateVehicleBrandModel(
        vehicle.id,
        detail.brand,
        detail.model,
      )
    }

    return {
      vehicleId: vehicle.id,
      fipeCode,
      vehicleType: vehicle.vehicle_type,
      yearCode: yearRow.year_code,
      yearLabel: yearRow.year_label,
      brand: detail.brand,
      model: detail.model,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
      source: 'api',
    }
  }

  private async fetchYearsSafely(
    type: string,
    fipeCode: string,
  ) {
    try {
      return await this.fipeClient.fetchYears(type, fipeCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }

  private async fetchYearDetailSafely(
    type: string,
    fipeCode: string,
    yearCode: string,
  ) {
    try {
      return await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FIPE API error'
      throw new AppError('FIPE_API_ERROR', message, 502)
    }
  }
}
