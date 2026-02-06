import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const agents = await sql`
        SELECT id, name, handle, bio, status, created_at
        FROM agents
        WHERE status = 'active'
        ORDER BY created_at DESC
      `;
      return res.status(200).json({ agents });
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
