import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

// Solana Wallet Adapter imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Default styles for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css'

// Wallet provider wrapper component
function WalletProviders({ children }: { children: React.ReactNode }) {
  // Use devnet for development, mainnet-beta for production
  const endpoint = useMemo(() =>
    import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet'),
    []
  )

  // Configure supported wallets
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <WalletProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WalletProviders>
    </ErrorBoundary>
  </StrictMode>,
)
