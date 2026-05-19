import type { FipeYear, FipeYearDetail } from './fipe.types.js'

export class FipeClient {
  constructor(private readonly baseUrl: string) {}

  async fetchYears(type: string, fipeCode: string): Promise<FipeYear[]> {
    const url = `${this.baseUrl}/${type}/${fipeCode}/years`
    const response = await this.request(url)

    if (response.status === 404) {
      return []
    }

    return (await response.json()) as FipeYear[]
  }

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

  private async request(url: string): Promise<Response> {
    let response: Response

    try {
      response = await fetch(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`FIPE API request failed: ${message}`)
    }

    if (!response.ok && response.status !== 404) {
      throw new Error(`FIPE API error: ${response.status} ${response.statusText}`)
    }

    return response
  }
}
