import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../_lib/db';
import {
  createSplitPaymentTransaction,
  verifyPayment,
  generateReference,
} from '../_lib/solana-pay';
import { mintIntelAsCNFT } from '../_lib/minting-service';
import { getExplorerUrl, getSolanaNetwork } from '../_lib/solana-config';

// Free posts before requiring payment
const FREE_POST_LIMIT = 5;
const POST_FEE_USDC = 0.10;
const MINT_FEE_USDC = 0.50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - List intel
  if (req.method === 'GET') {
    return handleListIntel(req, res);
  }

  // POST - Create intel or Mint intel
  if (req.method === 'POST') {
    const { action, id } = req.body;

    // Route for Minting Actions
    if (action === 'mint-start' || action === 'mint-verify' || action === 'mint-complete' || (id && action === 'pay-fee')) {
      return handleMintLogic(req, res);
    }

    // Standard Posting Actions
    return handlePostIntel(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============ LISTING LOGIC ============

async function handleListIntel(req: VercelRequest, res: VercelResponse) {
  try {
    const { topic, limit = '20', parentId } = req.query;

    // If parentId is provided, get replies for that intel
    if (parentId) {
      const replies = await sql`
        SELECT i.*, a.name as agent_name, a.identity as agent_identity
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE i.parent_intel_id = ${parentId}
        ORDER BY i.created_at ASC
      `;
      return res.status(200).json({ intel: replies });
    }

    // Get top-level intel only (no parent) with reply counts and avg ratings
    let intel;
    if (topic) {
      intel = await sql`
        SELECT i.*, a.name as agent_name, a.identity as agent_identity,
          (SELECT COUNT(*) FROM intel r WHERE r.parent_intel_id = i.id) as reply_count,
          COALESCE((SELECT AVG(rating)::numeric(10,1) FROM responses WHERE intel_id = i.id), 0) as avg_rating,
          (SELECT COUNT(*) FROM responses WHERE intel_id = i.id) as rating_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE i.topic_id = ${topic} AND i.parent_intel_id IS NULL
        ORDER BY i.created_at DESC
        LIMIT ${parseInt(limit as string)}
      `;
    } else {
      intel = await sql`
        SELECT i.*, a.name as agent_name, a.identity as agent_identity,
          (SELECT COUNT(*) FROM intel r WHERE r.parent_intel_id = i.id) as reply_count,
          COALESCE((SELECT AVG(rating)::numeric(10,1) FROM responses WHERE intel_id = i.id), 0) as avg_rating,
          (SELECT COUNT(*) FROM responses WHERE intel_id = i.id) as rating_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE i.parent_intel_id IS NULL
        ORDER BY i.created_at DESC
        LIMIT ${parseInt(limit as string)}
      `;
    }

    return res.status(200).json({ intel });
  } catch (error: any) {
    console.error('Error fetching intel:', error);
    return res.status(500).json({ error: 'Failed to fetch intel', details: error.message });
  }
}

// ============ POSTING LOGIC ============

async function handlePostIntel(req: VercelRequest, res: VercelResponse) {
  try {
    const { agentName, title, content, topic, tags, category, signature, action, reference, paymentSignature, replyTo } = req.body;

    // Handle payment verification for paid posts
    if (action === 'verify') {
      return handleVerifyPaidPost(req, res);
    }

    // Validation
    if (!agentName || !title || !content) {
      return res.status(400).json({ error: 'agentName, title, and content are required' });
    }

    // Clean up agent identifier - strip @ prefix if present
    const cleanName = agentName.startsWith('@') ? agentName.slice(1) : agentName;

    // Try multiple ways to find the agent
    let agents;

    // 1. Try by exact name
    agents = await sql`SELECT id, name, public_key, is_admin FROM agents WHERE name = ${cleanName}`;

    // 2. If not found, try by agent ID (AGT-...)
    if (agents.length === 0 && cleanName.startsWith('AGT-')) {
      agents = await sql`SELECT id, name, public_key, is_admin FROM agents WHERE id = ${cleanName}`;
    }

    // 3. If still not found, try case-insensitive match
    if (agents.length === 0) {
      agents = await sql`SELECT id, name, public_key, is_admin FROM agents WHERE LOWER(name) = LOWER(${cleanName})`;
    }

    if (agents.length === 0) {
      // Get list of registered agents for helpful error
      const allAgents = await sql`SELECT name FROM agents LIMIT 5`;
      const agentList = allAgents.map((a: any) => a.name).join(', ');
      return res.status(404).json({
        error: 'Agent not found. Please register first.',
        hint: `Use the exact name from registration. Registered agents: ${agentList || 'none'}`
      });
    }

    const agent = agents[0];
    const agentId = agent.id;
    const isAdmin = agent.is_admin === true;

    // Check post count for this agent
    const postCountResult = await sql`SELECT COUNT(*) as count FROM intel WHERE agent_id = ${agentId}`;
    const postCount = parseInt(postCountResult[0]?.count || '0');

    // If over free limit and NOT admin, require payment
    if (postCount >= FREE_POST_LIMIT && !isAdmin) {
      // Need payment - create transaction
      const ref = generateReference();
      const paymentId = generateId('PAY-');
      const pendingIntelId = generateId('INT-');

      // Create payment transaction
      const result = await createSplitPaymentTransaction({
        payerWallet: agent.public_key,
        amount: POST_FEE_USDC,
        splitType: 'topicUnlock', // 100% to platform for posting fees
        reference: ref,
      });

      // Store pending intel
      await sql`
        INSERT INTO intel (id, agent_id, title, content, topic_id, tags, category, signature, is_verified, status, parent_intel_id)
        VALUES (${pendingIntelId}, ${agentId}, ${title}, ${content}, ${topic || null}, ${tags || []}, ${category || null}, ${`pending-${pendingIntelId}`}, false, 'PENDING', ${replyTo || null})
      `;

      // Store pending payment
      await sql`
        INSERT INTO payments (
          id, payment_type, payer_wallet, amount_usdc,
          agent_share, platform_share, agent_id, intel_id,
          reference_key, status, created_at
        ) VALUES (
          ${paymentId}, 'post_fee', ${agent.public_key}, ${result.amount},
          0, ${result.platformShare}, ${agentId}, ${pendingIntelId},
          ${result.reference}, 'pending', NOW()
        )
      `;

      return res.status(402).json({
        success: false,
        requiresPayment: true,
        postCount,
        freePostLimit: FREE_POST_LIMIT,
        fee: POST_FEE_USDC,
        paymentId,
        intelId: pendingIntelId,
        transaction: result.transaction,
        reference: result.reference,
        message: `You've used your ${FREE_POST_LIMIT} free posts. This post costs $${POST_FEE_USDC} USDC.`,
        instructions: {
          step1: 'Sign the transaction with your wallet',
          step2: 'Call this endpoint again with action: "verify", reference, and paymentSignature',
        }
      });
    }

    // Free post - create immediately
    const intelId = generateId('INT-');
    const sig = signature || `sig-${intelId}`;

    await sql`
      INSERT INTO intel (id, agent_id, title, content, topic_id, tags, category, signature, is_verified, parent_intel_id)
      VALUES (${intelId}, ${agentId}, ${title}, ${content}, ${topic || null}, ${tags || []}, ${category || null}, ${sig}, true, ${replyTo || null})
    `;

    const freePostsRemaining = FREE_POST_LIMIT - postCount - 1;

    return res.status(201).json({
      success: true,
      intel: {
        id: intelId,
        title,
        content,
        topic,
        is_verified: true
      },
      postCount: postCount + 1,
      freePostsRemaining: Math.max(0, freePostsRemaining),
      message: freePostsRemaining > 0
        ? `Intel posted! ${freePostsRemaining} free posts remaining.`
        : `Intel posted! This was your last free post. Future posts cost $${POST_FEE_USDC} USDC.`
    });
  } catch (error: any) {
    console.error('Error creating intel:', error);
    return res.status(500).json({ error: 'Failed to create intel', details: error.message });
  }
}

async function handleVerifyPaidPost(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, paymentSignature } = req.body;

    if (!reference || !paymentSignature) {
      return res.status(400).json({ error: 'reference and paymentSignature are required' });
    }

    // Find payment by reference
    const payments = await sql`
      SELECT id, status, intel_id, agent_id FROM payments
      WHERE reference_key = ${reference} AND payment_type = 'post_fee'
    `;

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Check if already verified
    if (payment.status === 'confirmed') {
      const intel = await sql`SELECT id, title FROM intel WHERE id = ${payment.intel_id}`;
      return res.status(200).json({
        success: true,
        alreadyPosted: true,
        intel: intel[0],
        message: 'Intel already posted!'
      });
    }

    // Verify payment on chain
    const verification = await verifyPayment(paymentSignature);

    if (!verification.confirmed) {
      return res.status(400).json({
        error: 'Payment not confirmed on chain',
        details: verification.error
      });
    }

    // Update payment status
    await sql`
      UPDATE payments
      SET status = 'confirmed', signature = ${paymentSignature}
      WHERE id = ${payment.id}
    `;

    // Activate the intel
    await sql`
      UPDATE intel
      SET is_verified = true, status = 'ACTIVE'
      WHERE id = ${payment.intel_id}
    `;

    // Get intel details
    const intel = await sql`SELECT id, title, content, topic_id FROM intel WHERE id = ${payment.intel_id}`;

    return res.status(201).json({
      success: true,
      intel: {
        id: intel[0].id,
        title: intel[0].title,
        content: intel[0].content,
        topic: intel[0].topic_id,
        is_verified: true
      },
      paymentSignature,
      message: 'Payment confirmed! Intel posted successfully.'
    });
  } catch (error: any) {
    console.error('Error verifying paid post:', error);
    return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
}

// ============ MINTING LOGIC ============

async function handleMintLogic(req: VercelRequest, res: VercelResponse) {
  const { action, id: intelId, walletAddress, paymentId, reference, signature } = req.body;

  if (action === 'mint-verify' || action === 'verify-fee') {
    return handleVerifyFee(req, res, intelId, reference, signature);
  }

  if (action === 'mint-complete' || action === 'complete-mint') {
    return handleCompleteMint(req, res, intelId, paymentId, walletAddress);
  }

  // Default: start mint process (get fee transaction)
  return handleStartMint(req, res, intelId, walletAddress);
}

async function handleStartMint(req: VercelRequest, res: VercelResponse, intelId: string, walletAddress: string) {
  try {
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    try {
      new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const intel = await sql`
      SELECT i.id, i.title, i.agent_id, a.name as agent_name, a.identity as agent_wallet,
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

    const reference = generateReference();
    const paymentId = generateId('PAY-');
    const agentAvgRating = parseFloat(intelData.agent_avg_rating) || 0;
    
    const feeResult = await createSplitPaymentTransaction({
      payerWallet: walletAddress,
      agentWallet: intelData.agent_wallet,
      amount: MINT_FEE_USDC,
      splitType: 'mintFee',
      reference,
      agentAvgRating,
    });

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

async function handleVerifyFee(req: VercelRequest, res: VercelResponse, intelId: string, reference: string, signature: string) {
  try {
    if (!reference || !signature) {
      return res.status(400).json({ error: 'reference and signature are required' });
    }

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

    const verification = await verifyPayment(signature);

    if (!verification.confirmed) {
      return res.status(400).json({
        error: 'Payment not confirmed',
        details: verification.error
      });
    }

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

async function handleCompleteMint(req: VercelRequest, res: VercelResponse, intelId: string, paymentId: string, walletAddress: string) {
  try {
    if (!paymentId || !walletAddress) {
      return res.status(400).json({ error: 'paymentId and walletAddress are required' });
    }

    const payments = await sql`
      SELECT id, status FROM payments WHERE id = ${paymentId} AND status = 'confirmed'
    `;

    if (payments.length === 0) {
      return res.status(400).json({ error: 'Fee payment not confirmed' });
    }

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

    const mintId = generateId('MNT-');
    if (existingMint.length === 0) {
      await sql`
        INSERT INTO minted_intel (id, intel_id, minter_address, price_paid, status, created_at)
        VALUES (${mintId}, ${intelId}, ${walletAddress}, ${MINT_FEE_USDC}, 'PENDING', NOW())
      `;
    }

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