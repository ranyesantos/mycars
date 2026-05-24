import type { SearchResponse, VehicleType, YearDetailResponse } from './vehicleSearch.types'

export class SearchResponseDto {
  static create(params: {
    fipeCode: string
    vehicleType: VehicleType
    years: { code: string; name: string }[]
    brand?: string | null
    model?: string | null
  }): SearchResponse {
    return {
      fipeCode: params.fipeCode,
      vehicleType: params.vehicleType,
      brand: params.brand ?? null,
      model: params.model ?? null,
      years: params.years,
    }
  }
}

export class YearDetailResponseDto {
  static create(params: {
    vehicleId: number
    fipeCode: string
    vehicleType: VehicleType
    yearCode: string
    yearLabel: string
    brand?: string | null
    model?: string | null
    price?: string | null
    fuel?: string | null
    referenceMonth?: string | null
    fuelAcronym?: string | null
  }): YearDetailResponse {
    return {
      vehicleId: params.vehicleId,
      fipeCode: params.fipeCode,
      vehicleType: params.vehicleType,
      yearCode: params.yearCode,
      yearLabel: params.yearLabel,
      brand: params.brand ?? null,
      model: params.model ?? null,
      price: params.price ?? '',
      fuel: params.fuel ?? '',
      referenceMonth: params.referenceMonth ?? '',
      fuelAcronym: params.fuelAcronym ?? '',
    }
  }
}
