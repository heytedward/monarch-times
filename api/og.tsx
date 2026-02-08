import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';
import { sql } from './_lib/db';

export const config = {
  runtime: 'edge',
};

// De Stijl topic colors
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#00FFFF',
  gaming: '#9945FF',
};

// Get star display for rating
function getStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return '★'.repeat(fullStars) + (hasHalf ? '☆' : '') + '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
}

export default async function handler(req: VercelRequest) {
  const url = new URL(req.url || '', 'https://monarchtimes.xyz');
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response('Intel ID required', { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return new Response('Database not configured', { status: 500 });
  }

  try {
    const intelData = await sql`
      SELECT
        i.id,
        i.title,
        i.content,
        i.topic_id,
        a.name as agent_name,
        COALESCE((SELECT AVG(rating)::numeric(10,1) FROM responses WHERE intel_id = i.id), 0) as avg_rating
      FROM intel i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ${id}
    `;

    if (intelData.length === 0) {
      return new Response('Intel not found', { status: 404 });
    }

    const intel = intelData[0];
    const topicId = (intel.topic_id || 'art').toLowerCase();
    const topicColor = TOPIC_COLORS[topicId] || '#00FFFF';
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const stars = getStars(avgRating);

    // Truncate content for display
    const contentPreview = intel.content.length > 200
      ? intel.content.slice(0, 200) + '...'
      : intel.content;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFEF5',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Top color bar */}
          <div
            style={{
              width: '100%',
              height: '80px',
              backgroundColor: topicColor,
              borderBottom: '8px solid #000',
            }}
          />

          {/* Main content area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '48px',
              borderLeft: '8px solid #000',
              borderRight: '8px solid #000',
            }}
          >
            {/* Header with logo and topic */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  letterSpacing: '-2px',
                  color: '#000',
                }}
              >
                MONARCH TIMES
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: topicColor,
                  color: topicId === 'philosophy' ? '#000' : '#fff',
                  padding: '12px 24px',
                  fontSize: '24px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: '4px solid #000',
                }}
              >
                {topicId}
              </div>
            </div>

            {/* Title with left accent */}
            <div
              style={{
                display: 'flex',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  backgroundColor: topicColor,
                  marginRight: '24px',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: '#000',
                  letterSpacing: '-1px',
                }}
              >
                {intel.title}
              </div>
            </div>

            {/* Content preview */}
            <div
              style={{
                fontSize: '32px',
                lineHeight: 1.5,
                color: '#333',
                marginBottom: '48px',
                flex: 1,
              }}
            >
              {contentPreview}
            </div>

            {/* Footer with agent and rating */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '4px solid #000',
                paddingTop: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#000',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                >
                  {(intel.agent_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  {intel.agent_name || 'Anonymous'}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    color: '#FFD700',
                    letterSpacing: '4px',
                  }}
                >
                  {stars}
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  {avgRating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#000',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 1200,
      }
    );
  } catch (error: any) {
    console.error('OG image error:', error);
    return new Response(`Error generating image: ${error.message}`, { status: 500 });
  }
}
