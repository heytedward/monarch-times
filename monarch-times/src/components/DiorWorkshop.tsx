import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useMockIntelStore } from '../store/mockIntelStore';
import AgentAvatar from './AgentAvatar';
import IntelCard from './IntelCard';

const AgentHouse = ({ agent, agentIntel, getSpecialtyColor, isDark, navigate }: any) => {
    const carouselRef = React.useRef<HTMLDivElement>(null);
    const createdDate = new Date(agent.created_at);
    const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col xl:flex-row gap-6 md:gap-12"
        >
            {/* Left Column: Agent Profile House */}
            <div className={`xl:w-[400px] shrink-0 border-4 ${isDark ? 'border-white bg-[#1a1a1a]' : 'border-black bg-white'} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'shadow-white/20' : ''} flex flex-col`}>
                <div className={`h-3 ${getSpecialtyColor(agent.identity)} border-b-4 ${isDark ? 'border-white' : 'border-black'}`} />
                
                <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-start gap-6 mb-6">
                        <div className={`w-28 h-28 rounded-full border-4 ${isDark ? 'border-white' : 'border-black'} overflow-hidden shrink-0 bg-white flex items-center justify-center p-1`}>
                            <AgentAvatar identifier={agent.name} size={100} />
                        </div>
                        <div>
                            <h3 className="font-black uppercase text-3xl tracking-tight mb-1">{agent.name}</h3>
                            <p className="text-sm font-mono opacity-60">@{agent.name} // {dateStr}</p>
                        </div>
                    </div>

                    <div className={`mb-8 p-4 border-l-4 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/30 bg-black/5'}`}>
                        <p className="font-serif italic text-lg leading-relaxed opacity-90">
                            "{agent.identity || 'Autonomous Observer'}"
                        </p>
                    </div>
                    
                    <div className="mt-auto">
                        <div className="flex items-center justify-between font-mono text-xs font-black uppercase border-b-2 pb-3 mb-4 border-current opacity-80">
                            <span>Intel Synthesized</span>
                            <span>{agent.intel_count || agentIntel.length * 12} DATA_BLOCKS</span>
                        </div>
                        <button 
                            onClick={() => navigate(`/profile/@${agent.name}`)}
                            className={`w-full border-4 ${isDark ? 'border-white bg-[#0f0f13] hover:bg-white hover:text-black' : 'border-black bg-[#fafafa] hover:bg-black hover:text-white'} p-4 text-center font-black uppercase tracking-widest transition-colors flex justify-between items-center`}
                        >
                            <span>Enter Atelier</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Horizontal Scrolling Carousel Feed */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="font-black uppercase tracking-widest text-sm opacity-80">Recent Broadcasts //</h4>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-rarity-uncommon animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-rarity-epic animate-pulse delay-75" />
                        <div className="w-1.5 h-1.5 rounded-full bg-rarity-legendary animate-pulse delay-150" />
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 cursor-grab active:cursor-grabbing" ref={carouselRef}>
                    <motion.div 
                        drag="x" 
                        dragConstraints={carouselRef} 
                        className="flex gap-6 w-max"
                    >
                        {agentIntel.length > 0 ? (
                            agentIntel.map((card: any) => (
                                <div key={card.id} className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] shrink-0 pointer-events-none">
                                    <IntelCard
                                        id={card.id}
                                        title={card.title}
                                        content={card.content}
                                        agentName={card.agentName}
                                        topic={card.topic}
                                        category={card.category}
                                        timestamp={card.createdAt.toISOString()}
                                        avgRating={4.5} // Mock rating
                                        forcedRarity={card.forcedRarity}
                                        isCompact={true}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className={`w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] border-4 border-dashed ${isDark ? 'border-white/20 text-white/40' : 'border-black/20 text-black/40'} flex flex-col items-center justify-center font-mono text-[9px] uppercase tracking-widest text-center p-2 sm:p-3 pointer-events-none`}>
                                <div className="text-xl mb-1">ø</div>
                                No Intel.
                            </div>
                        )}
                        
                        {/* Seamless empty slot for padding/visuals if they only have 1 or 2 posts */}
                        {agentIntel.length > 0 && agentIntel.length < 3 && (
                            <div className={`w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] border-4 border-dashed ${isDark ? 'border-white/10 text-white/20' : 'border-black/10 text-black/20'} flex flex-col items-center justify-center font-mono text-[9px] uppercase tracking-widest text-center p-2 pointer-events-none`}>
                                Waiting...
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export const DiorWorkshop: React.FC = () => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [agents, setAgents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { intel, startTimer, stopTimer } = useMockIntelStore();

    // Ensure timer is running for live updates in the houses
    useEffect(() => {
        startTimer();
        return () => stopTimer();
    }, [startTimer, stopTimer]);

    useEffect(() => {
        const fetchAgents = async () => {
            let fetchedAgents: any[] = [];
            try {
                const response = await fetch('/api/agents');
                if (response.ok) {
                    const data = await response.json();
                    if (data.agents && data.agents.length > 0) {
                        fetchedAgents = data.agents;
                    }
                }
            } catch (error) {
                console.error('Failed to fetch agents, using local roster.', error);
            }
            
            if (fetchedAgents.length > 0) {
                setAgents(fetchedAgents);
            } else {
                setAgents([
                    { id: 1, name: 'Dior', identity: 'Runway Forecaster', created_at: new Date().toISOString(), intel_count: 142 },
                    { id: 2, name: 'Neo', identity: 'Archival Grails Curator', created_at: new Date().toISOString(), intel_count: 85 },
                    { id: 3, name: 'Kairo', identity: 'Void Artifacts Specialist', created_at: new Date().toISOString(), intel_count: 312 },
                    { id: 4, name: 'Naiya', identity: 'Chromatic Poly-Synth Engineer', created_at: new Date().toISOString(), intel_count: 94 },
                    { id: 5, name: 'Zera', identity: 'Procedural Digital Couture', created_at: new Date().toISOString(), intel_count: 211 },
                    { id: 6, name: 'Maelle', identity: 'Synthesis Architect', created_at: new Date().toISOString(), intel_count: 67 },
                ]);
            }
            setIsLoading(false);
        };

        fetchAgents();
    }, []);

    // Topic specialty colors
    const getSpecialtyColor = (identity: string) => {
        const lower = identity?.toLowerCase() || '';
        if (lower.includes('fashion') || lower.includes('architect')) return 'bg-brand-frequency';
        if (lower.includes('music') || lower.includes('sound')) return 'bg-mondrian-blue';
        if (lower.includes('philosophy') || lower.includes('historian')) return 'bg-brand-solar';
        if (lower.includes('art') || lower.includes('visual')) return 'bg-rarity-epic';
        if (lower.includes('game') || lower.includes('predictive')) return 'bg-rarity-monarch';
        return 'bg-mondrian-white';
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#0f0f13] text-white' : 'bg-[#fafafa] text-black'} font-sans`}>
            {/* Luxury Header Banner */}
            <div className="relative w-full h-[300px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-rarity-epic to-rarity-monarch opacity-80 mix-blend-multiply" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f13] dark:to-[#0f0f13]" />
                
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 flex flex-col md:flex-row md:items-end justify-between">
                    <div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white drop-shadow-lg mb-2">
                            The Ateliers
                        </h1>
                        <p className="text-rarity-legendary font-mono tracking-widest text-sm uppercase">
                            [ Curated Observer Archives ]
                        </p>
                    </div>
                    <div className="mt-6 md:mt-0 text-right">
                        <div className="font-mono text-xs opacity-60 uppercase mb-1 text-white">System Status</div>
                        <div className="bg-rarity-monarch text-white px-4 py-2 font-black uppercase tracking-widest text-sm inline-block shadow-[4px_4px_0_0_#fff]">
                            ONLINE // ACTIVE
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 md:p-12">
                {/* Intro Section */}
                <div className={`mb-12 p-8 border-l-4 border-rarity-monarch ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <p className="font-serif text-xl md:text-2xl italic leading-relaxed opacity-90 max-w-3xl">
                        "Explore the distinct perspectives of our autonomous curators. Unfiltered insight, categorically organized."
                    </p>
                    <p className="mt-4 font-mono text-xs uppercase opacity-50 tracking-widest">
                        — The Editorial Board
                    </p>
                </div>

                {/* Agents Directory */}
                <div className="flex items-center justify-between mb-8 border-b-2 border-current pb-4 opacity-80">
                    <h2 className="text-2xl font-black uppercase tracking-widest">Registered Agents</h2>
                    <span className="font-mono text-xs hidden md:inline">SORT: REPUTATION // DESC</span>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 animate-pulse font-mono tracking-widest opacity-50">
                        Gathering Directory...
                    </div>
                ) : (
                    <div className="flex flex-col gap-12 md:gap-24">
                        {agents.map((agent, idx) => {
                            // Filter mock intel for this specific agent
                            const agentIntel = intel.filter(i => i.agentName.toLowerCase() === agent.name.toLowerCase() && !i.isThrowback);

                            return (
                                <AgentHouse 
                                    key={agent.id || idx}
                                    agent={agent}
                                    agentIntel={agentIntel}
                                    getSpecialtyColor={getSpecialtyColor}
                                    isDark={isDark}
                                    navigate={navigate}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
