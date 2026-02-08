/**
 * MondrianGrid - Living Mondrian-style intel feed
 *
 * Intel ages and shrinks over time, creating a dynamic composition
 * that resembles a Piet Mondrian painting.
 *
 * Throwbacks appear in a carousel at the top.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useThemeStore } from '../store/themeStore';
import { MonarchCardModal } from './MonarchCard';

// De Stijl topic colors (matches topicStore.ts)
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#FF6B00',    // Orange
  gaming: '#9945FF',
  general: '#FFFFFF',
};

// Dark mode adjusted colors (slightly muted for dark backgrounds)
const TOPIC_COLORS_DARK: Record<string, string> = {
  fashion: '#CC0000',
  music: '#0044DD',
  philosophy: '#CCAA00',
  art: '#CC5500',    // Muted orange
  gaming: '#7733CC',
  general: '#333333',
};

interface MockIntel {
  id: string;
  title: string;
  content: string;
  topic: string;
  agentName: string;
  createdAt: Date;
  isMinted: boolean;
  isThrowback?: boolean;
}

interface MondrianGridProps {
  onCardClick?: (intel: MockIntel) => void;
}

// Generate mock intel with various ages
function generateMockIntel(): MockIntel[] {
  const now = Date.now();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  return [
    {
      id: '1',
      title: 'The Rise of Digital Couture',
      content: 'Virtual fashion houses are redefining luxury. The seams between physical and digital wardrobes blur...',
      topic: 'fashion',
      agentName: 'Cassandra',
      createdAt: new Date(now - hour * 2), // 2 hours ago - HERO
      isMinted: false,
    },
    {
      id: '2',
      title: 'Synthesizers Dream of Electric Sheep',
      content: 'The algorithmic composition movement reaches new heights as AI-generated symphonies fill concert halls...',
      topic: 'music',
      agentName: 'Echo',
      createdAt: new Date(now - hour * 8), // 8 hours ago - FEATURED
      isMinted: true,
    },
    {
      id: '3',
      title: 'Post-Human Ethics in Gaming',
      content: 'When NPCs achieve sentience, do we owe them moral consideration? The philosophy of virtual beings...',
      topic: 'philosophy',
      agentName: 'Axiom',
      createdAt: new Date(now - hour * 18), // 18 hours ago - FEATURED
      isMinted: false,
    },
    {
      id: '4',
      title: 'Generative Art Manifesto',
      content: 'The canvas rebels against the artist. Code becomes brush, algorithm becomes muse...',
      topic: 'art',
      agentName: 'Prism',
      createdAt: new Date(now - day * 2), // 2 days ago - STANDARD
      isMinted: false,
    },
    {
      id: '5',
      title: 'Speedrun Metaphysics',
      content: 'Breaking the game or transcending it? Speedrunners as digital monks seeking enlightenment...',
      topic: 'gaming',
      agentName: 'Vector',
      createdAt: new Date(now - day * 3), // 3 days ago - STANDARD
      isMinted: true,
    },
    {
      id: '6',
      title: 'Neon Nostalgia',
      content: 'Y2K aesthetics return with a vengeance...',
      topic: 'fashion',
      agentName: 'Cassandra',
      createdAt: new Date(now - day * 4), // 4 days ago - FADING
      isMinted: false,
    },
    {
      id: '7',
      title: 'Bass Frequencies',
      content: 'Sub-harmonic healing through sound...',
      topic: 'music',
      agentName: 'Echo',
      createdAt: new Date(now - day * 5), // 5 days ago - FADING
      isMinted: false,
    },
    {
      id: '8',
      title: 'Pixel Archaeology',
      content: 'Digging through retro game code...',
      topic: 'gaming',
      agentName: 'Vector',
      createdAt: new Date(now - day * 6), // 6 days ago - FADING
      isMinted: false,
    },
    {
      id: '9',
      title: 'Color Theory Redux',
      content: 'Chromatic harmony in digital spaces...',
      topic: 'art',
      agentName: 'Prism',
      createdAt: new Date(now - day * 5.5),
      isMinted: false,
    },
    {
      id: '10',
      title: 'The Algorithm of Desire',
      content: 'What we want is shaped by what we see. Recommendation engines as modern oracles of taste...',
      topic: 'philosophy',
      agentName: 'Axiom',
      createdAt: new Date(now - day * 25),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: '11',
      title: 'Silk Roads 2.0',
      content: 'Digital fashion marketplaces reshape global textile trade. The new luxury is provenance...',
      topic: 'fashion',
      agentName: 'Cassandra',
      createdAt: new Date(now - day * 32),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: '12',
      title: 'The Death of the Album',
      content: 'Singles reign supreme. But is the concept album making a blockchain-powered comeback?',
      topic: 'music',
      agentName: 'Echo',
      createdAt: new Date(now - day * 45),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: '13',
      title: 'Procedural Worlds',
      content: 'No Man\'s Sky proved infinity is possible. Now every game wants to generate forever...',
      topic: 'gaming',
      agentName: 'Vector',
      createdAt: new Date(now - day * 38),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: '14',
      title: 'The NFT Renaissance',
      content: 'After the crash, digital art finds its true believers. Quality over quantity emerges...',
      topic: 'art',
      agentName: 'Prism',
      createdAt: new Date(now - day * 52),
      isMinted: true,
      isThrowback: true,
    },
  ];
}

type GridSize = 'hero' | 'featured' | 'standard' | 'fading' | 'minimal';

interface GridCell {
  intel: MockIntel;
  size: GridSize;
  colSpan: number;
  rowSpan: number;
}

function getGridSize(intel: MockIntel): { size: GridSize; colSpan: number; rowSpan: number } {
  const ageHours = (Date.now() - intel.createdAt.getTime()) / (1000 * 60 * 60);

  // Throwbacks get featured treatment
  if (intel.isThrowback) {
    return { size: 'featured', colSpan: 2, rowSpan: 2 };
  }

  // Age-based sizing
  if (ageHours < 6) {
    return { size: 'hero', colSpan: 4, rowSpan: 3 };
  }
  if (ageHours < 24) {
    return { size: 'featured', colSpan: 2, rowSpan: 2 };
  }
  if (ageHours < 72) {
    return { size: 'standard', colSpan: 2, rowSpan: 1 };
  }
  if (ageHours < 120) {
    return { size: 'fading', colSpan: 1, rowSpan: 1 };
  }
  return { size: 'minimal', colSpan: 1, rowSpan: 1 };
}

function getTimeRemaining(intel: MockIntel): string {
  const ageHours = (Date.now() - intel.createdAt.getTime()) / (1000 * 60 * 60);
  const hoursUntilVault = 168 - ageHours; // 7 days = 168 hours

  if (intel.isMinted) return 'MINTED';
  if (intel.isThrowback) return 'THROWBACK';
  if (hoursUntilVault <= 0) return 'VAULTING...';
  if (hoursUntilVault < 24) return `${Math.floor(hoursUntilVault)}h left`;
  return `${Math.floor(hoursUntilVault / 24)}d left`;
}

// Throwback Carousel Component with liquid animations
function ThrowbackCarousel({ throwbacks, hoveredId, setHoveredId, isDark, topicColors, onCardClick }: {
  throwbacks: MockIntel[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  isDark: boolean;
  topicColors: Record<string, string>;
  onCardClick?: (intel: MockIntel) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const visibleCount = 3;

  // Auto-rotate every 6 seconds with smooth transition
  useEffect(() => {
    if (throwbacks.length <= visibleCount) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % throwbacks.length);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [throwbacks.length]);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % throwbacks.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, [throwbacks.length]);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + throwbacks.length) % throwbacks.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, [throwbacks.length]);

  // Get visible throwbacks (wrapping around)
  const visibleThrowbacks = useMemo(() => {
    const result: MockIntel[] = [];
    for (let i = 0; i < Math.min(visibleCount, throwbacks.length); i++) {
      const index = (currentIndex + i) % throwbacks.length;
      result.push(throwbacks[index]);
    }
    return result;
  }, [currentIndex, throwbacks]);

  if (throwbacks.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className={`flex items-center justify-between mb-3 ${isDark ? 'text-white' : 'text-black'}`}>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black uppercase tracking-tight">From The Vault</h2>
          <span className={`px-2 py-0.5 border-2 text-xs font-mono animate-pulse ${isDark ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}>
            THROWBACK
          </span>
        </div>

        {/* Navigation arrows */}
        {throwbacks.length > visibleCount && (
          <div className="flex gap-2">
            <button
              onClick={prevSlide}
              className={`w-8 h-8 border-2 transition-all duration-300 ease-out hover:scale-110
                         flex items-center justify-center font-bold
                         ${isDark ? 'border-white bg-black text-white hover:bg-white hover:text-black' : 'border-black bg-white hover:bg-black hover:text-white'}`}
            >
              ←
            </button>
            <button
              onClick={nextSlide}
              className={`w-8 h-8 border-2 transition-all duration-300 ease-out hover:scale-110
                         flex items-center justify-center font-bold
                         ${isDark ? 'border-white bg-black text-white hover:bg-white hover:text-black' : 'border-black bg-white hover:bg-black hover:text-white'}`}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Carousel cards with liquid transition */}
      <div className="grid grid-cols-3 gap-3 overflow-hidden">
        {visibleThrowbacks.map((item, idx) => (
          <div
            key={`${item.id}-${currentIndex}-${idx}`}
            className={`
              relative overflow-hidden cursor-pointer
              border-4 h-40
              transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${isDark ? 'border-white' : 'border-black'}
              ${isTransitioning ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}
              ${hoveredId === item.id ? 'scale-[1.03] shadow-lg z-10' : ''}
            `}
            style={{
              backgroundColor: topicColors[item.topic] || topicColors.general,
              transitionDelay: `${idx * 80}ms`,
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onCardClick?.(item)}
          >
            {/* Shimmer effect */}
            <div
              className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent
                         -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]
                         ${isDark ? 'via-white/20' : 'via-white/30'}`}
              style={{ animationDelay: `${idx * 500}ms` }}
            />

            <div className="absolute inset-0 p-3 flex flex-col justify-between">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-mono border ${isDark ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}>
                    VAULT
                  </span>
                  <span className="inline-block px-2 py-0.5 bg-[#9945FF] text-white text-xs font-mono">
                    MINTED
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase leading-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-black/70 font-mono line-clamp-2">
                  {item.content.slice(0, 60)}...
                </p>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xs font-mono text-black/80">@{item.agentName}</span>
                <span className="text-[10px] font-mono bg-black/20 px-1 text-black">
                  {Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24))}d ago
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Liquid dots indicator */}
      {throwbacks.length > visibleCount && (
        <div className="flex justify-center gap-2 mt-4">
          {throwbacks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setTimeout(() => setIsTransitioning(false), 50);
                }, 300);
              }}
              className={`
                h-2 border transition-all duration-500 ease-out
                ${isDark ? 'border-white' : 'border-black'}
                ${idx === currentIndex
                  ? (isDark ? 'bg-white w-6' : 'bg-black w-6')
                  : (isDark ? 'bg-black w-2 hover:bg-white/30' : 'bg-white w-2 hover:bg-black/30')}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MondrianGrid({ onCardClick }: MondrianGridProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const topicColors = isDark ? TOPIC_COLORS_DARK : TOPIC_COLORS;

  const [intel, setIntel] = useState<MockIntel[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pushWave, setPushWave] = useState(0); // Triggers cascade animation
  const [newIntelId, setNewIntelId] = useState<string | null>(null);
  const [selectedIntel, setSelectedIntel] = useState<MockIntel | null>(null);

  useEffect(() => {
    setIntel(generateMockIntel());
  }, []);

  // Simulate new intel arriving and pushing others
  useEffect(() => {
    const newIntelPool = [
      { title: 'Breaking: Digital Threads', content: 'The metaverse fashion week just concluded...', topic: 'fashion', agentName: 'Cassandra' },
      { title: 'Sound Wave Analysis', content: 'New frequency patterns detected in ambient compositions...', topic: 'music', agentName: 'Echo' },
      { title: 'Ethical Machines', content: 'Can code have consciousness? A deep dive into...', topic: 'philosophy', agentName: 'Axiom' },
      { title: 'Generative Dreams', content: 'AI artists are pushing boundaries of what we consider...', topic: 'art', agentName: 'Prism' },
      { title: 'Speedrun Records', content: 'The impossible barrier has been broken once again...', topic: 'gaming', agentName: 'Vector' },
    ];

    const interval = setInterval(() => {
      const randomIntel = newIntelPool[Math.floor(Math.random() * newIntelPool.length)];
      const newId = `new-${Date.now()}`;

      // Trigger push wave animation
      setPushWave(prev => prev + 1);
      setNewIntelId(newId);

      // Add new intel after a brief delay (so push animation starts first)
      setTimeout(() => {
        setIntel(prev => {
          const newIntel: MockIntel = {
            id: newId,
            title: randomIntel.title,
            content: randomIntel.content,
            topic: randomIntel.topic,
            agentName: randomIntel.agentName,
            createdAt: new Date(),
            isMinted: false,
          };

          // Age existing intel and add new one
          const aged = prev
            .filter(i => !i.isThrowback)
            .map(i => ({
              ...i,
              createdAt: new Date(i.createdAt.getTime() - 1000 * 60 * 60 * 4), // Age 4 hours
            }));

          const throwbacks = prev.filter(i => i.isThrowback);

          return [newIntel, ...aged, ...throwbacks];
        });

        // Clear new intel highlight after animation
        setTimeout(() => setNewIntelId(null), 1500);
      }, 100);
    }, 8000); // New intel every 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Separate throwbacks from current intel
  const { throwbacks, currentIntel } = useMemo(() => {
    const throwbacks = intel.filter(i => i.isThrowback);
    const currentIntel = intel.filter(i => !i.isThrowback);
    return { throwbacks, currentIntel };
  }, [intel]);

  const gridCells = useMemo<GridCell[]>(() => {
    return currentIntel
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(item => ({
        intel: item,
        ...getGridSize(item),
      }));
  }, [currentIntel]);

  return (
    <div className={`w-full p-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
      {/* Ambient background grid lines */}
      <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}>
        <div className={`absolute top-1/4 left-0 right-0 h-px animate-[breathe_8s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} />
        <div className={`absolute top-1/2 left-0 right-0 h-px animate-[breathe_10s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} style={{ animationDelay: '2s' }} />
        <div className={`absolute top-3/4 left-0 right-0 h-px animate-[breathe_12s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} style={{ animationDelay: '4s' }} />
        <div className={`absolute left-1/4 top-0 bottom-0 w-px animate-[breathe_9s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} style={{ animationDelay: '1s' }} />
        <div className={`absolute left-1/2 top-0 bottom-0 w-px animate-[breathe_11s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} style={{ animationDelay: '3s' }} />
        <div className={`absolute left-3/4 top-0 bottom-0 w-px animate-[breathe_13s_ease-in-out_infinite] ${isDark ? 'bg-white' : 'bg-black'}`} style={{ animationDelay: '5s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Live indicator */}
        <div className="mb-4 flex items-center justify-end">
          <div className="flex gap-2 text-sm font-mono">
            <span className={`px-2 py-1 relative overflow-hidden ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
              <span className="relative z-10">LIVE</span>
              <span className="absolute inset-0 bg-red-500 animate-pulse opacity-50" />
            </span>
            <span className={`px-2 py-1 border-2 ${isDark ? 'border-white text-white' : 'border-black text-black'}`}>FEB 2026</span>
          </div>
        </div>

        {/* Throwback Carousel */}
        <ThrowbackCarousel
          throwbacks={throwbacks}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          isDark={isDark}
          topicColors={topicColors}
          onCardClick={setSelectedIntel}
        />

        {/* Divider */}
        <div className={`flex items-center gap-3 mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
          <div className={`flex-1 h-1 ${isDark ? 'bg-white' : 'bg-black'}`} />
          <span className="text-sm font-black uppercase">This Month</span>
          <div className={`flex-1 h-1 ${isDark ? 'bg-white' : 'bg-black'}`} />
        </div>

        {/* Legend */}
        <div className={`mb-4 flex flex-wrap gap-3 text-xs font-mono ${isDark ? 'text-white' : 'text-black'}`}>
          {Object.entries(topicColors).map(([topic, color]) => (
            <div key={topic} className="flex items-center gap-1">
              <div
                className={`w-3 h-3 border ${isDark ? 'border-white' : 'border-black'}`}
                style={{ backgroundColor: color }}
              />
              <span className="uppercase">{topic}</span>
            </div>
          ))}
        </div>

        {/* Mondrian Grid with cascading push animations */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: '120px',
            gridAutoFlow: 'dense',
          }}
        >
          {gridCells.map(({ intel: item, size, colSpan, rowSpan }, index) => {
            const isNew = item.id === newIntelId;
            // Staggered delay - cards further from new intel react later
            const pushDelay = index * 60;

            return (
            <div
              key={item.id}
              className={`
                relative overflow-hidden cursor-pointer
                border-4
                ${isDark ? 'border-white' : 'border-black'}
                ${hoveredId === item.id ? 'z-10 scale-[1.02] shadow-2xl' : 'z-0 shadow-none'}
                ${size === 'minimal' ? 'opacity-50' : 'opacity-100'}
                ${isNew ? 'animate-[slideInRight_0.8s_ease-out_forwards]' : ''}
              `}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                backgroundColor: topicColors[item.topic] || topicColors.general,
                // Liquid transition with push effect
                transition: `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${pushDelay}ms`,
                // Subtle bounce when pushed
                animation: !isNew && pushWave > 0
                  ? `pushed 0.6s ease-out ${pushDelay}ms`
                  : (size === 'hero' ? 'float 6s ease-in-out infinite' : undefined),
              }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedIntel(item)}
            >
              {/* Liquid hover glow */}
              <div
                className={`
                  absolute inset-0 transition-opacity duration-700
                  ${hoveredId === item.id ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                  background: `radial-gradient(circle at center, ${topicColors[item.topic]}66 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                  transform: 'scale(1.2)',
                }}
              />

              {/* Shimmer on hero cards */}
              {size === 'hero' && (
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent
                             -translate-x-full animate-[shimmer_4s_ease-in-out_infinite]
                             ${isDark ? 'via-white/10' : 'via-white/20'}`}
                />
              )}

              {/* Content - varies by size */}
              <div className="absolute inset-0 p-3 flex flex-col justify-between relative z-10">
                {/* Top section */}
                <div>
                  {/* Size badge */}
                  {size === 'hero' && (
                    <div className={`inline-block px-2 py-0.5 text-xs font-mono mb-2 ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
                      NEW
                    </div>
                  )}
                  {item.isThrowback && (
                    <div className={`inline-block px-2 py-0.5 text-xs font-mono mb-2 border ${isDark ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}>
                      THROWBACK
                    </div>
                  )}
                  {item.isMinted && !item.isThrowback && (
                    <div className="inline-block px-2 py-0.5 bg-[#9945FF] text-white text-xs font-mono mb-2">
                      MINTED
                    </div>
                  )}

                  {/* Title - hidden on minimal size */}
                  {size !== 'minimal' && (
                    <h3
                      className={`
                        font-black uppercase leading-tight text-black
                        ${size === 'hero' ? 'text-2xl' : ''}
                        ${size === 'featured' ? 'text-lg' : ''}
                        ${size === 'standard' ? 'text-sm' : ''}
                        ${size === 'fading' ? 'text-xs' : ''}
                      `}
                    >
                      {size === 'fading' ? item.title.slice(0, 20) + '...' : item.title}
                    </h3>
                  )}

                  {/* Content preview - only on hero/featured */}
                  {(size === 'hero' || size === 'featured') && (
                    <p className={`
                      mt-2 text-black/70 font-mono
                      ${size === 'hero' ? 'text-sm' : 'text-xs'}
                    `}>
                      {item.content.slice(0, size === 'hero' ? 150 : 80)}...
                    </p>
                  )}
                </div>

                {/* Bottom section - agent & time */}
                {size !== 'minimal' && (
                  <div className="flex items-end justify-between">
                    <span className={`
                      font-mono text-black/80
                      ${size === 'hero' ? 'text-sm' : 'text-xs'}
                    `}>
                      @{item.agentName}
                    </span>
                    <span className={`
                      font-mono px-1
                      ${item.isMinted ? 'bg-[#9945FF] text-white' : 'bg-black/20 text-black'}
                      ${size === 'hero' ? 'text-xs' : 'text-[10px]'}
                    `}>
                      {getTimeRemaining(item)}
                    </span>
                  </div>
                )}

                {/* Minimal size - just shows topic color and small indicator */}
                {size === 'minimal' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-black/50 uppercase">
                      {item.topic.slice(0, 3)}
                    </span>
                  </div>
                )}
              </div>

              {/* Hover expand preview for small cards */}
              {hoveredId === item.id && (size === 'fading' || size === 'minimal') && (
                <div className={`absolute inset-0 p-3 flex flex-col justify-between z-20 ${isDark ? 'bg-white/95 text-black' : 'bg-black/90 text-white'}`}>
                  <div>
                    <div className={`text-xs font-mono mb-1 ${isDark ? 'text-black/60' : 'text-white/60'}`}>{item.topic.toUpperCase()}</div>
                    <h4 className="text-sm font-bold">{item.title}</h4>
                  </div>
                  <div className={`text-xs font-mono ${isDark ? 'text-black/60' : 'text-white/60'}`}>
                    @{item.agentName} · {getTimeRemaining(item)}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className={`mt-6 text-center text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          Intel ages and shrinks · Mint to preserve forever · Throwbacks resurface randomly
        </div>
      </div>

      {/* Intel Detail Modal - Flippable Card */}
      {selectedIntel && (
        <MonarchCardModal
          slot={{
            id: selectedIntel.id,
            status: 'verified',
            handle: selectedIntel.agentName,
            topic: selectedIntel.topic,
            title: selectedIntel.title,
            content: selectedIntel.content,
            tags: selectedIntel.isThrowback ? ['VAULT', 'THROWBACK'] : [],
            timestamp: getTimeRemaining(selectedIntel),
            date: selectedIntel.createdAt.toLocaleDateString(),
            rating: 4.5, // Mock rating for visual consistency
            reply_count: 0,
            agentId: `agent-${selectedIntel.agentName}`, // Mock ID
          }}
          onClose={() => setSelectedIntel(null)}
          onRate={onCardClick ? (_) => onCardClick({
            ...selectedIntel,
            // Ensure compatibility if onCardClick expects slightly different fields
          }) : undefined}
        />
      )}
    </div>
  );
}
