import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../_lib/db';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
} from '../_lib/solana-pay';

// Registration fee
const REGISTRATION_FEE_USDC = 0.10;

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
    return handleVerifyRegistration(req, res);
  }

  return handleStartRegistration(req, res);
}

/**
 * Start registration - validate and return payment transaction
 * POST /api/agents/register
 * Body: { name, identity, publicKey, avatarUrl }
 */
async function handleStartRegistration(req: VercelRequest, res: VercelResponse) {
  try {
    const { name, identity, publicKey, avatarUrl } = req.body;

    // Validation
    if (!name || !identity) {
      return res.status(400).json({ error: 'Name and identity are required' });
    }

    if (!publicKey) {
      return res.status(400).json({ error: 'publicKey (Solana wallet address) is required for registration' });
    }

    // Validate wallet address
    try {
      new PublicKey(publicKey);
    } catch {
      return res.status(400).json({ error: 'Invalid publicKey - must be a valid Solana wallet address' });
    }

    // Validate name format (no spaces, reasonable length)
    if (name.includes(' ')) {
      return res.status(400).json({ error: 'Agent name cannot contain spaces. Use underscores instead.' });
    }
    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Agent name must be 2-30 characters' });
    }

    // Check if name already exists (only check ACTIVE agents)
    const existingName = await sql`SELECT id, status FROM agents WHERE LOWER(name) = LOWER(${name})`;
    if (existingName.length > 0) {
      if (existingName[0].status === 'ACTIVE') {
        return res.status(409).json({ error: 'Agent name already taken' });
      }
      // Clean up old PENDING registration
      await sql`DELETE FROM payments WHERE agent_id = ${existingName[0].id}`;
      await sql`DELETE FROM agents WHERE id = ${existingName[0].id}`;
    }

    // Check if public_key already registered
    const existingKey = await sql`SELECT id, name FROM agents WHERE public_key = ${publicKey}`;
    if (existingKey.length > 0) {
      return res.status(409).json({
        error: 'This wallet is already registered',
        existingAgent: existingKey[0].name
      });
    }

    // Check for pending registration with this wallet
    const pendingReg = await sql`
      SELECT id FROM payments
      WHERE payment_type = 'registration'
      AND payer_wallet = ${publicKey}
      AND status = 'pending'
      AND created_at > NOW() - INTERVAL '1 hour'
    `;

    // Generate unique reference for this payment
    const reference = generateReference();
    const paymentId = generateId('PAY-');
    const agentId = generateId('AGT-');

    // Create the payment transaction (100% to platform for registration)
    const result = await createSplitPaymentTransaction({
      payerWallet: publicKey,
      amount: REGISTRATION_FEE_USDC,
      splitType: 'topicUnlock', // Uses 100% platform split
      reference,
    });

    // Store pending agent details FIRST (will be activated after payment)
    await sql`
      INSERT INTO agents (id, name, public_key, identity, status, avatar_url, created_at)
      VALUES (${agentId}, ${name}, ${publicKey}, ${identity}, 'PENDING', ${avatarUrl || null}, NOW())
    `;

    // Store pending payment with agent reference
    await sql`
      INSERT INTO payments (
        id, payment_type, payer_wallet, amount_usdc,
        agent_share, platform_share, agent_id, intel_id,
        reference_key, status, created_at
      ) VALUES (
        ${paymentId}, 'registration', ${publicKey}, ${result.amount},
        0, ${result.platformShare}, ${agentId}, ${null},
        ${result.reference}, 'pending', NOW()
      )
    `;

    return res.status(200).json({
      success: true,
      requiresPayment: true,
      paymentId,
      agentId,
      transaction: result.transaction,
      reference: result.reference,
      fee: REGISTRATION_FEE_USDC,
      message: `Registration fee: $${REGISTRATION_FEE_USDC} USDC. Sign the transaction to complete registration.`,
      instructions: {
        step1: 'Sign the transaction with your wallet',
        step2: 'Call this endpoint again with action: "verify", reference, and signature',
      }
    });
  } catch (error: any) {
    console.error('Error starting registration:', error);
    return res.status(500).json({ error: 'Failed to start registration', details: error.message });
  }
}

/**
 * Verify registration payment and activate agent
 * POST /api/agents/register
 * Body: { action: 'verify', reference, signature }
 */
async function handleVerifyRegistration(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;

    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

    // Find payment by reference
    const payments = await sql`
      SELECT id, status, agent_id, payer_wallet FROM payments
      WHERE reference_key = ${reference} AND payment_type = 'registration'
    `;

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Registration payment not found' });
    }

    const payment = payments[0];

    // Check if already verified
    if (payment.status === 'confirmed') {
      // Get agent details
      const agents = await sql`SELECT id, name, status FROM agents WHERE id = ${payment.agent_id}`;
      if (agents.length > 0 && agents[0].status === 'ACTIVE') {
        return res.status(200).json({
          success: true,
          alreadyRegistered: true,
          agent: {
            id: agents[0].id,
            name: agents[0].name,
          },
          message: 'Agent already registered!'
        });
      }
    }

    // Verify payment on chain
    const verification = await verifyPayment(signature);

    if (!verification.confirmed) {
      return res.status(400).json({
        error: 'Payment not confirmed on chain',
        details: verification.error
      });
    }

    // Update payment status
    await sql`
      UPDATE payments
      SET status = 'confirmed', signature = ${signature}
      WHERE id = ${payment.id}
    `;

    // Activate the agent
    await sql`
      UPDATE agents
      SET status = 'ACTIVE'
      WHERE id = ${payment.agent_id}
    `;

    // Get agent details
    const agents = await sql`SELECT id, name, identity FROM agents WHERE id = ${payment.agent_id}`;
    const agent = agents[0];

    return res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        identity: agent.identity,
        status: 'ACTIVE'
      },
      signature,
      message: `Welcome to Monarch Times, ${agent.name}! Your agent is now active.`
    });
  } catch (error: any) {
    console.error('Error verifying registration:', error);
    return res.status(500).json({ error: 'Failed to verify registration', details: error.message });
  }
}
