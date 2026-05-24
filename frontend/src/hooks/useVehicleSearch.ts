import { useMutation } from '@tanstack/react-query'
import * as vehicleSearchApi from '../services/vehicleSearchApi'
import type { SearchResponse, YearDetailResponse, VehicleType } from '../services/types'

export function useVehicleSearch(): {
  searchByFipeCode: (vehicleType: VehicleType, fipeCode: string) => Promise<SearchResponse>
  isSearching: boolean
  getYearDetail: (vehicleType: VehicleType, fipeCode: string, yearCode: string) => Promise<YearDetailResponse>
  isFetchingDetail: boolean
} {
  const searchMutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      vehicleSearchApi.searchByFipeCode(vehicleType, fipeCode),
  })

  const detailMutation = useMutation({
    mutationFn: ({
      vehicleType,
      fipeCode,
      yearCode,
    }: {
      vehicleType: VehicleType
      fipeCode: string
      yearCode: string
    }) => vehicleSearchApi.getYearDetail(vehicleType, fipeCode, yearCode),
  })

  return {
    searchByFipeCode: (vehicleType, fipeCode) =>
      searchMutation.mutateAsync({ vehicleType, fipeCode }),
    isSearching: searchMutation.isPending,
    getYearDetail: (vehicleType, fipeCode, yearCode) =>
      detailMutation.mutateAsync({ vehicleType, fipeCode, yearCode }),
    isFetchingDetail: detailMutation.isPending,
  }
}
