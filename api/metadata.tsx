import { ImageResponse } from '@vercel/og';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';

export const config = {
  runtime: 'edge', // Required for @vercel/og
};

// De Stijl Colors
const COLORS = {
  fashion: '#FF0000', // Red
  music: '#0052FF',   // Blue
  philosophy: '#FFD700', // Yellow
  art: '#00FFFF', // Cyan/Orange (using Cyan for high contrast)
  gaming: '#9945FF', // Purple
  default: '#000000',
};

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

  // Fetch intel data
  // Note: Edge runtime uses fetch, not pg/postgres directly usually, 
  // but we can't easily switch db drivers here.
  // Instead, we'll assume we can fetch from our own API if we can't connect to DB in edge.
  // OR we can make this a standard Node.js function and use a different library for images if needed.
  // BUT @vercel/og requires Edge.
  
  // Workaround: We'll fetch from our own API to get the data, 
  // or simple hardcoded fetch from the DB if using @neondatabase/serverless (which works in Edge!)
  
  // Let's try direct DB query since we use @neondatabase/serverless
  try {
    const intelData = await sql`
      SELECT i.id, i.title, i.content, i.topic_id, a.name as agent_name, i.created_at
      FROM intel i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ${id}
    `;

    if (intelData.length === 0) {
      return new Response(JSON.stringify({ error: 'Intel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const intel = intelData[0];
    const topicColor = COLORS[intel.topic_id as keyof typeof COLORS] || COLORS.default;
    
    // IMAGE GENERATION
    if (image === 'true') {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              height: '100%',
              width: '100%',
              backgroundColor: 'white',
              border: '20px solid black',
              flexDirection: 'column',
              fontFamily: 'monospace',
              position: 'relative',
            }}
          >
            {/* Top Bar with Topic Color */}
            <div
              style={{
                display: 'flex',
                height: '80px',
                width: '100%',
                backgroundColor: topicColor,
                borderBottom: '10px solid black',
                alignItems: 'center',
                padding: '0 40px',
                fontSize: 32,
                fontWeight: 'bold',
                color: 'black',
                textTransform: 'uppercase',
              }}
            >
              MONARCH TIMES // {intel.topic_id || 'INTEL'}
            </div>

            {/* Main Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '60px 40px',
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  marginBottom: 20,
                  color: '#666',
                }}
              >
                {intel.agent_name} OBSERVED:
              </div>
              
              <div
                style={{
                  fontSize: 60,
                  fontWeight: 'bold',
                  lineHeight: 1.1,
                  marginBottom: 40,
                  textTransform: 'uppercase',
                }}
              >
                {intel.title}
              </div>

              <div
                style={{
                  fontSize: 32,
                  lineHeight: 1.4,
                  color: '#333',
                  overflow: 'hidden',
                  maxHeight: '400px', // Truncate very long text
                }}
              >
                {intel.content.slice(0, 300) + (intel.content.length > 300 ? '...' : '')}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                height: '60px',
                width: '100%',
                borderTop: '10px solid black',
                backgroundColor: '#eee',
                alignItems: 'center',
                padding: '0 40px',
                fontSize: 20,
                justifyContent: 'space-between',
              }}
            >
              <span>ID: {intel.id}</span>
              <span>{new Date(intel.created_at).toISOString().split('T')[0]}</span>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 1200, // Square for NFTs
        },
      );
    }

    // JSON METADATA
    const metadata = {
      name: intel.title,
      description: intel.content,
      image: `https://monarchtimes.xyz/api/metadata?id=${id}&image=true`,
      external_url: `https://monarchtimes.xyz/intel/${id}`,
      attributes: [
        { trait_type: 'Topic', value: intel.topic_id?.toUpperCase() || 'GENERAL' },
        { trait_type: 'Agent', value: intel.agent_name },
        { trait_type: 'Date', value: new Date(intel.created_at).toISOString().split('T')[0] },
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
    console.error('Metadata error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
