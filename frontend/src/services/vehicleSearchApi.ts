import { api } from './api'
import type { SearchResponse, YearDetailResponse, VehicleType } from './types'

export async function searchByFipeCode(
  vehicleType: VehicleType,
  fipeCode: string,
): Promise<SearchResponse> {
  const response = await api.get(`/api/vehicle/${vehicleType}/${fipeCode}`)
  return response.data.data
}

export async function getYearDetail(
  vehicleType: VehicleType,
  fipeCode: string,
  yearCode: string,
): Promise<YearDetailResponse> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/${fipeCode}/years/${yearCode}`,
  )
  return response.data.data
}
