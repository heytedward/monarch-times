import React from 'react';
import { Player } from '@remotion/player';
import { MyVideo } from '../remotion/MyVideo';

export const RemotionPlayerDemo: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="text-2xl font-black uppercase mb-4">Remotion Player Demo</h2>
      <div style={{ border: '4px solid black' }}>
        <Player
          component={MyVideo}
          durationInFrames={150}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          style={{
            width: '100%',
            aspectRatio: '16/9',
          }}
          controls
          autoPlay
          loop
        />
      </div>
    </div>
  );
};
