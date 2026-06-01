import { api } from './api'
import type { FavoriteVehicle, VehicleType } from './types'

export async function getFavorites(): Promise<FavoriteVehicle[]> {
  const response = await api.get('/api/favorites')
  return response.data.data
}

export async function addFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<FavoriteVehicle> {
  const response = await api.post(`/api/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}

export async function removeFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<{ fipeCode: string; favorited: boolean }> {
  const response = await api.delete(`/api/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}
