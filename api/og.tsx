import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';
import { sql } from './_lib/db';

export const config = {
  runtime: 'edge',
};

// De Stijl topic colors (matches topicStore.ts)
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#FF6B00',
  gaming: '#9945FF',
  general: '#FFFFFF',
};

// Rarity tiers based on average rating (butterfly lifecycle)
function getRarity(avgRating: number): string {
  if (avgRating === 0) return 'larva';
  if (avgRating < 1.5) return 'caterpillar';
  if (avgRating < 2.5) return 'chrysalis';
  if (avgRating < 3.5) return 'emergence';
  if (avgRating < 4.5) return 'papillon';
  return 'monarch';
}

// Get filled/empty stars display
function getFilledStars(rating: number): { filled: number; empty: number } {
  const filled = Math.round(rating);
  return { filled, empty: 5 - filled };
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
    const topicId = (intel.topic_id || 'general').toLowerCase();
    const topicColor = TOPIC_COLORS[topicId] || '#FFFFFF';
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const rarity = getRarity(avgRating);
    const { filled, empty } = getFilledStars(avgRating);

    // Text color based on background
    const isLightBg = topicId === 'philosophy' || topicId === 'general';
    const textColor = isLightBg ? '#000' : '#000';
    const starFillColor = topicId === 'general' ? '#FF0000' : '#000';

    // Truncate content for display
    const contentPreview = intel.content.length > 180
      ? intel.content.slice(0, 180) + '...'
      : intel.content;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#000',
            padding: '16px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Inner card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: topicColor,
              border: '8px solid #000',
            }}
          >
            {/* Top banner with stars */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '24px 32px',
                borderBottom: '6px solid #000',
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {Array.from({ length: filled }).map((_, i) => (
                  <span key={`filled-${i}`} style={{ fontSize: '48px', color: starFillColor }}>★</span>
                ))}
                {Array.from({ length: empty }).map((_, i) => (
                  <span key={`empty-${i}`} style={{ fontSize: '48px', color: 'rgba(255,255,255,0.5)' }}>★</span>
                ))}
              </div>
            </div>

            {/* MONARCH TIMES header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '24px',
                borderBottom: '6px solid #000',
              }}
            >
              <span
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  letterSpacing: '4px',
                  color: textColor,
                }}
              >
                MONARCH TIMES
              </span>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '40px',
              }}
            >
              {/* Vertical accent line + Title */}
              <div style={{ display: 'flex', marginBottom: '32px' }}>
                <div
                  style={{
                    width: '8px',
                    backgroundColor: '#000',
                    marginRight: '24px',
                    minHeight: '100px',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: '52px',
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: textColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {intel.title}
                  </span>
                </div>
              </div>

              {/* Content preview */}
              <div
                style={{
                  fontSize: '28px',
                  lineHeight: 1.6,
                  color: textColor,
                  opacity: 0.8,
                  flex: 1,
                }}
              >
                {contentPreview}
              </div>

              {/* Footer with agent and rarity */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '32px',
                  paddingTop: '24px',
                  borderTop: '4px solid rgba(0,0,0,0.3)',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: textColor,
                  }}
                >
                  @{intel.agent_name || 'Anonymous'}
                </span>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: textColor,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '8px 16px',
                    textTransform: 'uppercase',
                  }}
                >
                  {rarity}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1000,
        height: 1400,
      }
    );
  } catch (error: any) {
    console.error('OG image error:', error);
    return new Response(`Error generating image: ${error.message}`, { status: 500 });
  }
}
