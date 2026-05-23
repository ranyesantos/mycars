import type { IFipeClient } from '../../shared/services/fipe/fipe.types'
import type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'
import type { VehicleSearchRepository } from './vehicleSearch.repository'
import {
  assertVehicleExists,
  assertYearExists,
  assertYearsNotEmpty,
  assertYearDetailAvailable,
} from './vehicleSearch.assertions'

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
      return this.toCachedSearchResponse(cached)
    }

    const years = await this.fipeClient.fetchYears(type, fipeCode)
    assertYearsNotEmpty(years)

    const vehicleId = cached
      ? cached.id
      : await this.repository.createVehicleWithYears(fipeCode, type, years)

    if (cached && cached.years.length === 0) {
      await this.repository.createYears(vehicleId, years)
    }

    return this.toApiSearchResponse(fipeCode, type, cached, years)
  }

  /** Get detailed info for a single year, from cache or the FIPE API. */
  async getYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<YearDetailResponse> {
    const vehicle = await this.repository.findByFipeCode(fipeCode)
    assertVehicleExists(vehicle, fipeCode)

    const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)
    assertYearExists(yearRow, yearCode)

    if (yearRow.fetchedAt) {
      return this.toCachedYearDetailResponse(vehicle, yearRow, fipeCode)
    }

    const detail = await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)
    assertYearDetailAvailable(detail)

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

    return this.toApiYearDetailResponse(vehicle, yearRow, detail)
  }

  // -----------------------------------------------------------
  // Private helpers — response mapping
  // -----------------------------------------------------------

  private toCachedSearchResponse(cached: {
    fipeCode: string
    vehicleType: string
    brand: string | null
    model: string | null
    years: { yearCode: string; yearLabel: string }[]
  }): SearchResponse {
    return {
      fipeCode: cached.fipeCode,
      vehicleType: cached.vehicleType as VehicleType,
      brand: cached.brand,
      model: cached.model,
      years: cached.years.map((y) => ({ code: y.yearCode, name: y.yearLabel })),
      source: 'cache',
    }
  }

  private toApiSearchResponse(
    fipeCode: string,
    type: string,
    cached: { brand: string | null; model: string | null } | null,
    years: { code: string; name: string }[],
  ): SearchResponse {
    return {
      fipeCode,
      vehicleType: type as VehicleType,
      brand: cached?.brand ?? null,
      model: cached?.model ?? null,
      years: years.map((y) => ({ code: y.code, name: y.name })),
      source: 'api',
    }
  }

  private toCachedYearDetailResponse(
    vehicle: { id: number; vehicleType: string; brand: string | null; model: string | null },
    yearRow: { yearCode: string; yearLabel: string; price: string | null; fuel: string | null; referenceMonth: string | null; fuelAcronym: string | null },
    fipeCode: string,
  ): YearDetailResponse {
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

  private toApiYearDetailResponse(
    vehicle: { id: number; vehicleType: string; fipeCode: string },
    yearRow: { yearCode: string; yearLabel: string },
    detail: { brand: string; model: string; price: string; fuel: string; referenceMonth: string; fuelAcronym: string },
  ): YearDetailResponse {
    return {
      vehicleId: vehicle.id,
      fipeCode: vehicle.fipeCode,
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
}
