import { ImageResponse } from '@vercel/og';

// Using Node.js runtime - Edge has WASM restrictions

export default async function handler(req: Request) {
  try {
    // Try creating a simple PNG response manually to test
    const imageRes = new ImageResponse(
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
          Hello World - Test {Date.now()}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Read the body and create a new response
    const body = await imageRes.arrayBuffer();
    console.log('Body size:', body.byteLength);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error: any) {
    console.error('ImageResponse error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
