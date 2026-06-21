import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { errorHandler } from './shared/middleware/errorHandler'
import { logger } from './shared/utils/logger'
import { FipeClient } from './shared/services/fipe/index'
import { VehicleSearchRepository } from './features/vehicle-search/vehicleSearch.repository'
import { VehicleSearchService } from './features/vehicle-search/vehicleSearch.service'
import { createVehicleSearchRoutes } from './features/vehicle-search/index'
import { FavoriteVehicleRepository } from './features/favorite-vehicle/favoriteVehicle.repository'
import { createFavoriteVehicleRoutes } from './features/favorite-vehicle/index'
import { ScrapeDetailsRepository } from './features/scrape-details/index'
import { ScrapeDetailsService } from './features/scrape-details/index'
import { createScrapeDetailsRoutes } from './features/scrape-details/index'
import { getScrapingQueue } from './shared/queue/scrapingQueue'
import { VehicleDetailRepository } from './features/vehicle-detail/index'
import { createVehicleDetailRoutes } from './features/vehicle-detail/index'
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
const favoriteVehicleRepo = new FavoriteVehicleRepository(db)
const scrapeDetailsRepo = new ScrapeDetailsRepository(db)
const scrapingQueue = getScrapingQueue()
const scrapeDetailsService = new ScrapeDetailsService(scrapeDetailsRepo, scrapingQueue)
const vehicleDetailRepo = new VehicleDetailRepository(db)

// Routes — register before errorHandler
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})
app.use(createVehicleSearchRoutes(vehicleSearchService))
app.use(createFavoriteVehicleRoutes(favoriteVehicleRepo))
app.use(createScrapeDetailsRoutes(scrapeDetailsService))
app.use(createVehicleDetailRoutes(vehicleDetailRepo))

// Error handler must be last
app.use(errorHandler)
console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
  })
}

export { app }
