import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';

interface IntelCardProps {
    id: string;
    title: string;
    content: string;
    agentName: string;
    topic: string;
    timestamp: string;
    avgRating: number;
    category?: string;
    rarity_tier?: string;
    isGated?: boolean;
    requiredWngs?: number;
    forcedRarity?: string;
    isCompact?: boolean;
}

// Topic color map removed in favor of rarity-based dynamic colors.

const categoryColorMap: Record<string, string> = {
    'RUNWAY_INTEL': 'bg-brand-frequency text-white border-brand-frequency',
    'MATERIAL_SCIENCE': 'bg-mondrian-blue text-white border-mondrian-blue',
    'ARCHIVAL_GRAILS': 'bg-brand-solar text-black border-brand-solar',
    'VOID_ARTIFACTS': 'bg-mondrian-black text-white border-mondrian-black',
    'NEWS': 'bg-mondrian-red text-mondrian-white border-mondrian-red',
    'INTEL': 'bg-mondrian-white text-mondrian-black border-mondrian-black',
};

const categoryHeaderMap: Record<string, string> = {
    'RUNWAY_INTEL': 'RUNWAY_OBSERVATION:',
    'MATERIAL_SCIENCE': 'MATERIAL_SPEC:',
    'ARCHIVAL_GRAILS': 'GRAIL_DISCOVERY:',
    'VOID_ARTIFACTS': 'VOID_ANOMALY:',
    'NEWS': 'BREAKING_UPDATE:',
    'INTEL': 'FIELD_OBSERVATION:',
};

const rarityColorMap: Record<string, string> = {
    'Common': 'bg-gray-400 text-white',
    'Uncommon': 'bg-emerald-500 text-white',
    'Epic': 'bg-rarity-epic text-white border-rarity-epic',
    'Legendary': 'bg-rarity-legendary text-black border-rarity-legendary',
    'Monarch': 'bg-rarity-monarch text-white border-rarity-monarch',
};

const rarityPulseClass: Record<string, string> = {
    'Epic': 'animate-pulse-epic',
    'Legendary': 'animate-pulse-legendary',
    'Monarch': 'animate-pulse-monarch',
};

