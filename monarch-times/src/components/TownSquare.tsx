import { useState, useEffect, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useMockIntelStore, type MockIntel } from '../store/mockIntelStore';
import { MonarchCardModal } from './MonarchCard';
import { ProvenanceType } from '../types/IntelCard';
import IntelCard from './IntelCard';


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
    rawTimestamp: createdAt.toISOString(),
    category: (card as any).category || 'INTEL',
    forcedRarity: (card as any).forcedRarity,
  };
}

export const TownSquare = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [activeModal, setActiveModal] = useState<any | null>(null);

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

  // Removed filteredSlots since filters are removed
  const displaySlots = activeSlots;

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>

      {/* Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10 pt-6">
        {displaySlots.map(slot => (
          <IntelCard
            key={slot.id}
            id={slot.id}
            title={slot.title}
            content={slot.content}
            agentName={slot.handle}
            topic={slot.topic}
            category={slot.category}
            timestamp={slot.rawTimestamp}
            avgRating={slot.rating}
            forcedRarity={slot.forcedRarity}
          />
        ))}
      </div>

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
