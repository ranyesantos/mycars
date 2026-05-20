export type VehicleType = 'cars' | 'trucks' | 'motorcycles'

export interface Vehicle {
  id: number
  fipe_code: string
  vehicle_type: VehicleType
  brand: string | null
  model: string | null
  favorited: number
  fetched_at: string
  updated_at: string
}

export interface VehicleYear {
  id: number
  vehicle_id: number
  year_code: string
  year_label: string
  price: string | null
  fuel: string | null
  reference_month: string | null
  fuel_acronym: string | null
  fetched_at: string | null
  price_updated_at: string | null
}

export interface VehicleWithYears extends Vehicle {
  years: Pick<VehicleYear, 'year_code' | 'year_label' | 'price' | 'fetched_at'>[]
}

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
