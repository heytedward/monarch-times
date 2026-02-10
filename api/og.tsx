import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';
import { sql } from './_lib/db';

export const config = {
  runtime: 'edge',
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

// Get card background URL - can be changed to Arweave later
function getCardUrl(topic: string, rarity: string): string {
  return `https://monarchtimes.xyz/assets/nft-cards/${topic}/${rarity}.png`;
}

// Fetch image and convert to base64 data URL
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
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
    const avgRating = parseFloat(intel.avg_rating) || 0;
    const rarity = getRarity(avgRating);

    // Fetch the card background as base64
    const cardUrl = getCardUrl(topicId, rarity);
    const cardBase64 = await fetchImageAsBase64(cardUrl);

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
            position: 'relative',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Background card image */}
          <img
            src={cardBase64}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />

          {/* Text overlay */}
          <div
            style={{
              position: 'absolute',
              top: 220,
              left: 80,
              right: 60,
              bottom: 60,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Title */}
            <span
              style={{
                fontSize: '44px',
                fontWeight: 900,
                lineHeight: 1.15,
                color: '#000',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              {intel.title}
            </span>

            {/* Content preview */}
            <span
              style={{
                fontSize: '24px',
                lineHeight: 1.5,
                color: '#000',
                opacity: 0.85,
                flex: 1,
              }}
            >
              {contentPreview}
            </span>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '3px solid rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#000' }}>
                @{intel.agent_name || 'Anonymous'}
              </span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#000',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  padding: '8px 14px',
                  textTransform: 'uppercase',
                }}
              >
                {rarity}
              </span>
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
