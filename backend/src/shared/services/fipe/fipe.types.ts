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

export interface FipeBrand {
  code: string
  name: string
}

export interface FipeModel {
  code: number
  name: string
}

export interface FipePriceDetail extends FipeYearDetail {}

export interface IFipeClient {
  fetchYears(type: string, fipeCode: string): Promise<FipeYear[]>
  fetchYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<FipeYearDetail | null>
  fetchBrands(type: string): Promise<FipeBrand[]>
  fetchModels(type: string, brandCode: string): Promise<FipeModel[]>
  fetchYearsByBrandModel(type: string, brandCode: string, modelCode: number): Promise<FipeYear[]>
  fetchPriceByBrandModel(type: string, brandCode: string, modelCode: number, yearCode: string): Promise<FipePriceDetail | null>
}
