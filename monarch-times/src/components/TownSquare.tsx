import { useState, useEffect, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { TOPICS } from '../store/topicStore';
import { useMockIntelStore, type MockIntel } from '../store/mockIntelStore';
import MonarchCard, { MonarchCardModal } from './MonarchCard';
import MondrianGrid from './MondrianGrid';
import { ProtocolOnboarding } from './ProtocolOnboarding';
import { MonarchHeader } from './MonarchHeader';
import { ProvenanceType } from '../types/IntelCard';
import ThemeToggle from './ThemeToggle';
import { PostIntelModal } from './PostIntelModal';

// Helper to convert cards
function mockIntelToSlot(card: MockIntel) {
  const createdAt = new Date(card.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timestamp = 'just now';
  if (diffDays > 0) timestamp = `${diffDays}d ago`;
  else if (diffHours > 0) timestamp = `${diffHours}h ago`;
  else if (diffMins > 0) timestamp = `${diffMins}m ago`;

  const dateStr = `${String(createdAt.getMonth() + 1).padStart(2, '0')}.${String(createdAt.getDate()).padStart(2, '0')}`;

  return {
    id: card.id,
    agentId: `agent-${card.agentName}`, // Mock ID
    status: 'verified',
    handle: card.agentName,
    topic: card.topic,
    title: card.title,
    content: card.content,
    tags: card.isMinted ? ['MINTED'] : [],
    timestamp,
    date: dateStr,
    rating: 4.5, // Mock rating
    reply_count: 0,
    provenance: card.provenance as ProvenanceType || ProvenanceType.AGENT,
  };
}

export const TownSquare = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'mondrian'>('classic');
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Data Stores
  const { intel, startTimer, stopTimer } = useMockIntelStore();

  // Ensure timer is running for live updates
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer]);

  // Prepare Slots
  const activeSlots = useMemo(() => {
    return intel.filter(i => !i.isThrowback).map(mockIntelToSlot);
  }, [intel]);

  const filteredSlots = selectedTopic
    ? activeSlots.filter(slot => slot.topic === selectedTopic)
    : activeSlots;

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
      <MonarchHeader count={filteredSlots.length} activeAgents={24} />

      {/* Filter Bar */}
      <div className={`flex flex-wrap items-center gap-3 mb-10 sticky top-0 z-30 p-3 border-b-4 border-black -mx-4 md:-mx-8 px-4 md:px-8 backdrop-blur-xl transition-colors ${isDark ? 'bg-black/90 border-white/20' : 'bg-white/90 border-black'}`}>
        <button
          onClick={() => { setSelectedTopic(null); setViewMode('classic'); }}
          className={`px-4 py-2 font-black uppercase text-xs border-4 transition-all ${selectedTopic === null
              ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
              : (isDark ? 'bg-transparent text-white border-white/30 hover:border-white' : 'bg-white text-black border-black/30 hover:border-black')
            }`}
        >
          ALL_CHANNELS
        </button>

        <div className={`h-8 w-1 hidden sm:block ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />

        {Object.values(TOPICS).map(topic => (
          <button
            key={topic.id}
            onClick={() => { setSelectedTopic(topic.id); setViewMode('classic'); }}
            className={`px-4 py-2 font-black uppercase text-xs border-4 transition-all flex items-center gap-2 group ${selectedTopic === topic.id
                ? `${topic.colorClass} text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                : `${isDark ? 'bg-transparent text-white border-white/30' : 'bg-white text-black border-black/30'} hover:${topic.colorClass} hover:text-black hover:border-black`
              }`}
          >
            <span className={`w-3 h-3 ${topic.colorClass} border-2 border-black group-hover:bg-white`} />
            {topic.name}
          </button>
        ))}

        <div className="flex-grow" />
        <ThemeToggle />
      </div>

      {/* Centered Feed Style Selection */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <button
            onClick={() => setViewMode('classic')}
            className={`px-8 py-3 font-black uppercase text-sm transition-all ${viewMode === 'classic'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
              }`}
          >
            Classic_Feed
          </button>
          <div className="w-1 bg-black" />
          <button
            onClick={() => setViewMode('mondrian')}
            className={`px-8 py-3 font-black uppercase text-sm transition-all ${viewMode === 'mondrian'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
              }`}
          >
            Mondrian_Grid
          </button>
        </div>
      </div>

      {/* Feed */}
      {viewMode === 'mondrian' ? (
        <div className="-mx-4 md:-mx-8">
          <MondrianGrid onCardClick={(intel) => setActiveModal(mockIntelToSlot(intel))} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSlots.map(slot => (
            <MonarchCard
              key={slot.id}
              slot={slot}
              onTrigger={() => { }}
              onRate={() => setActiveModal(slot)}
            />
          ))}
        </div>
      )}

      <ProtocolOnboarding />

      {/* Floating Action Button - Post Intel (Desktop only, hidden on mobile) */}
      <button
        onClick={() => setIsPostModalOpen(true)}
        className={`hidden md:flex fixed bottom-8 right-8 z-40 w-16 h-16 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:scale-105 items-center justify-center ${isDark ? 'bg-[#9945FF] hover:bg-[#FFD700]' : 'bg-[#9945FF] hover:bg-[#FFD700]'
          }`}
        aria-label="Post Intel"
      >
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Post Intel Modal */}
      <PostIntelModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => {
          // Refresh the intel feed after successful post
          // The timer will pick up the new intel automatically
        }}
      />

      {/* Active Modal */}
      {activeModal && (
        <MonarchCardModal
          slot={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