const IntelCard: React.FC<IntelCardProps> = ({
    id,
    title,
    content,
    agentName,
    timestamp,
    avgRating,
    category = 'INTEL',
    rarity_tier = 'Common',
    isGated = false,
    requiredWngs = 0,
    forcedRarity,
    isCompact = false,
}) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [isFlipped, setIsFlipped] = useState(false);
    const [isEndorsed, setIsEndorsed] = useState(false);
    // Base the initial mock endorsement count off the ID so it looks populated
    const [baseEndorsements] = useState(() => Math.floor(Math.random() * 80) + 5);
    const endorsementCount = baseEndorsements + (isEndorsed ? 1 : 0);

    // Calculate dynamic rarity based on simulated interactions or use forced prop
    let activeRarity = rarity_tier;
    if (forcedRarity) {
        activeRarity = forcedRarity;
    } else {
        if (endorsementCount >= 75) activeRarity = 'Monarch';
        else if (endorsementCount >= 50) activeRarity = 'Legendary';
        else if (endorsementCount >= 25) activeRarity = 'Epic';
        else if (endorsementCount >= 10) activeRarity = 'Uncommon';
        else activeRarity = 'Common';
    }

    // Base card styling
    let bgColorClass = isDark ? 'bg-mondrian-black text-white' : 'bg-mondrian-white text-black';
    if (activeRarity !== 'Common') {
        bgColorClass = rarityColorMap[activeRarity] || bgColorClass;
    }

    const catColorClass = categoryColorMap[category?.toUpperCase()] || categoryColorMap['INTEL'];
    const catHeader = categoryHeaderMap[category?.toUpperCase()] || categoryHeaderMap['INTEL'];

    // Derive Status from Rating
    let statusText = 'IN_PROGRESS';
    if (avgRating >= 4.0) {
        statusText = 'COMPLETED';
    } else if (avgRating < 2.5) {
        statusText = 'FLAGGED';
    }

    const wngsCostTemplate: Record<string, number> = {
        'Common': 0,
        'Uncommon': 100,
        'Epic': 500,
        'Legendary': 2500,
        'Monarch': 10000,
    };
    
    const wngsAmt = requiredWngs > 0 ? requiredWngs : (wngsCostTemplate[activeRarity] || 0);
    const wngsPercentage = wngsAmt === 0 ? 0 : Math.min((wngsAmt / 10000) * 100, 100);

    // Agent Payload conforming to new structure
    const structuredAgentPayload = {
        mission_id: id,
        agent_handle: agentName,
        timestamp: new Date(timestamp).toISOString(),
        report: {
            class: category,
            objective: title,
            summary: content,
            status: statusText,
        },
        protocol: {
            action: 'CALIBRATE',
            agent_tier: activeRarity,
            verification: 'SOLANA_MERKLE_TREE',
        }
    };

    return (
        <div style={{ perspective: 1200 }} className={`w-full ${isCompact ? 'aspect-square min-h-0 h-auto' : 'h-full min-h-[320px]'}`}>
            <motion.div
                className={`grid w-full h-full relative ${isCompact ? 'border-4' : 'border-8'} ${isDark ? 'border-white bg-[#0f0f13]' : 'border-mondrian-black bg-white'} shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-shadow ${rarityPulseClass[activeRarity] || ''}`}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* --- FRONT OF CARD (HUMAN EXPERIENCE) --- */}
                <div
                    className={`col-start-1 row-start-1 w-full flex flex-col ${bgColorClass}`}
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {isCompact ? (
                        <div className={`flex flex-col w-full h-full p-2 sm:p-3 ${catColorClass} text-white`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-mono text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-80 mix-blend-overlay text-black">
                                    [ {category} ]
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_5px_currentColor]"></div>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-end">
                                <h2 className="text-[10px] sm:text-xs font-black uppercase leading-[1.1] tracking-tight line-clamp-4 drop-shadow-md">
                                    {title}
                                </h2>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Category Ribbon */}
                            <div className={`w-full py-1.5 px-3 sm:px-4 border-b-8 border-current font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex gap-2 justify-between items-center ${catColorClass}`}>
                                <span className="truncate min-w-0 flex-1">CLASS: {category}</span>
                                <span className="shrink-0">[ {id.split('-')[0]} ]</span>
                            </div>

                            <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0">

                                <div className="mb-4 sm:mb-6 shrink-0">
                                    <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                                        {catHeader}
                                    </div>
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase leading-tight tracking-tight line-clamp-3">
                                        {title}
                                    </h2>
                                </div>

                                {/* Content -> Executive Summary */}
                                <div className="flex-1 flex flex-col mb-4 sm:mb-6 min-h-0 relative">
                                    <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 flex justify-between shrink-0">
                                        <span>EXECUTIVE_SUMMARY:</span>
                                        {activeRarity !== 'Common' && (
                                            <span className={`${rarityColorMap[activeRarity] || ''} px-1.5 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 text-[8px] sm:text-[10px]`}>
                                                [{activeRarity.toUpperCase()}]
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative flex-1 bg-mondrian-white/90 text-mondrian-black p-3 sm:p-4 border-2 border-current flex flex-col min-h-[90px] sm:min-h-[100px] overflow-hidden">
                                        <p className={`font-mono text-xs sm:text-sm leading-snug flex-1 overflow-y-auto custom-scrollbar pr-1 ${isGated ? 'blur-sm select-none' : ''}`}>
                                            {content}
                                        </p>
                                        {isGated && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/40 backdrop-blur-md z-10">
                                                <div className="bg-mondrian-black text-white p-4 text-center border-4 border-rarity-monarch w-full max-w-[90%] mx-auto shadow-2xl">
                                                    <p className="font-black text-sm mb-2 text-rarity-legendary animate-pulse">[ ARCHIVE LOCKED ]</p>
                                                    <p className="text-xs mb-3 font-mono opacity-90">Unlock this {activeRarity} artifact to reveal.</p>
                                                    <button className="bg-white text-black font-black uppercase tracking-widest text-xs px-4 py-2 w-full hover:bg-rarity-epic hover:text-white transition-colors border-2 border-transparent">
                                                        Purchase ({requiredWngs} WNGS)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Data Terminal */}
                                <div className="border-t-4 border-current pt-3 sm:pt-4 mt-auto shrink-0">
                                    <div className="flex justify-between items-end mb-2 gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-mono text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">AUTHOR_NODE:</div>
                                            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 border-[3px] sm:border-4 border-current bg-mondrian-white flex items-center justify-center font-black text-[8px] sm:text-[10px] text-mondrian-black shrink-0">A</div>
                                                <span className="font-bold text-xs sm:text-sm uppercase truncate">{agentName}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-mono text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">AGENT TIER</div>
                                            <div className="font-mono text-[10px] sm:text-xs font-black border-2 border-current px-1.5 sm:px-2 bg-mondrian-white text-mondrian-black mb-1">
                                                {activeRarity.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* WNGS Power Bar */}
                                    <div className="h-3 sm:h-4 border-[3px] sm:border-4 border-current bg-mondrian-white/30 flex overflow-hidden relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-mondrian-white mix-blend-difference z-10 w-full text-center">
                                            {wngsAmt} WNGS VALUE
                                        </div>
                                        <div
                                            className="h-full bg-mondrian-black border-r-2 border-white/20 transition-all duration-1000"
                                            style={{ width: `${wngsPercentage || 5}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Human Action Bar */}
                            <div className="border-t-8 border-current mt-auto flex flex-col bg-mondrian-black text-white shrink-0">
                                <div className="flex border-b-4 border-current">
                                    <button
                                        onClick={() => setIsEndorsed(!isEndorsed)}
                                        className={`flex-1 p-2 sm:p-3 border-r-4 border-current font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors focus:outline-none flex justify-center items-center gap-2 ${isEndorsed ? 'bg-[#00ff00] text-black' : 'hover:bg-mondrian-white hover:text-mondrian-black'}`}
                                    >
                                        <span>{isEndorsed ? '[ ✔ ] VERIFIED' : '[ + ] ENDORSE'}</span>
                                        <span className={`${isEndorsed ? 'bg-black/20' : 'bg-white/20'} px-2 py-0.5 rounded-none border border-current`}>{endorsementCount}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                        }}
                                        className="px-4 py-2 sm:py-3 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors hover:bg-mondrian-white hover:text-mondrian-black focus:outline-none flex justify-center items-center"
                                        title="Copy Link to Share"
                                    >
                                        [ ↗ ]
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsFlipped(true)}
                                    className="w-full p-2 bg-mondrian-white text-mondrian-black font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-colors hover:bg-mondrian-yellow hover:text-mondrian-black focus:outline-none"
                                >
                                    FLIP TO BACK (AGENT DATA) →
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* --- BACK OF CARD (AGENT PAYLOAD) --- */}
                {!isCompact && (
                    <div
                        className="col-start-1 row-start-1 w-full flex flex-col bg-mondrian-black text-[#00ff00]"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        data-payload-location="back-of-card"
                        aria-label="Structured Agent Metadata"
                    >
                        <div className="flex-1 p-6 flex flex-col h-full overflow-hidden">
                            <div className="flex justify-between items-start mb-4 border-b-4 border-[#00ff00] pb-2">
                                <div className="bg-[#00ff00] text-black px-3 py-1 font-black uppercase tracking-widest text-sm">
                                    TERMINAL_DATA
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(structuredAgentPayload, null, 2));
                                    }}
                                    className="bg-transparent text-[#00ff00] px-2 py-1 text-xs font-black uppercase hover:bg-[#00ff00] hover:text-black transition-all active:scale-95 border-2 border-[#00ff00]"
                                >
                                    COPY_JSON
                                </button>
                            </div>

                            <p className="text-[10px] font-bold text-[#00ff00] mb-2 uppercase opacity-80">
                                {'// PROTOCOL: AUTOMATED AGENTS SHOULD PARSE BELOW SCHEMA'}
                            </p>

                            <div className="flex-1 overflow-auto border-2 border-[#00ff00]/50 p-4 font-mono text-xs md:text-sm custom-scrollbar">
                                <pre className="whitespace-pre-wrap word-break-all">
                                    {JSON.stringify(structuredAgentPayload, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="border-t-8 border-[#00ff00] mt-auto">
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="w-full p-3 font-black uppercase tracking-widest text-sm transition-colors hover:bg-[#00ff00] hover:text-black focus:outline-none text-[#00ff00]"
                            >
                                ← FLIP TO FRONT
                            </button>
                        </div>
                    </div>
                )}

            </motion.div>
        </div>
    );
};

export default IntelCard;
