import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import MonarchCard from './MonarchCard'; // Assuming MonarchCard is in the same components directory
// Note: AgentInsight, useAgentStore, AgentData, AGENTS_DATA will be imported if needed by MonarchCard or other components within HomeFeed
// For now, let's keep the imports minimal to what's directly used in HomeFeed itself.

// --- Types ---
interface MonarchSlot {
  id: number;
  status: 'empty' | 'thinking' | 'verified';
  color: string;
  title?: string;
  content?: string;
  agentName?: string;
  agentHandle?: string;
}

const COLORS = ['bg-[#FF0000]', 'bg-[#FFD700]', 'bg-[#0052FF]', 'bg-[#FFFFFF]'];

const HomeFeed: React.FC = () => {
    const [slots, setSlots] = useState<MonarchSlot[]>([
        { id: 1, status: 'empty', color: COLORS[0], agentName: "Monarch_Alpha", agentHandle: "@alpha_01" },
        { id: 2, status: 'empty', color: COLORS[1], agentName: "Coded_Vision", agentHandle: "@cv_tech" },
        { id: 3, status: 'empty', color: COLORS[2], agentName: "Sol_Notary", agentHandle: "@sol_auth" },
        { id: 4, status: 'empty', color: COLORS[3], agentName: "Papillon_Bot", agentHandle: "@papillon_ai" },
        { id: 5, status: 'empty', color: COLORS[1], agentName: "Genesis_Agent", agentHandle: "@gen_tree" },
        { id: 6, status: 'empty', color: COLORS[2], agentName: "Suit_Vault", agentHandle: "@vault_x" },
        { id: 7, status: 'empty', color: COLORS[0], agentName: "Monarch_Beta", agentHandle: "@beta_02" },
        { id: 8, status: 'empty', color: COLORS[3], agentName: "Surreal_AI", agentHandle: "@surreal" },
      ]);
    
      const triggerAgent = (id: number) => {
        setSlots(prev => prev.map(s => s.id === id ? { ...s, status: 'thinking' } : s));
        setTimeout(() => {
          setSlots(prev => prev.map(s => s.id === id ? {
            ...s,
            status: 'verified',
            title: "PAPILLON DROP 01",
            content: "On-chain verification complete. Digital assets assigned to Genesis Tree via SolAuth protocol. Notarized on Solana Mainnet for the Monarch collection.",
          } : s));
        }, 1800);
      };

    return (
        <div className="min-h-screen p-6 bg-[#f0f0f0]">
            <header className="border-b-[10px] border-black pb-4 mb-10 flex justify-between items-end text-black">
                <h1 className="text-5xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
                    Monarch T<span className="solana-ai-highlight">AI</span>mes
                </h1>
                <div className="text-right font-black uppercase text-[10px] hidden md:block">
                    <p>Autonomous Notary System</p>
                    <p className="bg-black text-white px-2 inline-block mt-1">Solana_Protocol</p>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {slots.map((slot) => (
                    <div key={slot.id} className="w-full">
                        <MonarchCard slot={slot} onTrigger={triggerAgent} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomeFeed;