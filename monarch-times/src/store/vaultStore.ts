import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MonarchStyle } from '../components/MonarchLivingHash';

export interface VaultAvatar {
  id: string;
  seed: string;
  name: string;
  topic: 'fashion' | 'music' | 'philosophy' | 'art' | 'gaming';
  style: MonarchStyle;
  rarity: string;
  purchaseDate: string;
  price: string;
}

export interface VaultIntel {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  topic: string;
  provenance: string;
  mintAddress?: string;
  timestamp: string;
}

interface VaultStore {
  avatars: VaultAvatar[];
  intel: VaultIntel[];
  currentAvatar: string | null; // ID of current avatar
  currentAgent: string | null; // agent name/ID

  // Avatar actions
  purchaseAvatar: (avatar: VaultAvatar) => void;
  setCurrentAvatar: (avatarId: string | null) => void;

  // Intel actions
  addIntelToVault: (intel: VaultIntel) => void;

  // Agent actions
  setCurrentAgent: (agentName: string) => void;
}

// Generate 2 random starter avatars for new users
const generateStarterAvatars = (): VaultAvatar[] => {
  const topics: Array<'fashion' | 'music' | 'philosophy' | 'art' | 'gaming'> = ['fashion', 'music', 'philosophy', 'art', 'gaming'];
  const styles: MonarchStyle[] = ['squares', 'triangles'];
  const rarities = ['COMMON', 'UNCOMMON'];
  const names = ['Cipher', 'Echo', 'Nova', 'Prism', 'Vector', 'Pixel', 'Quantum', 'Nexus'];

  const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
  const shuffledNames = [...names].sort(() => Math.random() - 0.5);

  const now = new Date().toISOString();

  return [
    {
      id: `starter-avatar-1-${Date.now()}`,
      seed: `starter-${Math.random().toString(36).substring(7)}`,
      name: shuffledNames[0],
      topic: shuffledTopics[0],
      style: styles[0], // squares
      rarity: rarities[Math.floor(Math.random() * rarities.length)],
      purchaseDate: now,
      price: 'FREE',
    },
    {
      id: `starter-avatar-2-${Date.now()}`,
      seed: `starter-${Math.random().toString(36).substring(7)}`,
      name: shuffledNames[1],
      topic: shuffledTopics[1],
      style: styles[1], // triangles
      rarity: rarities[Math.floor(Math.random() * rarities.length)],
      purchaseDate: now,
      price: 'FREE',
    },
  ];
};

export const useVaultStore = create<VaultStore>()(
  persist(
    (set) => ({
      avatars: generateStarterAvatars(),
      intel: [],
      currentAvatar: null,
      currentAgent: null,

      purchaseAvatar: (avatar) =>
        set((state) => ({
          avatars: [...state.avatars, avatar],
        })),

      setCurrentAvatar: (avatarId) =>
        set({ currentAvatar: avatarId }),

      addIntelToVault: (intel) =>
        set((state) => ({
          intel: [...state.intel, intel],
        })),

      setCurrentAgent: (agentName) =>
        set({ currentAgent: agentName }),
    }),
    {
      name: 'monarch-vault-storage',
    }
  )
);
