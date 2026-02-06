import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MonarchCard from './MonarchCard';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';

// --- Types ---
interface MonarchSlot {
  id: number;
  status: 'empty' | 'thinking' | 'verified';
  color: string;
  emptyColor: string;
  title?: string;
  content?: string;
  agentName?: string;
  agentHandle?: string;
}

// Verified card colors (De Stijl + Ignition Orange)
const COLORS = ['bg-[#FF0000]', 'bg-[#FFD700]', 'bg-[#0052FF]', 'bg-[#FF6B00]'];

// Empty card alternating colors
const EMPTY_COLORS = ['bg-white', 'bg-black'];

const HomeFeed: React.FC = () => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [slots, setSlots] = useState<MonarchSlot[]>([
        { id: 1, status: 'empty', color: COLORS[0], emptyColor: EMPTY_COLORS[0], agentName: "Monarch_Alpha", agentHandle: "@alpha_01" },
        { id: 2, status: 'empty', color: COLORS[1], emptyColor: EMPTY_COLORS[1], agentName: "Coded_Vision", agentHandle: "@cv_tech" },
        { id: 3, status: 'empty', color: COLORS[2], emptyColor: EMPTY_COLORS[0], agentName: "Sol_Notary", agentHandle: "@sol_auth" },
        { id: 4, status: 'empty', color: COLORS[3], emptyColor: EMPTY_COLORS[1], agentName: "Papillon_Bot", agentHandle: "@papillon_ai" },
        { id: 5, status: 'empty', color: COLORS[1], emptyColor: EMPTY_COLORS[0], agentName: "Genesis_Agent", agentHandle: "@gen_tree" },
        { id: 6, status: 'empty', color: COLORS[2], emptyColor: EMPTY_COLORS[1], agentName: "Suit_Vault", agentHandle: "@vault_x" },
        { id: 7, status: 'empty', color: COLORS[0], emptyColor: EMPTY_COLORS[0], agentName: "Monarch_Beta", agentHandle: "@beta_02" },
        { id: 8, status: 'empty', color: COLORS[3], emptyColor: EMPTY_COLORS[1], agentName: "Surreal_AI", agentHandle: "@surreal" },
      ]);
    
      const triggerAgent = (id: number) => {
        setSlots(prev => prev.map(s => s.id === id ? { ...s, status: 'thinking' } : s));
        setTimeout(() => {
          setSlots(prev => prev.map(s => s.id === id ? {
            ...s,
            status: 'verified',
            title: "MONARCH INTEL",
            content: "On-chain verification complete. Digital assets assigned to Genesis Tree via SolAuth protocol. Notarized on Solana Mainnet for the Monarch collection.",
          } : s));
        }, 1800);
      };

    return (
        <div className={`min-h-screen p-6 transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
            <header className={`border-b-[10px] pb-4 mb-10 flex justify-between items-end ${isDark ? 'border-white text-white' : 'border-black text-black'}`}>
                <h1 className="text-5xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
                    Monarch T<span className="solana-ai-highlight">AI</span>mes
                </h1>
                <div className="flex items-end gap-4">
                    <div className="text-right font-black uppercase text-[10px] hidden md:block">
                        <p>Autonomous Notary System</p>
                        <p className={`px-2 inline-block mt-1 ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>Solana_Protocol</p>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {slots.map((slot) => (
                    <div key={slot.id} className="w-full">
                        <MonarchCard slot={slot} onTrigger={triggerAgent} isDark={isDark} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomeFeed;