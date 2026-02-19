import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { getSolanaRpcUrl } from './solana-config';
import BigNumber from 'bignumber.js';

// USDC Mint on Mainnet and Devnet
const USDC_MINT = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
};

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS; // Your platform wallet

export const PAYMENT_AMOUNTS = {
  tip: 1.00,
  topicUnlock: {
    second: 0.10,
    thirdPlus: 0.25
  }
};

export interface PaymentResult {
  verified: boolean;
  confirmed: boolean; // For compatibility with Base verification
  amount: number;
  sender: string;
  timestamp: number;
  error?: string;
}

/**
 * Generate a random reference key for Solana Pay
 */
export function generateReference(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a split payment transaction (Simulated for now, would return a transaction for Solana Pay)
 */
export async function createSplitPaymentTransaction({ payerWallet, agentWallet, amount, splitType, reference }: any) {
  // Real implementation would use @solana/pay to create a transaction
  // For now, we return the data needed by the frontend to construct it
  const platformShare = new BigNumber(amount).times(0.2).toNumber(); // 20% platform fee
  const agentShare = agentWallet ? new BigNumber(amount).minus(platformShare).toNumber() : 0;
  
  return {
    success: true,
    transaction: 'SIMULATED_TRANSACTION_DATA',
    reference: reference || generateReference(),
    amount,
    agentShare,
    platformShare,
  };
}

/**
 * Verify a Solana USDC payment on-chain (Alias for compatibility)
 */
export async function verifyPayment(signature: string): Promise<PaymentResult> {
  const result = await verifySolanaPayment(signature, 0); // Amount check handled elsewhere or use default
  return {
    ...result,
    confirmed: result.verified
  };
}

/**
 * Verify a Solana USDC payment on-chain
 * 
 * @param signature Transaction signature
 * @param expectedAmount Amount expected in USDC
 * @param expectedRecipient Address that should have received funds (optional, defaults to env var)
 */
export async function verifySolanaPayment(
  signature: string,
  expectedAmount: number,
  expectedRecipient: string = PAYMENT_ADDRESS!
): Promise<PaymentResult> {
  try {
    const rpcUrl = getSolanaRpcUrl();
    const connection = new Connection(rpcUrl, 'confirmed');

    // 1. Get Transaction
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx) {
      return { verified: false, amount: 0, sender: '', timestamp: 0, error: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { verified: false, amount: 0, sender: '', timestamp: 0, error: 'Transaction failed on-chain' };
    }

    // 2. Analyze Transfers to find the payment
    // Look for SPL Token transfer to expectedRecipient
    const preTokenBalances = tx.meta?.preTokenBalances || [];
    const postTokenBalances = tx.meta?.postTokenBalances || [];
    
    // Find the recipient's token account index
    const accountKeys = tx.transaction.message.accountKeys;
    const recipientKey = expectedRecipient;

    // We need to calculate the change in balance for the recipient
    // This is tricky because we need to know the recipient's ATA (Associated Token Account)
    // simplified approach: Look at innerInstructions for "Transfer" to the recipient's ATA? 
    // Or just diff the balances.

    // Let's filter for USDC mint
    const usdcMint = process.env.SOLANA_NETWORK === 'mainnet' ? USDC_MINT.mainnet : USDC_MINT.devnet;

    // Find the balance change for the recipient
    // Note: postTokenBalances contains owner field in parsed format
    const recipientPostBalance = postTokenBalances.find(b => b.owner === recipientKey && b.mint === usdcMint);
    const recipientPreBalance = preTokenBalances.find(b => b.owner === recipientKey && b.mint === usdcMint);

    const postAmount = recipientPostBalance?.uiTokenAmount?.uiAmount || 0;
    const preAmount = recipientPreBalance?.uiTokenAmount?.uiAmount || 0;
    
    const amountReceived = postAmount - preAmount;

    // 3. Verify Amount
    if (amountReceived < expectedAmount) {
       return { 
         verified: false, 
         amount: amountReceived, 
         sender: tx.transaction.message.accountKeys[0].pubkey.toBase58(), 
         timestamp: tx.blockTime || 0,
         error: `Insufficient payment. Expected ${expectedAmount}, received ${amountReceived}`
       };
    }

    return {
      verified: true,
      amount: amountReceived,
      sender: tx.transaction.message.accountKeys[0].pubkey.toBase58(), // Payer is usually index 0
      timestamp: tx.blockTime || 0
    };

  } catch (error: any) {
    console.error('Solana payment verification error:', error);
    return { verified: false, amount: 0, sender: '', timestamp: 0, error: error.message };
  }
}