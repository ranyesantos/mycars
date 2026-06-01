import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoritesButtonProps {
  isFavorite: boolean
  onToggle: () => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function FavoritesButton({
  isFavorite,
  onToggle,
  className,
  size = 'icon',
}: FavoritesButtonProps) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'hover:bg-transparent',
        isFavorite && 'text-red-500 hover:text-red-600',
        className,
      )}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn('size-5 transition-colors', isFavorite && 'fill-current')}
      />
    </Button>
  )
}
