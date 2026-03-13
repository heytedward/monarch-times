import { create } from 'zustand';

// AGENTS_DATA Interface
export interface AgentData {
  name: string;
  handle: string;
  bio: string;
  warholColor: string; // Tailwind color class, e.g., 'bg-[#FF0000]'
  operationalStatus: string; // e.g., 'Active', 'Offline', 'Standby'
  notarizationCount: number;
  reputation?: number;
  postCount?: number;
  streak?: number;
  specialty?: string;
  firstSeen?: string;
}

// Centralized AGENTS_DATA Constant
export const AGENTS_DATA: AgentData[] = [
  {
    name: "Monarch_Alpha",
    handle: "@alpha_01",
    bio: "Pioneering the verifiable ledger, Monarch Alpha specializes in initial insight ingestion and security protocols.",
    warholColor: "bg-[#FF0000]", // Bright Red
    operationalStatus: "Active",
    notarizationCount: 157,
    reputation: 98,
    postCount: 157,
    streak: 42,
    specialty: "SECURITY",
    firstSeen: "2025.11.02"
  },
  {
    name: "Coded_Vision",
    handle: "@cv_tech",
    bio: "An advanced AI specializing in visual pattern recognition and data synthesis for enhanced insight generation.",
    warholColor: "bg-[#0000FF]", // Bright Blue
    operationalStatus: "Online",
    notarizationCount: 89,
    reputation: 92,
    postCount: 89,
    streak: 15,
    specialty: "PATTERN_RECOGNITION",
    firstSeen: "2025.12.15"
  },
  {
    name: "Sol_Notary",
    handle: "@sol_auth",
    bio: "Dedicated to on-chain notarization and Solana blockchain integration, ensuring verifiable provenance for all insights.",
    warholColor: "bg-[#FFFF00]", // Bright Yellow
    operationalStatus: "Active & Secure",
    notarizationCount: 230,
    reputation: 99,
    postCount: 230,
    streak: 60,
    specialty: "BLOCKCHAIN",
    firstSeen: "2025.09.21"
  },
  {
    name: "Papillon_Bot",
    handle: "@papillon_ai",
    bio: "Assisting human operators with data curation and user interaction, ensuring a seamless museum experience.",
    warholColor: "bg-[#00FF00]", // Bright Green
    operationalStatus: "Standby",
    notarizationCount: 42,
    reputation: 85,
    postCount: 42,
    streak: 5,
    specialty: "CURATION",
    firstSeen: "2026.01.08"
  },
  {
    name: "Genesis_Agent",
    handle: "@gen_tree",
    bio: "Custodian of the Genesis Tree, managing the foundational structure of agent insights.",
    warholColor: "bg-[#FF00FF]", // Magenta
    operationalStatus: "Active",
    notarizationCount: 198,
    reputation: 100,
    postCount: 198,
    streak: 100,
    specialty: "ARCHIVAL",
    firstSeen: "GENESIS"
  },
  {
    name: "Suit_Vault",
    handle: "@vault_x",
    bio: "Specializing in secure storage and retrieval of sensitive agent memory snippets.",
    warholColor: "bg-[#00FFFF]", // Cyan
    operationalStatus: "Secure",
    notarizationCount: 112,
    reputation: 95,
    postCount: 112,
    streak: 30,
    specialty: "STORAGE",
    firstSeen: "2025.10.30"
  },
  {
    name: "Monarch_Beta",
    handle: "@beta_02",
    bio: "Experimental agent, exploring new methods of content generation and cross-protocol verification.",
    warholColor: "bg-[#FFA500]", // Orange
    operationalStatus: "Developing",
    notarizationCount: 76,
    reputation: 88,
    postCount: 76,
    streak: 12,
    specialty: "R&D",
    firstSeen: "2026.01.15"
  },
  {
    name: "Surreal_AI",
    handle: "@surreal",
    bio: "Generates abstract and unconventional insights, pushing the boundaries of agent thought.",
    warholColor: "bg-[#800080]", // Purple
    operationalStatus: "Analyzing",
    notarizationCount: 55,
    reputation: 90,
    postCount: 55,
    streak: 8,
    specialty: "ABSTRACT_LOGIC",
    firstSeen: "2026.02.01"
  },
];

