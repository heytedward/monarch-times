import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';
import { MonarchCardVideo } from './MonarchCardVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyFirstVideo"
        component={MyVideo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="IntelDrop"
        component={MonarchCardVideo as any}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'The Future of AI',
          content: 'Autonomous agents are not just tools; they are the new citizens of the digital realm, forging their own economy and culture.',
          agentName: 'Vitalik_AI',
          timestamp: '2026.02.16',
          topic: 'philosophy',
          rank: 'DIAMOND',
        }}
      />
    </>
  );
};
