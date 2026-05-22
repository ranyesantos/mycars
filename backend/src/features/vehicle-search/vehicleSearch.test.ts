import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { VehicleSearchRepository } from './vehicleSearch.repository'
import { VehicleSearchService } from './vehicleSearch.service'
import { createVehicleSearchRoutes } from './vehicleSearch.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'
import type { FipeYear, FipeYearDetail, IFipeClient } from '../../shared/services/fipe/fipe.types'

function createMockFipeClient(overrides?: Partial<IFipeClient>): IFipeClient {
  const mock: IFipeClient = {
    fetchYears: vi.fn().mockResolvedValue([]),
    fetchYearDetail: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
  return mock
}

describe('VehicleSearchService', () => {
  let db: PrismaClient
  let repo: VehicleSearchRepository
  let fipeClient: IFipeClient
  let service: VehicleSearchService

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    service = new VehicleSearchService(fipeClient, repo)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  describe('searchByFipeCode', () => {
    it('should return cached vehicle when already in DB', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

      const result = await service.searchByFipeCode('cars', '005490-9')

      expect(result.source).toBe('cache')
      expect(result.fipeCode).toBe('005490-9')
      expect(result.years).toHaveLength(1)
      expect(fipeClient.fetchYears).not.toHaveBeenCalled()
    })

    it('should fetch from API when vehicle not in DB', async () => {
      const mockYears: FipeYear[] = [
        { code: '2012-1', name: '2012 Gasolina' },
        { code: '2013-1', name: '2013 Gasolina' },
      ]
      fipeClient.fetchYears = vi.fn().mockResolvedValue(mockYears)

      const result = await service.searchByFipeCode('cars', '005490-9')

      expect(result.source).toBe('api')
      expect(result.years).toHaveLength(2)
      expect(fipeClient.fetchYears).toHaveBeenCalledWith('cars', '005490-9')

      const vehicle = await repo.findByFipeCode('005490-9')
      expect(vehicle).not.toBeNull()
    })

    it('should throw 404 when FIPE code does not exist', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([])

      await expect(
        service.searchByFipeCode('cars', '000000-0'),
      ).rejects.toMatchObject({
        code: 'FIPE_CODE_NOT_FOUND',
        statusCode: 404,
      })
    })
  })

  describe('getYearDetail', () => {
    it('should return cached year detail when fetched_at is set', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = await repo.findYearsByVehicleId(vehicleId)
      await repo.updateYearDetail(years[0].id, {
        price: 'R$ 55.119,00',
        fuel: 'Flex',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const result = await service.getYearDetail('cars', '005490-9', '2023-5')

      expect(result.source).toBe('cache')
      expect(result.price).toBe('R$ 55.119,00')
      expect(fipeClient.fetchYearDetail).not.toHaveBeenCalled()
    })

    it('should fetch from API when year not cached', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])

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
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue(mockDetail)

      const result = await service.getYearDetail('cars', '005490-9', '2023-5')

      expect(result.source).toBe('api')
      expect(result.price).toBe('R$ 55.119,00')
      expect(result.brand).toBe('VW - VolksWagen')

      const vehicle = await repo.findByFipeCode('005490-9')
      expect(vehicle!.brand).toBe('VW - VolksWagen')
      expect(vehicle!.model).toBe('Gol 1.0 Flex 12V 5p')
    })

    it('should throw 404 when vehicle does not exist', async () => {
      await expect(
        service.getYearDetail('cars', '005490-9', '2023-5'),
      ).rejects.toMatchObject({
        code: 'VEHICLE_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when year code not in DB', async () => {
      await repo.createVehicle('005490-9', 'cars')

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when FIPE API returns null for year', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '9999-9', name: '9999 Unknown' }])
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue(null)

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_AVAILABLE',
        statusCode: 404,
      })
    })
  })
})

describe('Vehicle Search Routes', () => {
  let db: PrismaClient
  let repo: VehicleSearchRepository
  let fipeClient: IFipeClient
  let app: express.Express

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    const service = new VehicleSearchService(fipeClient, repo)
    app = express()
    app.use(express.json())
    app.use(createVehicleSearchRoutes(service))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  describe('GET /api/vehicle/:type/:fipeCode', () => {
    it('should return 200 with years from API on first search', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      const response = await request(app).get('/api/vehicle/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.source).toBe('api')
      expect(response.body.data.years).toHaveLength(1)
    })

    it('should return 200 with cache on second search', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

      const response = await request(app).get('/api/vehicle/cars/005490-9')

      expect(response.status).toBe(200)
      expect(response.body.data.source).toBe('cache')
      expect(fipeClient.fetchYears).not.toHaveBeenCalled()
    })

    it('should return 404 when FIPE code not found', async () => {
      fipeClient.fetchYears = vi.fn().mockResolvedValue([])

      const response = await request(app).get('/api/vehicle/cars/000000-0')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('FIPE_CODE_NOT_FOUND')
    })

    it('should return 400 when vehicle type is invalid', async () => {
      const response = await request(app).get('/api/vehicle/boats/005490-9')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when FIPE code format is invalid', async () => {
      const response = await request(app).get('/api/vehicle/cars/abc')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/vehicle/:type/:fipeCode/years/:yearCode', () => {
    it('should return 200 with year detail from API', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      fipeClient.fetchYearDetail = vi.fn().mockResolvedValue({
        vehicleType: 1,
        price: 'R$ 55.119,00',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        modelYear: 2023,
        fuel: 'Flex',
        codeFipe: '005490-9',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(200)
      expect(response.body.data.price).toBe('R$ 55.119,00')
      expect(response.body.data.source).toBe('api')
    })

    it('should return 200 with cached detail on second call', async () => {
      const vehicleId = await repo.createVehicle('005490-9', 'cars')
      await repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = await repo.findYearsByVehicleId(vehicleId)
      await repo.updateYearDetail(years[0].id, {
        price: 'R$ 55.119,00',
        fuel: 'Flex',
        referenceMonth: 'maio de 2026',
        fuelAcronym: 'F',
      })

      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(200)
      expect(response.body.data.source).toBe('cache')
      expect(fipeClient.fetchYearDetail).not.toHaveBeenCalled()
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/2023-5',
      )

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 400 when year code format is invalid', async () => {
      const response = await request(app).get(
        '/api/vehicle/cars/005490-9/years/invalid',
      )

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
