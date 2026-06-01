import { useQuery, useMutation } from '@tanstack/react-query'
import * as vehicleSearchApi from '../services/vehicleSearchApi'
import type {
  Brand,
  Model,
  CascadingYear,
  BrandModelPriceResponse,
  VehicleType,
} from '../services/types'

export const browseKeys = {
  brands: (type: VehicleType) => ['brands', type] as const,
  models: (type: VehicleType, brandCode: string) => ['models', type, brandCode] as const,
  years: (type: VehicleType, brandCode: string, modelCode: number) =>
    ['years-by-model', type, brandCode, modelCode] as const,
}

export function useBrands(type: VehicleType): {
  brands: Brand[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.brands(type),
    queryFn: () => vehicleSearchApi.getBrands(type),
    enabled: !!type,
  })

  return { brands: data ?? [], isLoading, error: error as Error | null }
}

export function useModels(
  type: VehicleType,
  brandCode: string | null,
): {
  models: Model[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.models(type, brandCode ?? ''),
    queryFn: () => vehicleSearchApi.getModels(type, brandCode!),
    enabled: !!brandCode,
  })

  return { models: data ?? [], isLoading, error: error as Error | null }
}

export function useYearsByBrandModel(
  type: VehicleType,
  brandCode: string | null,
  modelCode: number | null,
): {
  years: CascadingYear[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: browseKeys.years(type, brandCode ?? '', modelCode ?? 0),
    queryFn: () => vehicleSearchApi.getYearsByBrandModel(type, brandCode!, modelCode!),
    enabled: !!modelCode,
  })

  return { years: data ?? [], isLoading, error: error as Error | null }
}

export function useFetchPriceByBrandModel(): {
  fetchPrice: (
    type: VehicleType,
    brandCode: string,
    modelCode: number,
    yearCode: string,
  ) => Promise<BrandModelPriceResponse>
  isFetching: boolean
} {
  const mutation = useMutation({
    mutationFn: ({
      type,
      brandCode,
      modelCode,
      yearCode,
    }: {
      type: VehicleType
      brandCode: string
      modelCode: number
      yearCode: string
    }) => vehicleSearchApi.getPriceByBrandModel(type, brandCode, modelCode, yearCode),
  })

  return {
    fetchPrice: (type, brandCode, modelCode, yearCode) =>
      mutation.mutateAsync({ type, brandCode, modelCode, yearCode }),
    isFetching: mutation.isPending,
  }
}
