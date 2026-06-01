import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as favoriteApi from '../services/favoriteApi'
import type { FavoriteVehicle, VehicleType } from '../services/types'

export const favoriteKeys = {
  list: ['favorites'] as const,
}

export function useFavorites(): {
  favorites: FavoriteVehicle[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: favoriteKeys.list,
    queryFn: favoriteApi.getFavorites,
  })

  return {
    favorites: data ?? [],
    isLoading,
    error: error as Error | null,
  }
}

export function useAddFavorite(): {
  addFavorite: (vehicleType: VehicleType, fipeCode: string) => void
  isPending: boolean
} {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      favoriteApi.addFavorite(vehicleType, fipeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list })
    },
  })

  return {
    addFavorite: (vehicleType, fipeCode) =>
      mutation.mutate({ vehicleType, fipeCode }),
    isPending: mutation.isPending,
  }
}

export function useRemoveFavorite(): {
  removeFavorite: (vehicleType: VehicleType, fipeCode: string) => void
  isPending: boolean
} {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ vehicleType, fipeCode }: { vehicleType: VehicleType; fipeCode: string }) =>
      favoriteApi.removeFavorite(vehicleType, fipeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list })
    },
  })

  return {
    removeFavorite: (vehicleType, fipeCode) =>
      mutation.mutate({ vehicleType, fipeCode }),
    isPending: mutation.isPending,
  }
}
