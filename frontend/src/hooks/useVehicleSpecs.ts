import { useQuery } from '@tanstack/react-query'
import { getVehicleSpecs } from '../services/vehicleDetailApi'
import type { VehicleSpecsResponse } from '../services/vehicleDetailApi'

export function useVehicleSpecs(
  fipeCode: string,
  yearCode: string,
): {
  data: VehicleSpecsResponse | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-specs', fipeCode, yearCode],
    queryFn: () => getVehicleSpecs(fipeCode, yearCode),
    enabled: !!fipeCode && !!yearCode,
  })

  return {
    data,
    isLoading,
    error: error as Error | null,
  }
}
