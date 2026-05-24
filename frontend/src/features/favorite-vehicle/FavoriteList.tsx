import { VehicleCard } from './VehicleCard'
import type { FavoriteVehicle, VehicleType } from '../../services/types'

interface FavoriteListProps {
  favorites: FavoriteVehicle[]
  onRemoveFavorite: (vehicleType: VehicleType, fipeCode: string) => void
}

export function FavoriteList({ favorites, onRemoveFavorite }: FavoriteListProps) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">No favorites yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for a vehicle by FIPE code and add it to your favorites.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((fav) => (
        <VehicleCard
          key={fav.fipeCode}
          fipeCode={fav.fipeCode}
          vehicleType={fav.vehicleType as VehicleType}
          brand={fav.brand}
          model={fav.model}
          years={fav.years}
          isFavorite
          onToggleFavorite={() =>
            onRemoveFavorite(fav.vehicleType as VehicleType, fav.fipeCode)
          }
        />
      ))}
    </div>
  )
}
