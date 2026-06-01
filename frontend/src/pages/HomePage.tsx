import { useState } from 'react'
import { VehicleTypeTabs } from '../features/browse-vehicles/VehicleTypeTabs'
import { SearchFilters } from '../features/browse-vehicles/SearchFilters'
import { VehicleResultList } from '../features/browse-vehicles/VehicleResultList'
import { useYearsByBrandModel, useFetchPriceByBrandModel } from '../hooks/useBrowseVehicles'
import { useAddFavorite } from '../hooks/useFavorites'
import type { VehicleType, CascadingYear } from '../services/types'

export function HomePage() {
  const [vehicleType, setVehicleType] = useState<VehicleType>('cars')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [savedYears, setSavedYears] = useState<Set<string>>(new Set())
  const [savingYear, setSavingYear] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modelCode = selectedModel ? Number(selectedModel) : null
  const { years, isLoading: loadingYears } = useYearsByBrandModel(
    vehicleType,
    selectedBrand || null,
    modelCode,
  )
  const { fetchPrice, isFetching: isFetchingPrice } = useFetchPriceByBrandModel()
  const { addFavorite } = useAddFavorite()

  const handleFavorite = async (
    type: VehicleType,
    brandCode: string,
    modelCode: number,
    year: CascadingYear,
  ) => {
    setSavingYear(year.code)
    setError(null)

    try {
      const priceDetail = await fetchPrice(type, brandCode, modelCode, year.code)
      addFavorite(type, priceDetail.fipeCode)
      setSavedYears((prev) => new Set(prev).add(year.code))
    } catch {
      setError('Could not save vehicle. Try again.')
    } finally {
      setSavingYear(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <VehicleTypeTabs value={vehicleType} onChange={setVehicleType} />
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <SearchFilters
          vehicleType={vehicleType}
          selectedBrand={selectedBrand}
          selectedModel={selectedModel}
          onBrandChange={setSelectedBrand}
          onModelChange={setSelectedModel}
        />
      </div>

      {savedYears.size > 0 && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {savedYears.size} {savedYears.size === 1 ? 'year' : 'years'} saved to favorites.
        </div>
      )}

      <VehicleResultList
        years={years}
        isLoading={loadingYears || isFetchingPrice}
        error={error}
        hasSelectedModel={!!selectedModel}
        vehicleType={vehicleType}
        brandCode={selectedBrand}
        modelCode={modelCode ?? 0}
        savedYears={savedYears}
        savingYear={savingYear}
        onFavorite={handleFavorite}
      />
    </div>
  )
}
