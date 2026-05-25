import type { FipeBrand, FipeModel, FipePriceDetail, FipeYear, FipeYearDetail, IFipeClient } from './fipe.types'
import { AppError } from '../../errors/AppError'

/** HTTP client for the FIPE vehicle pricing API (fipe.parallelum.com.br). */
export class FipeClient implements IFipeClient {
  constructor(private readonly baseUrl: string) {}

  /** Fetch available model years for a FIPE code. Returns empty array on 404. */
  async fetchYears(type: string, fipeCode: string): Promise<FipeYear[]> {
    const url = `${this.baseUrl}/${type}/${fipeCode}/years`
    const response = await this.request(url)

    if (response.status === 404) {
      return []
    }

    return (await response.json()) as FipeYear[]
  }

  /** Fetch pricing and fuel details for a specific model year. Returns null on 404. */
  async fetchYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<FipeYearDetail | null> {
    const url = `${this.baseUrl}/${type}/${fipeCode}/years/${yearCode}`
    const response = await this.request(url)

    if (response.status === 404) {
      return null
    }

    return (await response.json()) as FipeYearDetail
  }

  /** Fetch all brands for a vehicle type. Returns empty array on 404. */
  async fetchBrands(type: string): Promise<FipeBrand[]> {
    const url = `${this.baseUrl}/${type}/brands`
    const response = await this.request(url)
    if (response.status === 404) return []
    return (await response.json()) as FipeBrand[]
  }

  /** Fetch all models for a vehicle type and brand. Returns empty array on 404. */
  async fetchModels(type: string, brandCode: string): Promise<FipeModel[]> {
    const url = `${this.baseUrl}/${type}/brands/${brandCode}/models`
    const response = await this.request(url)
    if (response.status === 404) return []
    return (await response.json()) as FipeModel[]
  }

  /** Fetch available years for a brand/model combination. Returns empty array on 404. */
  async fetchYearsByBrandModel(
    type: string,
    brandCode: string,
    modelCode: number,
  ): Promise<FipeYear[]> {
    const url = `${this.baseUrl}/${type}/brands/${brandCode}/models/${modelCode}/years`
    const response = await this.request(url)
    if (response.status === 404) return []
    return (await response.json()) as FipeYear[]
  }

  /** Fetch price detail for a specific brand/model/year. Returns null on 404. */
  async fetchPriceByBrandModel(
    type: string,
    brandCode: string,
    modelCode: number,
    yearCode: string,
  ): Promise<FipePriceDetail | null> {
    const url = `${this.baseUrl}/${type}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
    const response = await this.request(url)
    if (response.status === 404) return null
    return (await response.json()) as FipePriceDetail
  }

  private async request(url: string): Promise<Response> {
    const response = await fetch(url)

    if (!response.ok && response.status !== 404) {
      throw new AppError(
        'FIPE_API_ERROR',
        `FIPE API returned ${response.status}`,
        502,
      )
    }

    return response
  }
}
