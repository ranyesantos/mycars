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
  source: 'cache' | 'api'
}

export interface SearchResponse {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: { code: string; name: string }[]
  source: 'cache' | 'api'
}
