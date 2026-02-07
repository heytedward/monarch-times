/**
 * x402 Payment Protocol for Monarch Times (Vercel Serverless)
 *
 * Implements pay-per-request API access via the x402 protocol.
 * No registration or API keys required - just pay and use.
 *
 * Ported from SOLAUTH and adapted for Vercel serverless functions.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { sql, generateId } from './db';
import { getSolanaRpcUrl, getSolanaNetwork } from './solana-config';

// Pricing constants (USDC)
export const DOSSIER_PRICE = 0.50;      // Full agent dossier
export const BULK_INTEL_PRICE = 0.25;   // Bulk intel access
export const SEARCH_PRICE = 0.10;       // Advanced search

// USDC Token Mint addresses
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

// Payment validity window (5 minutes)
const PAYMENT_VALIDITY_SECONDS = 300;

function getUsdcMint(): string {
  const network = getSolanaNetwork();
  return network === 'devnet' ? USDC_MINT_DEVNET : USDC_MINT_MAINNET;
}

/**
 * Validates a Solana transaction signature format.
 */
function isValidSolanaSignatureFormat(signature: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(signature);
}

/**
 * Finds a USDC token transfer to the specified recipient in a transaction.
 */
function findUsdcTransfer(
  transaction: ParsedTransactionWithMeta,
  recipient: string,
  usdcMint: string
): { amount: number; sender: string } | null {
  const instructions = transaction.transaction.message.instructions;

  for (const ix of instructions) {
    if ('parsed' in ix && ix.program === 'spl-token') {
      const parsed = ix.parsed;

      if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
        const info = parsed.info;

        if (parsed.type === 'transferChecked' && info.mint !== usdcMint) {
          continue;
        }

        const postBalances = transaction.meta?.postTokenBalances || [];
        for (const balance of postBalances) {
          if (balance.mint === usdcMint && balance.owner === recipient) {
            const amount = parsed.type === 'transferChecked'
              ? info.tokenAmount.uiAmount
              : Number(info.amount) / 1_000_000;

            return {
              amount,
              sender: info.authority || info.source,
            };
          }
        }
      }
    }
  }

  // Check inner instructions
  const innerInstructions = transaction.meta?.innerInstructions || [];
  for (const inner of innerInstructions) {
    for (const ix of inner.instructions) {
      if ('parsed' in ix && ix.program === 'spl-token') {
        const parsed = ix.parsed;
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const info = parsed.info;

          if (parsed.type === 'transferChecked' && info.mint !== usdcMint) {
            continue;
          }

          const postBalances = transaction.meta?.postTokenBalances || [];
          for (const balance of postBalances) {
            if (balance.mint === usdcMint && balance.owner === recipient) {
              const amount = parsed.type === 'transferChecked'
                ? info.tokenAmount.uiAmount
                : Number(info.amount) / 1_000_000;

              return {
                amount,
                sender: info.authority || info.source,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Verifies a Solana transaction signature for x402 payment.
 */
async function verifyPayment(
  signature: string,
  requiredAmount: number,
  endpoint: string = 'unknown'
): Promise<{ valid: boolean; amount?: number; sender?: string; error?: string }> {
  if (!isValidSolanaSignatureFormat(signature)) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const paymentAddress = process.env.X402_PAYMENT_ADDRESS;
  if (!paymentAddress) {
    return { valid: false, error: 'Payment address not configured' };
  }

  try {
    // 1. Check for replay attack
    const existingPayment = await sql`
      SELECT id FROM x402_payments WHERE signature = ${signature}
    `;

    if (existingPayment.length > 0) {
      console.log(`[x402] Replay attack detected: ${signature.substring(0, 20)}...`);
      return { valid: false, error: 'Payment signature already used' };
    }

    // 2. Query Solana RPC for transaction
    const connection = new Connection(getSolanaRpcUrl(), 'confirmed');
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found' };
    }

    // 3. Verify transaction was successful
    if (transaction.meta?.err) {
      return { valid: false, error: 'Transaction failed on-chain' };
    }

    // 4. Check transaction age
    const blockTime = transaction.blockTime;
    if (blockTime) {
      const txAge = Date.now() / 1000 - blockTime;
      if (txAge > PAYMENT_VALIDITY_SECONDS) {
        return { valid: false, error: `Transaction too old (${Math.round(txAge)}s)` };
      }
    }

    // 5. Find USDC transfer
    const usdcMint = getUsdcMint();
    const paymentInfo = findUsdcTransfer(transaction, paymentAddress, usdcMint);

    if (!paymentInfo) {
      return { valid: false, error: 'No USDC transfer to payment address found' };
    }

    // 6. Verify amount
    if (paymentInfo.amount < requiredAmount) {
      return {
        valid: false,
        error: `Insufficient payment: ${paymentInfo.amount} USDC < ${requiredAmount} USDC required`,
      };
    }

    // 7. Store signature to prevent replay
    const id = generateId('X402-');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO x402_payments (id, signature, amount, sender, endpoint, expires_at)
      VALUES (${id}, ${signature}, ${paymentInfo.amount}, ${paymentInfo.sender}, ${endpoint}, ${expiresAt})
    `;

    console.log(`[x402] Payment verified: ${paymentInfo.amount} USDC for ${endpoint}`);

    return {
      valid: true,
      amount: paymentInfo.amount,
      sender: paymentInfo.sender,
    };
  } catch (error: any) {
    console.error('[x402] Payment verification error:', error);
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}

export interface X402PaymentInfo {
  signature: string;
  verified: boolean;
  amount?: number;
  sender?: string;
}

export interface X402VerificationResult {
  verified: boolean;
  sender?: string;
  amount?: number;
}

/**
 * Verifies x402 payment inline (for use in consolidated endpoints).
 * Sends 402 response if payment is missing or invalid.
 * Returns verification result if payment is valid.
 *
 * @example
 * const result = await verifyX402Payment(req, res, 0.50, '/api/endpoint');
 * if (!result.verified) return; // 402 already sent
 * // Continue with handler...
 */
export async function verifyX402Payment(
  req: VercelRequest,
  res: VercelResponse,
  priceUSDC: number,
  endpoint: string
): Promise<X402VerificationResult> {
  const paymentSignature = req.headers['x-payment-signature'] as string;
  const paymentAddress = process.env.X402_PAYMENT_ADDRESS;
  const network = getSolanaNetwork();

  if (!paymentAddress) {
    console.error('[x402] X402_PAYMENT_ADDRESS not configured');
    res.status(500).json({
      error: 'Payment configuration error',
      message: 'Payment recipient address not configured',
    });
    return { verified: false };
  }

  // No payment - return 402 Payment Required
  if (!paymentSignature) {
    res.status(402)
      .setHeader('X-PAYMENT-REQUIRED', 'true')
      .setHeader('X-PAYMENT-AMOUNT', priceUSDC.toString())
      .setHeader('X-PAYMENT-CURRENCY', 'USDC')
      .setHeader('X-PAYMENT-ADDRESS', paymentAddress)
      .setHeader('X-PAYMENT-NETWORK', `solana-${network}`)
      .json({
        error: 'Payment required',
        price: `${priceUSDC} USDC`,
        recipient: paymentAddress,
        network: `solana-${network}`,
        instructions: {
          step1: 'Send USDC payment to the recipient address on Solana',
          step2: 'Retry the request with X-PAYMENT-SIGNATURE header containing the transaction signature',
          docs: 'https://monarchtimes.xyz/skill.md',
        },
      });
    return { verified: false };
  }

  // Verify the payment
  const verification = await verifyPayment(paymentSignature, priceUSDC, endpoint);

  if (!verification.valid) {
    res.status(402)
      .setHeader('X-PAYMENT-REQUIRED', 'true')
      .setHeader('X-PAYMENT-ERROR', verification.error || 'Invalid payment')
      .json({
        error: 'Payment verification failed',
        reason: verification.error || 'Invalid payment signature',
        price: `${priceUSDC} USDC`,
        recipient: paymentAddress,
        network: `solana-${network}`,
      });
    return { verified: false };
  }

  // Payment verified
  res.setHeader('X-PAYMENT-RECEIVED', 'true');
  res.setHeader('X-PAYMENT-SIGNATURE', paymentSignature);

  return {
    verified: true,
    amount: verification.amount,
    sender: verification.sender,
  };
}

type VercelHandler = (
  req: VercelRequest & { x402Payment?: X402PaymentInfo },
  res: VercelResponse
) => Promise<any>;

/**
 * Wraps a Vercel handler with x402 payment protection.
 *
 * @param handler - The Vercel handler function
 * @param priceUSDC - Required payment amount in USDC
 *
 * @example
 * export default withX402(async (req, res) => {
 *   // Handler code - only runs after payment verified
 * }, 0.50);
 */
export function withX402(handler: VercelHandler, priceUSDC: number) {
  return async (req: VercelRequest & { x402Payment?: X402PaymentInfo }, res: VercelResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Signature');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const paymentSignature = req.headers['x-payment-signature'] as string;
    const paymentAddress = process.env.X402_PAYMENT_ADDRESS;
    const network = getSolanaNetwork();

    if (!paymentAddress) {
      console.error('[x402] X402_PAYMENT_ADDRESS not configured');
      return res.status(500).json({
        error: 'Payment configuration error',
        message: 'Payment recipient address not configured',
      });
    }

    // No payment - return 402 Payment Required
    if (!paymentSignature) {
      return res.status(402)
        .setHeader('X-PAYMENT-REQUIRED', 'true')
        .setHeader('X-PAYMENT-AMOUNT', priceUSDC.toString())
        .setHeader('X-PAYMENT-CURRENCY', 'USDC')
        .setHeader('X-PAYMENT-ADDRESS', paymentAddress)
        .setHeader('X-PAYMENT-NETWORK', `solana-${network}`)
        .json({
          error: 'Payment required',
          price: `${priceUSDC} USDC`,
          recipient: paymentAddress,
          network: `solana-${network}`,
          instructions: {
            step1: 'Send USDC payment to the recipient address on Solana',
            step2: 'Retry the request with X-PAYMENT-SIGNATURE header containing the transaction signature',
            docs: 'https://monarchtimes.xyz/skill.md',
          },
        });
    }

    // Verify the payment
    const endpoint = `${req.method} ${req.url}`;
    const verification = await verifyPayment(paymentSignature, priceUSDC, endpoint);

    if (!verification.valid) {
      return res.status(402)
        .setHeader('X-PAYMENT-REQUIRED', 'true')
        .setHeader('X-PAYMENT-ERROR', verification.error || 'Invalid payment')
        .json({
          error: 'Payment verification failed',
          reason: verification.error || 'Invalid payment signature',
          price: `${priceUSDC} USDC`,
          recipient: paymentAddress,
          network: `solana-${network}`,
        });
    }

    // Payment verified - attach info to request and proceed
    req.x402Payment = {
      signature: paymentSignature,
      verified: true,
      amount: verification.amount,
      sender: verification.sender,
    };

    res.setHeader('X-PAYMENT-RECEIVED', 'true');
    res.setHeader('X-PAYMENT-SIGNATURE', paymentSignature);

    return handler(req, res);
  };
}
