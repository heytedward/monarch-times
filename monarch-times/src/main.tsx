import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

// Privy authentication (replaces Magic Link + Wallet Adapter)
import { PrivyProviderWrapper } from './providers/PrivyProviderWrapper'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PrivyProviderWrapper>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PrivyProviderWrapper>
    </ErrorBoundary>
  </StrictMode>,
)
