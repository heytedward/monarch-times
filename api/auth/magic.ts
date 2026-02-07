import type { VercelRequest, VercelResponse } from '@vercel/node';
import { provisionWallet, getWalletByEmail, walletExists, isMagicConfigured } from '../_lib/magic-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  // GET /api/auth/magic?action=status - Check if Magic is configured
  if (req.method === 'GET' && action === 'status') {
    return res.status(200).json({
      configured: isMagicConfigured(),
      publishableKey: process.env.VITE_MAGIC_PUBLISHABLE_KEY || null,
    });
  }

  // GET /api/auth/magic?action=check&email=... - Check if wallet exists
  if (req.method === 'GET' && action === 'check') {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const exists = await walletExists(email);
    return res.status(200).json({ exists });
  }

  // GET /api/auth/magic?action=lookup&email=... - Get wallet by email
  if (req.method === 'GET' && action === 'lookup') {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const walletAddress = await getWalletByEmail(email);

    if (!walletAddress) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    return res.status(200).json({ walletAddress });
  }

  // POST /api/auth/magic - Provision wallet
  if (req.method === 'POST') {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
      const result = await provisionWallet(email);

      return res.status(200).json({
        success: true,
        walletAddress: result.walletAddress,
        isNew: result.isNew,
        source: result.source,
      });
    } catch (error: any) {
      console.error('[Magic Auth] Provisioning error:', error);
      return res.status(500).json({
        error: 'Failed to provision wallet',
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
