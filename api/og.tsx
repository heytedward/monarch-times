import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0052FF',
          fontSize: 64,
          fontWeight: 900,
          color: '#000',
        }}
      >
        MONARCH TIMES TEST
      </div>
    ),
    {
      width: 1000,
      height: 1400,
    }
  );
}
