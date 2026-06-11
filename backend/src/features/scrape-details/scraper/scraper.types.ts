/**
 * All fields extracted and stored in typed columns.
 * Label string → column mapping is defined in the scraper implementation.
 */
export interface TypedFields {
  engine: string | null
  powerHp: string | null
  torque: string | null
  transmission: string | null
  fuelType: string | null
  consumptionCity: string | null
  consumptionHighway: string | null
}

/**
 * The scraper's return type.
 * rawData contains every label:value pair found on the page as JSON.
 */
export interface ScrapedVehicleDetails extends TypedFields {
  rawData: string
}
