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
      // Get agents with their intel count
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

  return res.status(405).json({ error: 'Method not allowed' });
}
