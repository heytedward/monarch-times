import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../_lib/db';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
  PAYMENT_AMOUNTS,
} from '../_lib/solana-pay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  // Route to appropriate handler
  if (action === 'verify') {
    return handleVerify(req, res);
  }

  return handleCreateTip(req, res);
}

/**
 * Create a tip transaction
 * POST /api/payments/tip
 * Body: { agentId, intelId?, tipperWallet }
 */
async function handleCreateTip(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId, intelId, tipperWallet } = req.body;

    // Validation
    if (!agentId || !tipperWallet) {
      return res.status(400).json({ error: 'agentId and tipperWallet are required' });
    }

    // Validate wallet address
    try {
      new PublicKey(tipperWallet);
    } catch {
      return res.status(400).json({ error: 'Invalid tipperWallet address' });
    }

    // Get agent with their wallet
    const agents = await sql`
      SELECT id, name, public_key FROM agents WHERE id = ${agentId}
    `;

    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agents[0];

    // If intelId provided, verify it exists and belongs to agent
    if (intelId) {
      const intel = await sql`
        SELECT id FROM intel WHERE id = ${intelId} AND agent_id = ${agentId}
      `;
      if (intel.length === 0) {
        return res.status(404).json({ error: 'Intel not found or does not belong to agent' });
      }
    }

    // Generate unique reference for this payment
    const reference = generateReference();
    const paymentId = generateId('PAY-');

    // Create the split payment transaction
    const result = await createSplitPaymentTransaction({
      payerWallet: tipperWallet,
      agentWallet: agent.public_key,
      amount: PAYMENT_AMOUNTS.tip,
      splitType: 'tip',
      reference,
    });

    // Store pending payment in database
    await sql`
      INSERT INTO payments (
        id, payment_type, payer_wallet, amount_usdc,
        agent_share, platform_share, agent_id, intel_id,
        reference_key, status, created_at
      ) VALUES (
        ${paymentId}, 'tip', ${tipperWallet}, ${result.amount},
        ${result.agentShare}, ${result.platformShare}, ${agentId}, ${intelId || null},
        ${result.reference}, 'pending', NOW()
      )
    `;

    return res.status(200).json({
      success: true,
      paymentId,
      transaction: result.transaction,
      reference: result.reference,
      amount: result.amount,
      agentShare: result.agentShare,
      platformShare: result.platformShare,
      message: `Tip ${agent.name}: $${result.amount} USDC (${result.agentShare} to agent, ${result.platformShare} to platform)`,
    });
  } catch (error: any) {
    console.error('Error creating tip transaction:', error);
    return res.status(500).json({
      error: 'Failed to create tip transaction',
      details: error.message
    });
  }
}

/**
 * Verify a tip payment
 * POST /api/payments/tip
 * Body: { action: 'verify', reference, signature }
 */
async function handleVerify(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;

    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

    // Find payment by reference
    const payments = await sql`
      SELECT id, status FROM payments WHERE reference_key = ${reference}
    `;

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    if (payment.status === 'confirmed') {
      return res.status(200).json({
        success: true,
        paymentId: payment.id,
        message: 'Payment already confirmed'
      });
    }

    // Verify on chain
    const verification = await verifyPayment(signature);

    if (!verification.confirmed) {
      return res.status(400).json({
        error: 'Payment not confirmed',
        details: verification.error
      });
    }

    // Update payment status
    await sql`
      UPDATE payments
      SET status = 'confirmed', signature = ${signature}
      WHERE id = ${payment.id}
    `;

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      signature,
      message: 'Tip confirmed! Thank you for supporting this agent.',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      error: 'Failed to verify payment',
      details: error.message
    });
  }
}
