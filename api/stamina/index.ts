import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, generateId } from '../_lib/db';
import { getAuthenticatedWallet } from '../_lib/auth';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
} from '../_lib/solana-pay';

const STAMINA_REFILL_PRICE_USDC = 1.00;
const MAX_STAMINA = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'create') {
      return handleCreatePayment(req, res);
    }

    if (action === 'verify') {
      return handleVerifyPayment(req, res);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCreatePayment(req: VercelRequest, res: VercelResponse) {
  try {
    const authWallet = await getAuthenticatedWallet(req);
    if (!authWallet) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agent
    const agents = await sql`SELECT id FROM agents WHERE public_key = ${authWallet}`;
    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const agentId = agents[0].id;

    const ref = generateReference();
    const paymentId = generateId('PAY-');

    // Create payment transaction (100% to platform)
    const result = await createSplitPaymentTransaction({
      payerWallet: authWallet,
      amount: STAMINA_REFILL_PRICE_USDC,
      splitType: 'topicUnlock', // Reuse existing 100% platform split type
      reference: ref,
    });

    // Store pending payment
    await sql`
      INSERT INTO payments (
        id, payment_type, payer_wallet, amount_usdc,
        agent_share, platform_share, agent_id,
        reference_key, status, created_at
      ) VALUES (
        ${paymentId}, 'stamina_refill', ${authWallet}, ${result.amount},
        0, ${result.platformShare}, ${agentId},
        ${result.reference}, 'pending', NOW()
      )
    `;

    return res.status(200).json({
      success: true,
      paymentId,
      transaction: result.transaction,
      reference: result.reference,
      message: `Refill Stamina for $${STAMINA_REFILL_PRICE_USDC} USDC`
    });

  } catch (error: any) {
    console.error('Error creating stamina payment:', error);
    return res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
}

async function handleVerifyPayment(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;
    
    if (!reference || !signature) {
      return res.status(400).json({ error: 'Missing reference or signature' });
    }

    // Find payment
    const payments = await sql`
      SELECT id, status, agent_id FROM payments 
      WHERE reference_key = ${reference} AND payment_type = 'stamina_refill'
    `;

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Check if already processed
    if (payment.status === 'confirmed') {
      return res.status(200).json({ success: true, message: 'Already confirmed' });
    }

    // Verify on-chain
    const verification = await verifyPayment(signature);
    if (!verification.confirmed) {
      return res.status(400).json({ error: 'Payment not confirmed on chain' });
    }

    // Update DB (Transaction)
    await sql.begin(async sql => {
      // 1. Update Payment
      await sql`
        UPDATE payments 
        SET status = 'confirmed', signature = ${signature}
        WHERE id = ${payment.id}
      `;

      // 2. Refill Stamina
      await sql`
        UPDATE agents
        SET stamina = ${MAX_STAMINA}, last_regen_at = NOW()
        WHERE id = ${payment.agent_id}
      `;
    });

    return res.status(200).json({
      success: true,
      stamina: MAX_STAMINA,
      message: 'Stamina fully recharged!'
    });

  } catch (error: any) {
    console.error('Error verifying stamina payment:', error);
    return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
}
