/**
 * Base Payment Service for Monarch Times
 *
 * Real implementation for verifying USDC payments on Base blockchain.
 */

import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

export interface PaymentResult {
  success: boolean;
  confirmed: boolean;
  signature?: string;
  amount?: number;
  sender?: string;
  error?: string;
}

// USDC contract addresses
const USDC_ADDRESSES = {
  mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  sepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
};

// Base RPC configuration
const IS_TESTNET = process.env.BASE_NETWORK === 'sepolia';
const BASE_CHAIN = IS_TESTNET ? baseSepolia : base;
const BASE_RPC_URL = IS_TESTNET
  ? (process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  : (process.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org');
const USDC_ADDRESS = USDC_ADDRESSES[IS_TESTNET ? 'sepolia' : 'mainnet'];

// USDC has 6 decimals
const USDC_DECIMALS = 6;

// Create Base client
const baseClient = createPublicClient({
  chain: BASE_CHAIN,
  transport: http(BASE_RPC_URL),
});

/**
 * Verify a USDC payment on Base
 *
 * @param signature - Base transaction hash
 * @param expectedAmount - Expected payment amount in USDC
 * @param expectedRecipient - Expected recipient address
 * @returns Payment verification result
 */
export async function verifyPayment(
  signature: string,
  expectedAmount?: number,
  expectedRecipient?: string
): Promise<PaymentResult> {
  try {
    console.log(`[Base Pay] Verifying payment sig=${signature}`);

    // 1. Get transaction from Base blockchain
    const transaction = await baseClient.getTransaction({
      hash: signature as `0x${string}`,
    });

    if (!transaction) {
      return {
        success: false,
        confirmed: false,
        error: 'Transaction not found on Base blockchain',
      };
    }

    // 2. Get transaction receipt to verify confirmation
    const receipt = await baseClient.getTransactionReceipt({
      hash: signature as `0x${string}`,
    });

    if (!receipt) {
      return {
        success: false,
        confirmed: false,
        error: 'Transaction receipt not found',
      };
    }

    const isConfirmed = receipt.status === 'success';

    if (!isConfirmed) {
      return {
        success: false,
        confirmed: false,
        error: 'Transaction failed or is pending',
      };
    }

    // 3. Find USDC Transfer event in logs
    // Transfer event signature: Transfer(address,address,uint256)
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    const transferEvent = receipt.logs.find(log =>
      log.topics[0] === transferTopic &&
      log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
    );

    if (!transferEvent) {
      return {
        success: false,
        confirmed: true,
        error: 'No USDC transfer found in transaction',
      };
    }

    // 4. Decode Transfer event
    // topics[1] = from (sender)
    // topics[2] = to (recipient)
    // data = amount
    const senderAddress = `0x${transferEvent.topics[1]?.slice(26)}`;
    const recipientAddress = `0x${transferEvent.topics[2]?.slice(26)}`;
    const amountHex = transferEvent.data;
    const amountWei = BigInt(amountHex);
    const amountUSDC = Number(amountWei) / Math.pow(10, USDC_DECIMALS);

    // 5. Verify recipient if provided
    if (expectedRecipient && recipientAddress.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return {
        success: false,
        confirmed: true,
        error: `Wrong recipient. Expected ${expectedRecipient}, got ${recipientAddress}`,
        amount: amountUSDC,
        sender: senderAddress,
      };
    }

    // 6. Verify amount if provided
    if (expectedAmount !== undefined && amountUSDC < expectedAmount) {
      return {
        success: false,
        confirmed: true,
        error: `Insufficient amount. Expected ${expectedAmount} USDC, got ${amountUSDC} USDC`,
        amount: amountUSDC,
        sender: senderAddress,
      };
    }

    console.log(`[Base Pay] Payment verified: ${amountUSDC} USDC from ${senderAddress} to ${recipientAddress}`);

    return {
      success: true,
      confirmed: true,
      signature: signature,
      amount: amountUSDC,
      sender: senderAddress,
    };

  } catch (error: any) {
    console.error('[Base Pay] Verification error:', error);
    return {
      success: false,
      confirmed: false,
      error: error.message || 'Payment verification failed',
    };
  }
}

/**
 * Legacy signature for backward compatibility
 */
export async function verifyPaymentLegacy(
  reference: string,
  signature: string,
  amount: number,
  recipient: string
): Promise<PaymentResult> {
  console.log(`[Base Pay] Legacy verification ref=${reference}`);
  return verifyPayment(signature, amount, recipient);
}
