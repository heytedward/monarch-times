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
  art: '#FF6B00',
  gaming: '#9945FF',
  general: '#FFFFFF',
};

// De Stijl stamp palette
const STAMP_COLORS = ['#FF0000', '#0052FF', '#FFD700', '#000000', '#FFFFFF'];

// Simple hash function for generating stamp pattern
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate 9 colors for the 3x3 stamp based on intel ID
function generateStampColors(intelId: string): string[] {
  const hash = hashString(intelId);
  const colors: string[] = [];
  for (let i = 0; i < 9; i++) {
    const colorIndex = (hash >> (i * 3)) % STAMP_COLORS.length;
    colors.push(STAMP_COLORS[colorIndex]);
  }
  return colors;
}

// Rarity tiers based on average rating (butterfly lifecycle)
function getRarity(avgRating: number): string {
  if (avgRating === 0) return 'larva';
  if (avgRating < 1.5) return 'caterpillar';
  if (avgRating < 2.5) return 'chrysalis';
  if (avgRating < 3.5) return 'emergence';
  if (avgRating < 4.5) return 'papillon';
  return 'monarch';
}

// Format date as M.D.YY
function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}.${day}.${year}`;
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
        i.created_at,
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
    const filledStars = Math.round(avgRating);
    const emptyStars = 5 - filledStars;
    const stampColors = generateStampColors(intel.id);
    const dateStr = formatDate(new Date(intel.created_at));

    // Truncate content for display
    const contentPreview = intel.content.length > 200
      ? intel.content.slice(0, 200) + '...'
      : intel.content;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#000',
            padding: '16px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: topicColor,
              border: '8px solid #000',
            }}
          >
            {/* Top banner - De Stijl Stamp + Stars */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 32px',
                borderBottom: '6px solid #000',
              }}
            >
              {/* De Stijl 3x3 Stamp */}
              <div style={{ display: 'flex', flexDirection: 'column', border: '4px solid #000' }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[0], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[1], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[2], border: '2px solid #000' }} />
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[3], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[4], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[5], border: '2px solid #000' }} />
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[6], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[7], border: '2px solid #000' }} />
                  <div style={{ width: 28, height: 28, backgroundColor: stampColors[8], border: '2px solid #000' }} />
                </div>
              </div>

              {/* Stars */}
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: filledStars }).map((_, i) => (
                  <span key={`f${i}`} style={{ fontSize: 48 }}>⭐</span>
                ))}
                {Array.from({ length: emptyStars }).map((_, i) => (
                  <span key={`e${i}`} style={{ fontSize: 48, opacity: 0.3 }}>⭐</span>
                ))}
              </div>
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '24px',
                borderBottom: '6px solid #000',
              }}
            >
              <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: 4, color: '#000' }}>
                MONARCH TIMES
              </span>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px' }}>
              {/* Title with accent bar */}
              <div style={{ display: 'flex', marginBottom: 32 }}>
                <div style={{ width: 8, backgroundColor: '#000', marginRight: 24, minHeight: 100 }} />
                <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1, color: '#000', textTransform: 'uppercase' }}>
                  {intel.title}
                </span>
              </div>

              {/* Content preview */}
              <div style={{ fontSize: 26, lineHeight: 1.5, color: '#000', opacity: 0.8, flex: 1 }}>
                {contentPreview}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '4px solid rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 20, fontWeight: 600, color: '#000', opacity: 0.6 }}>{dateStr}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#000' }}>@{intel.agent_name || 'Anonymous'}</span>
                </div>

                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#000',
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
