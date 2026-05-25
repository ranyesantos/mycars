import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Heart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddByFipeDialog } from './features/add-by-fipe'
import { HomePage } from './pages/HomePage'
import { FavoritesPage } from './pages/FavoritesPage'

const queryClient = new QueryClient()

function AppLayout() {
  const location = useLocation()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              MyCars
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track vehicle prices from the FIPE table
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button
                variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Search className="size-4" />
                Search
              </Button>
            </Link>
            <Link to="/favorites">
              <Button
                variant={location.pathname === '/favorites' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Heart className="size-4" />
                Favorites
              </Button>
            </Link>
            <AddByFipeDialog triggerVariant="default" />
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </div>
    </main>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
