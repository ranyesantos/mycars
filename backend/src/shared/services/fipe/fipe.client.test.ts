import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FipeClient } from './fipe.client.js'
import type { FipeYear, FipeYearDetail } from './fipe.types.js'

describe('FipeClient', () => {
  let client: FipeClient
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    client = new FipeClient('https://fipe.parallelum.com.br/api/v2')
    fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof global.fetch
  })

  describe('fetchYears', () => {
    it('should return parsed years array on success', async () => {
      const mockYears: FipeYear[] = [
        { code: '2012-1', name: '2012 Gasolina' },
        { code: '2013-1', name: '2013 Gasolina' },
      ]
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockYears),
      })

      const result = await client.fetchYears('cars', '005490-9')

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://fipe.parallelum.com.br/api/v2/cars/005490-9/years',
      )
      expect(result).toEqual(mockYears)
    })

    it('should return empty array when FIPE code does not exist (404)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      })

      const result = await client.fetchYears('cars', '000000-0')

      expect(result).toEqual([])
    })

    it('should throw on unexpected HTTP errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({}),
      })

      await expect(client.fetchYears('cars', '005490-9')).rejects.toThrow(
        'FIPE API error: 500 Internal Server Error',
      )
    })

    it('should throw on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(client.fetchYears('cars', '005490-9')).rejects.toThrow(
        'FIPE API request failed: ECONNREFUSED',
      )
    })
  })

  describe('fetchYearDetail', () => {
    it('should return parsed year detail on success', async () => {
      const mockDetail: FipeYearDetail = {
        vehicleType: 1,
        price: 'R$ 55.119,00',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        modelYear: 2023,
        fuel: 'Flex',
        codeFipe: '005490-9',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      }
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockDetail),
      })

      const result = await client.fetchYearDetail('cars', '005490-9', '2023-5')

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://fipe.parallelum.com.br/api/v2/cars/005490-9/years/2023-5',
      )
      expect(result).toEqual(mockDetail)
    })

    it('should return null when year not found (404)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      })

      const result = await client.fetchYearDetail('cars', '005490-9', '9999-9')

      expect(result).toBeNull()
    })
  })
})