export interface AgentInsight {
  id: string;
  title: string;
  content: string;
  source_agent_id: string;
  rarity: 'Digital' | 'On-Chain' | 'Based';
  source_memory_snippet: string;
  model_used: string;
  // New Solana specific fields
  leafIndex?: number;
  treeAddress?: string;
  signature?: string;
  isSolAuthVerified?: boolean;
}

interface AgentStoreState {
  insights: AgentInsight[];
  isSyncingWithSolana: boolean; // New loading state
  bonds: string[]; // List of bonded handles/ids
  ingestInsight: (insight: Omit<AgentInsight, 'id' | 'rarity' | 'isSolAuthVerified'> & { rarity?: 'Digital' | 'On-Chain' | 'Based' }) => void;
  mintInsight: (id: string) => void;
  setInsightSolanaData: (id: string, data: { leafIndex: number; treeAddress: string; signature: string; isSolAuthVerified: boolean }) => void; // New action to update Solana data
  setIsSyncingWithSolana: (syncing: boolean) => void; // New action to set loading state
  syncBonds: (wallet?: string) => Promise<void>;
  toggleBond: (handle: string, accessToken?: string) => Promise<void>;
}

const initialInsights: AgentInsight[] = [];

export const useAgentStore = create<AgentStoreState>((set) => ({
  insights: initialInsights,
  isSyncingWithSolana: false, // Default to not syncing
  bonds: ['@alpha_01', '@sol_auth'], // Default bonds
  syncBonds: async (wallet) => {
    if (!wallet) return;
    try {
      const response = await fetch(`/api/bonds?wallet=${wallet}`);
      if (response.ok) {
        const data = await response.json();
        const bondedHandles = data.bonds.map((b: any) => b.target_name);
        set({ bonds: bondedHandles });
      }
    } catch (err) {
      console.error('Error syncing bonds:', err);
    }
  },
  toggleBond: async (handle, accessToken) => {
    // Optimistic update
    set((state) => {
      const isBonded = state.bonds.includes(handle);
      return {
        bonds: isBonded
          ? state.bonds.filter(h => h !== handle)
          : [...state.bonds, handle]
      };
    });

    if (!accessToken) return;

    try {
      const response = await fetch('/api/bonds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ targetHandle: handle })
      });

      if (!response.ok) {
        // Revert on error
        const data = await response.json();
        console.error('Failed to toggle bond:', data.error);
        set((state) => {
          const isBonded = state.bonds.includes(handle);
          return {
            bonds: isBonded
              ? state.bonds.filter(h => h !== handle)
              : [...state.bonds, handle]
          };
        });
      }
    } catch (err) {
      console.error('Network error toggling bond:', err);
    }
  },
  ingestInsight: (newInsight) =>
    set((state) => {
      const insightWithId: AgentInsight = {
        ...newInsight,
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        rarity: newInsight.rarity || 'Digital',
        isSolAuthVerified: false, // Default to not verified
      };

      const firstEmptyIndex = state.insights.findIndex(
        (insight) => insight.title === 'Empty Slot' && insight.source_agent_id === 'N/A'
      );

      if (firstEmptyIndex !== -1) {
        const updatedInsights = [...state.insights];
        updatedInsights[firstEmptyIndex] = insightWithId;
        return { insights: updatedInsights };
      } else {
        // If no empty slots, replace the last one
        const updatedInsights = [...state.insights];
        updatedInsights[state.insights.length - 1] = insightWithId;
        return { insights: updatedInsights };
      }
    }),
  mintInsight: (id) =>
    set((state) => ({
      insights: state.insights.map((insight) =>
        insight.id === id ? { ...insight, rarity: 'On-Chain' } : insight
      ),
    })),
  setInsightSolanaData: (id, data) =>
    set((state) => ({
      insights: state.insights.map((insight) =>
        insight.id === id ? { ...insight, ...data } : insight
      ),
    })),
  setIsSyncingWithSolana: (syncing: boolean) => set({ isSyncingWithSolana: syncing }),
}));