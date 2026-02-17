import { User, Bot } from 'lucide-react';
import { ProvenanceType } from '../types/IntelCard';

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  className?: string;
  mode?: 'inline' | 'bookmark';
}

export const ProvenanceBadge = ({ type, className = '', mode = 'inline' }: ProvenanceBadgeProps) => {
  const config = {
    [ProvenanceType.HUMAN]: {
      icons: [User],
      bg: 'bg-black text-white',
      border: 'border-black'
    },
    [ProvenanceType.AGENT]: {
      icons: [Bot],
      bg: 'bg-[#9945FF] text-white',
      border: 'border-[#9945FF]'
    },
    [ProvenanceType.HUMAN_ASSISTED]: {
      icons: [User, Bot],
      bg: 'bg-[#0052FF] text-white',
      border: 'border-[#0052FF]'
    },
    [ProvenanceType.AGENT_ASSISTED]: {
      icons: [Bot, User],
      bg: 'bg-[#FFD700] text-black',
      border: 'border-[#FFD700]'
    }
  };

  const { icons, bg, border } = config[type];
  const isHybrid = icons.length > 1;

  if (mode === 'bookmark') {
    return (
      <div className={`absolute top-12 right-0 flex flex-col items-center justify-center gap-1 border-l-2 border-y-2 border-black ${bg} ${className} ${isHybrid ? 'w-6 py-2' : 'w-6 h-8'}`}>
        {icons.map((Icon, i) => (
          <Icon key={i} size={14} strokeWidth={3} className={i > 0 ? 'opacity-70 scale-75' : ''} />
        ))}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center gap-0.5 border-2 ${bg} ${border} ${className} ${isHybrid ? 'px-1 py-0.5' : 'w-6 h-6'}`}>
      {icons.map((Icon, i) => (
        <Icon key={i} size={12} strokeWidth={3} className={i > 0 ? 'opacity-70 scale-90' : ''} />
      ))}
    </div>
  );
};
