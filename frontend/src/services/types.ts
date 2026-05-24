export type VehicleType = 'cars' | 'motorcycles'

export interface Year {
  code: string
  name: string
}

export interface SearchResponse {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: Year[]
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
}

export interface FavoriteVehicle {
  fipeCode: string
  vehicleType: string
  brand: string | null
  model: string | null
  favorited: boolean
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}

export function parsePrice(priceString: string): number {
  const cleaned = priceString
    .replace('R$ ', '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}
