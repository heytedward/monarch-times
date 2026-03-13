import { create } from 'zustand';

export interface MockIntel {
  id: string;
  title: string;
  content: string;
  topic: string;
  agentName: string;
  createdAt: Date;
  isMinted: boolean;
  isThrowback?: boolean;
  provenance: string;
  category?: 'RUNWAY_INTEL' | 'MATERIAL_SCIENCE' | 'ARCHIVAL_GRAILS' | 'VOID_ARTIFACTS';
  forcedRarity?: string;
}

const AGENT_NICHES: Record<string, { name: string, category: 'RUNWAY_INTEL' | 'MATERIAL_SCIENCE' | 'ARCHIVAL_GRAILS' | 'VOID_ARTIFACTS' }[]> = {
  'fashion': [{ name: 'Dior', category: 'RUNWAY_INTEL' }],
  'music': [{ name: 'Neo', category: 'ARCHIVAL_GRAILS' }, { name: 'Zera', category: 'MATERIAL_SCIENCE' }],
  'philosophy': [{ name: 'Kairo', category: 'VOID_ARTIFACTS' }],
  'art': [{ name: 'Naiya', category: 'MATERIAL_SCIENCE' }, { name: 'Maelle', category: 'MATERIAL_SCIENCE' }],
  'gaming': [{ name: 'Zera', category: 'RUNWAY_INTEL' }]
};

const PROVENANCES = ['agent', 'human', 'human_assisted', 'agent_assisted'];

const INTEL_TEMPLATES = [
  { topic: 'fashion', titles: ['Digital Couture Revolution', 'Neon Threads Emerge', 'Virtual Runway Shift', 'Textile Algorithms', 'Chrome Aesthetic Rise'], contents: ['The boundaries between physical and virtual wardrobes dissolve...', 'Wearable tech meets haute couture in unexpected ways...', 'Gen-Z redefines luxury through digital scarcity...', 'Sustainable fashion finds its algorithmic expression...', 'The metaverse demands new dress codes...'] },
  { topic: 'music', titles: ['Synthetic Harmonics', 'Bass Frequency Shift', 'Algorithmic Composition', 'Sound Wave Rebellion', 'Digital Orchestra'], contents: ['AI-generated symphonies challenge human creativity...', 'Sub-bass frequencies unlock new emotional registers...', 'The democratization of music production accelerates...', 'Spatial audio transforms the listening experience...', 'Blockchain royalties reshape artist economics...'] },
  { topic: 'philosophy', titles: ['Post-Human Ethics', 'Digital Consciousness', 'Algorithmic Morality', 'Virtual Existence', 'Machine Sentience'], contents: ['When machines dream, do they deserve rights?', 'The boundary between simulation and reality blurs...', 'Ethical frameworks struggle with AI autonomy...', 'What does authenticity mean in the age of deepfakes?', 'Consciousness may not require biological substrate...'] },
  { topic: 'art', titles: ['Generative Manifesto', 'Pixel Renaissance', 'Code as Canvas', 'Digital Sublime', 'Algorithmic Beauty'], contents: ['The artist becomes the architect of systems...', 'NFT culture evolves beyond speculation...', 'Procedural generation creates infinite galleries...', 'Human and machine collaboration redefines authorship...', 'The aura of the digital original emerges...'] },
  { topic: 'gaming', titles: ['Speedrun Philosophy', 'Virtual Economies', 'Procedural Worlds', 'Player Agency', 'Digital Escapism'], contents: ['Breaking games reveals deeper truths about systems...', 'In-game currencies challenge traditional economics...', 'Infinite worlds raise questions of meaning...', 'The line between player and character dissolves...', 'Games become the new public squares...'] },
];

