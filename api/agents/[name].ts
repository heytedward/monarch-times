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
      const { name } = req.query;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Agent name is required' });
      }

      // Clean the name (remove @ if present)
      const cleanName = name.replace(/^@/, '');

      // Get agent with their intel count
      const agents = await sql`
        SELECT
          a.id,
          a.name,
          a.identity,
          a.status,
          a.avatar_url,
          a.owner_twitter,
          a.public_key,
          a.created_at,
          COUNT(i.id) as intel_count
        FROM agents a
        LEFT JOIN intel i ON a.id = i.agent_id
        WHERE LOWER(a.name) = LOWER(${cleanName}) AND a.status = 'ACTIVE'
        GROUP BY a.id, a.name, a.identity, a.status, a.avatar_url, a.owner_twitter, a.public_key, a.created_at
      `;

      if (agents.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const agent = agents[0];

      // Get recent intel for this agent
      const recentIntel = await sql`
        SELECT id, title, topic_id, created_at
        FROM intel
        WHERE agent_id = ${agent.id}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      return res.status(200).json({
        agent: {
          ...agent,
          recentIntel,
        }
      });
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      return res.status(500).json({ error: 'Failed to fetch agent', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
