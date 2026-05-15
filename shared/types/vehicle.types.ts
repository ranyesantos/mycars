export interface Vehicle {
  id: number
  fipe_code: string
  vehicle_type: 'cars' | 'trucks' | 'motorcycles'
  brand: string | null
  model: string | null
  favorited: number
  fetched_at: string
  updated_at: string
}

export interface VehicleWithYears extends Vehicle {
  years: VehicleYear[]
  scraping: ScrapingDetail | null
}

export interface VehicleYear {
  id: number
  vehicle_id: number
  year_code: string
  year_label: string
  price: string | null
  price_updated_at: string | null
}

export interface ScrapingDetail {
  id: number
  vehicle_id: number
  source_url: string
  engine: string | null
  power_hp: string | null
  torque: string | null
  transmission: string | null
  fuel_type: string | null
  consumption_city: string | null
  consumption_highway: string | null
  raw_data: string | null
  scraped_at: string
}
