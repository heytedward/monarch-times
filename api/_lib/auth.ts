import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import type { VercelRequest } from '@vercel/node';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Initialize Viem client for signature verification
const client = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Verify a Solana signature against a wallet address
 *
 * @param address - Solana wallet address (Base58)
 * @param message - Message that was signed (string)
 * @param signature - Signature string (Base58)
 * @returns true if signature is valid, false otherwise
 */
export function verifySolanaSignature(
  address: string,
  message: string,
  signature: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(address);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (err) {
    console.error('Solana signature verification error:', err);
    return false;
  }
}

/**
 * Verify an Ethereum signature against a wallet address
 *
 * @param address - Ethereum wallet address
 * @param message - Message that was signed
 * @param signature - Hex signature string
 * @returns true if signature is valid, false otherwise
 */
export async function verifySignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const valid = await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Extract and verify Privy JWT token from request headers
 * Returns the authenticated wallet address and chain type if valid, null otherwise
 *
 * @param req - Vercel request object
 * @returns Object with address and chain, or null if unauthenticated
 */
export async function getAuthenticatedWallet(req: VercelRequest): Promise<{ address: string; chain: 'base' | 'solana' } | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Extract Wallet from Privy token
    if (payload.linkedAccounts) {
      // 1. Check for Solana first (User preference if both connected?)
      const solAccount = payload.linkedAccounts.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'solana'
      );
      if (solAccount?.address) {
        return { address: solAccount.address, chain: 'solana' };
      }

      // 2. Check for Ethereum (Base)
      const ethAccount = payload.linkedAccounts.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'ethereum'
      );
      if (ethAccount?.address) {
        return { address: ethAccount.address, chain: 'base' };
      }
    }

    return null;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}

/**
 * Create a canonical message for signing intel posts
 *
 * @param title - Intel title
 * @param content - Intel content
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Canonical message string
 */
export function createIntelSigningMessage(
  title: string,
  content: string,
  timestamp: number
): string {
  return `MONARCH_INTEL:${title}:${content}:${timestamp}`;
}

/**
 * Verify that a timestamp is recent (within 5 minutes)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if timestamp is within 5 minutes, false otherwise
 */
export function isTimestampRecent(timestamp: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(now - timestamp) < fiveMinutes;
}

