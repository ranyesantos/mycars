import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench } from 'lucide-react'
import type { SpecsData, VehicleSpecsResponse } from '../../services/vehicleDetailApi'
import { METADATA_COLUMNS } from '../../services/vehicleDetailApi'
import { DomainSection } from './sections/DomainSection'

interface VehicleTechnicalSpecsProps {
  data: VehicleSpecsResponse
}

const METADATA_COLUMNS_SET = new Set<string>(METADATA_COLUMNS)

function countNonEmpty(specs: SpecsData): number {
  return Object.entries(specs)
    .filter(([key, value]) => value !== null && !METADATA_COLUMNS_SET.has(key))
    .length
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
        <DomainSection id="general" specs={specs} />
        <DomainSection id="performance" specs={specs} />
        <DomainSection id="engine" specs={specs} />
        <DomainSection id="transmission" specs={specs} />
        <DomainSection id="dimensions" specs={specs} />
        <DomainSection id="consumption" specs={specs} />
        <DomainSection id="brakes" specs={specs} />
        <DomainSection id="suspension" specs={specs} />
        <DomainSection id="aerodynamics" specs={specs} />
        <DomainSection id="steering" specs={specs} />
      </CardContent>
    </Card>
  )
}
