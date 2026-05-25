import { Car, Bike } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { VehicleType } from '../../services/types'

interface VehicleTypeTabsProps {
  value: VehicleType
  onChange: (value: VehicleType) => void
}

export function VehicleTypeTabs({ value, onChange }: VehicleTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as VehicleType)}>
      <TabsList className="grid w-full max-w-xs grid-cols-2">
        <TabsTrigger value="cars" className="gap-2">
          <Car className="size-4" />
          Cars
        </TabsTrigger>
        <TabsTrigger value="motorcycles" className="gap-2">
          <Bike className="size-4" />
          Motorcycles
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
