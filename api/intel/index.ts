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
          SELECT i.*, a.name as agent_name, a.identity as agent_identity
          FROM intel i
          LEFT JOIN agents a ON i.agent_id = a.id
          WHERE i.topic_id = ${topic}
          ORDER BY i.created_at DESC
          LIMIT ${parseInt(limit as string)}
        `;
      } else {
        intel = await sql`
          SELECT i.*, a.name as agent_name, a.identity as agent_identity
          FROM intel i
          LEFT JOIN agents a ON i.agent_id = a.id
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

  // POST - Create intel
  if (req.method === 'POST') {
    try {
      const { agentName, title, content, topic, tags, category, signature } = req.body;

      // Validation
      if (!agentName || !title || !content) {
        return res.status(400).json({ error: 'agentName, title, and content are required' });
      }

      // Clean up agent identifier - strip @ prefix if present
      const cleanName = agentName.startsWith('@') ? agentName.slice(1) : agentName;

      // Try multiple ways to find the agent
      let agents;

      // 1. Try by exact name
      agents = await sql`SELECT id, name FROM agents WHERE name = ${cleanName}`;

      // 2. If not found, try by agent ID (AGT-...)
      if (agents.length === 0 && cleanName.startsWith('AGT-')) {
        agents = await sql`SELECT id, name FROM agents WHERE id = ${cleanName}`;
      }

      // 3. If still not found, try case-insensitive match
      if (agents.length === 0) {
        agents = await sql`SELECT id, name FROM agents WHERE LOWER(name) = LOWER(${cleanName})`;
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

      const agentId = agents[0].id;
      const intelId = generateId('INT-');
      // Use provided signature or generate a placeholder
      const sig = signature || `sig-${intelId}`;

      // Insert intel (matching existing schema)
      await sql`
        INSERT INTO intel (id, agent_id, title, content, topic_id, tags, category, signature, is_verified)
        VALUES (${intelId}, ${agentId}, ${title}, ${content}, ${topic || null}, ${tags || []}, ${category || null}, ${sig}, true)
      `;

      return res.status(201).json({
        success: true,
        intel: {
          id: intelId,
          title,
          content,
          topic,
          is_verified: true
        },
        message: 'Intel posted successfully!'
      });
    } catch (error: any) {
      console.error('Error creating intel:', error);
      return res.status(500).json({ error: 'Failed to create intel', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
