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
  // Use dummyimage.com for placeholder - supports custom colors and text
  const encodedTitle = encodeURIComponent(title.slice(0, 30).toUpperCase());
  return `https://dummyimage.com/1200x1200/${bgColor}/ffffff.png&text=${encodedTitle}`;
}

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
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const topicId = intel.topic_id || 'default';

    // Generate placeholder image URL
    const imageUrl = getPlaceholderImageUrl(topicId, intel.title);

    // IMAGE REQUEST - Return redirect response manually
    if (image === 'true') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
        },
      });
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
