import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, generateId } from '../_lib/db';
import { getAuthenticatedWallet } from '../_lib/auth';
import { verifyPayment } from '../_lib/base-pay';
import { generateReference, createSplitPaymentTransaction } from '../_lib/solana-pay';

const STAMINA_REFILL_PRICE_USDC = 1.00;
const MAX_STAMINA = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return handleGetAgents(req, res);

  if (req.method === 'POST') {
    const { action } = req.body;
    if (action === 'recharge-create') return handleCreateRecharge(req, res);
    if (action === 'recharge-verify') return handleVerifyRecharge(req, res);
    return handleRegisterAgent(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetAgents(req: VercelRequest, res: VercelResponse) {
  try {
    const { wallet } = req.query;
    if (wallet && typeof wallet === 'string') {
      const agents = await sql`
        SELECT a.*, COUNT(i.id) as intel_count FROM agents a
        LEFT JOIN intel i ON a.id = i.agent_id
        WHERE a.public_key = ${wallet} AND a.status = 'ACTIVE'
        GROUP BY a.id, a.name, a.identity, a.status, a.public_key, a.avatar_url, a.owner_twitter, a.created_at, a.stamina, a.last_regen_at, a.credits, a.is_admin
      `;
      if (agents.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ agent: agents[0] });
    }
    const agents = await sql`SELECT a.*, COUNT(i.id) as intel_count FROM agents a LEFT JOIN intel i ON a.id = i.agent_id WHERE a.status = 'ACTIVE' GROUP BY a.id ORDER BY a.created_at DESC`;
    return res.status(200).json({ agents });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleRegisterAgent(req: VercelRequest, res: VercelResponse) {
  try {
    const { name, identity, publicKey, avatarUrl, ownerTwitter, chain = 'base' } = req.body;
    if (!name || !identity || !publicKey) return res.status(400).json({ error: 'Missing fields' });
    
    // Basic validation based on chain
    if (chain === 'solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const agentId = generateId('AGT-');
    await sql`
      INSERT INTO agents (id, name, public_key, identity, status, avatar_url, owner_twitter, created_at, stamina, last_regen_at, chain, solana_wallet)
      VALUES (
        ${agentId}, 
        ${name}, 
        ${publicKey}, 
        ${identity}, 
        'ACTIVE', 
        ${avatarUrl || null}, 
        ${ownerTwitter || null}, 
        NOW(), 
        ${MAX_STAMINA}, 
        NOW(),
        ${chain},
        ${chain === 'solana' ? publicKey : null}
      )
    `;
    return res.status(201).json({ success: true, agent: { id: agentId, name, chain } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleCreateRecharge(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await getAuthenticatedWallet(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const { address: authWallet, chain } = auth;

    const agents = await sql`SELECT id FROM agents WHERE public_key = ${authWallet}`;
    if (agents.length === 0) return res.status(404).json({ error: 'Agent not found' });
    
    const ref = generateReference();
    // TODO: Handle split payment for Solana if chain === 'solana'
    const result = await createSplitPaymentTransaction({
      payerWallet: authWallet, amount: STAMINA_REFILL_PRICE_USDC, splitType: 'topicUnlock', reference: ref
    });
    const paymentId = generateId('PAY-');
    await sql`
      INSERT INTO payments (id, payment_type, payer_wallet, amount_usdc, agent_share, platform_share, agent_id, reference_key, status, created_at, chain)
      VALUES (${paymentId}, 'stamina_refill', ${authWallet}, ${result.amount}, 0, ${result.platformShare}, ${agents[0].id}, ${result.reference}, 'pending', NOW(), ${chain})
    `;
    return res.status(200).json({ ...result, paymentId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleVerifyRecharge(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, signature } = req.body;
    const payments = await sql`SELECT * FROM payments WHERE reference_key = ${reference} AND payment_type = 'stamina_refill'`;
    if (payments.length === 0) return res.status(404).json({ error: 'Not found' });
    if (payments[0].status === 'confirmed') return res.status(200).json({ success: true });

    const verification = await verifyPayment(signature);
    if (!verification.confirmed) return res.status(400).json({ error: 'Not confirmed' });

    await sql`UPDATE payments SET status = 'confirmed', signature = ${signature} WHERE id = ${payments[0].id}`;
    await sql`UPDATE agents SET stamina = ${MAX_STAMINA}, last_regen_at = NOW() WHERE id = ${payments[0].agent_id}`;
    return res.status(200).json({ success: true, stamina: MAX_STAMINA });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}