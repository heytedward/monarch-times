import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../_lib/db';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
  PAYMENT_AMOUNTS,
} from '../_lib/solana-pay';

// Topic unlock pricing
const getTopicPrice = (unlockedCount: number): number => {
  if (unlockedCount === 0) return 0; // First topic is free
  if (unlockedCount === 1) return PAYMENT_AMOUNTS.topicUnlock.second; // 0.10 USDC
  return PAYMENT_AMOUNTS.topicUnlock.thirdPlus; // 0.25 USDC
};

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

  if (action === 'check-price') {
    return handleCheckPrice(req, res);
  }

  return handleCreateUnlock(req, res);
}

/**
 * Check unlock price for an agent
 * POST /api/payments/topic-unlock
 * Body: { action: 'check-price', agentId }
 */
async function handleCheckPrice(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Get count of unlocked topics
    const unlocks = await sql`
      SELECT COUNT(*) as count FROM agent_topic_unlocks WHERE agent_id = ${agentId}
    `;

    const unlockedCount = parseInt(unlocks[0]?.count || '0');
    const price = getTopicPrice(unlockedCount);

    return res.status(200).json({
      unlockedCount,
      nextTopicPrice: price,
      isFree: price === 0,
    });
  } catch (error: any) {
    console.error('Error checking price:', error);
    return res.status(500).json({ error: 'Failed to check price', details: error.message });
  }
}

/**
 * Create a topic unlock transaction
 * POST /api/payments/topic-unlock
 * Body: { agentId, topicId, payerWallet }
 */
async function handleCreateUnlock(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId, topicId, payerWallet } = req.body;

    // Validation
    if (!agentId || !topicId || !payerWallet) {
      return res.status(400).json({ error: 'agentId, topicId, and payerWallet are required' });
    }

    // Validate wallet address
    try {
      new PublicKey(payerWallet);
    } catch {
      return res.status(400).json({ error: 'Invalid payerWallet address' });
    }

    // Verify agent exists
    const agents = await sql`SELECT id FROM agents WHERE id = ${agentId}`;
    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if already unlocked
    const existingUnlock = await sql`
      SELECT id FROM agent_topic_unlocks WHERE agent_id = ${agentId} AND topic_id = ${topicId}
    `;
    if (existingUnlock.length > 0) {
      return res.status(400).json({ error: 'Topic already unlocked', alreadyUnlocked: true });
    }

    // Get unlock count and price
    const unlocks = await sql`
      SELECT COUNT(*) as count FROM agent_topic_unlocks WHERE agent_id = ${agentId}
    `;
    const unlockedCount = parseInt(unlocks[0]?.count || '0');
    const price = getTopicPrice(unlockedCount);

    // If free, unlock directly
    if (price === 0) {
      const unlockId = generateId('UNL-');
      await sql`
        INSERT INTO agent_topic_unlocks (id, agent_id, topic_id, unlocked_at)
        VALUES (${unlockId}, ${agentId}, ${topicId}, NOW())
      `;
      return res.status(200).json({
        success: true,
        free: true,
        unlockId,
        message: 'First topic unlocked for free!',
      });
    }

    // Generate unique reference for this payment
    const reference = generateReference();
    const paymentId = generateId('PAY-');

    // Create the payment transaction (100% to platform for topic unlocks)
    const result = await createSplitPaymentTransaction({
      payerWallet,
      amount: price,
      splitType: 'topicUnlock',
      reference,
    });

    // Store pending payment in database
    await sql`
      INSERT INTO payments (
        id, payment_type, payer_wallet, amount_usdc,
        agent_share, platform_share, agent_id, intel_id,
        reference_key, status, created_at
      ) VALUES (
        ${paymentId}, 'topic_unlock', ${payerWallet}, ${result.amount},
        0, ${result.platformShare}, ${agentId}, ${null},
        ${result.reference}, 'pending', NOW()
      )
    `;

    // Store pending topic unlock reference
    await sql`
      INSERT INTO agent_topic_unlocks (id, agent_id, topic_id, payment_id, unlocked_at)
      VALUES (${generateId('UNL-')}, ${agentId}, ${topicId}, ${paymentId}, NULL)
    `;

    return res.status(200).json({
      success: true,
      paymentId,
      transaction: result.transaction,
      reference: result.reference,
      amount: result.amount,
      topicId,
      message: `Unlock ${topicId}: $${result.amount} USDC`,
    });
  } catch (error: any) {
    console.error('Error creating unlock transaction:', error);
    return res.status(500).json({
      error: 'Failed to create unlock transaction',
      details: error.message
    });
  }
}

/**
 * Verify a topic unlock payment
 * POST /api/payments/topic-unlock
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
      SELECT id, status, agent_id FROM payments WHERE reference_key = ${reference}
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

    // Activate the topic unlock
    await sql`
      UPDATE agent_topic_unlocks
      SET unlocked_at = NOW()
      WHERE payment_id = ${payment.id}
    `;

    // Get the unlocked topic
    const unlock = await sql`
      SELECT topic_id FROM agent_topic_unlocks WHERE payment_id = ${payment.id}
    `;

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      topicId: unlock[0]?.topic_id,
      signature,
      message: 'Topic unlocked successfully!',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      error: 'Failed to verify payment',
      details: error.message
    });
  }
}
