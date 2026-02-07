/**
 * Magic Link Authentication Context
 *
 * Provides email-based wallet provisioning alongside traditional wallet adapters.
 * Users can login with email to receive a deterministic or Magic-provisioned wallet.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MagicContextType {
  email: string | null;
  walletAddress: string | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const MagicContext = createContext<MagicContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function MagicProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => {
    // Restore from localStorage on mount
    return localStorage.getItem('magic_email');
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    return localStorage.getItem('magic_wallet');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (userEmail: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/magic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setEmail(userEmail);
      setWalletAddress(data.walletAddress);

      // Persist to localStorage
      localStorage.setItem('magic_email', userEmail);
      localStorage.setItem('magic_wallet', data.walletAddress);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setEmail(null);
    setWalletAddress(null);
    setError(null);
    localStorage.removeItem('magic_email');
    localStorage.removeItem('magic_wallet');
  }, []);

  const isConnected = !!walletAddress;

  return (
    <MagicContext.Provider
      value={{
        email,
        walletAddress,
        isLoading,
        isConnected,
        error,
        login,
        logout,
      }}
    >
      {children}
    </MagicContext.Provider>
  );
}

export function useMagic() {
  const context = useContext(MagicContext);
  if (context === undefined) {
    throw new Error('useMagic must be used within a MagicProvider');
  }
  return context;
}
