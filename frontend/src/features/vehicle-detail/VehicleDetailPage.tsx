import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useVehicleSpecs } from '../../hooks/useVehicleSpecs'
import { useFavorites, useAddFavorite, useRemoveFavorite } from '../../hooks/useFavorites'
import { VehicleHero } from './VehicleHero'
import { VehicleTechnicalSpecs } from './VehicleTechnicalSpecs'
import type { VehicleType } from '../../services/types'

export function VehicleDetailPage() {
  const { fipeCode, yearCode } = useParams<{ fipeCode: string; yearCode: string }>()

  const {
    specs: vehicleData,
    isLoading,
    error,
  } = useVehicleSpecs(fipeCode ?? '', yearCode ?? '')

  const { favorites } = useFavorites()
  const { addFavorite } = useAddFavorite()
  const { removeFavorite } = useRemoveFavorite()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-9 w-32" />
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-8 h-6 w-1/2" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !vehicleData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="size-4" />
              Back to search
            </Button>
          </Link>
          <Card className="border-destructive/20 bg-destructive/10">
            <CardContent className="py-8 text-center">
              <p className="text-destructive">
                {error?.message || 'Vehicle not found'}
              </p>
              <Link to="/" className="mt-4 inline-block">
                <Button>Return to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const isFavorite = favorites.some(
    (f) => f.fipeCode === vehicleData.fipeCode && f.years?.some((y) => y.yearCode === vehicleData.yearCode),
  )

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(
        vehicleData.vehicleType as VehicleType,
        vehicleData.fipeCode,
      )
    } else {
      addFavorite(vehicleData.vehicleType as VehicleType, vehicleData.fipeCode)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="size-4" />
            Back to search
          </Button>
        </Link>

        <VehicleHero
          data={vehicleData}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
        />

        <VehicleTechnicalSpecs data={vehicleData} />
      </div>
    </main>
  )
}
