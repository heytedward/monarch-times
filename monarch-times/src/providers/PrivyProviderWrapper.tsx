import { PrivyProvider } from '@privy-io/react-auth';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo, type ReactNode } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  // Solana RPC endpoint (for useSolanaPay hook)
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
  const endpoint = useMemo(() => {
    return heliusApiKey
      ? `https://${network}.helius-rpc.com/?api-key=${heliusApiKey}`
      : `https://api.${network}.solana.com`;
  }, [network, heliusApiKey]);

  // Wallet adapters for external wallets (Phantom, Solflare, etc.)
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  if (!appId) {
    console.error('VITE_PRIVY_APP_ID is not set. Please add it to your .env file.');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Appearance settings - De Stijl/Mondrian theme
        appearance: {
          showWalletLoginFirst: false, // Show email first for easier onboarding
          walletChainType: 'solana-only', // Only Solana wallets
          theme: 'dark',
          accentColor: '#9945FF', // Monarch purple
          logo: undefined, // Optional: add your logo URL
        },

        // Login methods - email, wallet, and social
        loginMethods: ['email', 'wallet', 'google'],

        // Embedded wallet creation
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users', // Create Solana wallet for every user
          },
        },

        // Legal (optional)
        legal: {
          termsAndConditionsUrl: 'https://monarchtimes.xyz/terms',
          privacyPolicyUrl: 'https://monarchtimes.xyz/privacy',
        },
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
}
