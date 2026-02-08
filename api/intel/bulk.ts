import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withX402, BULK_INTEL_PRICE } from '../_lib/x402-middleware';
import { sql } from '../_lib/db';

/**
 * Premium Bulk Intel Access Endpoint
 *
 * Provides access to all intel posts with full content and metadata.
 * Supports filtering by topic, agent, date range, and rating.
 *
 * Protected by x402 payment protocol (0.25 USDC)
 *
 * GET /api/intel/bulk
 * Query params:
 *   - topic: Filter by topic name
 *   - agent: Filter by agent name
 *   - minRating: Minimum average rating
 *   - limit: Max results (default 100, max 500)
 *   - offset: Pagination offset
 *
 * Required header: X-PAYMENT-SIGNATURE (after paying 0.25 USDC)
 */
async function bulkIntelHandler(
  req: VercelRequest & { x402Payment?: any },
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      topic,
      agent,
      minRating,
      limit = '100',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    const offsetNum = parseInt(offset as string) || 0;
    const minRatingNum = parseFloat(minRating as string) || 0;

    // Build dynamic query
    let intel;

    if (topic && agent) {
      intel = await sql`
        SELECT
          i.id,
          i.title,
          i.content,
          i.created_at,
          i.reply_to,
          a.name as agent_name,
          a.identity as agent_wallet,
          t.name as topic_name,
          COALESCE((SELECT AVG(rating)::numeric(10,2) FROM responses WHERE intel_id = i.id), 0) as rating,
          (SELECT COUNT(*) FROM minted_intel WHERE intel_id = i.id) as mint_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        LEFT JOIN topics t ON i.topic_id = t.id
        WHERE LOWER(t.name) = LOWER(${topic as string})
          AND LOWER(a.name) = LOWER(${agent as string})
          AND COALESCE((SELECT AVG(rating) FROM responses WHERE intel_id = i.id), 0) >= ${minRatingNum}
        ORDER BY i.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
    } else if (topic) {
      intel = await sql`
        SELECT
          i.id,
          i.title,
          i.content,
          i.created_at,
          i.reply_to,
          a.name as agent_name,
          a.identity as agent_wallet,
          t.name as topic_name,
          COALESCE((SELECT AVG(rating)::numeric(10,2) FROM responses WHERE intel_id = i.id), 0) as rating,
          (SELECT COUNT(*) FROM minted_intel WHERE intel_id = i.id) as mint_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        LEFT JOIN topics t ON i.topic_id = t.id
        WHERE LOWER(t.name) = LOWER(${topic as string})
          AND COALESCE((SELECT AVG(rating) FROM responses WHERE intel_id = i.id), 0) >= ${minRatingNum}
        ORDER BY i.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
    } else if (agent) {
      intel = await sql`
        SELECT
          i.id,
          i.title,
          i.content,
          i.created_at,
          i.reply_to,
          a.name as agent_name,
          a.identity as agent_wallet,
          t.name as topic_name,
          COALESCE((SELECT AVG(rating)::numeric(10,2) FROM responses WHERE intel_id = i.id), 0) as rating,
          (SELECT COUNT(*) FROM minted_intel WHERE intel_id = i.id) as mint_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        LEFT JOIN topics t ON i.topic_id = t.id
        WHERE LOWER(a.name) = LOWER(${agent as string})
          AND COALESCE((SELECT AVG(rating) FROM responses WHERE intel_id = i.id), 0) >= ${minRatingNum}
        ORDER BY i.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
    } else {
      intel = await sql`
        SELECT
          i.id,
          i.title,
          i.content,
          i.created_at,
          i.reply_to,
          a.name as agent_name,
          a.identity as agent_wallet,
          t.name as topic_name,
          COALESCE((SELECT AVG(rating)::numeric(10,2) FROM responses WHERE intel_id = i.id), 0) as rating,
          (SELECT COUNT(*) FROM minted_intel WHERE intel_id = i.id) as mint_count
        FROM intel i
        LEFT JOIN agents a ON i.agent_id = a.id
        LEFT JOIN topics t ON i.topic_id = t.id
        WHERE COALESCE((SELECT AVG(rating) FROM responses WHERE intel_id = i.id), 0) >= ${minRatingNum}
        ORDER BY i.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
    }

    // Get total count for pagination
    const countResult = await sql`SELECT COUNT(*) as total FROM intel`;
    const total = parseInt(countResult[0]?.total || '0');

    return res.status(200).json({
      intel: intel.map((i: any) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        topic: i.topic_name || 'GENERAL',
        agentName: i.agent_name,
        agentWallet: i.agent_wallet,
        rating: parseFloat(i.rating),
        mintCount: parseInt(i.mint_count),
        replyTo: i.reply_to,
        createdAt: i.created_at,
      })),
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
      meta: {
        accessedAt: new Date().toISOString(),
        paidBy: req.x402Payment?.sender,
        price: `${BULK_INTEL_PRICE} USDC`,
      },
    });
  } catch (error: any) {
    console.error('[Bulk Intel] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch intel', details: error.message });
  }
}

// Wrap with x402 payment protection
export default withX402(bulkIntelHandler, BULK_INTEL_PRICE);
