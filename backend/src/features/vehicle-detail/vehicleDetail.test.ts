import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { VehicleDetailRepository } from './vehicleDetail.repository'
import { createVehicleDetailRoutes } from './vehicleDetail.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'

describe('Vehicle Detail Routes', () => {
  let db: PrismaClient
  let repo: VehicleDetailRepository
  let app: express.Express

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleDetailRepository(db)
    app = express()
    app.use(express.json())
    app.use(createVehicleDetailRoutes(repo))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  async function seedVehicleWithYearAndSpecs(): Promise<{ fipeCode: string; yearCode: string }> {
    const vehicle = await db.vehicle.create({
      data: {
        fipeCode: '005490-9',
        vehicleType: 'cars',
        brand: 'Audi',
        model: 'RS6 Avant',
        years: {
          create: {
            yearCode: '2004-1',
            yearLabel: '2004',
            price: 'R$ 85.000',
            fuel: 'Gasolina',
          },
        },
      },
      include: { years: true },
    })

    const yearId = vehicle.years[0].id

    await db.technicalSpecs.create({
      data: {
        vehicleYearId: yearId,
        sourceUrl: 'https://example.com/car',
        powerHpG: '450 cv',
        torqueG: '57,1 kgfm',
        gearbox: 'Automático',
        fuel: 'Gasolina',
        displacement: '4172 cm³',
        engineCode: 'EA824',
      },
    })

    return { fipeCode: vehicle.fipeCode, yearCode: '2004-1' }
  }

  async function seedVehicleWithYearNoSpecs(): Promise<{ fipeCode: string; yearCode: string }> {
    const vehicle = await db.vehicle.create({
      data: {
        fipeCode: '001002-5',
        vehicleType: 'cars',
        brand: 'VW',
        model: 'Gol',
        years: {
          create: {
            yearCode: '2020-1',
            yearLabel: '2020',
            price: 'R$ 45.000',
            fuel: 'Flex',
          },
        },
      },
    })

    return { fipeCode: vehicle.fipeCode, yearCode: '2020-1' }
  }

  describe('GET /api/vehicles/:fipeCode/:yearCode/specs', () => {
    it('should return 200 with specs when vehicle and specs exist', async () => {
      const { fipeCode, yearCode } = await seedVehicleWithYearAndSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.fipeCode).toBe(fipeCode)
      expect(response.body.data.brand).toBe('Audi')
      expect(response.body.data.specs).not.toBeNull()
      expect(response.body.data.specs.power_hp_g).toBe('450 cv')
      expect(response.body.data.specs.gearbox).toBe('Automático')
    })

    it('should return 200 with specs: null when vehicle exists but has no specs', async () => {
      const { fipeCode, yearCode } = await seedVehicleWithYearNoSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.specs).toBeNull()
    })

    it('should return 404 when fipeCode does not exist', async () => {
      const response = await request(app).get('/api/vehicles/999999-9/2020-1/specs')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 404 when yearCode does not match', async () => {
      const { fipeCode } = await seedVehicleWithYearNoSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/2099-1/specs`)

      // Vehicle exists but year doesn't — vehicle.years.where filters out,
      // so vehicle.years[0] is undefined → returns null from repository
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })
  })
})
