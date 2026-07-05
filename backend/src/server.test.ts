import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import type { PrismaClient } from './generated/prisma/client'
import { createApp } from './server'
import { createTestDb, closeTestDb } from './db/test-helpers'

vi.mock('./shared/services/fipe/index', () => {
  const mockFipeClient = {
    fetchBrands: vi.fn().mockResolvedValue([{ code: '1', name: 'Test Brand' }]),
    fetchModels: vi.fn().mockResolvedValue([{ code: '1', name: 'Test Model' }]),
    fetchYears: vi.fn().mockResolvedValue([{ code: '2024-1', name: '2024 Gasolina' }]),
    fetchYearDetail: vi.fn().mockResolvedValue({
      brand: 'Test Brand',
      model: 'Test Model',
      year: '2024',
      price: 'R$ 50.000',
      fuel: 'Gasolina',
      referenceMonth: 'Junho/2024',
      fuelAcronym: 'G',
      codeFipe: '001001-1',
      modelYear: 2024,
      vehicleType: 'carro',
    }),
    fetchYearsByBrandModel: vi.fn().mockResolvedValue([{ code: '2024-1', name: '2024 Gasolina' }]),
    fetchPriceByBrandModel: vi.fn().mockResolvedValue({
      brand: 'Test Brand',
      model: 'Test Model',
      year: '2024',
      price: 'R$ 50.000',
      fuel: 'Gasolina',
      referenceMonth: 'Junho/2024',
      fuelAcronym: 'G',
      codeFipe: '001001-1',
      modelYear: 2024,
      vehicleType: 'carro',
    }),
  }

  return {
    FipeClient: vi.fn().mockImplementation(() => mockFipeClient),
  }
})

describe('GET /api/health (unversioned)', () => {
  let db: PrismaClient
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    db = await createTestDb()
    app = createApp(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  it('should return 200 with status ok when the server is running', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })
})

describe('GET /api/v1/vehicles/cars/brands (v1 aggregator wiring)', () => {
  let db: PrismaClient
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    db = await createTestDb()
    app = createApp(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  it('should return 200 with success field when fetching brands through v1 API', async () => {
    const response = await request(app).get('/api/v1/vehicles/cars/brands')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('data')
    expect(Array.isArray(response.body.data)).toBe(true)
  })
})
