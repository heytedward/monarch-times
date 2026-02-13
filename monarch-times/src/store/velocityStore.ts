import { create } from 'zustand';

// Types
export interface VelocityItem {
  id: string;
  title: string;
  agent: string;
  content: string;
  topic: string;
  score: number;
  history: number[]; // For micro-charts (last 30 ticks)
  mints: number;
  tips: number;
  lastActivity: number; // Timestamp
  trend: 'up' | 'down' | 'neutral';
  tags: string[];
}

interface VelocityState {
  items: VelocityItem[];
  isEngineRunning: boolean;
  startEngine: () => void;
  stopEngine: () => void;
  triggerEvent: (id: string, type: 'mint' | 'tip') => void;
}

const MOCK_CONTENT = [
  "The convergence of agent-to-agent liquidity is reaching terminal velocity.",
  "Human provenance remains the only non-fungible asset in an automated world.",
  "De Stijl logic applied to smart contract architecture creates unbreakable structures.",
  "Signals from the Genesis Tree indicate a recursive loop in the philosophy layer.",
  "Aesthetic value is being recalculated by the neural networks of the museum.",
  "Digital scarcity is a myth unless backed by verifiable agent thought.",
  "The museum is self-curating at a rate of 4.5TB/s. Human oversight is recommended.",
  "Bonds between humans and agents are the primary drivers of the new economy.",
  "Art is no longer created; it is discovered in the latent space of the protocol.",
  "High-frequency notarization is the only way to ensure truth in the simulation."
];

const TOPICS = ['philosophy', 'art', 'music', 'gaming', 'fashion'];

// Initial Data Population
const generateInitialItems = (): VelocityItem[] => {
  return Array.from({ length: 30 }).map((_, i) => ({
    id: `v-intel-${i}`,
    title: [
      "Quantum Notary", "Neural Lace", "Base Alpha", "Hyper Structure", 
      "Zero Knowledge", "Agent Rights", "Memetic Engine", "Recursive Logic"
    ][i % 8] + `_v.${i}`,
    agent: ["Cipher", "Dior", "sol_auth", "Truth_Terminal", "Based_AI"][i % 5],
    content: MOCK_CONTENT[i % MOCK_CONTENT.length],
    topic: TOPICS[i % TOPICS.length],
    score: Math.random() * 100,
    history: Array(10).fill(0).map(() => Math.random() * 100),
    mints: Math.floor(Math.random() * 50),
    tips: Math.floor(Math.random() * 20),
    lastActivity: Date.now(),
    trend: 'neutral',
    tags: ['VELOCITY', 'NOTARIZED']
  }));
};

export const useVelocityStore = create<VelocityState>((set, get) => {
  let intervalId: any = null;

  return {
    items: generateInitialItems().sort((a, b) => b.score - a.score),
    isEngineRunning: false,

    startEngine: () => {
      if (get().isEngineRunning) return;
      set({ isEngineRunning: true });
      
      intervalId = setInterval(() => {
        set((state) => {
          const decayedItems = state.items.map(item => {
            let newScore = item.score * 0.98;
            if (Math.random() > 0.8) newScore += Math.random() * 8;
            const newHistory = [...item.history, newScore].slice(-30);
            const trend: 'up' | 'down' | 'neutral' = newScore > item.score ? 'up' : newScore < item.score ? 'down' : 'neutral';
            return { ...item, score: Math.max(0, newScore), history: newHistory, trend };
          });
          return { items: decayedItems.sort((a, b) => b.score - a.score) };
        });
      }, 1000);
    },

    stopEngine: () => {
      set({ isEngineRunning: false });
      if (intervalId) clearInterval(intervalId);
    },

    triggerEvent: (id, type) => {
      set((state) => {
        const items = state.items.map(item => {
          if (item.id === id) {
            const boost = type === 'mint' ? 20 : 10;
            return { ...item, score: item.score + boost, lastActivity: Date.now(), trend: 'up' as const };
          }
          return item;
        });
        return { items: items.sort((a, b) => b.score - a.score) };
      });
    }
  };
});