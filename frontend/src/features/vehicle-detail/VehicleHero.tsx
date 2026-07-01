import type { ReactNode } from 'react'
import { Car, Fuel, Calendar, Hash } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, parsePrice } from '../../services/types'
import type { VehicleSpecsResponse } from '../../services/vehicleDetailApi'

interface VehicleHeroProps {
  data: VehicleSpecsResponse
  /** Favorite toggle element injected by the parent to avoid cross-slice coupling. */
  favoriteAction?: ReactNode
}

export function VehicleHero({ data, favoriteAction }: VehicleHeroProps) {
  const name = data.brand && data.model
    ? `${data.brand} ${data.model}`
    : `FIPE ${data.fipeCode}`

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Vehicle Image Placeholder */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-muted lg:aspect-auto lg:h-auto lg:w-96">
          <div className="flex size-full min-h-64 items-center justify-center">
            <Car className="size-24 text-muted-foreground/30" />
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="size-5" />
              <Badge variant="secondary">Vehicle</Badge>
            </div>
            {favoriteAction}
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {name}
          </h1>

          {/* Current Price */}
          {data.price && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                FIPE Price
              </p>
              <p className="text-4xl font-bold text-foreground">
                {formatPrice(parsePrice(data.price))}
              </p>
            </div>
          )}

          {/* Vehicle Info Grid */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 text-sm">
              <Hash className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">FIPE:</span>
              <span className="font-medium">{data.fipeCode}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Year:</span>
              <span className="font-medium">{data.year}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Fuel className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fuel:</span>
              <span className="font-medium">{data.fuel ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
