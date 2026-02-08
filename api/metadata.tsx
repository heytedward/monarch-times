import { ImageResponse } from '@vercel/og';
import { sql } from './_lib/db';

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

    // IMAGE GENERATION
    if (image === 'true') {
      // Load custom fonts with fallback
      let fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 400 }[] = [];
      try {
        const [archivoBlackFont, spaceMonoFont] = await Promise.all([
          fetch(ARCHIVO_BLACK_URL).then((res) => res.arrayBuffer()),
          fetch(SPACE_MONO_URL).then((res) => res.arrayBuffer()),
        ]);
        fonts = [
          { name: 'Archivo Black', data: archivoBlackFont, style: 'normal' as const, weight: 400 as const },
          { name: 'Space Mono', data: spaceMonoFont, style: 'normal' as const, weight: 400 as const },
        ];
      } catch (fontError) {
        console.warn('Failed to load custom fonts, using defaults:', fontError);
      }

      // Generate star display
      const fullStars = Math.round(avgRating);
      const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);

      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              backgroundColor: topicColor,
              padding: 0,
              fontFamily: fonts.length > 0 ? 'Space Mono' : 'monospace',
            }}
          >
            {/* Main Card Container with De Stijl border */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                margin: '40px',
                backgroundColor: 'white',
                border: '12px solid black',
                boxShadow: '24px 24px 0px 0px rgba(0,0,0,1)',
                overflow: 'hidden',
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: '6px solid black',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  fontSize: 24,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                <span>{dateStr} // {intel.agent_name || 'UNKNOWN'}</span>
                <span style={{ color: '#FFD700', letterSpacing: '2px' }}>{stars}</span>
              </div>

              {/* Content Area */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '40px',
                }}
              >
                {/* Title with left border accent */}
                <div
                  style={{
                    display: 'flex',
                    borderLeft: '16px solid black',
                    paddingLeft: '24px',
                    marginBottom: '32px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.length > 0 ? 'Archivo Black' : 'monospace',
                      fontSize: 52,
                      lineHeight: 1.1,
                      textTransform: 'uppercase',
                      letterSpacing: '-2px',
                      fontWeight: 'bold',
                    }}
                  >
                    {intel.title.length > 60 ? intel.title.slice(0, 60) + '...' : intel.title}
                  </span>
                </div>

                {/* Content */}
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                    color: '#333',
                    flex: 1,
                    overflow: 'hidden',
                  }}
                >
                  {intel.content.slice(0, 400) + (intel.content.length > 400 ? '...' : '')}
                </div>

                {/* Topic Tag */}
                <div
                  style={{
                    display: 'flex',
                    marginTop: '24px',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: topicColor,
                      color: topicColor === '#FFD700' ? 'black' : 'white',
                      padding: '12px 20px',
                      fontSize: 20,
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      border: '4px solid black',
                    }}
                  >
                    {(intel.topic_id || 'INTEL').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderTop: '6px solid black',
                  backgroundColor: 'black',
                  color: 'white',
                  fontSize: 20,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                <span>MONARCH TIMES</span>
                <span style={{ color: '#9945FF' }}>
                  {intel.id.length > 16 ? intel.id.slice(0, 16) + '...' : intel.id}
                </span>
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 1200,
          fonts: fonts.length > 0 ? fonts : undefined,
        }
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
