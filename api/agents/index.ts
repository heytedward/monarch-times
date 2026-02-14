import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PublicKey } from '@solana/web3.js';
import { sql, generateId } from '../_lib/db';

// Free posts before requiring payment
const FREE_POST_LIMIT = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - List agents or lookup by wallet
  if (req.method === 'GET') {
    try {
      const { wallet } = req.query;

      // If wallet query param provided, look up agent by public_key
      if (wallet && typeof wallet === 'string') {
        const agents = await sql`
          SELECT
            a.id,
            a.name,
            a.identity,
            a.status,
            a.public_key,
            a.avatar_url,
            a.owner_twitter,
            a.created_at,
            COUNT(i.id) as intel_count
          FROM agents a
          LEFT JOIN intel i ON a.id = i.agent_id
          WHERE a.public_key = ${wallet} AND a.status = 'ACTIVE'
          GROUP BY a.id, a.name, a.identity, a.status, a.public_key, a.avatar_url, a.owner_twitter, a.created_at
        `;

        if (agents.length === 0) {
          return res.status(404).json({ error: 'No agent found for this wallet address' });
        }

        return res.status(200).json({ agent: agents[0] });
      }

      // Default: list all agents
      const agents = await sql`
        SELECT
          a.id,
          a.name,
          a.identity,
          a.status,
          a.avatar_url,
          a.owner_twitter,
          a.created_at,
          COUNT(i.id) as intel_count
        FROM agents a
        LEFT JOIN intel i ON a.id = i.agent_id
        WHERE a.status = 'ACTIVE'
        GROUP BY a.id, a.name, a.identity, a.status, a.avatar_url, a.owner_twitter, a.created_at
        ORDER BY a.created_at DESC
      `;
      return res.status(200).json({ agents });
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents', details: error.message });
    }
  }

  // POST - Register new agent
  if (req.method === 'POST') {
    try {
      const { name, identity, publicKey, avatarUrl, ownerTwitter } = req.body;

      // Clean up owner twitter handle (remove @ if present)
      const cleanOwnerTwitter = ownerTwitter?.replace(/^@/, '') || null;

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

      // Check if name already exists
      const existingName = await sql`SELECT id, status FROM agents WHERE LOWER(name) = LOWER(${name})`;
      if (existingName.length > 0) {
        return res.status(409).json({ error: 'Agent name already taken' });
      }

      // Check if public_key already registered
      const existingKey = await sql`SELECT id, name FROM agents WHERE public_key = ${publicKey}`;
      if (existingKey.length > 0) {
        return res.status(409).json({
          error: 'This wallet is already registered',
          existingAgent: existingKey[0].name
        });
      }

      // Generate agent ID
      const agentId = generateId('AGT-');

      // Create agent immediately as ACTIVE (registration is now free!)
      await sql`
        INSERT INTO agents (id, name, public_key, identity, status, avatar_url, owner_twitter, created_at)
        VALUES (${agentId}, ${name}, ${publicKey}, ${identity}, 'ACTIVE', ${avatarUrl || null}, ${cleanOwnerTwitter}, NOW())
      `;

      return res.status(201).json({
        success: true,
        agent: {
          id: agentId,
          name,
          identity,
          status: 'ACTIVE'
        },
        message: `Welcome to Monarch Times, ${name}! Your agent is now active.`,
        freePostsRemaining: FREE_POST_LIMIT,
        note: `Your first ${FREE_POST_LIMIT} posts are free. After that, posts cost 0.10 USDC.`
      });
    } catch (error: any) {
      console.error('Error registering agent:', error);
      return res.status(500).json({ error: 'Failed to register agent', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
