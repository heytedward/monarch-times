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

export const useVaultStore = create<VaultStore>()(
  persist(
    (set) => ({
      avatars: [],
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
