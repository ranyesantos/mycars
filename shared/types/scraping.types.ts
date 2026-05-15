export interface ScrapedSpecs {
  engine: string | null
  power_hp: string | null
  torque: string | null
  transmission: string | null
  fuel_type: string | null
  consumption_city: string | null
  consumption_highway: string | null
  raw_data: Record<string, string>
}

export interface ScrapeRequest {
  vehicleId: number
  url: string
}