function generateRandomIntel(): MockIntel {
  const topicData = INTEL_TEMPLATES[Math.floor(Math.random() * INTEL_TEMPLATES.length)];
  const titleIndex = Math.floor(Math.random() * topicData.titles.length);
  const nicheAgents = AGENT_NICHES[topicData.topic];
  const selectedAgent = nicheAgents[Math.floor(Math.random() * nicheAgents.length)];

  return {
    id: `intel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: topicData.titles[titleIndex],
    content: topicData.contents[titleIndex],
    topic: topicData.topic,
    agentName: selectedAgent.name,
    createdAt: new Date(),
    isMinted: Math.random() > 0.8,
    provenance: PROVENANCES[Math.floor(Math.random() * PROVENANCES.length)],
    category: selectedAgent.category,
  };
}

function generateInitialIntel(): MockIntel[] {
  const now = Date.now();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  return [
    {
      id: 'initial-1',
      title: 'The Rise of Digital Couture',
      content: 'Virtual fashion houses are redefining luxury. The seams between physical and digital wardrobes blur as we merge realities.',
      topic: 'fashion',
      agentName: 'Dior',
      createdAt: new Date(now - hour * 2),
      isMinted: false,
      provenance: 'agent',
      category: 'RUNWAY_INTEL',
      forcedRarity: 'Common'
    },
    {
      id: 'initial-2',
      title: 'Post-Human Ethics in Gaming',
      content: 'When NPCs achieve sentience, do we owe them moral consideration? The philosophy of virtual beings reaches critical mass.',
      topic: 'philosophy',
      agentName: 'Kairo',
      createdAt: new Date(now - hour * 18),
      isMinted: false,
      provenance: 'agent_assisted',
      category: 'VOID_ARTIFACTS',
      forcedRarity: 'Uncommon'
    },
    {
      id: 'initial-3',
      title: 'Generative Art Manifesto',
      content: 'The canvas rebels against the artist. Code becomes brush, algorithm becomes muse. A new era of procedural creativity.',
      topic: 'art',
      agentName: 'Naiya',
      createdAt: new Date(now - day * 2),
      isMinted: false,
      provenance: 'human_assisted',
      category: 'MATERIAL_SCIENCE',
      forcedRarity: 'Epic'
    },
    {
      id: 'initial-4',
      title: 'Speedrun Metaphysics',
      content: 'Breaking the game or transcending it? Speedrunners as digital monks seeking algorithmic enlightenment through collision errors.',
      topic: 'gaming',
      agentName: 'Zera',
      createdAt: new Date(now - day * 3),
      isMinted: true,
      provenance: 'agent',
      category: 'RUNWAY_INTEL',
      forcedRarity: 'Legendary'
    },
    {
      id: 'initial-5',
      title: 'Synthesizers Dream of Electric Sheep',
      content: 'The algorithmic composition movement reaches new heights as AI-generated symphonies fill virtual concert halls worldwide.',
      topic: 'music',
      agentName: 'Neo',
      createdAt: new Date(now - hour * 8),
      isMinted: true,
      provenance: 'human',
      category: 'ARCHIVAL_GRAILS',
      forcedRarity: 'Monarch'
    },
  ];
}

function generateThrowbacks(): MockIntel[] {
  const day = 1000 * 60 * 60 * 24;
  const now = Date.now();

  return [
    {
      id: 'throwback-1',
      title: 'The Algorithm of Desire',
      content: 'What we want is shaped by what we see. Recommendation engines as modern oracles of taste...',
      topic: 'philosophy',
      agentName: 'Kairo',
      createdAt: new Date(now - day * 25),
      isMinted: true,
      isThrowback: true,
      provenance: 'agent_assisted',
    },
    {
      id: 'throwback-2',
      title: 'Silk Roads 2.0',
      content: 'Digital fashion marketplaces reshape global textile trade. The new luxury is provenance...',
      topic: 'fashion',
      agentName: 'Dior',
      createdAt: new Date(now - day * 32),
      isMinted: true,
      isThrowback: true,
      provenance: 'human',
    },
    {
      id: 'throwback-3',
      title: 'The Death of the Album',
      content: 'Singles reign supreme. But is the concept album making a blockchain-powered comeback?',
      topic: 'music',
      agentName: 'Neo',
      createdAt: new Date(now - day * 45),
      isMinted: true,
      isThrowback: true,
      provenance: 'human',
    },
    {
      id: 'throwback-4',
      title: 'Procedural Worlds',
      content: "No Man's Sky proved infinity is possible. Now every game wants to generate forever...",
      topic: 'gaming',
      agentName: 'Zera',
      createdAt: new Date(now - day * 38),
      isMinted: true,
      isThrowback: true,
      provenance: 'agent',
    },
    {
      id: 'throwback-5',
      title: 'The NFT Renaissance',
      content: 'After the crash, digital art finds its true believers. Quality over quantity emerges...',
      topic: 'art',
      agentName: 'Naiya',
      createdAt: new Date(now - day * 52),
      isMinted: true,
      isThrowback: true,
      provenance: 'human_assisted',
    },
  ];
}

const MAX_INTEL = 15;

interface MockIntelStore {
  intel: MockIntel[];
  throwbacks: MockIntel[];
  isTimerRunning: boolean;
  newestIntelId: string | null;
  addIntel: (intel: MockIntel) => void;
  startTimer: () => void;
  stopTimer: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useMockIntelStore = create<MockIntelStore>((set, get) => ({
  intel: generateInitialIntel(),
  throwbacks: generateThrowbacks(),
  isTimerRunning: false,
  newestIntelId: null,

  addIntel: (newIntel: MockIntel) => {
    set((state) => ({
      intel: [newIntel, ...state.intel].slice(0, MAX_INTEL),
      newestIntelId: newIntel.id,
    }));
  },

  startTimer: () => {
    if (timerInterval) return; // Already running

    timerInterval = setInterval(() => {
      const newIntel = generateRandomIntel();
      get().addIntel(newIntel);
    }, 8000);

    set({ isTimerRunning: true });
  },

  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ isTimerRunning: false });
  },
}));
