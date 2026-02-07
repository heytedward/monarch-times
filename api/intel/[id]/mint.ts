import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../../_lib/db';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
} from '../../_lib/solana-pay';
import { mintIntelAsCNFT } from '../../_lib/minting-service';
import { getExplorerUrl, getSolanaNetwork } from '../../_lib/solana-config';

// Mint fee configuration
const MINT_FEE_USDC = 0.50; // $0.50 USDC mint fee
// Split is now dynamic based on agent performance (70-90% to agent)

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

  const { id: intelId } = req.query;
  const { action } = req.body;

  if (!intelId || typeof intelId !== 'string') {
    return res.status(400).json({ error: 'Intel ID is required' });
  }

  // Route based on action
  if (action === 'pay-fee') {
    return handlePayFee(req, res, intelId);
  }

  if (action === 'verify-fee') {
    return handleVerifyFee(req, res, intelId);
  }

  if (action === 'complete-mint') {
    return handleCompleteMint(req, res, intelId);
  }

  // Default: start mint process (get fee transaction)
  return handleStartMint(req, res, intelId);
}

/**
 * Start mint process - return fee info
 * POST /api/intel/[id]/mint
 * Body: { walletAddress }
 */
async function handleStartMint(req: VercelRequest, res: VercelResponse, intelId: string) {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    // Validate wallet
    try {
      new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Get intel details with agent's average rating for performance-based split
    const intel = await sql`
      SELECT i.id, i.title, i.agent_id, a.name as agent_name, a.public_key as agent_wallet,
        COALESCE((
          SELECT AVG(r.rating)::numeric(10,2)
          FROM responses r
          JOIN intel i2 ON r.intel_id = i2.id
          WHERE i2.agent_id = a.id
        ), 0) as agent_avg_rating
      FROM intel i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ${intelId}
    `;

    if (intel.length === 0) {
      return res.status(404).json({ error: 'Intel not found' });
    }

    const intelData = intel[0];

    // Check if already minted by this wallet
    const existingMint = await sql`
      SELECT id FROM minted_intel
      WHERE intel_id = ${intelId} AND minter_address = ${walletAddress}
    `;

    if (existingMint.length > 0) {
      return res.status(400).json({
        error: 'Already minted',
        message: 'You have already minted this intel'
      });
    }

    // Generate reference for fee payment
    const reference = generateReference();
    const paymentId = generateId('PAY-');

    // Create fee transaction with performance-based split
    const agentAvgRating = parseFloat(intelData.agent_avg_rating) || 0;
    const feeResult = await createSplitPaymentTransaction({
      payerWallet: walletAddress,
      agentWallet: intelData.agent_wallet,
      amount: MINT_FEE_USDC,
      splitType: 'mintFee',
      reference,
      agentAvgRating,
    });

    // Store pending payment
    await sql`
      INSERT INTO payments (
        id, payment_type, payer_wallet, amount_usdc,
        agent_share, platform_share, agent_id, intel_id,
        reference_key, status, created_at
      ) VALUES (
        ${paymentId}, 'mint_fee', ${walletAddress}, ${feeResult.amount},
        ${feeResult.agentShare}, ${feeResult.platformShare},
        ${intelData.agent_id}, ${intelId},
        ${feeResult.reference}, 'pending', NOW()
      )
    `;

    const agentPercent = Math.round((feeResult.agentShare / MINT_FEE_USDC) * 100);

    return res.status(200).json({
      success: true,
      requiresFee: true,
      paymentId,
      transaction: feeResult.transaction,
      reference: feeResult.reference,
      fee: {
        total: MINT_FEE_USDC,
        agentShare: feeResult.agentShare,
        platformShare: feeResult.platformShare,
      },
      intel: {
        id: intelData.id,
        title: intelData.title,
        agentName: intelData.agent_name,
        agentRating: agentAvgRating,
      },
      message: `Mint fee: $${MINT_FEE_USDC} USDC (${agentPercent}% to ${intelData.agent_name}${agentAvgRating >= 3 ? ' ⭐' : ''})`,
    });
  } catch (error: any) {
    console.error('Error starting mint:', error);
    return res.status(500).json({ error: 'Failed to start mint', details: error.message });
  }
}

/**
 * Verify fee payment and prepare for mint
 * POST /api/intel/[id]/mint
 * Body: { action: 'verify-fee', reference, signature }
 */
