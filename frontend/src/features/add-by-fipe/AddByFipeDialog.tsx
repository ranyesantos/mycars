import { useState } from 'react'
import { Loader2, Plus, Car, Bike, Search, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useVehicleSearch } from '../../hooks/useVehicleSearch'
import { useAddFavorite } from '../../hooks/useFavorites'
import type { VehicleType, Year } from '../../services/types'

type Step = 'input' | 'select-year'

interface AddByFipeDialogProps {
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline' | 'secondary'
}

export function AddByFipeDialog({
  triggerLabel = 'Add by FIPE code',
  triggerVariant = 'default',
}: AddByFipeDialogProps) {
  const { searchByFipeCode, isSearching, getYearDetail } = useVehicleSearch()
  const { addFavorite } = useAddFavorite()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('input')
  const [vehicleType, setVehicleType] = useState<VehicleType>('cars')
  const [fipeCode, setFipeCode] = useState('')
  const [years, setYears] = useState<Year[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedYears, setSavedYears] = useState<Set<string>>(new Set())
  const [savingYear, setSavingYear] = useState<string | null>(null)

  const resetState = () => {
    setStep('input')
    setFipeCode('')
    setYears([])
    setError(null)
    setSavedYears(new Set())
    setSavingYear(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(resetState, 200)
    }
  }

  const normalizeFipeCode = (code: string) => {
    const trimmed = code.trim().replace(/\s+/g, '')
    if (trimmed.includes('-')) return trimmed
    if (trimmed.length === 7) {
      return `${trimmed.slice(0, 6)}-${trimmed.slice(6)}`
    }
    return trimmed
  }

  const handleFetchYears = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fipeCode.trim()) {
      setError('Please enter a FIPE code.')
      return
    }

    const normalized = normalizeFipeCode(fipeCode)
    setError(null)

    try {
      const result = await searchByFipeCode(vehicleType, normalized)

      if (result.years.length === 0) {
        setError(
          `No vehicle found for FIPE code "${normalized}". Check the code and vehicle type.`,
        )
        return
      }

      setFipeCode(normalized)
      setYears(result.years)
      setStep('select-year')
    } catch {
      setError(
        `Could not find vehicle. Verify the FIPE code "${normalized}" and selected vehicle type.`,
      )
    }
  }

  const handleSelectYear = async (year: Year) => {
    setSavingYear(year.code)
    setError(null)

    try {
      await Promise.all([
        getYearDetail(vehicleType, fipeCode, year.code),
        addFavorite(vehicleType, fipeCode),
      ])

      setSavedYears((prev) => new Set(prev).add(year.code))
    } catch {
      setError('Could not load vehicle details. Try again.')
    } finally {
      setSavingYear(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant={triggerVariant} className="gap-2" />}
      >
        <Plus className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'input' && (
          <>
            <DialogHeader>
              <DialogTitle>Add favorite by FIPE code</DialogTitle>
              <DialogDescription>
                Enter the FIPE code and select the vehicle type. We'll fetch the
                available years for you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFetchYears} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleType('cars')}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-medium transition-colors ${
                      vehicleType === 'cars'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Car className="size-4" />
                    Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleType('motorcycles')}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-medium transition-colors ${
                      vehicleType === 'motorcycles'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Bike className="size-4" />
                    Motorcycle
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fipe-code">FIPE code</Label>
                <Input
                  id="fipe-code"
                  placeholder="e.g. 001004-9"
                  value={fipeCode}
                  onChange={(e) => setFipeCode(e.target.value)}
                  autoFocus
                  disabled={isSearching}
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isSearching} className="w-full gap-2">
                  {isSearching ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Search vehicle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === 'select-year' && (
          <>
            <DialogHeader>
              <DialogTitle>Select year and fuel</DialogTitle>
              <DialogDescription>
                FIPE code <span className="font-mono">{fipeCode}</span> has{' '}
                {years.length} available {years.length === 1 ? 'option' : 'options'}.
                Tap one to add it to favorites.
              </DialogDescription>
            </DialogHeader>

            {savedYears.size > 0 && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                {savedYears.size} {savedYears.size === 1 ? 'year' : 'years'} saved to
                favorites.
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {years.map((year) => {
                const alreadySaved = savedYears.has(year.code)
                const isSaving = savingYear === year.code
                return (
                  <button
                    key={year.code}
                    type="button"
                    onClick={() => !alreadySaved && handleSelectYear(year)}
                    disabled={alreadySaved || isSaving}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="font-medium text-foreground">{year.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Code: {year.code}
                      </p>
                    </div>
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : alreadySaved ? (
                      <Badge variant="secondary">Saved</Badge>
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={resetState} className="gap-2">
                <ArrowLeft className="size-4" />
                Search another
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
