import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useVehicleSpecs } from '../../hooks/useVehicleSpecs'
import { useFavorites, useAddFavorite, useRemoveFavorite } from '../../hooks/useFavorites'
import { VehicleHero } from './VehicleHero'
import { VehicleTechnicalSpecs } from './VehicleTechnicalSpecs'

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
      <>
        <Skeleton className="mb-6 h-9 w-32" />
        <Skeleton className="mb-4 h-10 w-3/4" />
        <Skeleton className="mb-8 h-6 w-1/2" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </>
    )
  }

  if (error || !vehicleData) {
    return (
      <>
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
      </>
    )
  }

  const isFavorite = favorites.some(
    (f) => f.fipeCode === vehicleData.fipeCode,
  )

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(
        vehicleData.vehicleType,
        vehicleData.fipeCode,
      )
    } else {
      addFavorite(vehicleData.vehicleType, vehicleData.fipeCode)
    }
  }

  return (
    <>
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
    </>
  )
}
