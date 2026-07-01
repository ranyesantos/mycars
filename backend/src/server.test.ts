import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { PrismaClient } from './generated/prisma/client'
import { createApp } from './server'
import { createTestDb, closeTestDb } from './db/test-helpers'

describe('GET /api/health', () => {
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
