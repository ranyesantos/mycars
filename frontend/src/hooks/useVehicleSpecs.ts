import { useQuery } from '@tanstack/react-query'
import * as vehicleDetailApi from '../services/vehicleDetailApi'
import type { VehicleSpecsResponse } from '../services/vehicleDetailApi'

export const vehicleSpecsKeys = {
  byFipeAndYear: (fipeCode: string, yearCode: string) =>
    ['vehicle-specs', fipeCode, yearCode] as const,
}

export function useVehicleSpecs(
  fipeCode: string,
  yearCode: string,
): {
  specs: VehicleSpecsResponse | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: vehicleSpecsKeys.byFipeAndYear(fipeCode, yearCode),
    queryFn: () => vehicleDetailApi.getVehicleSpecs(fipeCode, yearCode),
    enabled: !!fipeCode && !!yearCode,
  })

  return {
    specs: data,
    isLoading,
    error: error as Error | null,
  }
}
