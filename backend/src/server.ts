import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler.js'
import { logger } from './shared/utils/logger.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

// Error handler must be last
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
  })
}

export { app }
