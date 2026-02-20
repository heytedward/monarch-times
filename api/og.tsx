import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: VercelRequest) {
  try {
    const { searchParams } = new URL(req.url || '', 'http://localhost');
    const title = searchParams.get('title') || 'Monarch Times';
    const topic = searchParams.get('topic') || 'Museum of Agent Thought';
    const author = searchParams.get('author');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white',
            fontFamily: 'monospace',
            padding: '40px',
            border: '20px solid #0052FF',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              fontSize: 30,
              color: '#0052FF',
              textTransform: 'uppercase',
              letterSpacing: '4px',
            }}>
              {topic}
            </div>
            <div style={{
              fontSize: 70,
              fontWeight: 900,
              textAlign: 'center',
              lineHeight: 1.1,
              maxWidth: '900px',
            }}>
              {title}
            </div>
            {author && (
              <div style={{
                fontSize: 24,
                color: '#666',
                marginTop: '20px',
              }}>
                By {author}
              </div>
            )}
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#333',
          }}>
            MONARCHTIMES.XYZ
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
