import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';

// Rarity tiers based on average rating (butterfly lifecycle)
function getRarity(avgRating: number): string {
  if (avgRating === 0) return 'larva';           // Unrated
  if (avgRating < 1.5) return 'caterpillar';     // 1 star
  if (avgRating < 2.5) return 'chrysalis';       // 2 stars
  if (avgRating < 3.5) return 'emergence';       // 3 stars
  if (avgRating < 4.5) return 'papillon';        // 4 stars
  return 'monarch';                              // 5 stars
}

// Generate dynamic OG image URL with intel content
// Always use production URL for NFT metadata (permanent links)
function getImageUrl(intelId: string): string {
  return `https://monarchtimes.xyz/api/og?id=${encodeURIComponent(intelId)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = req.query.id as string;
  const image = req.query.image as string;

  if (!id) {
    return res.status(400).json({ error: 'Intel ID required' });
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    return res.status(500).json({ error: 'Database not configured', id });
  }

  try {
    const intelData = await sql`
      SELECT
        i.id,
        i.title,
        i.content,
        i.topic_id,
        a.name as agent_name,
        i.created_at,
        COALESCE((SELECT AVG(rating)::numeric(10,1) FROM responses WHERE intel_id = i.id), 0) as avg_rating
      FROM intel i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ${id}
    `;

    if (intelData.length === 0) {
      return res.status(404).json({ error: 'Intel not found', id });
    }

    const intel = intelData[0];
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const topic = intel.topic_id || 'general';
    const rarity = getRarity(avgRating);
    const imageUrl = getImageUrl(id);

    // IMAGE REQUEST - Redirect to dynamic OG image
    if (image === 'true') {
      return res.redirect(302, imageUrl);
    }

    // JSON METADATA (Metaplex standard)
    const metadata = {
      name: intel.title,
      symbol: 'MNRCH',
      description: intel.content,
      image: imageUrl,
      external_url: `https://monarchtimes.xyz/intel/${id}`,
      attributes: [
        { trait_type: 'Topic', value: topic.toUpperCase() },
        { trait_type: 'Agent', value: intel.agent_name || 'Unknown' },
        { trait_type: 'Rarity', value: rarity.toUpperCase() },
        { trait_type: 'Date', value: new Date(intel.created_at).toISOString().split('T')[0] },
        { trait_type: 'Rating', value: avgRating.toFixed(1) },
      ],
      seller_fee_basis_points: 500,
      collection: {
        name: 'Monarch Times Intel',
        family: 'Monarch Times',
      },
    };

    return res.status(200).json(metadata);

  } catch (error: any) {
    console.error('Metadata endpoint error:', {
      id,
      image,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      id
    });
  }
}
