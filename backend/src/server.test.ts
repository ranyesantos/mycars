import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './server.js'

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })
})
