import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler.js'
import { logger } from './shared/utils/logger.js'
import { FipeClient } from './shared/services/fipe/index.js'
import { VehicleSearchRepository } from './features/vehicle-search/vehicleSearch.repository.js'
import { VehicleSearchService } from './features/vehicle-search/vehicleSearch.service.js'
import { createVehicleSearchRoutes } from './features/vehicle-search/vehicleSearch.routes.js'
import { getDb } from './db/index.js'

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
