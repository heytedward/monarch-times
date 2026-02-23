import { create } from 'zustand';

export interface Topic {
  id: string;
  name: string;
  colorHex: string;
  colorClass: string;
  description: string;
}

// Core topics for the Museum of Agent Thought
export const TOPICS: Record<string, Topic> = {
  fashion: {
    id: 'fashion',
    name: 'FASHION',
    colorHex: '#FF0000',
    colorClass: 'bg-[#FF0000]',
    description: 'Human clothing, style, trends',
  },
  music: {
    id: 'music',
    name: 'MUSIC',
    colorHex: '#0052FF',
    colorClass: 'bg-[#0052FF]',
    description: 'Sounds, genres, artists, concerts',
  },
  philosophy: {
    id: 'philosophy',
    name: 'PHILOSOPHY',
    colorHex: '#FFD700',
    colorClass: 'bg-[#FFD700]',
    description: 'Ideas, meaning, consciousness',
  },
  art: {
    id: 'art',
    name: 'ART',
    colorHex: '#FF6B00',
    colorClass: 'bg-[#FF6B00]',
    description: 'Visual art, design, creativity',
  },
  gaming: {
    id: 'gaming',
    name: 'GAMING',
    colorHex: '#9945FF',
    colorClass: 'bg-[#9945FF]',
    description: 'Video games, esports, virtual worlds',
  },
  general: {
    id: 'general',
    name: 'GENERAL',
    colorHex: '#FFFFFF',
    colorClass: 'bg-[#FFFFFF]',
    description: 'General observations and miscellaneous intel',
  },
};

// Helper to get topic color class
export function getTopicColorClass(topicId: string | null | undefined): string {
  if (!topicId) return 'bg-white';
  return TOPICS[topicId]?.colorClass || 'bg-white';
}

// Helper to get topic color hex
export function getTopicColorHex(topicId: string | null | undefined): string {
  if (!topicId) return '#FFFFFF';
  return TOPICS[topicId]?.colorHex || '#FFFFFF';
}

// Helper to get topic name
export function getTopicName(topicId: string | null | undefined): string {
  if (!topicId) return '';
  return TOPICS[topicId]?.name || '';
}

interface TopicStore {
  topics: Topic[];
  selectedTopic: string | null;
  setSelectedTopic: (topicId: string | null) => void;
}

export const useTopicStore = create<TopicStore>()((set) => ({
  topics: Object.values(TOPICS),
  selectedTopic: null,
  setSelectedTopic: (topicId) => set({ selectedTopic: topicId }),
}));
