export type VehicleType = 'cars' | 'trucks' | 'motorcycles'

export interface YearDetailResponse {
  vehicleId: number
  fipeCode: string
  vehicleType: VehicleType
  yearCode: string
  yearLabel: string
  brand: string | null
  model: string | null
  price: string
  fuel: string
  referenceMonth: string
  fuelAcronym: string
}

export interface SearchResponse {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: { code: string; name: string }[]
}

export interface BrandResponse {
  code: string
  name: string
}

export interface ModelResponse {
  code: number
  name: string
}

export interface CascadingYear {
  code: string
  name: string
}

export interface BrandModelPriceResponse {
  fipeCode: string
  brand: string
  model: string
  modelYear: number
  price: string
  fuel: string
  referenceMonth: string
  fuelAcronym: string
  vehicleType: number
}
