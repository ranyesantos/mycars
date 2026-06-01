import { api } from './api'
import type { Brand, BrandModelPriceResponse, CascadingYear, Model, SearchResponse, VehicleType, YearDetailResponse } from './types'

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

export async function getBrands(
  vehicleType: VehicleType,
): Promise<Brand[]> {
  const response = await api.get(`/api/vehicle/${vehicleType}/brands`)
  return response.data.data
}

export async function getModels(
  vehicleType: VehicleType,
  brandCode: string,
): Promise<Model[]> {
  const response = await api.get(`/api/vehicle/${vehicleType}/brands/${brandCode}/models`)
  return response.data.data
}

export async function getYearsByBrandModel(
  vehicleType: VehicleType,
  brandCode: string,
  modelCode: number,
): Promise<CascadingYear[]> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`,
  )
  return response.data.data
}

export async function getPriceByBrandModel(
  vehicleType: VehicleType,
  brandCode: string,
  modelCode: number,
  yearCode: string,
): Promise<BrandModelPriceResponse> {
  const response = await api.get(
    `/api/vehicle/${vehicleType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
  )
  return response.data.data
}
