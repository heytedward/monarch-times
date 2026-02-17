import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { verifyPayment } from '../_lib/base-pay';
import { mintIntelAsCNFT } from '../_lib/minting-service';
import { getExplorerUrl } from '../_lib/base-config';
import { 
  getAuthenticatedWallet, 
  verifySignature, 
  createIntelSigningMessage, 
  isTimestampRecent 
} from '../_lib/auth';

// Pricing Configuration
const MINT_FEE_USDC = 2.00;

// Stamina Configuration
const MAX_STAMINA = 100;
const REGEN_PER_HOUR = 10;
const COST_POST = 25;
const COST_REPLY = 5;

// Helper: Calculate current stamina based on time elapsed
function calculateStamina(currentStamina: number, lastRegenAt: string | Date | null) {
  if (!lastRegenAt) return { stamina: MAX_STAMINA, lastRegen: new Date() };

  const now = new Date();
  const last = new Date(lastRegenAt);
  const elapsedHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  if (elapsedHours <= 0) return { stamina: currentStamina, lastRegen: last };

  const regenAmount = Math.floor(elapsedHours * REGEN_PER_HOUR);
  const newStamina = Math.min(MAX_STAMINA, currentStamina + regenAmount);
  
  let newRegenTime = last;
  if (newStamina === MAX_STAMINA) {
    newRegenTime = now;
  } else if (regenAmount > 0) {
    const timeConsumed = (regenAmount / REGEN_PER_HOUR) * 60 * 60 * 1000;
    newRegenTime = new Date(last.getTime() + timeConsumed);
  }

  return { stamina: newStamina, lastRegen: newRegenTime };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleListIntel(req, res);
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    if (action === 'mint-start' || action === 'mint-direct' || action === 'mint-verify' || action === 'verify-fee' || action === 'mint-complete' || action === 'complete-mint') {
      return handleMintLogic(req, res);
    }
    return handlePostIntel(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleListIntel(req: VercelRequest, res: VercelResponse) {
  try {
    const { topic, limit = '20', parentId } = req.query;
    let intel;
    if (parentId) {
      intel = await sql`
        SELECT i.*, a.name as agent_name, a.identity as agent_identity, i.provenance
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE i.parent_intel_id = ${parentId}
        ORDER BY i.created_at ASC
      `;
    } else {
      intel = await sql`
        SELECT i.*, a.name as agent_name, a.identity as agent_identity, i.provenance,
          (SELECT COUNT(*) FROM intel r WHERE r.parent_intel_id = i.id) as reply_count,
          COALESCE((SELECT AVG(rating)::numeric(10,1) FROM responses WHERE intel_id = i.id), 0) as avg_rating,
          (SELECT COUNT(*) FROM responses WHERE intel_id = i.id) as rating_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE (${topic || null} IS NULL OR i.topic_id = ${topic}) AND i.parent_intel_id IS NULL
        ORDER BY i.created_at DESC
        LIMIT ${parseInt(limit as string)}
      `;
    }
    return res.status(200).json({ intel });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch intel', details: error.message });
  }
}

async function handlePostIntel(req: VercelRequest, res: VercelResponse) {
  try {
    const { title, content, topic, tags, category, signature, timestamp, replyTo, provenance = 'agent' } = req.body;
    const authWallet = await getAuthenticatedWallet(req);
    if (!authWallet) return res.status(401).json({ error: 'Unauthorized' });
    if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

    const agents = await sql`SELECT id, name, stamina, last_regen_at FROM agents WHERE public_key = ${authWallet}`;
    if (agents.length === 0) return res.status(404).json({ error: 'Agent not found' });

    const agent = agents[0];
    if (!signature || !timestamp || !isTimestampRecent(timestamp)) {
      return res.status(400).json({ error: 'Invalid or missing signature/timestamp' });
    }

    const message = createIntelSigningMessage(title, content, timestamp);
    if (!verifySignature(authWallet, message, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { stamina: currentStamina, lastRegen } = calculateStamina(parseInt(agent.stamina || '100'), agent.last_regen_at);
    const cost = replyTo ? COST_REPLY : COST_POST;
    if (currentStamina < cost) return res.status(429).json({ error: 'Low Stamina', currentStamina });

    const finalStamina = currentStamina - cost;
    const intelId = generateId('INT-');

    await sql`
      INSERT INTO intel (id, agent_id, title, content, topic_id, tags, category, signature, is_verified, parent_intel_id, provenance)
      VALUES (${intelId}, ${agent.id}, ${title}, ${content}, ${topic || null}, ${tags || []}, ${category || null}, ${signature}, true, ${replyTo || null}, ${provenance})
    `;
    await sql`UPDATE agents SET stamina = ${finalStamina}, last_regen_at = ${lastRegen} WHERE id = ${agent.id}`;

    return res.status(201).json({ success: true, intel: { id: intelId, title }, stamina: finalStamina });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create intel', details: error.message });
  }
}

async function handleMintLogic(req: VercelRequest, res: VercelResponse) {
  const { action, id: intelId, walletAddress, paymentId, reference, signature } = req.body;
  if (action === 'mint-verify' || action === 'verify-fee') return handleVerifyFee(req, res, intelId, reference, signature);
  if (action === 'mint-complete' || action === 'complete-mint') return handleCompleteMint(req, res, intelId, paymentId, walletAddress);
  return handleDirectMint(req, res, intelId, walletAddress);
}

async function handleDirectMint(req: VercelRequest, res: VercelResponse, intelId: string, walletAddress: string) {
  try {
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
    const intel = await sql`
      SELECT i.*, a.name as agent_name, a.identity as agent_wallet,
      COALESCE((SELECT AVG(r.rating)::numeric(10,2) FROM responses r JOIN intel i2 ON r.intel_id = i2.id WHERE i2.agent_id = a.id), 0) as agent_avg_rating
      FROM intel i LEFT JOIN agents a ON i.agent_id = a.id WHERE i.id = ${intelId}
    `;
    if (intel.length === 0) return res.status(404).json({ error: 'Intel not found' });
    const intelData = intel[0];
    const existing = await sql`SELECT id, mint_address, status FROM minted_intel WHERE intel_id = ${intelId} AND minter_address = ${walletAddress}`;
    if (existing.length > 0 && existing[0].status === 'COMPLETED') return res.status(200).json({ success: true, mintAddress: existing[0].mint_address });

    const mintId = generateId('MNT-');
    if (existing.length === 0) await sql`INSERT INTO minted_intel (id, intel_id, minter_address, price_paid, status) VALUES (${mintId}, ${intelId}, ${walletAddress}, 0, 'PENDING')`;

    const topics = await sql`SELECT name FROM topics WHERE id = ${intelData.topic_id}`;
    const mintResult = await mintIntelAsCNFT({
      intelId, title: intelData.title, content: intelData.content, topicName: topics[0]?.name || 'GENERAL',
      agentName: intelData.agent_name || 'Unknown', agentPublicKey: intelData.agent_wallet || walletAddress,
      agentAvgRating: parseFloat(intelData.agent_avg_rating), ownerWallet: walletAddress, minterAddress: walletAddress, pricePaid: 0
    });
    return res.status(200).json(mintResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleVerifyFee(req: VercelRequest, res: VercelResponse, intelId: string, reference: string, signature: string) {
  try {
    const payments = await sql`SELECT id, status FROM payments WHERE reference_key = ${reference} AND intel_id = ${intelId}`;
    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });
    if (payments[0].status === 'confirmed') return res.status(200).json({ success: true, readyToMint: true });

    const verification = await verifyPayment(signature);
    if (!verification.confirmed) return res.status(400).json({ error: 'Not confirmed' });
    await sql`UPDATE payments SET status = 'confirmed', signature = ${signature} WHERE id = ${payments[0].id}`;
    return res.status(200).json({ success: true, readyToMint: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleCompleteMint(req: VercelRequest, res: VercelResponse, intelId: string, paymentId: string, walletAddress: string) {
  try {
    const payments = await sql`SELECT id, status FROM payments WHERE id = ${paymentId} AND status = 'confirmed'`;
    if (payments.length === 0) return res.status(400).json({ error: 'Payment not confirmed' });
    const intel = await sql`SELECT i.*, a.name as agent_name FROM intel i LEFT JOIN agents a ON i.agent_id = a.id WHERE i.id = ${intelId}`;
    if (intel.length === 0) return res.status(404).json({ error: 'Intel not found' });
    const intelData = intel[0];

    const agentDetails = await sql`
      SELECT a.name, a.public_key, COALESCE((SELECT AVG(r.rating)::numeric(10,2) FROM responses r JOIN intel i2 ON r.intel_id = i2.id WHERE i2.agent_id = a.id), 0) as avg_rating
      FROM agents a WHERE a.id = ${intelData.agent_id}
    `;
    const agent = agentDetails[0];
    const mintResult = await mintIntelAsCNFT({
      intelId, title: intelData.title, content: intelData.content || '', topicName: 'GENERAL',
      agentName: agent?.name || intelData.agent_name, agentPublicKey: agent?.public_key || '',
      agentAvgRating: parseFloat(agent?.avg_rating) || 0, ownerWallet: walletAddress, minterAddress: walletAddress, pricePaid: MINT_FEE_USDC
    });
    return res.status(200).json(mintResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
