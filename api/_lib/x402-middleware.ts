/**
 * x402 Protocol Middleware
 *
 * Pay-per-request protocol for premium API endpoints.
 * Clients send USDC on Base, include transaction signature in header,
 * server verifies payment before serving content.
 *
 * Protocol Flow:
 * 1. Client sends USDC to X402_PAYMENT_ADDRESS
 * 2. Client includes tx signature in X-Payment-Signature header
 * 3. Server verifies transaction on Base blockchain
 * 4. Server checks for replay attacks (signature reuse)
 * 5. Server validates payment amount >= required price
 * 6. Server stores signature to prevent reuse
 * 7. Server serves premium content or returns 402
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './db';
import { createPublicClient, http, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Premium endpoint prices (in USDC)
export const DOSSIER_PRICE = 0.50;      // Full agent dossier
export const BULK_INTEL_PRICE = 0.25;   // Bulk intel export
export const SEARCH_PRICE = 0.10;       // Advanced search

// x402 payment address (from env)
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '9XjfDxDAu32FXdSv6Nudhy6HPaY9RAd1QYiJMBAaBRND';

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
 * Payment verification result
 */
export interface X402PaymentResult {
  verified: boolean;
  sender?: string;
  amount?: number;
  signature?: string;
  error?: string;
}

/**
 * Verify x402 payment from request headers
 *
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @param requiredPrice - Required payment in USDC
 * @param endpoint - Endpoint being accessed (for logging)
 * @returns Payment verification result
 */
export async function verifyX402Payment(
  req: VercelRequest,
  res: VercelResponse,
  requiredPrice: number,
  endpoint: string
): Promise<X402PaymentResult> {
  // Extract payment signature from header
  const paymentSignature = req.headers['x-payment-signature'] as string | undefined;

  if (!paymentSignature) {
    res.status(402).json({
      error: 'Payment Required',
      message: `This endpoint requires payment of ${requiredPrice} USDC`,
      protocol: 'x402',
      paymentAddress: X402_PAYMENT_ADDRESS,
      amount: requiredPrice,
      currency: 'USDC',
      network: IS_TESTNET ? 'Base Sepolia' : 'Base',
      instructions: 'Send USDC to the payment address and include transaction hash in X-Payment-Signature header',
    });
    return { verified: false, error: 'Missing payment signature' };
  }

  try {
    // 1. Check for replay attack (signature already used)
    const existingPayment = await sql`
      SELECT id, created_at FROM x402_payments
      WHERE signature = ${paymentSignature}
      LIMIT 1
    `;

    if (existingPayment.length > 0) {
      res.status(409).json({
        error: 'Payment Already Used',
        message: 'This transaction signature has already been used',
        usedAt: existingPayment[0].created_at,
      });
      return { verified: false, error: 'Replay attack detected' };
    }

    // 2. Verify transaction on Base blockchain
    const transaction = await baseClient.getTransaction({
      hash: paymentSignature as `0x${string}`,
    });

    if (!transaction) {
      res.status(400).json({
        error: 'Invalid Transaction',
        message: 'Transaction not found on Base blockchain',
        signature: paymentSignature,
      });
      return { verified: false, error: 'Transaction not found' };
    }

    // 3. Verify transaction is confirmed
    const receipt = await baseClient.getTransactionReceipt({
      hash: paymentSignature as `0x${string}`,
    });

    if (!receipt || receipt.status !== 'success') {
      res.status(400).json({
        error: 'Transaction Not Confirmed',
        message: 'Transaction is pending or failed',
        status: receipt?.status || 'unknown',
      });
      return { verified: false, error: 'Transaction not confirmed' };
    }

    // 4. Verify payment is to correct address (X402_PAYMENT_ADDRESS)
    // Note: For USDC transfers, we need to check the Transfer event logs
    // The 'to' field in the transaction is the USDC contract, not the recipient

    // Find USDC Transfer event in logs
    const transferEvent = receipt.logs.find(log => {
      // USDC Transfer event signature: Transfer(address,address,uint256)
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      return log.topics[0] === transferTopic &&
             log.address.toLowerCase() === USDC_ADDRESS.toLowerCase();
    });

    if (!transferEvent) {
      res.status(400).json({
        error: 'Invalid Payment',
        message: 'No USDC transfer found in transaction',
      });
      return { verified: false, error: 'No USDC transfer found' };
    }

    // Decode Transfer event (topics[1] = from, topics[2] = to, data = amount)
    const recipientAddress = `0x${transferEvent.topics[2]?.slice(26)}`;

    if (recipientAddress.toLowerCase() !== X402_PAYMENT_ADDRESS.toLowerCase()) {
      res.status(400).json({
        error: 'Wrong Recipient',
        message: `Payment must be sent to ${X402_PAYMENT_ADDRESS}`,
        actualRecipient: recipientAddress,
      });
      return { verified: false, error: 'Wrong payment recipient' };
    }

    // 5. Decode amount from Transfer event data
    const amountHex = transferEvent.data;
    const amountWei = BigInt(amountHex);
    const amountUSDC = Number(amountWei) / Math.pow(10, USDC_DECIMALS);

    // 6. Verify amount >= required price
    if (amountUSDC < requiredPrice) {
      res.status(400).json({
        error: 'Insufficient Payment',
        message: `Payment of ${requiredPrice} USDC required, received ${amountUSDC.toFixed(6)} USDC`,
        required: requiredPrice,
        received: amountUSDC,
      });
      return { verified: false, error: 'Insufficient payment amount' };
    }

    // 7. Get sender address
    const senderAddress = transaction.from;

    // 8. Store payment signature to prevent replay
    await sql`
      INSERT INTO x402_payments (
        signature,
        sender_address,
        amount_usdc,
        endpoint,
        created_at
      ) VALUES (
        ${paymentSignature},
        ${senderAddress},
        ${amountUSDC},
        ${endpoint},
        NOW()
      )
    `;

    console.log(`[x402] Payment verified: ${amountUSDC} USDC from ${senderAddress} for ${endpoint}`);

    // Payment verified successfully
    return {
      verified: true,
      sender: senderAddress,
      amount: amountUSDC,
      signature: paymentSignature,
    };

  } catch (error: any) {
    console.error('[x402] Payment verification error:', error);

    res.status(500).json({
      error: 'Payment Verification Failed',
      message: 'Unable to verify payment on blockchain',
      details: error.message,
    });

    return { verified: false, error: error.message };
  }
}

