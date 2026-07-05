import { Router } from 'express'

export function createApiRoutes(routers: {
  vehicleSearch: Router
  favorites: Router
  scrapeDetails: Router
  vehicleDetail: Router
}): Router {
  const router = Router()

  router.use('/vehicles', routers.vehicleSearch)
  router.use('/favorites', routers.favorites)
  router.use('/scraping', routers.scrapeDetails)
  router.use('/vehicles', routers.vehicleDetail)

  return router
}
