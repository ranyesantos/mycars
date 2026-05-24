import type { IFipeClient } from '../../shared/services/fipe/fipe.types'
import type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'
import type { VehicleSearchRepository } from './vehicleSearch.repository'
import {
  assertVehicleExists,
  assertYearExists,
  assertYearsNotEmpty,
  assertYearDetailAvailable,
} from './vehicleSearch.assertions'
import { SearchResponseDto, YearDetailResponseDto } from './vehicleSearch.dto'

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
      return SearchResponseDto.create({
        fipeCode: cached.fipeCode,
        vehicleType: cached.vehicleType as VehicleType,
        years: cached.years.map((y) => ({ code: y.yearCode, name: y.yearLabel })),
        brand: cached.brand,
        model: cached.model,
      })
    }

    const years = await this.fipeClient.fetchYears(type, fipeCode)
    assertYearsNotEmpty(years)

    const vehicleId = cached
      ? cached.id
      : await this.repository.createVehicleWithYears(fipeCode, type, years)

    if (cached && cached.years.length === 0) {
      await this.repository.createYears(vehicleId, years)
    }

    return SearchResponseDto.create({
      fipeCode,
      vehicleType: type as VehicleType,
      years,
    })
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
      return YearDetailResponseDto.create({
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicleType as VehicleType,
        yearCode: yearRow.yearCode,
        yearLabel: yearRow.yearLabel,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price,
        fuel: yearRow.fuel,
        referenceMonth: yearRow.referenceMonth,
        fuelAcronym: yearRow.fuelAcronym,
      })
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

    return YearDetailResponseDto.create({
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
    })
  }
}
