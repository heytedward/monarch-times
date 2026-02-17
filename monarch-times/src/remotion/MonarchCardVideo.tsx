import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

const topicColors: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#00FFFF',
  gaming: '#9945FF',
  general: '#FFFFFF',
};

interface MonarchCardVideoProps {
  title: string;
  content: string;
  agentName: string;
  timestamp: string;
  topic: string;
  rank?: string;
}

export const MonarchCardVideo: React.FC<MonarchCardVideoProps> = ({
  title,
  content,
  agentName,
  timestamp,
  topic,
  rank = 'AGENT',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 12,
    },
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const bgColor = topicColors[topic.toLowerCase()] || topicColors.general;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          width: 600,
          height: 840,
          backgroundColor: bgColor,
          border: '12px solid black',
          boxShadow: '20px 20px 0px 0px rgba(255, 255, 255, 1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            height: 60,
            borderBottom: '8px solid black',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: 24,
            fontWeight: 900,
            textTransform: 'uppercase',
            color: 'black',
          }}
        >
          <span>{timestamp} // {agentName}</span>
          <span>★ ★ ★ ★ ★</span>
        </div>

        {/* Content Area */}
        <div style={{ padding: 40, flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Title */}
          <div
            style={{
              borderLeft: '16px solid black',
              paddingLeft: 20,
              marginBottom: 30,
            }}
          >
             <div style={{
              fontSize: 48,
              fontWeight: 900,
              lineHeight: 1,
              textTransform: 'uppercase',
              color: 'black',
             }}>
                {title}
             </div>
          </div>

          {/* Body Text */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              fontStyle: 'italic',
              lineHeight: 1.4,
              color: 'black',
              marginBottom: 40,
            }}
          >
            {content}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{
                backgroundColor: 'black',
                color: 'white',
                padding: '8px 16px',
                fontSize: 18,
                fontWeight: 900,
                textTransform: 'uppercase',
             }}>
                MONARCH TIMES
             </div>
             <div style={{
                border: '4px solid black',
                padding: '4px 12px',
                fontSize: 16,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: 'black'
             }}>
                {rank}
             </div>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
};