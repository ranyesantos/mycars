import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '../../generated/prisma/client'
import express from 'express'
import request from 'supertest'
import { ScrapeDetailsRepository } from './scrapeDetails.repository'
import { ScrapeDetailsService } from './scrapeDetails.service'
import { createScrapeDetailsRoutes } from './scrapeDetails.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'
import type { IScrapingQueue } from '../../shared/queue/scrapingQueue'

const VALID_URL = 'https://www.test-allowed-domain.test/carros/test'
const INVALID_DOMAIN_URL = 'https://www.other-site.com/carros/test'

function createMockQueue(): IScrapingQueue {
  return {
    add: vi.fn().mockResolvedValue({ id: 'mock-redis-job-id' }),
  }
}

describe('Scrape Details Routes', () => {
  let db: PrismaClient
  let repo: ScrapeDetailsRepository
  let mockQueue: IScrapingQueue
  let app: express.Express

  beforeAll(async () => {
    db = await createTestDb()
  })

  beforeEach(async () => {
    repo = new ScrapeDetailsRepository(db)
    mockQueue = createMockQueue()
    const service = new ScrapeDetailsService(repo, mockQueue)
    app = express()
    app.use(express.json())
    app.use(createScrapeDetailsRoutes(service))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  async function seedVehicle(): Promise<{ vehicleId: number; yearCode: string }> {
    const vehicle = await db.vehicle.create({
      data: {
        fipeCode: '005490-9',
        vehicleType: 'cars',
        brand: 'VW - VolksWagen',
        model: 'Gol 1.0 Flex 12V 5p',
        years: {
          create: [
            { yearCode: '2012-1', yearLabel: '2012 Gasolina' },
            { yearCode: '2013-1', yearLabel: '2013 Gasolina' },
          ],
        },
      },
      include: { years: { select: { id: true, yearCode: true } } },
    })

    const year2012 = vehicle.years.find((y) => y.yearCode === '2012-1')!
    return { vehicleId: vehicle.id, yearCode: year2012.yearCode }
  }

  describe('POST /api/scraping', () => {
    it('should return 202 with jobId when request is valid', async () => {
      const { vehicleId, yearCode } = await seedVehicle()

      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode,
          url: VALID_URL,
        })

      expect(response.status).toBe(202)
      expect(response.body.success).toBe(true)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.pollUrl).toContain('/api/scraping/')
      expect(mockQueue.add).toHaveBeenCalledTimes(1)
    })

    it('should return 200 with existing jobId when duplicate is enqueued', async () => {
      const { vehicleId, yearCode } = await seedVehicle()

      const first = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode,
          url: VALID_URL,
        })

      const second = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode,
          url: VALID_URL,
        })

      expect(second.status).toBe(200)
      expect(second.body.data.jobId).toBe(first.body.data.jobId)
      expect(second.body.data.status).toBe('already_queued')
      expect(mockQueue.add).toHaveBeenCalledTimes(1) // not enqueued again
    })

    it('should return 404 when vehicleId does not exist', async () => {
      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId: 9999,
          yearCode: '2012-1',
          url: VALID_URL,
        })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 404 when yearCode does not exist for the vehicle', async () => {
      const { vehicleId } = await seedVehicle()

      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode: '9999-9',
          url: VALID_URL,
        })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('YEAR_NOT_FOUND')
    })

    it('should return 400 when URL domain is not allowed', async () => {
      const { vehicleId, yearCode } = await seedVehicle()

      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode,
          url: INVALID_DOMAIN_URL,
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when vehicleId is not a positive integer', async () => {
      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId: -1,
          yearCode: '2012-1',
          url: VALID_URL,
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when yearCode format is invalid', async () => {
      const { vehicleId } = await seedVehicle()

      const response = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode: 'invalid',
          url: VALID_URL,
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/scraping/:jobId/status', () => {
    it('should return current job status', async () => {
      const { vehicleId, yearCode } = await seedVehicle()

      const enqueueRes = await request(app)
        .post('/api/scraping')
        .send({
          vehicleId,
          yearCode,
          url: VALID_URL,
        })

      const jobId = enqueueRes.body.data.jobId as string

      const statusRes = await request(app).get(`/api/scraping/${jobId}/status`)

      expect(statusRes.status).toBe(200)
      expect(statusRes.body.success).toBe(true)
      expect(statusRes.body.data.jobId).toBe(jobId)
      expect(statusRes.body.data.status).toBe('pending')
      expect(statusRes.body.data.error).toBeNull()
    })

    it('should return 404 when jobId does not exist', async () => {
      const response = await request(app).get('/api/scraping/nonexistent-id/status')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('JOB_NOT_FOUND')
    })
  })
})
