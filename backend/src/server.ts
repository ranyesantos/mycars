import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler'
import { logger } from './shared/utils/logger'
import { FipeClient } from './shared/services/fipe/index'
import { VehicleSearchRepository } from './features/vehicle-search/vehicleSearch.repository'
import { VehicleSearchService } from './features/vehicle-search/vehicleSearch.service'
import { createVehicleSearchRoutes } from './features/vehicle-search/index'
import { getDb } from './db/index'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Dependencies — manual DI (composition root)
const fipeClient = new FipeClient('https://fipe.parallelum.com.br/api/v2')
const db = getDb()
const vehicleSearchRepo = new VehicleSearchRepository(db)
const vehicleSearchService = new VehicleSearchService(fipeClient, vehicleSearchRepo)

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})
app.use(createVehicleSearchRoutes(vehicleSearchService))

// Error handler must be last
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
  })
}

export { app }
