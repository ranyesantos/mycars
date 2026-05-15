export interface FipeYear {
  code: string
  name: string
}

export interface FipeVehicle {
  fipe_code: string
  vehicle_type: 'cars' | 'trucks' | 'motorcycles'
  brand: string
  model: string
  years: FipeYear[]
}

export interface FipePriceResponse {
  code: string
  name: string
  price: string
}
