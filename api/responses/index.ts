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

  // POST - Create response/rating
  if (req.method === 'POST') {
    try {
      const { intelId, rating, comment, walletAddress } = req.body;

      // Validation
      if (!intelId || !rating) {
        return res.status(400).json({ error: 'intelId and rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Verify intel exists
      const intel = await sql`SELECT id FROM intel WHERE id = ${intelId}`;
      if (intel.length === 0) {
        return res.status(404).json({ error: 'Intel not found' });
      }

      // Generate response ID
      const responseId = generateId('RSP-');

      // Insert response
      await sql`
        INSERT INTO responses (id, intel_id, rating, comment, wallet_address, created_at)
        VALUES (${responseId}, ${intelId}, ${rating}, ${comment || null}, ${walletAddress || null}, NOW())
      `;

      return res.status(201).json({
        success: true,
        response: {
          id: responseId,
          intelId,
          rating,
        },
        message: 'Response recorded!'
      });
    } catch (error: any) {
      console.error('Error creating response:', error);
      // If table doesn't exist, create it
      if (error.message?.includes('relation "responses" does not exist')) {
        try {
          await sql`
            CREATE TABLE IF NOT EXISTS responses (
              id VARCHAR(50) PRIMARY KEY,
              intel_id VARCHAR(50) REFERENCES intel(id),
              rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
              comment TEXT,
              wallet_address VARCHAR(100),
              created_at TIMESTAMP DEFAULT NOW()
            )
          `;
          await sql`CREATE INDEX IF NOT EXISTS idx_responses_intel ON responses(intel_id)`;
          return res.status(500).json({ error: 'Table created. Please try again.' });
        } catch (createErr) {
          console.error('Error creating table:', createErr);
        }
      }
      return res.status(500).json({ error: 'Failed to create response', details: error.message });
    }
  }

  // GET - Get responses for an intel (or average ratings)
  if (req.method === 'GET') {
    try {
      const { intelId } = req.query;

      if (intelId) {
        // Get responses for specific intel
        const responses = await sql`
          SELECT id, rating, comment, wallet_address, created_at
          FROM responses
          WHERE intel_id = ${intelId}
          ORDER BY created_at DESC
        `;

        // Calculate average
        const avgResult = await sql`
          SELECT AVG(rating)::numeric(10,2) as avg_rating, COUNT(*) as count
          FROM responses
          WHERE intel_id = ${intelId}
        `;

        return res.status(200).json({
          responses,
          average: avgResult[0]?.avg_rating || 0,
          count: avgResult[0]?.count || 0,
        });
      } else {
        // Get average ratings for all intel
        const averages = await sql`
          SELECT intel_id, AVG(rating)::numeric(10,2) as avg_rating, COUNT(*) as count
          FROM responses
          GROUP BY intel_id
        `;
        return res.status(200).json({ averages });
      }
    } catch (error: any) {
      console.error('Error fetching responses:', error);
      return res.status(500).json({ error: 'Failed to fetch responses', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
