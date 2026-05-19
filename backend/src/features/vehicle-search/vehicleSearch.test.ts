import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import request from 'supertest'
import { VehicleSearchRepository } from './vehicleSearch.repository.js'
import { VehicleSearchService } from './vehicleSearch.service.js'
import { createVehicleSearchRoutes } from './vehicleSearch.routes.js'
import { errorHandler } from '../../shared/middleware/errorHandler.js'
import { FipeClient } from '../../shared/services/fipe/fipe.client.js'
import type { FipeYear, FipeYearDetail } from '../shared/services/fipe/fipe.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrationsOn(db: Database.Database): void {
  const migrationsDir = path.join(__dirname, '..', '..', 'db', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  db.exec(
    `CREATE TABLE IF NOT EXISTS migrations (
      name    TEXT PRIMARY KEY,
      ran_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run(file)
  }
}

function createMockFipeClient(overrides?: Partial<FipeClient>): FipeClient {
  return {
    fetchYears: vi.fn().mockResolvedValue([]),
    fetchYearDetail: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as FipeClient
}

describe('VehicleSearchService', () => {
  let db: Database.Database
  let repo: VehicleSearchRepository
  let fipeClient: FipeClient
  let service: VehicleSearchService

  beforeAll(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrationsOn(db)
  })

  beforeEach(() => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    service = new VehicleSearchService(fipeClient, repo)
    db.exec('DELETE FROM vehicle_years')
    db.exec('DELETE FROM vehicles')
  })

  afterAll(() => {
    db.close()
  })

  describe('searchByFipeCode', () => {
    it('should return cached vehicle when already in DB', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

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

      // Should be cached now
      const vehicle = repo.findByFipeCode('005490-9')
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
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = repo.findYearsByVehicleId(vehicleId)
      repo.updateYearDetail(years[0].id, {
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
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])

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

      // Should have updated vehicle brand/model
      const vehicle = repo.findByFipeCode('005490-9')
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
      repo.createVehicle('005490-9', 'cars')

      await expect(
        service.getYearDetail('cars', '005490-9', '9999-9'),
      ).rejects.toMatchObject({
        code: 'YEAR_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw 404 when FIPE API returns null for year', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '9999-9', name: '9999 Unknown' }])
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
  let db: Database.Database
  let repo: VehicleSearchRepository
  let fipeClient: FipeClient
  let app: express.Express

  beforeAll(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrationsOn(db)
  })

  beforeEach(() => {
    repo = new VehicleSearchRepository(db)
    fipeClient = createMockFipeClient()
    const service = new VehicleSearchService(fipeClient, repo)
    app = express()
    app.use(express.json())
    app.use(createVehicleSearchRoutes(service))
    app.use(errorHandler)
    db.exec('DELETE FROM vehicle_years')
    db.exec('DELETE FROM vehicles')
  })

  afterAll(() => {
    db.close()
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
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2012-1', name: '2012 Gasolina' }])

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
  })

  describe('GET /api/vehicle/:type/:fipeCode/years/:yearCode', () => {
    it('should return 200 with year detail from API', async () => {
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
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
      const vehicleId = repo.createVehicle('005490-9', 'cars')
      repo.createYears(vehicleId, [{ code: '2023-5', name: '2023 Flex' }])
      const years = repo.findYearsByVehicleId(vehicleId)
      repo.updateYearDetail(years[0].id, {
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
  })
})
