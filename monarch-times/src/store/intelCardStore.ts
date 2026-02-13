import { create } from 'zustand';
import { IntelCard } from '../types/IntelCard';

interface IntelCardStore {
  cards: IntelCard[];
  addCard: (card: IntelCard) => void;
  loadInitial: () => void;
}

export const useIntelCardStore = create<IntelCardStore>((set) => ({
  cards: [],
  
  loadInitial: () => {
    // Mock data removed
    set({ cards: [] });
  },

  addCard: (card) => set((state) => ({ cards: [card, ...state.cards] })),
}));
