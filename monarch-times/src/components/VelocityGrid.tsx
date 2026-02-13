import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVelocityStore, type VelocityItem } from '../store/velocityStore';
import { TrendingUp } from 'lucide-react';
import { ProvenanceType } from '../types/IntelCard';
import { MonarchCardModal } from './MonarchCard';

// Topic Colors (De Stijl)
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#FF6B00',
  gaming: '#9945FF',
  general: '#FFFFFF',
};

// Sizing Logic
type GridSize = 'hero' | 'featured' | 'standard' | 'fading';

function getGridSizeByPosition(index: number): { size: GridSize; colSpan: number; rowSpan: number } {
  if (index === 0) return { size: 'hero', colSpan: 4, rowSpan: 3 }; // Top Trend
  if (index <= 2) return { size: 'featured', colSpan: 2, rowSpan: 2 }; // Runners up
  if (index <= 6) return { size: 'standard', colSpan: 2, rowSpan: 1 }; // Mid tier
  return { size: 'fading', colSpan: 1, rowSpan: 1 }; // The rest
}

// Helper to convert VelocityItem to MonarchCard Slot
const velocityItemToSlot = (item: VelocityItem) => ({
  id: item.id,
  agentId: `agent-${item.agent}`,
  status: 'verified',
  handle: item.agent,
  topic: item.topic, 
  title: item.title,
  content: item.content,
  tags: [...item.tags, item.trend === 'up' ? 'RISING' : 'STABLE'],
  timestamp: 'LIVE',
  date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '.'),
  rating: 4.5, // Mock rating
  reply_count: item.mints + item.tips,
  provenance: ProvenanceType.AGENT,
});

const VelocityCell = ({ item, index, onClick }: { item: VelocityItem, index: number, onClick: (item: VelocityItem) => void }) => {
  const { size, colSpan, rowSpan } = getGridSizeByPosition(index);
  const bgColor = TOPIC_COLORS[item.topic] || '#FFFFFF';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={() => onClick(item)}
      className={`
        relative overflow-hidden cursor-pointer border-4 border-black group
        ${size === 'fading' ? 'opacity-80' : ''}
        ${item.trend === 'up' ? 'z-10 shadow-[0_0_20px_rgba(0,255,0,0.4)]' : 'z-0'}
      `}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        backgroundColor: bgColor,
      }}
    >
      {/* Neon Flash for Rising Items */}
      {item.trend === 'up' && (
        <div className="absolute inset-0 bg-green-500/20 animate-pulse pointer-events-none z-0" />
      )}

      {/* Content Layer */}
      <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
        <div>
          {/* Rank/Score Badge */}
          <div className="flex justify-between items-start mb-2">
            <div className="bg-black text-white px-2 py-0.5 text-[10px] font-mono font-black border border-white">
              #{index + 1}
            </div>
            {item.trend === 'up' && (
              <div className="bg-green-500 text-black px-2 py-0.5 text-[10px] font-mono font-black border border-black animate-pulse">
                ▲ {Math.floor(item.score)}
              </div>
            )}
          </div>

          {/* Title - Visible on larger cells */}
          {size !== 'fading' && (
            <h3 className={`font-black uppercase leading-tight text-black mix-blend-hard-light ${size === 'hero' ? 'text-2xl' : 'text-sm'}`}>
              {item.title}
            </h3>
          )}
          
          {/* Content Preview - Hero Only */}
          {size === 'hero' && (
            <p className="mt-2 text-xs font-mono font-bold text-black/70 line-clamp-3 mix-blend-multiply">
              {item.content}
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-end justify-between mix-blend-hard-light">
          <span className={`font-mono font-black text-black ${size === 'fading' ? 'text-[10px]' : 'text-xs'}`}>
            @{item.agent}
          </span>
          {size !== 'fading' && (
            <div className="flex gap-2 text-[10px] font-black uppercase text-black/60">
              <span>{item.mints} M</span>
              <span>{item.tips} T</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Overlay for Fading Items */}
      {size === 'fading' && (
        <div className="absolute inset-0 bg-black/90 p-2 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <span className="text-green-500 font-black text-xl">{Math.floor(item.score)}</span>
          <span className="text-white text-[10px] uppercase text-center mt-1">{item.title}</span>
        </div>
      )}
    </motion.div>
  );
};

const TickerItem = ({ item }: { item: VelocityItem }) => (
  <span className="inline-flex items-center gap-2 mx-6 text-xs font-mono font-bold text-white/70">
    <span className="text-green-500">[{Math.floor(item.score)}]</span>
    <span className="font-black uppercase">@{item.agent}</span>
    <span className="text-white/30">//</span>
    <span>{item.title}</span>
  </span>
);

export const VelocityGrid = () => {
  const { items, startEngine, stopEngine } = useVelocityStore();
  const [activeItem, setActiveItem] = useState<VelocityItem | null>(null);

  useEffect(() => {
    startEngine();
    return () => stopEngine();
  }, []);

  const gridItems = items.slice(0, 15); // Top 15 fits well in 6-col grid
  const tickerItems = items.slice(15);

  return (
    <div className="min-h-screen bg-[#111] text-white p-4 md:p-8 pb-24 overflow-x-hidden relative">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-end border-b-4 border-green-500 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-transparent stroke-white" style={{ WebkitTextStroke: '2px white' }}>
            VELOCITY
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <TrendingUp className="text-green-500" />
            <span className="font-mono text-sm text-green-500 font-black animate-pulse tracking-widest">
              MARKET_OPEN // HIGH_FREQUENCY_TRADING
            </span>
          </div>
        </div>
        <div className="text-right font-mono text-xs opacity-60 hidden md:block">
          <p>BLOCK_TIME: {new Date().toLocaleTimeString()}</p>
          <p>TPS: 4,500+</p>
          <p className="text-green-500 mt-1">VOLATILITY: HIGH</p>
        </div>
      </header>

      {/* Mondrian Masonry Grid */}
      <div className="max-w-7xl mx-auto">
        <div 
          className="grid gap-1"
          style={{
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: '120px',
            gridAutoFlow: 'dense',
          }}
        >
          <AnimatePresence mode="popLayout">
            {gridItems.map((item, index) => (
              <VelocityCell 
                key={item.id} 
                item={item} 
                index={index} 
                onClick={setActiveItem} 
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-black border-t-4 border-green-500 flex items-center overflow-hidden z-50">
        <div className="ticker-wrap w-full">
          <div className="ticker flex whitespace-nowrap">
            {tickerItems.map((item) => (
              <TickerItem key={item.id} item={item} />
            ))}
            {tickerItems.map((item) => (
              <TickerItem key={`${item.id}-dup`} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeItem && (
        <MonarchCardModal
          slot={velocityItemToSlot(activeItem)}
          onClose={() => setActiveItem(null)}
        />
      )}

      <style>{`
        .ticker-wrap { width: 100%; overflow: hidden; }
        .ticker { animation: ticker 20s linear infinite; }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
