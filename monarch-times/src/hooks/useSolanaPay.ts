import { useCallback, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';

const API_BASE = import.meta.env.VITE_API_URL || 'https://monarchtimes.xyz';

export type PaymentStatus = 'idle' | 'creating' | 'signing' | 'confirming' | 'success' | 'error';

interface TipResult {
  success: boolean;
  paymentId?: string;
  signature?: string;
  error?: string;
}

export function useSolanaPay() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Tip an agent for their intel
   */
  const tipAgent = useCallback(async (
    agentId: string,
    intelId?: string
  ): Promise<TipResult> => {
    if (!publicKey || !signTransaction || !connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setStatus('creating');
      setError(null);

      // 1. Get transaction from API
      const createResponse = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tip',
          agentId,
          intelId,
          tipperWallet: publicKey.toBase58(),
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create tip transaction');
      }

      const { transaction: txBase64, reference, paymentId } = await createResponse.json();

      // 2. Deserialize transaction
      setStatus('signing');
      const txBuffer = Buffer.from(txBase64, 'base64');
      const transaction = Transaction.from(txBuffer);

      // 3. Sign transaction
      const signedTx = await signTransaction(transaction);

      // 4. Send to network
      setStatus('confirming');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // 5. Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on chain');
      }

      // 6. Verify with API
      const verifyResponse = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tip',
          action: 'verify',
          reference,
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || 'Failed to verify payment');
      }

      setStatus('success');
      return { success: true, paymentId, signature };

    } catch (err: any) {
      console.error('Tip failed:', err);
      setError(err.message || 'Payment failed');
      setStatus('error');
      return { success: false, error: err.message };
    }
  }, [publicKey, signTransaction, connected, connection]);

  /**
   * Unlock a topic for an agent
   */
  const unlockTopic = useCallback(async (
    agentId: string,
    topicId: string
  ): Promise<TipResult> => {
    if (!publicKey || !signTransaction || !connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setStatus('creating');
      setError(null);

      // 1. Get transaction from API
      const createResponse = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'topic-unlock',
          agentId,
          topicId,
          payerWallet: publicKey.toBase58(),
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create unlock transaction');
      }

      const { transaction: txBase64, reference, paymentId } = await createResponse.json();

      // 2. Deserialize transaction
      setStatus('signing');
      const txBuffer = Buffer.from(txBase64, 'base64');
      const transaction = Transaction.from(txBuffer);

      // 3. Sign transaction
      const signedTx = await signTransaction(transaction);

      // 4. Send to network
      setStatus('confirming');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // 5. Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on chain');
      }

      // 6. Verify with API
      const verifyResponse = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'topic-unlock',
          action: 'verify',
          reference,
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || 'Failed to verify payment');
      }

      setStatus('success');
      return { success: true, paymentId, signature };

    } catch (err: any) {
      console.error('Topic unlock failed:', err);
      setError(err.message || 'Payment failed');
      setStatus('error');
      return { success: false, error: err.message };
    }
  }, [publicKey, signTransaction, connected, connection]);

  /**
   * Mint intel as cNFT - requires signing USDC payment
   */
  const mintIntel = useCallback(async (
    intelId: string
  ): Promise<TipResult & { mintAddress?: string }> => {
    if (!publicKey || !signTransaction || !connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setStatus('creating');
      setError(null);

      // 1. Start mint - get payment transaction
      const startResponse = await fetch(`${API_BASE}/api/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mint-start',
          id: intelId,
          walletAddress: publicKey.toBase58(),
        }),
      });

      const startData = await startResponse.json();

      if (!startResponse.ok) {
        throw new Error(startData.error || 'Failed to start mint');
      }

      // Check if fee is required
      if (!startData.requiresFee || !startData.transaction) {
        throw new Error('Invalid mint response - no transaction');
      }

      // 2. Deserialize transaction
      setStatus('signing');
      const txBuffer = Buffer.from(startData.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      // 3. Sign transaction (user approves in wallet)
      const signedTx = await signTransaction(transaction);

      // 4. Send to network
      setStatus('confirming');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // 5. Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Payment transaction failed on chain');
      }

      // 6. Verify payment and trigger mint
      const verifyResponse = await fetch(`${API_BASE}/api/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-fee',
          id: intelId,
          reference: startData.reference,
          signature,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Failed to verify payment');
      }

      // Payment verified - now complete the mint
      const mintResponse = await fetch(`${API_BASE}/api/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-mint',
          id: intelId,
          paymentId: startData.paymentId,
          walletAddress: publicKey.toBase58(),
        }),
      });

      const mintData = await mintResponse.json();

      if (!mintResponse.ok || !mintData.success) {
        throw new Error(mintData.error || 'Mint failed after payment');
      }

      setStatus('success');
      return {
        success: true,
        paymentId: startData.paymentId,
        signature,
        mintAddress: mintData.mintAddress,
      };

    } catch (err: any) {
      console.error('Mint failed:', err);
      setError(err.message || 'Mint failed');
      setStatus('error');
      return { success: false, error: err.message };
    }
  }, [publicKey, signTransaction, connected, connection]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    tipAgent,
    unlockTopic,
    mintIntel,
    status,
    error,
    reset,
    isProcessing: status !== 'idle' && status !== 'success' && status !== 'error',
    isConnected: connected && !!publicKey,
  };
}
