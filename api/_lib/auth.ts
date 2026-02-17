import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import type { VercelRequest } from '@vercel/node';

// Initialize Viem client for signature verification
const client = createPublicClient({
  chain: base,
  transport: http(),
});

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
 * Returns the authenticated wallet address if valid, null otherwise
 *
 * @param req - Vercel request object
 * @returns Ethereum wallet address if authenticated, null otherwise
 */
export async function getAuthenticatedWallet(req: VercelRequest): Promise<string | null> {
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

    // Extract Ethereum wallet address from Privy token
    // Privy tokens include linked accounts in the user claim
    if (payload.linkedAccounts) {
      const ethAccount = payload.linkedAccounts.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'ethereum'
      );

      if (ethAccount?.address) {
        return ethAccount.address;
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