/**
 * Higher-order function to wrap endpoints with x402 protection
 *
 * Usage:
 * export default withX402(handler, DOSSIER_PRICE);
 *
 * @param handler - Original endpoint handler
 * @param requiredPrice - Required payment in USDC
 * @returns Wrapped handler with x402 protection
 */
export function withX402(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
  requiredPrice: number
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Signature');
      return res.status(200).end();
    }

    // Verify payment
    const endpoint = `${req.url}`;
    const paymentResult = await verifyX402Payment(req, res, requiredPrice, endpoint);

    if (!paymentResult.verified) {
      // Response already sent by verifyX402Payment
      return;
    }

    // Payment verified, attach info to request and continue
    (req as any).x402 = {
      sender: paymentResult.sender,
      amount: paymentResult.amount,
      signature: paymentResult.signature,
    };

    // Call original handler
    return handler(req, res);
  };
}

/**
 * Get payment history for an address
 *
 * @param address - Ethereum address
 * @returns Array of payment records
 */
export async function getPaymentHistory(address: string) {
  const payments = await sql`
    SELECT
      signature,
      amount_usdc,
      endpoint,
      created_at
    FROM x402_payments
    WHERE sender_address = ${address}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return payments;
}

/**
 * Get total revenue from x402 payments
 *
 * @returns Total USDC collected
 */
export async function getX402Revenue() {
  const result = await sql`
    SELECT
      COUNT(*) as payment_count,
      COALESCE(SUM(amount_usdc), 0) as total_revenue
    FROM x402_payments
  `;

  return {
    paymentCount: parseInt(result[0]?.payment_count || '0'),
    totalRevenue: parseFloat(result[0]?.total_revenue || '0'),
    currency: 'USDC',
  };
}

/**
 * Initialize x402_payments table if it doesn't exist
 * This should be run during deployment or first request
 */
export async function initializeX402Table() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS x402_payments (
        id SERIAL PRIMARY KEY,
        signature TEXT UNIQUE NOT NULL,
        sender_address TEXT NOT NULL,
        amount_usdc DECIMAL(18, 6) NOT NULL,
        endpoint TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_sender (sender_address),
        INDEX idx_created (created_at DESC)
      )
    `;
    console.log('[x402] Table initialized');
  } catch (error) {
    console.error('[x402] Failed to initialize table:', error);
  }
}
