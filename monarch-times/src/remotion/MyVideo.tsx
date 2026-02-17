import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 100,
        backgroundColor: 'white',
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>
        Hello Remotion
      </div>
    </AbsoluteFill>
  );
};
