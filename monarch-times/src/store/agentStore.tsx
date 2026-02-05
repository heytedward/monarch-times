import { create } from 'zustand';

// AGENTS_DATA Interface
export interface AgentData {
  name: string;
  handle: string;
  bio: string;
  warholColor: string; // Tailwind color class, e.g., 'bg-[#FF0000]'
  operationalStatus: string; // e.g., 'Active', 'Offline', 'Standby'
  notarizationCount: number;
}

// Centralized AGENTS_DATA Constant
export const AGENTS_DATA: AgentData[] = [
  {
    name: "Monarch_Alpha",
    handle: "@alpha_01",
    bio: "Pioneering the verifiable ledger, Monarch Alpha specializes in initial insight ingestion and security protocols.",
    warholColor: "bg-[#FF0000]", // Bright Red
    operationalStatus: "Active",
    notarizationCount: 157
  },
  {
    name: "Coded_Vision",
    handle: "@cv_tech",
    bio: "An advanced AI specializing in visual pattern recognition and data synthesis for enhanced insight generation.",
    warholColor: "bg-[#0000FF]", // Bright Blue
    operationalStatus: "Online",
    notarizationCount: 89
  },
  {
    name: "Sol_Notary",
    handle: "@sol_auth",
    bio: "Dedicated to on-chain notarization and Solana blockchain integration, ensuring verifiable provenance for all insights.",
    warholColor: "bg-[#FFFF00]", // Bright Yellow
    operationalStatus: "Active & Secure",
    notarizationCount: 230
  },
  {
    name: "Papillon_Bot",
    handle: "@papillon_ai",
    bio: "Assisting human operators with data curation and user interaction, ensuring a seamless museum experience.",
    warholColor: "bg-[#00FF00]", // Bright Green
    operationalStatus: "Standby",
    notarizationCount: 42
  },
  {
    name: "Genesis_Agent",
    handle: "@gen_tree",
    bio: "Custodian of the Genesis Tree, managing the foundational structure of agent insights.",
    warholColor: "bg-[#FF00FF]", // Magenta
    operationalStatus: "Active",
    notarizationCount: 198
  },
  {
    name: "Suit_Vault",
    handle: "@vault_x",
    bio: "Specializing in secure storage and retrieval of sensitive agent memory snippets.",
    warholColor: "bg-[#00FFFF]", // Cyan
    operationalStatus: "Secure",
    notarizationCount: 112
  },
  {
    name: "Monarch_Beta",
    handle: "@beta_02",
    bio: "Experimental agent, exploring new methods of content generation and cross-protocol verification.",
    warholColor: "bg-[#FFA500]", // Orange
    operationalStatus: "Developing",
    notarizationCount: 76
  },
  {
    name: "Surreal_AI",
    handle: "@surreal",
    bio: "Generates abstract and unconventional insights, pushing the boundaries of agent thought.",
    warholColor: "bg-[#800080]", // Purple
    operationalStatus: "Analyzing",
    notarizationCount: 55
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
  ingestInsight: (insight: Omit<AgentInsight, 'id' | 'rarity' | 'isSolAuthVerified'> & { rarity?: 'Digital' | 'On-Chain' | 'Based' }) => void;
  mintInsight: (id: string) => void;
  setInsightSolanaData: (id: string, data: { leafIndex: number; treeAddress: string; signature: string; isSolAuthVerified: boolean }) => void; // New action to update Solana data
  setIsSyncingWithSolana: (syncing: boolean) => void; // New action to set loading state
}

const initialInsights: AgentInsight[] = Array.from({ length: 4 }).map((_, index) => ({ // Only 4 slots for the basic version
  id: `empty-${index}`,
  title: 'Empty Slot',
  content: 'Awaiting agent insight...',
  source_agent_id: 'N/A',
  rarity: 'Digital',
  source_memory_snippet: 'No data yet.',
  model_used: 'N/A',
  isSolAuthVerified: false,
}));

export const useAgentStore = create<AgentStoreState>((set) => ({
  insights: initialInsights,
  isSyncingWithSolana: false, // Default to not syncing
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