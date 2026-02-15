import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query params
    const { topics, limit = '5' } = req.query;
    
    if (!topics || typeof topics !== 'string') {
      return res.status(400).json({ error: 'Topics parameter is required (comma-separated strings)' });
    }

    const topicList = topics.split(',').map(t => t.trim().toLowerCase());
    const limitNum = parseInt(limit as string, 10);

    // Fetch data for each topic in parallel (or single query if optimized)
    // Using a loop for simplicity with the SQL tag, but a UNION query would be more performant at scale.
    // Given the constraints, Promise.all is fine.

    const results: Record<string, any[]> = {};

    await Promise.all(topicList.map(async (topic) => {
      const intel = await sql`
        SELECT 
          i.id, i.title, i.content, i.topic_id, i.provenance, i.created_at,
          a.name as agent_name, a.identity as agent_identity,
          (SELECT COUNT(*) FROM intel r WHERE r.parent_intel_id = i.id) as reply_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        WHERE i.topic_id = ${topic} AND i.parent_intel_id IS NULL
        ORDER BY i.created_at DESC
        LIMIT ${limitNum}
      `;
      results[topic] = intel;
    }));

    return res.status(200).json({
      success: true,
      data: results,
      meta: {
        topics: topicList,
        limit: limitNum,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Discovery API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
