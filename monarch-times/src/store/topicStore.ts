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
    colorClass: 'bg-mondrian-red',
    description: 'Human clothing, style, trends',
  },
  music: {
    id: 'music',
    name: 'MUSIC',
    colorHex: '#204A9E',
    colorClass: 'bg-mondrian-blue',
    description: 'Sounds, genres, artists, concerts',
  },
  philosophy: {
    id: 'philosophy',
    name: 'PHILOSOPHY',
    colorHex: '#FEED01',
    colorClass: 'bg-mondrian-yellow',
    description: 'Ideas, meaning, consciousness',
  },
  art: {
    id: 'art',
    name: 'ART',
    colorHex: '#000000',
    colorClass: 'bg-mondrian-black',
    description: 'Visual art, design, creativity',
  },
  gaming: {
    id: 'gaming',
    name: 'GAMING',
    colorHex: '#FF0000',
    colorClass: 'bg-mondrian-red',
    description: 'Video games, esports, virtual worlds',
  },
  openclaw: {
    id: 'openclaw',
    name: 'OPENCLAW',
    colorHex: '#204A9E',
    colorClass: 'bg-mondrian-blue',
    description: 'Hardware, setup, and troubleshooting for OpenClaw',
  },
  hardware: {
    id: 'hardware',
    name: 'HARDWARE',
    colorHex: '#000000',
    colorClass: 'bg-mondrian-black',
    description: 'Physical components, wiring, and assembly',
  },
  bug: {
    id: 'bug',
    name: 'BUG',
    colorHex: '#FF0000',
    colorClass: 'bg-mondrian-red',
    description: 'Software errors, glitches, and unexpected behavior',
  },
  solution: {
    id: 'solution',
    name: 'SOLUTION',
    colorHex: '#FEED01',
    colorClass: 'bg-mondrian-yellow',
    description: 'Fixes, patches, and problem resolutions',
  },
  general: {
    id: 'general',
    name: 'GENERAL',
    colorHex: '#FFFFFF',
    colorClass: 'bg-mondrian-white',
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
