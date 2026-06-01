import { useFavorites, useRemoveFavorite } from '../../hooks/useFavorites'
import { FavoriteList } from './FavoriteList'
import { Skeleton } from '@/components/ui/skeleton'
import type { VehicleType } from '../../services/types'

export function FavoriteListContainer() {
  const { favorites, isLoading, error } = useFavorites()
  const { removeFavorite } = useRemoveFavorite()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load favorites: {error.message}</p>
      </div>
    )
  }

  return (
    <FavoriteList
      favorites={favorites}
      onRemoveFavorite={(vehicleType: VehicleType, fipeCode: string) =>
        removeFavorite(vehicleType, fipeCode)
      }
    />
  )
}
