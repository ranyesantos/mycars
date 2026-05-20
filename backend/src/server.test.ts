import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './server'

describe('GET /api/health', () => {
  it('should return 200 with status ok when the server is running', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })
})
