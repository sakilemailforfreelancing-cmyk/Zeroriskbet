import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { loadAuthFromStorage } from './auth/storage'
import { useSessionStore } from './store/useSessionStore'

const queryClient = new QueryClient()
registerServiceWorker()

const stored = loadAuthFromStorage()
if (stored) {
  useSessionStore.getState().setSession(stored)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
