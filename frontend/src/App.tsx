import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from './services/api.js'

const queryClient = new QueryClient()

function AppContent() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkHealth() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/health')
      setHealthStatus(response.data.data.status)
    } catch {
      setError('Backend is not reachable')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>MyCars</h1>
      <button onClick={checkHealth} disabled={isLoading}>
        {isLoading ? 'Checking...' : 'Check Backend Health'}
      </button>
      {healthStatus && <p>Backend status: {healthStatus}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
