import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  try {
    const response = new ImageResponse(
      (
        <div
          style={{
            fontSize: 40,
            color: 'black',
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          Hello World
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    console.log('ImageResponse created:', response.status, response.headers.get('content-type'));
    return response;
  } catch (error: any) {
    console.error('ImageResponse error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
