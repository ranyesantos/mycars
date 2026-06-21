import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Wrench } from 'lucide-react'
import type { SpecsData, VehicleSpecsResponse } from '../../services/vehicleDetailApi'
import { PerformanceSection } from './sections/PerformanceSection'
import { EngineSection } from './sections/EngineSection'
import { TransmissionSection } from './sections/TransmissionSection'
import { DimensionsSection } from './sections/DimensionsSection'
import { ConsumptionSection } from './sections/ConsumptionSection'
import { BrakesSection } from './sections/BrakesSection'
import { SuspensionSection } from './sections/SuspensionSection'
import { AerodynamicsSection } from './sections/AerodynamicsSection'
import { SteeringSection } from './sections/SteeringSection'
import { GeneralSection } from './sections/GeneralSection'

interface VehicleTechnicalSpecsProps {
  data: VehicleSpecsResponse
}

function countNonEmpty(specs: SpecsData): number {
  return Object.values(specs).filter((v) => v !== null).length - 2 // exclude sourceUrl, scrapedAt
}

export function VehicleTechnicalSpecs({ data }: VehicleTechnicalSpecsProps) {
  if (!data.specs) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Technical specifications not yet available
          </p>
        </CardContent>
      </Card>
    )
  }

  const { specs } = data
  const totalSpecs = countNonEmpty(specs)
  const title = data.brand && data.model
    ? `${data.brand} ${data.model}`
    : undefined

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-muted-foreground" />
            Technical Specifications
          </CardTitle>
          <Badge variant="secondary">{totalSpecs} specs</Badge>
        </div>
        {title && (
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <GeneralSection specs={specs} />
        <PerformanceSection specs={specs} />
        <EngineSection specs={specs} />
        <TransmissionSection specs={specs} />
        <DimensionsSection specs={specs} />
        <ConsumptionSection specs={specs} />
        <BrakesSection specs={specs} />
        <SuspensionSection specs={specs} />
        <AerodynamicsSection specs={specs} />
        <SteeringSection specs={specs} />

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Source data scraped on{' '}
            {new Date(specs.scrapedAt).toLocaleDateString()}
          </span>
          <a
            href={specs.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View source
            <ExternalLink className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
