import { Link } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FavoriteListContainer } from '../features/favorite-vehicle'

export function FavoritesPage() {
  return (
    <div>
      <Link to="/">
        <Button variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="size-4" />
          Back to search
        </Button>
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Heart className="size-8 text-red-500" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Favorites
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Track your saved vehicles from the FIPE table
        </p>
      </header>

      <FavoriteListContainer />
    </div>
  )
}
