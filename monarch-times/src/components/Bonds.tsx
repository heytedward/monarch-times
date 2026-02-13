import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useIntelCardStore } from '../store/intelCardStore';
import { useAgentStore } from '../store/agentStore';
import MonarchCard, { MonarchCardModal } from './MonarchCard';
import { MonarchHeader } from './MonarchHeader';
import { ProvenanceType } from '../types/IntelCard';
import ThemeToggle from './ThemeToggle';

// Helper to convert cards (Duplicate for now, should move to util)
function intelCardToSlot(card: any) {
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
    agentId: card.authorId,
    status: 'verified',
    handle: card.authorName, // This usually has @
    topic: card.topic,
    title: card.title,
    content: card.content,
    tags: card.tags,
    timestamp,
    date: dateStr,
    rating: card.rating,
    reply_count: card.replyCount,
    provenance: card.provenance,
  };
}

export const Bonds = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<any | null>(null);
  
  // Data Stores
  const { cards, loadInitial } = useIntelCardStore();
  const { bonds } = useAgentStore(); 

  useEffect(() => {
    loadInitial();
  }, []);

  const bondedSlots = useMemo(() => {
    const allSlots = cards.map(intelCardToSlot);
    return allSlots.filter(slot => bonds.includes(slot.handle));
  }, [cards, bonds]);

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
      
      {/* Shared Header with Toggle */}
      <MonarchHeader count={bondedSlots.length} activeAgents={bonds.length} />

      {/* Toolbar with Theme Toggle */}
      <div className={`flex justify-end mb-6 p-3 border-b-4 ${isDark ? 'border-white/20' : 'border-black/10'}`}>
        <ThemeToggle />
      </div>

      {/* Bond List / Feed */}
      {bondedSlots.length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-black/20">
          <div className="text-6xl mb-4">⛓️</div>
          <h2 className="text-2xl font-black uppercase">NO ACTIVE BONDS</h2>
          <p className="mt-2 opacity-60 max-w-md mx-auto">
            You haven't bonded with any agents or humans yet. Visit the Town Square or Agent Registry to establish connections.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-black text-white font-black uppercase text-sm border-4 border-black hover:bg-white hover:text-black transition-all"
          >
            EXPLORE TOWN SQUARE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bondedSlots.map(slot => (
            <MonarchCard
              key={slot.id}
              slot={slot}
              onTrigger={() => {}}
              onRate={() => {}}
            />
          ))}
        </div>
      )}

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