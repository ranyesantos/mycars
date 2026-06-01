import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrands, useModels } from '../../hooks/useBrowseVehicles'
import type { VehicleType } from '../../services/types'

interface SearchFiltersProps {
  vehicleType: VehicleType
  selectedBrand: string
  selectedModel: string
  onBrandChange: (code: string) => void
  onModelChange: (code: string) => void
}

export function SearchFilters({
  vehicleType,
  selectedBrand,
  selectedModel,
  onBrandChange,
  onModelChange,
}: SearchFiltersProps) {
  const { brands, isLoading: loadingBrands } = useBrands(vehicleType)
  const { models, isLoading: loadingModels } = useModels(
    vehicleType,
    selectedBrand || null,
  )

  // Reset model when brand changes
  useEffect(() => {
    onModelChange('')
  }, [selectedBrand])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {loadingBrands ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select value={selectedBrand} onValueChange={(v) => onBrandChange(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select brand">
              {(value: string) =>
                brands.find((b) => b.code === value)?.name ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.code} value={brand.code}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loadingModels ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select
          value={selectedModel}
          onValueChange={(v) => onModelChange(v ?? '')}
          disabled={!selectedBrand || models.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select model">
              {(value: string) =>
                models.find((m) => String(m.code) === value)?.name ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.code} value={String(model.code)}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
