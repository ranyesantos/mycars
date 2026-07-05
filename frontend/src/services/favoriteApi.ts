import { api, API_V1 } from './api'
import type { FavoriteVehicle, VehicleType } from './types'

export async function getFavorites(): Promise<FavoriteVehicle[]> {
  const response = await api.get(`${API_V1}/favorites`)
  return response.data.data
}

export async function addFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<FavoriteVehicle> {
  const response = await api.post(`${API_V1}/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}

export async function removeFavorite(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<{ fipeCode: string; favorited: boolean }> {
  const response = await api.delete(`${API_V1}/favorites/${vehicleType}/${fipeCode}`)
  return response.data.data
}
