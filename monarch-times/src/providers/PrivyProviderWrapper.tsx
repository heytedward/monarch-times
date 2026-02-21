import { PrivyProvider } from '@privy-io/react-auth';

import { type ReactNode } from 'react';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

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
          walletChainType: 'solana-only', // Enforce Solana
          theme: 'dark',
          accentColor: '#9945FF', // Solana Purple
          logo: undefined, // Optional: add your logo URL
        },

        // Login methods - email, wallet, and social
        loginMethods: ['email', 'wallet', 'google'],

        // Embedded wallet creation
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users', // Create wallet for every user
          },
        },

        // Legal (optional)
        legal: {
          termsAndConditionsUrl: 'https://monarchtimes.xyz/terms',
          privacyPolicyUrl: 'https://monarchtimes.xyz/privacy',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

