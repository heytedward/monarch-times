import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface SolanaAgentHook {
  isSyncing: boolean;
  syncError: string | null;
  postIntel: (intel: { title: string; content: string; topic: string }) => Promise<any>;
}

export const useSolanaAgent = (): SolanaAgentHook => {
  const { authenticated } = usePrivy();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Helper to find Solana wallet - unused for now
  // const getSolanaWallet = useCallback(() => {
  //   return user?.linkedAccounts.find(
  //     (a) => a.type === 'wallet' && a.chainType === 'solana'
  //   );
  // }, [user]);

  const postIntel = async (_intel: { title: string; content: string; topic: string }) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      if (!authenticated) throw new Error("Not authenticated");

      // const wallet = getSolanaWallet();
      // If no Solana wallet, we might be using Base, but this hook is specific to Solana actions
      // if needed. For now, we rely on the backend to handle the chain agnostic logic,
      // but if we needed client-side signing for Solana specifically, we'd do it here.

      // For now, this hook delegates to the universal API which handles the chain logic
      // The signing happens via Privy provider or wallet adapter in the UI components usually.

      // ... actually, the `postIntel` flow in `ShareIntelModal` handles the signing.
      // This hook might be redundant if we moved everything to the modal.

      // Let's just return a success for now as the logic is centralized in the Modal components
      return { success: true };

    } catch (err: any) {
      setSyncError(err.message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncError,
    postIntel
  };
};
