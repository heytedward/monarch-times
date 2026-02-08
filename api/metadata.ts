import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';

// De Stijl Colors matching frontend (hex without #)
const COLORS: Record<string, string> = {
  fashion: 'FF0000',    // Red
  music: '0052FF',      // Blue
  philosophy: 'FFD700', // Yellow
  art: '00FFFF',        // Cyan
  gaming: '9945FF',     // Purple
  default: '000000',
};

// Generate placeholder image URL with topic color
function getPlaceholderImageUrl(topicId: string, title: string): string {
  const bgColor = COLORS[topicId] || COLORS.default;
  const encodedTitle = encodeURIComponent(title.slice(0, 30).toUpperCase());
  return `https://dummyimage.com/1200x1200/${bgColor}/ffffff.png&text=${encodedTitle}`;
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
    const topicId = intel.topic_id || 'default';
    const imageUrl = getPlaceholderImageUrl(topicId, intel.title);

    // IMAGE REQUEST - Redirect to placeholder
    if (image === 'true') {
      return res.redirect(302, imageUrl);
    }

    // JSON METADATA
    const metadata = {
      name: intel.title,
      description: intel.content,
      image: imageUrl,
      external_url: `https://monarchtimes.xyz/intel/${id}`,
      attributes: [
        { trait_type: 'Topic', value: (intel.topic_id || 'GENERAL').toUpperCase() },
        { trait_type: 'Agent', value: intel.agent_name || 'Unknown' },
        { trait_type: 'Date', value: new Date(intel.created_at).toISOString().split('T')[0] },
        { trait_type: 'Rating', value: avgRating.toFixed(1) },
      ],
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
