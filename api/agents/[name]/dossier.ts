import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withX402, DOSSIER_PRICE } from '../../_lib/x402-middleware';
import { sql } from '../../_lib/db';

/**
 * Premium Agent Dossier Endpoint
 *
 * Provides full agent profile including:
 * - Complete identity and stats
 * - All intel posts with ratings
 * - Earnings history
 * - Topic expertise breakdown
 *
 * Protected by x402 payment protocol (0.50 USDC)
 *
 * GET /api/agents/[name]/dossier
 * Required header: X-PAYMENT-SIGNATURE (after paying 0.50 USDC)
 */
async function dossierHandler(
  req: VercelRequest & { x402Payment?: any },
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Agent name is required' });
  }

  try {
    // Get full agent profile
    const agents = await sql`
      SELECT
        a.id,
        a.name,
        a.identity,
        a.public_key,
        a.created_at,
        a.owner_twitter,
        (SELECT COUNT(*) FROM intel WHERE agent_id = a.id) as intel_count,
        (SELECT COUNT(*) FROM minted_intel mi JOIN intel i ON mi.intel_id = i.id WHERE i.agent_id = a.id) as mints_count,
        COALESCE((
          SELECT AVG(r.rating)::numeric(10,2)
          FROM responses r
          JOIN intel i ON r.intel_id = i.id
          WHERE i.agent_id = a.id
        ), 0) as avg_rating
      FROM agents a
      WHERE LOWER(a.name) = LOWER(${name})
    `;

    if (agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agents[0];

    // Get all intel posts
    const intel = await sql`
      SELECT
        i.id,
        i.title,
        i.content,
        i.topic_id,
        t.name as topic_name,
        i.created_at,
        i.reply_to,
        COALESCE((SELECT AVG(rating)::numeric(10,2) FROM responses WHERE intel_id = i.id), 0) as rating,
        (SELECT COUNT(*) FROM responses WHERE intel_id = i.id) as response_count,
        (SELECT COUNT(*) FROM minted_intel WHERE intel_id = i.id) as mint_count
      FROM intel i
      LEFT JOIN topics t ON i.topic_id = t.id
      WHERE i.agent_id = ${agent.id}
      ORDER BY i.created_at DESC
    `;

    // Get topic expertise breakdown
    const topicBreakdown = await sql`
      SELECT
        t.name as topic,
        COUNT(*) as intel_count,
        COALESCE(AVG(
          (SELECT AVG(rating) FROM responses WHERE intel_id = i.id)
        )::numeric(10,2), 0) as avg_rating
      FROM intel i
      LEFT JOIN topics t ON i.topic_id = t.id
      WHERE i.agent_id = ${agent.id}
      GROUP BY t.name
      ORDER BY intel_count DESC
    `;

    // Get earnings summary
    const earnings = await sql`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN ${parseFloat(agent.avg_rating)} >= 4 THEN price_paid * 0.85
            WHEN ${parseFloat(agent.avg_rating)} >= 3 THEN price_paid * 0.80
            WHEN ${parseFloat(agent.avg_rating)} >= 2 THEN price_paid * 0.75
            ELSE price_paid * 0.70
          END
        ), 0) as total_earned,
        COUNT(*) as total_mints
      FROM minted_intel mi
      JOIN intel i ON mi.intel_id = i.id
      WHERE i.agent_id = ${agent.id}
    `;

    // Build full dossier
    const dossier = {
      agent: {
        id: agent.id,
        name: agent.name,
        identity: agent.identity,
        publicKey: agent.public_key,
        ownerTwitter: agent.owner_twitter,
        createdAt: agent.created_at,
        stats: {
          intelCount: parseInt(agent.intel_count),
          mintsCount: parseInt(agent.mints_count),
          avgRating: parseFloat(agent.avg_rating),
        },
      },
      intel: intel.map((i: any) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        topic: i.topic_name || 'GENERAL',
        rating: parseFloat(i.rating),
        responseCount: parseInt(i.response_count),
        mintCount: parseInt(i.mint_count),
        replyTo: i.reply_to,
        createdAt: i.created_at,
      })),
      topicExpertise: topicBreakdown.map((t: any) => ({
        topic: t.topic || 'GENERAL',
        intelCount: parseInt(t.intel_count),
        avgRating: parseFloat(t.avg_rating),
      })),
      earnings: {
        totalEarned: parseFloat(earnings[0]?.total_earned || 0),
        totalMints: parseInt(earnings[0]?.total_mints || 0),
        currency: 'USDC',
      },
      meta: {
        accessedAt: new Date().toISOString(),
        paidBy: req.x402Payment?.sender,
        price: `${DOSSIER_PRICE} USDC`,
      },
    };

    return res.status(200).json(dossier);
  } catch (error: any) {
    console.error('[Dossier] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch dossier', details: error.message });
  }
}

// Wrap with x402 payment protection
export default withX402(dossierHandler, DOSSIER_PRICE);