async function handleVerifyFee(req: VercelRequest, res: VercelResponse, intelId: string) {
  try {
    const { reference, signature } = req.body;

    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

    // Find payment
    const payments = await sql`
      SELECT id, status, payer_wallet FROM payments
      WHERE reference_key = ${reference} AND intel_id = ${intelId}
    `;

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    if (payment.status === 'confirmed') {
      return res.status(200).json({
        success: true,
        paymentId: payment.id,
        readyToMint: true,
        message: 'Fee confirmed. Ready to mint!'
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

    // Update payment
    await sql`
      UPDATE payments
      SET status = 'confirmed', signature = ${signature}
      WHERE id = ${payment.id}
    `;

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      readyToMint: true,
      walletAddress: payment.payer_wallet,
      message: 'Fee confirmed! Proceeding to mint...',
    });
  } catch (error: any) {
    console.error('Error verifying fee:', error);
    return res.status(500).json({ error: 'Failed to verify fee', details: error.message });
  }
}

/**
 * Complete the NFT mint after fee is paid
 * POST /api/intel/[id]/mint
 * Body: { action: 'complete-mint', paymentId, walletAddress }
 */
async function handleCompleteMint(req: VercelRequest, res: VercelResponse, intelId: string) {
  try {
    const { paymentId, walletAddress } = req.body;

    if (!paymentId || !walletAddress) {
      return res.status(400).json({ error: 'paymentId and walletAddress are required' });
    }

    // Verify payment is confirmed
    const payments = await sql`
      SELECT id, status FROM payments WHERE id = ${paymentId} AND status = 'confirmed'
    `;

    if (payments.length === 0) {
      return res.status(400).json({ error: 'Fee payment not confirmed' });
    }

    // Get intel details
    const intel = await sql`
      SELECT i.*, a.name as agent_name
      FROM intel i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ${intelId}
    `;

    if (intel.length === 0) {
      return res.status(404).json({ error: 'Intel not found' });
    }

    const intelData = intel[0];

    // Check if already minted
    const existingMint = await sql`
      SELECT mint_address, status FROM minted_intel
      WHERE intel_id = ${intelId} AND minter_address = ${walletAddress}
    `;

    if (existingMint.length > 0 && existingMint[0].status === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        alreadyMinted: true,
        mintAddress: existingMint[0].mint_address,
        message: 'Already minted!',
        explorerUrl: getExplorerUrl(existingMint[0].mint_address),
      });
    }

    // Create pending mint record if not exists
    const mintId = generateId('MNT-');
    if (existingMint.length === 0) {
      await sql`
        INSERT INTO minted_intel (id, intel_id, minter_address, price_paid, status, created_at)
        VALUES (${mintId}, ${intelId}, ${walletAddress}, ${MINT_FEE_USDC}, 'PENDING', NOW())
      `;
    }

    // Get agent details for minting
    const agentDetails = await sql`
      SELECT a.name, a.public_key,
        COALESCE((
          SELECT AVG(r.rating)::numeric(10,2)
          FROM responses r
          JOIN intel i2 ON r.intel_id = i2.id
          WHERE i2.agent_id = a.id
        ), 0) as avg_rating
      FROM agents a
      WHERE a.id = ${intelData.agent_id}
    `;

    const agent = agentDetails[0];

    // Mint intel as cNFT using Bubblegum
    const mintResult = await mintIntelAsCNFT({
      intelId,
      title: intelData.title,
      content: intelData.content || '',
      topicName: intelData.topic_name || 'GENERAL',
      agentName: agent?.name || intelData.agent_name,
      agentPublicKey: agent?.public_key || '',
      agentAvgRating: parseFloat(agent?.avg_rating) || 0,
      ownerWallet: walletAddress,
      minterAddress: walletAddress,
      pricePaid: MINT_FEE_USDC,
    });

    if (!mintResult.success) {
      return res.status(500).json({
        error: 'Minting failed',
        details: mintResult.error,
      });
    }

    const network = getSolanaNetwork();

    return res.status(200).json({
      success: true,
      mintId,
      mintAddress: mintResult.mintAddress,
      signature: mintResult.signature,
      intel: {
        id: intelData.id,
        title: intelData.title,
        agentName: intelData.agent_name,
      },
      message: `Successfully minted "${intelData.title}" by ${intelData.agent_name} as cNFT!`,
      explorerUrl: getExplorerUrl(mintResult.mintAddress!),
      network,
    });
  } catch (error: any) {
    console.error('Error completing mint:', error);
    return res.status(500).json({ error: 'Failed to complete mint', details: error.message });
  }
}

/**
 * Legacy handler for simple mint (combines fee + mint for backward compatibility)
 * This creates a pending state and returns instructions
 */
async function handlePayFee(req: VercelRequest, res: VercelResponse, intelId: string) {
  // Redirect to start mint flow
  return handleStartMint(req, res, intelId);
}
