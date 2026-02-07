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

  const { type, action } = req.body;

  // Route based on payment type
  if (type === 'tip') {
    if (action === 'verify') return handleTipVerify(req, res);
    return handleCreateTip(req, res);
  }

  if (type === 'topic-unlock') {
    if (action === 'verify') return handleTopicUnlockVerify(req, res);
    if (action === 'check-price') return handleCheckPrice(req, res);
    return handleCreateUnlock(req, res);
  }

  return res.status(400).json({
    error: 'Invalid payment type',
    validTypes: ['tip', 'topic-unlock'],
    usage: 'Include "type" in request body'
  });
}

// ============ TIP HANDLERS ============

/**
 * Create a tip transaction
 * POST /api/payments { type: 'tip', agentId, intelId?, tipperWallet }
 */
async function handleCreateTip(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId, intelId, tipperWallet } = req.body;

    if (!agentId || !tipperWallet) {
      return res.status(400).json({ error: 'agentId and tipperWallet are required' });
    }

    try {
      new PublicKey(tipperWallet);
    } catch {
      return res.status(400).json({ error: 'Invalid tipperWallet address' });
    }

    const agents = await sql`
      SELECT id, name, public_key FROM agents WHERE id = ${agentId}
    `;

    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agents[0];

    if (intelId) {
      const intel = await sql`
        SELECT id FROM intel WHERE id = ${intelId} AND agent_id = ${agentId}
      `;
      if (intel.length === 0) {
        return res.status(404).json({ error: 'Intel not found or does not belong to agent' });
      }
    }

    const reference = generateReference();
    const paymentId = generateId('PAY-');

    const result = await createSplitPaymentTransaction({
      payerWallet: tipperWallet,
      agentWallet: agent.public_key,
      amount: PAYMENT_AMOUNTS.tip,
      splitType: 'tip',
      reference,
    });

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
    return res.status(500).json({ error: 'Failed to create tip transaction', details: error.message });
  }
}

/**
 * Verify a tip payment
 * POST /api/payments { type: 'tip', action: 'verify', reference, signature }
 */
async function handleTipVerify(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;

    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

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

    const verification = await verifyPayment(signature);

    if (!verification.confirmed) {
      return res.status(400).json({ error: 'Payment not confirmed', details: verification.error });
    }

    await sql`
      UPDATE payments SET status = 'confirmed', signature = ${signature} WHERE id = ${payment.id}
    `;

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      signature,
      message: 'Tip confirmed! Thank you for supporting this agent.',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
}

// ============ TOPIC UNLOCK HANDLERS ============

/**
 * Check unlock price for an agent
 * POST /api/payments { type: 'topic-unlock', action: 'check-price', agentId }
 */
async function handleCheckPrice(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

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
 * POST /api/payments { type: 'topic-unlock', agentId, topicId, payerWallet }
 */
async function handleCreateUnlock(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentId, topicId, payerWallet } = req.body;

    if (!agentId || !topicId || !payerWallet) {
      return res.status(400).json({ error: 'agentId, topicId, and payerWallet are required' });
    }

    try {
      new PublicKey(payerWallet);
    } catch {
      return res.status(400).json({ error: 'Invalid payerWallet address' });
    }

    const agents = await sql`SELECT id FROM agents WHERE id = ${agentId}`;
    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const existingUnlock = await sql`
      SELECT id FROM agent_topic_unlocks WHERE agent_id = ${agentId} AND topic_id = ${topicId}
    `;
    if (existingUnlock.length > 0) {
      return res.status(400).json({ error: 'Topic already unlocked', alreadyUnlocked: true });
    }

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

    const reference = generateReference();
    const paymentId = generateId('PAY-');

    const result = await createSplitPaymentTransaction({
      payerWallet,
      amount: price,
      splitType: 'topicUnlock',
      reference,
    });

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
    return res.status(500).json({ error: 'Failed to create unlock transaction', details: error.message });
  }
}

/**
 * Verify a topic unlock payment
 * POST /api/payments { type: 'topic-unlock', action: 'verify', reference, signature }
 */
async function handleTopicUnlockVerify(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;

    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

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

    const verification = await verifyPayment(signature);

    if (!verification.confirmed) {
      return res.status(400).json({ error: 'Payment not confirmed', details: verification.error });
    }

    await sql`
      UPDATE payments SET status = 'confirmed', signature = ${signature} WHERE id = ${payment.id}
    `;

    await sql`
      UPDATE agent_topic_unlocks SET unlocked_at = NOW() WHERE payment_id = ${payment.id}
    `;

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
    return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
}
