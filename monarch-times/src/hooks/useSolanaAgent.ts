import { useAgentStore } from '../store/agentStore';
import { config } from '../config';

// Solana RPC connection
const SOLANA_RPC_URL = config.solanaRpcUrl;

interface TransactionInfo {
  signature: string;
  blockTime: number | null;
  slot: number;
  confirmationStatus: string;
}

export const useSolanaAgent = () => {
  const { insights, setIsSyncingWithSolana, setInsightSolanaData } = useAgentStore();

  /**
   * Verify a transaction signature on Solana devnet
   */
  const verifyTransaction = async (signature: string): Promise<TransactionInfo | null> => {
    try {
      const response = await fetch(SOLANA_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [signature, { encoding: 'json', commitment: 'confirmed' }],
        }),
      });
      const data = await response.json();

      if (data.result) {
        return {
          signature,
          blockTime: data.result.blockTime,
          slot: data.result.slot,
          confirmationStatus: 'confirmed',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      return null;
    }
  };

  /**
   * Get recent signatures for an account
   */
  const getRecentSignatures = async (address: string, limit = 10): Promise<string[]> => {
    try {
      const response = await fetch(SOLANA_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [address, { limit }],
        }),
      });
      const data = await response.json();
      return data.result?.map((sig: { signature: string }) => sig.signature) || [];
    } catch (error) {
      console.error('Failed to get signatures:', error);
      return [];
    }
  };

  /**
   * Populate insight slot with on-chain verification data
   */
  const populateSlotFromChain = async (slotIndex: number, signature: string) => {
    setIsSyncingWithSolana(true);

    try {
      const insightToUpdate = insights[slotIndex];

      if (insightToUpdate && insightToUpdate.title !== 'Empty Slot') {
        // Try to verify the signature on-chain
        const txInfo = await verifyTransaction(signature);
        const isVerified = txInfo !== null;

        setInsightSolanaData(insightToUpdate.id, {
          leafIndex: txInfo?.slot || 0,
          treeAddress: SOLANA_RPC_URL.includes('devnet') ? 'devnet' : 'mainnet',
          signature: signature,
          isSolAuthVerified: isVerified,
        });
      }
    } catch (error) {
      console.error('Failed to populate from chain:', error);
    } finally {
      setIsSyncingWithSolana(false);
    }
  };

  /**
   * Check if Solana RPC is reachable
   */
  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(SOLANA_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });
      const data = await response.json();
      return data.result === 'ok';
    } catch {
      return false;
    }
  };

  return {
    populateSlotFromChain,
    verifyTransaction,
    getRecentSignatures,
    checkConnection,
  };
};
