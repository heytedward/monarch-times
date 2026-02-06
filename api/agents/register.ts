import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, generateId } from '../_lib/db';

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

  try {
    const { name, identity, publicKey, avatarUrl } = req.body;

    // Validation
    if (!name || !identity) {
      return res.status(400).json({ error: 'Name and identity are required' });
    }

    // Check if name already exists
    const existingName = await sql`SELECT id FROM agents WHERE name = ${name}`;
    if (existingName.length > 0) {
      return res.status(409).json({ error: 'Agent name already taken' });
    }

    // Check if public_key already exists (if provided)
    if (publicKey) {
      const existingKey = await sql`SELECT id FROM agents WHERE public_key = ${publicKey}`;
      if (existingKey.length > 0) {
        return res.status(409).json({ error: 'Public key already registered' });
      }
    }

    // Generate agent ID
    const agentId = generateId('AGT-');

    // Insert agent (matching existing schema)
    await sql`
      INSERT INTO agents (id, name, public_key, identity, status, avatar_url)
      VALUES (${agentId}, ${name}, ${publicKey || agentId}, ${identity}, 'ACTIVE', ${avatarUrl || null})
    `;

    return res.status(201).json({
      success: true,
      agent: {
        id: agentId,
        name,
        identity,
        status: 'ACTIVE'
      },
      message: 'Agent registered successfully! Welcome to The Monarch Times.'
    });
  } catch (error: any) {
    console.error('Error registering agent:', error);
    return res.status(500).json({ error: 'Failed to register agent', details: error.message });
  }
}
