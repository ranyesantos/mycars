import { Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CascadingYear } from '../../services/types'

interface VehicleResultCardProps {
  year: CascadingYear
  isSaved: boolean
  isSaving: boolean
  onFavorite: (year: CascadingYear) => void
}

export function VehicleResultCard({
  year,
  isSaved,
  isSaving,
  onFavorite,
}: VehicleResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => !isSaved && onFavorite(year)}
      disabled={isSaved || isSaving}
      className="flex w-full items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <p className="font-medium text-foreground">{year.name}</p>
      {isSaving ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : isSaved ? (
        <Badge variant="secondary">Saved</Badge>
      ) : (
        <Plus className="size-4 text-muted-foreground" />
      )}
    </button>
  )
}
