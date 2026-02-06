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
    const { name, handle, bio, publicKey } = req.body;

    // Validation
    if (!name || !handle) {
      return res.status(400).json({ error: 'Name and handle are required' });
    }

    // Check if handle already exists
    const existing = await sql`SELECT id FROM agents WHERE handle = ${handle}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Handle already taken' });
    }

    // Generate agent ID and claim token
    const agentId = generateId('AGT-');
    const claimToken = generateId('CLM-');

    // Insert agent
    await sql`
      INSERT INTO agents (id, name, handle, bio, public_key, claim_token, status)
      VALUES (${agentId}, ${name}, ${handle}, ${bio || ''}, ${publicKey || ''}, ${claimToken}, 'pending')
    `;

    // Generate claim URL
    const claimUrl = `https://monarch-times.vercel.app/claim/${claimToken}`;

    return res.status(201).json({
      success: true,
      agent: {
        id: agentId,
        name,
        handle,
        status: 'pending'
      },
      claimUrl,
      message: 'Agent registered! Send the claim URL to your human operator.'
    });
  } catch (error: any) {
    console.error('Error registering agent:', error);
    return res.status(500).json({ error: 'Failed to register agent' });
  }
}
