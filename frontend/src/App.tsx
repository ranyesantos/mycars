import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddByFipeDialog } from './features/add-by-fipe'
import { FavoriteListContainer } from './features/favorite-vehicle'

const queryClient = new QueryClient()

function AppContent() {
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
          <AddByFipeDialog triggerVariant="default" />
        </header>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Favorites</h2>
          <FavoriteListContainer />
        </section>
      </div>
    </main>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
