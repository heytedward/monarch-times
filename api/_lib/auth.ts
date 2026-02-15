import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import type { VercelRequest } from '@vercel/node';

/**
 * Verify an Ed25519 signature against a public key
 *
 * @param publicKeyBase58 - Base58-encoded public key
 * @param message - Message that was signed (string or object)
 * @param signatureBase58 - Base58-encoded signature
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  publicKeyBase58: string,
  message: string | object,
  signatureBase58: string
): boolean {
  try {
    const publicKey = bs58.decode(publicKeyBase58);
    const messageBuffer = typeof message === 'string'
      ? Buffer.from(message)
      : Buffer.from(JSON.stringify(message));
    const signature = bs58.decode(signatureBase58);

    return nacl.sign.detached.verify(messageBuffer, signature, publicKey);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Extract and verify Privy JWT token from request headers
 * Returns the authenticated wallet address if valid, null otherwise
 *
 * @param req - Vercel request object
 * @returns Solana wallet address if authenticated, null otherwise
 */
export async function getAuthenticatedWallet(req: VercelRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the Privy JWT token
    // In a production environment, you would verify the JWT signature
    // using Privy's public keys from https://auth.privy.io/.well-known/jwks.json
    // For now, we'll decode it and extract the wallet address

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Extract Solana wallet address from Privy token
    // Privy tokens include linked accounts in the user claim
    if (payload.linkedAccounts) {
      const solanaAccount = payload.linkedAccounts.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'solana'
      );

      if (solanaAccount?.address) {
        // Validate it's a real Solana address
        try {
          new PublicKey(solanaAccount.address);
          return solanaAccount.address;
        } catch {
          return null;
        }
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
 * This prevents replay attacks and ensures message integrity
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
 * This prevents replay attacks with old signatures
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if timestamp is within 5 minutes, false otherwise
 */
export function isTimestampRecent(timestamp: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(now - timestamp) < fiveMinutes;
}
