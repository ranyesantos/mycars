import { Link } from 'react-router-dom'
import { Car, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FavoritesButton } from './FavoritesButton'
import { formatPrice, parsePrice } from '../../services/types'
import type { VehicleType } from '../../services/types'

interface VehicleCardProps {
  fipeCode: string
  vehicleType: VehicleType
  brand: string | null
  model: string | null
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
  }[]
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function VehicleCard({
  fipeCode,
  vehicleType,
  brand,
  model,
  years,
  isFavorite,
  onToggleFavorite,
}: VehicleCardProps) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {vehicleType === 'cars' ? (
              <Car className="size-4" />
            ) : (
              <Bike className="size-4" />
            )}
            <span className="text-xs uppercase tracking-wide">{brand ?? 'Unknown'}</span>
          </div>
          <FavoritesButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
        </div>
        <CardTitle className="line-clamp-2 text-base leading-tight">
          {model ?? 'Unknown model'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {years.map((year) => (
            <div
              key={year.yearCode}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{year.yearLabel}</span>
                {year.fuel && (
                  <Badge variant="secondary" className="text-xs">
                    {year.fuel}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {year.price && (
                  <span className="text-sm font-semibold">
                    {formatPrice(parsePrice(year.price))}
                  </span>
                )}
                <Link
                  to={`/vehicle/${fipeCode}/${year.yearCode}`}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Ver Detalhes →
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          FIPE: {fipeCode}
        </p>
      </CardContent>
    </Card>
  )
}
