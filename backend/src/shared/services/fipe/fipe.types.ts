export interface FipeYear {
  code: string
  name: string
}

export interface FipeYearDetail {
  vehicleType: number
  price: string
  brand: string
  model: string
  modelYear: number
  fuel: string
  codeFipe: string
  referenceMonth: string
  fuelAcronym: string
}

export interface IFipeClient {
  fetchYears(type: string, fipeCode: string): Promise<FipeYear[]>
  fetchYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<FipeYearDetail | null>
}
