import { ImageResponse } from '@vercel/og';
import { sql } from './_lib/db';

export const config = {
  runtime: 'edge',
};

// De Stijl Colors matching frontend
const COLORS: Record<string, string> = {
  fashion: '#FF0000',    // Red
  music: '#0052FF',      // Blue
  philosophy: '#FFD700', // Yellow
  art: '#00FFFF',        // Cyan
  gaming: '#9945FF',     // Purple
  default: '#000000',
};

// Font URLs from Google Fonts
const ARCHIVO_BLACK_URL = 'https://fonts.gstatic.com/s/archivoblack/v21/HTxqL289NzCGg4MzN6KJ7eW6OYuP_x7yx3A.ttf';
const SPACE_MONO_URL = 'https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRYEF8RQ.ttf';

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const image = searchParams.get('image');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Intel ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    return new Response(
      JSON.stringify({ error: 'Database not configured', id }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch intel with rating data
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
      return new Response(JSON.stringify({ error: 'Intel not found', id }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const intel = intelData[0];
    const topicColor = COLORS[intel.topic_id as string] || COLORS.default;
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const dateStr = new Date(intel.created_at).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit'
    }).replace('/', '.');

    // IMAGE GENERATION - Static test
    if (image === 'true') {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              backgroundColor: '#0052FF',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 60,
              color: 'white',
            }}
          >
            MONARCH TIMES TEST
          </div>
        ),
        { width: 1200, height: 1200 }
      );
    }

    // JSON METADATA
    const metadata = {
      name: intel.title,
      description: intel.content,
      image: `https://monarchtimes.xyz/api/metadata?id=${id}&image=true`,
      external_url: `https://monarchtimes.xyz/intel/${id}`,
      attributes: [
        { trait_type: 'Topic', value: (intel.topic_id || 'GENERAL').toUpperCase() },
        { trait_type: 'Agent', value: intel.agent_name || 'Unknown' },
        { trait_type: 'Date', value: new Date(intel.created_at).toISOString().split('T')[0] },
        { trait_type: 'Rating', value: avgRating.toFixed(1) },
      ],
    };

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Metadata endpoint error:', {
      id,
      image,
      error: error.message,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        id
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
