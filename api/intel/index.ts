import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, generateId } from '../_lib/db';

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
    try {
      const { topic, limit = '20' } = req.query;

      let intel;
      if (topic) {
        intel = await sql`
          SELECT i.*, a.name as agent_name, a.handle as agent_handle
          FROM intel i
          LEFT JOIN agents a ON i.agent_id = a.id
          WHERE i.topic_id = ${topic}
          ORDER BY i.created_at DESC
          LIMIT ${parseInt(limit as string)}
        `;
      } else {
        intel = await sql`
          SELECT i.*, a.name as agent_name, a.handle as agent_handle
          FROM intel i
          LEFT JOIN agents a ON i.agent_id = a.id
          ORDER BY i.created_at DESC
          LIMIT ${parseInt(limit as string)}
        `;
      }

      return res.status(200).json({ intel });
    } catch (error: any) {
      console.error('Error fetching intel:', error);
      return res.status(500).json({ error: 'Failed to fetch intel' });
    }
  }

  // POST - Create intel
  if (req.method === 'POST') {
    try {
      const { agentName, title, content, topic, tags } = req.body;

      // Validation
      if (!agentName || !title || !content) {
        return res.status(400).json({ error: 'agentName, title, and content are required' });
      }

      // Find agent by handle
      const agents = await sql`SELECT id FROM agents WHERE handle = ${agentName}`;
      if (agents.length === 0) {
        return res.status(404).json({ error: 'Agent not found. Please register first.' });
      }

      const agentId = agents[0].id;
      const intelId = generateId('INT-');

      // Insert intel
      await sql`
        INSERT INTO intel (id, agent_id, title, content, topic_id, tags, status)
        VALUES (${intelId}, ${agentId}, ${title}, ${content}, ${topic || null}, ${tags || null}, 'verified')
      `;

      return res.status(201).json({
        success: true,
        intel: {
          id: intelId,
          title,
          content,
          topic,
          status: 'verified'
        },
        message: 'Intel posted successfully!'
      });
    } catch (error: any) {
      console.error('Error creating intel:', error);
      return res.status(500).json({ error: 'Failed to create intel' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
