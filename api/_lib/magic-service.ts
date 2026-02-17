/**
 * Magic Link Wallet Service for Monarch Times
 *
 * Handles wallet provisioning for users using Magic Link.
 * Provides email-based authentication alongside traditional wallet adapters.
 * Ported from SOLAUTH with raw SQL adaptations.
 */

import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';
import { sql, generateId } from './db';

const MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || '';
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Check if Magic Link is properly configured
 */
export function isMagicConfigured(): boolean {
  return !!MAGIC_SECRET_KEY;
}

/**
 * Generate a deterministic wallet address from email
 * Used as fallback when Magic API is not available
 */
function generateDeterministicWallet(email: string): { publicKey: string } {
  const appSecret = process.env.WALLET_DERIVATION_SECRET;

  if (!appSecret) {
    throw new Error('WALLET_DERIVATION_SECRET is not set. Cannot generate deterministic wallet.');
  }

  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(email.toLowerCase().trim());
  const seed = hmac.digest();

  const keypair = Keypair.fromSeed(seed);

  return {
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * Create a wallet using Magic Link Admin API
 */
async function createMagicWallet(email: string): Promise<{
  walletAddress: string;
  did: string;
} | null> {
  try {
    const response = await fetch('https://api.magic.link/v1/admin/auth/user/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Magic-Secret-Key': MAGIC_SECRET_KEY,
      },
      body: JSON.stringify({
        email,
        wallet_type: 'SOLANA',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Magic Wallet] API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    const walletAddress =
      data.data?.wallet?.public_address ||
      data.wallet?.public_address ||
      data.public_address ||
      null;

    const did = data.data?.issuer || data.issuer || data.did || null;

    if (!walletAddress) {
      console.error('[Magic Wallet] No wallet address in response:', data);
      return null;
    }

    return { walletAddress, did };
  } catch (error) {
    console.error('[Magic Wallet] API request failed:', error);
    return null;
  }
}

/**
 * Provision a wallet for a user
 */
export async function provisionWallet(
  email: string,
  options?: {
    forceNew?: boolean;
  }
): Promise<{
  walletAddress: string;
  isNew: boolean;
  source: 'database' | 'magic' | 'deterministic';
}> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if wallet already exists
  if (!options?.forceNew) {
    try {
      const existing = await sql`
        SELECT id, wallet_address FROM customer_wallets WHERE email = ${normalizedEmail}
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE customer_wallets SET last_used_at = NOW() WHERE id = ${existing[0].id}
        `;

        console.log(`[Magic Wallet] Found existing wallet for ${normalizedEmail}`);

        return {
          walletAddress: existing[0].wallet_address,
          isNew: false,
          source: 'database',
        };
      }
    } catch (e) {
      console.error('[Magic Wallet] Database lookup error:', e);
    }
  }

  // 2. Try Magic Link API if configured
  if (MAGIC_SECRET_KEY && !IS_DEV) {
    try {
      const magicWallet = await createMagicWallet(normalizedEmail);

      if (magicWallet) {
        const id = generateId('CW-');
        await sql`
          INSERT INTO customer_wallets (id, email, wallet_address, magic_did, last_used_at, created_at)
          VALUES (${id}, ${normalizedEmail}, ${magicWallet.walletAddress}, ${magicWallet.did}, NOW(), NOW())
        `;

        console.log(`[Magic Wallet] Created Magic wallet for ${normalizedEmail}`);

        return {
          walletAddress: magicWallet.walletAddress,
          isNew: true,
          source: 'magic',
        };
      }
    } catch (e) {
      console.error('[Magic Wallet] Magic API error, falling back:', e);
    }
  }

  // 3. Fallback to deterministic wallet
  const deterministicWallet = generateDeterministicWallet(normalizedEmail);

  try {
    const id = generateId('CW-');
    await sql`
      INSERT INTO customer_wallets (id, email, wallet_address, last_used_at, created_at)
      VALUES (${id}, ${normalizedEmail}, ${deterministicWallet.publicKey}, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET last_used_at = NOW()
    `;
  } catch (e) {
    console.error('[Magic Wallet] Failed to store wallet:', e);
  }

  console.log(`[Magic Wallet] Created deterministic wallet for ${normalizedEmail}`);

  return {
    walletAddress: deterministicWallet.publicKey,
    isNew: true,
    source: 'deterministic',
  };
}

/**
 * Get wallet address by email
 */
export async function getWalletByEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await sql`
      SELECT wallet_address FROM customer_wallets WHERE email = ${normalizedEmail}
    `;

    return result[0]?.wallet_address || null;
  } catch (e) {
    console.error('[Magic Wallet] Lookup error:', e);
    return null;
  }
}

/**
 * Check if a wallet exists for an email
 */
export async function walletExists(email: string): Promise<boolean> {
  const wallet = await getWalletByEmail(email);
  return wallet !== null;
}
