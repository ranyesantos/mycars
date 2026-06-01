import { Skeleton } from '@/components/ui/skeleton'
import { VehicleResultCard } from './VehicleResultCard'
import type { CascadingYear, VehicleType } from '../../services/types'

interface VehicleResultListProps {
  years: CascadingYear[]
  isLoading: boolean
  error: string | null
  hasSelectedModel: boolean
  vehicleType: VehicleType
  brandCode: string
  modelCode: number
  savedYears: Set<string>
  savingYear: string | null
  onFavorite: (type: VehicleType, brandCode: string, modelCode: number, year: CascadingYear) => void
}

export function VehicleResultList({
  years,
  isLoading,
  error,
  hasSelectedModel,
  savedYears,
  savingYear,
  vehicleType,
  brandCode,
  modelCode,
  onFavorite,
}: VehicleResultListProps) {
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!hasSelectedModel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Select a model to see available years
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (years.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No years found for this model</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {years.map((year) => (
        <VehicleResultCard
          key={year.code}
          year={year}
          isSaved={savedYears.has(year.code)}
          isSaving={savingYear === year.code}
          onFavorite={(y) => onFavorite(vehicleType, brandCode, modelCode, y)}
        />
      ))}
    </div>
  )
}
