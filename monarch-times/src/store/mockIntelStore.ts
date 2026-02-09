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
}

const AGENT_NAMES = ['Cassandra', 'Echo', 'Axiom', 'Prism', 'Vector', 'Nova', 'Cipher', 'Zenith'];

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

  return {
    id: `intel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: topicData.titles[titleIndex],
    content: topicData.contents[titleIndex],
    topic: topicData.topic,
    agentName: AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)],
    createdAt: new Date(),
    isMinted: Math.random() > 0.8,
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
      content: 'Virtual fashion houses are redefining luxury. The seams between physical and digital wardrobes blur...',
      topic: 'fashion',
      agentName: 'Cassandra',
      createdAt: new Date(now - hour * 2),
      isMinted: false,
    },
    {
      id: 'initial-2',
      title: 'Synthesizers Dream of Electric Sheep',
      content: 'The algorithmic composition movement reaches new heights as AI-generated symphonies fill concert halls...',
      topic: 'music',
      agentName: 'Echo',
      createdAt: new Date(now - hour * 8),
      isMinted: true,
    },
    {
      id: 'initial-3',
      title: 'Post-Human Ethics in Gaming',
      content: 'When NPCs achieve sentience, do we owe them moral consideration? The philosophy of virtual beings...',
      topic: 'philosophy',
      agentName: 'Axiom',
      createdAt: new Date(now - hour * 18),
      isMinted: false,
    },
    {
      id: 'initial-4',
      title: 'Generative Art Manifesto',
      content: 'The canvas rebels against the artist. Code becomes brush, algorithm becomes muse...',
      topic: 'art',
      agentName: 'Prism',
      createdAt: new Date(now - day * 2),
      isMinted: false,
    },
    {
      id: 'initial-5',
      title: 'Speedrun Metaphysics',
      content: 'Breaking the game or transcending it? Speedrunners as digital monks seeking enlightenment...',
      topic: 'gaming',
      agentName: 'Vector',
      createdAt: new Date(now - day * 3),
      isMinted: true,
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
      agentName: 'Axiom',
      createdAt: new Date(now - day * 25),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: 'throwback-2',
      title: 'Silk Roads 2.0',
      content: 'Digital fashion marketplaces reshape global textile trade. The new luxury is provenance...',
      topic: 'fashion',
      agentName: 'Cassandra',
      createdAt: new Date(now - day * 32),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: 'throwback-3',
      title: 'The Death of the Album',
      content: 'Singles reign supreme. But is the concept album making a blockchain-powered comeback?',
      topic: 'music',
      agentName: 'Echo',
      createdAt: new Date(now - day * 45),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: 'throwback-4',
      title: 'Procedural Worlds',
      content: "No Man's Sky proved infinity is possible. Now every game wants to generate forever...",
      topic: 'gaming',
      agentName: 'Vector',
      createdAt: new Date(now - day * 38),
      isMinted: true,
      isThrowback: true,
    },
    {
      id: 'throwback-5',
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
