import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { PrismaClient } from '../../generated/prisma/client'
import express from 'express'
import request from 'supertest'
import { FavoriteVehicleRepository } from './favoriteVehicle.repository'
import { createFavoriteVehicleRoutes } from './favoriteVehicle.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'
import { VehicleSearchRepository } from '../vehicle-search/vehicleSearch.repository'

describe('Favorite Vehicle Routes', () => {
  let db: PrismaClient
  let repo: FavoriteVehicleRepository
  let vehicleSearchRepo: VehicleSearchRepository
  let app: express.Express

  beforeAll(async () => {
    db = await createTestDb()
  })

  beforeEach(async () => {
    repo = new FavoriteVehicleRepository(db)
    vehicleSearchRepo = new VehicleSearchRepository(db)
    app = express()
    app.use(express.json())
    app.use('/api/v1/favorites', createFavoriteVehicleRoutes(repo))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  describe('POST /api/v1/favorites/:type/:fipeCode', () => {
    it('should favorite a vehicle when vehicle exists', async () => {
      await vehicleSearchRepo.createVehicleWithYears('900001-1', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      const response = await request(app).post('/api/v1/favorites/cars/900001-1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.favorited).toBe(true)
      expect(response.body.data.years).toHaveLength(1)
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).post('/api/v1/favorites/cars/900001-1')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 400 when vehicle type is invalid', async () => {
      const response = await request(app).post('/api/v1/favorites/boats/900001-1')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when FIPE code format is invalid', async () => {
      const response = await request(app).post('/api/v1/favorites/cars/abc')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/v1/favorites/:type/:fipeCode', () => {
    it('should unfavorite a vehicle', async () => {
      await vehicleSearchRepo.createVehicleWithYears('900001-1', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      // First, favorite it
      await request(app).post('/api/v1/favorites/cars/900001-1')

      // Then unfavorite
      const response = await request(app).delete('/api/v1/favorites/cars/900001-1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.favorited).toBe(false)
    })

    it('should return 404 when vehicle does not exist', async () => {
      const response = await request(app).delete('/api/v1/favorites/cars/900001-1')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })
  })

  describe('GET /api/v1/favorites', () => {
    it('should list only favorited vehicles', async () => {
      await vehicleSearchRepo.createVehicleWithYears('900001-1', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])
      await vehicleSearchRepo.createVehicleWithYears('900002-2', 'cars', [
        { code: '2012-1', name: '2012 Gasolina' },
      ])

      // Favorite only one
      await request(app).post('/api/v1/favorites/cars/900001-1')

      const response = await request(app).get('/api/v1/favorites')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].fipeCode).toBe('900001-1')
    })

    it('should return empty array when no favorites', async () => {
      const response = await request(app).get('/api/v1/favorites')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(0)
    })
  })
})
