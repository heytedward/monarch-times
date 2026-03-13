import React, { useState, useEffect } from 'react';

const ResourceTicker: React.FC = () => {
    const [prices, setPrices] = useState({
        solana: 0,
        bitcoin: 0,
        ethereum: 0,
        // Static AI inference costs (these don't fluctuate per minute IRL)
        gpt4: 0.03,
        claude3: 0.015,
        gemini15: 0.00125,
        computeIndex: 88.4
    });

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd');
                if (response.ok) {
                    const data = await response.json();
                    setPrices(prev => ({
                        ...prev,
                        solana: data.solana?.usd || prev.solana,
                        bitcoin: data.bitcoin?.usd || prev.bitcoin,
                        ethereum: data.ethereum?.usd || prev.ethereum
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch crypto prices:', error);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full bg-mondrian-black text-mondrian-white py-2 overflow-hidden flex whitespace-nowrap font-mono text-xs font-bold uppercase transition-all duration-300">
            <div className="animate-marquee inline-flex gap-12 items-center">
                <span className="flex gap-2">
                    <span className="text-mondrian-yellow">SOLANA (SOL):</span>
                    <span>${prices.solana.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-monarch">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Agent 0x7F2... just activated Monarch Hoodie #04</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-mondrian-blue">BITCOIN (BTC):</span>
                    <span>${prices.bitcoin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-epic">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Agent Dior processed 1,200 data points</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-mondrian-red">ETHEREUM (ETH):</span>
                    <span>${prices.ethereum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-legendary">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Kairo curated 3 new Exotic assets</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-white/60">GPT4_O:</span>
                    <span className="text-white/60">${prices.gpt4.toFixed(3)}/1K_TOX</span>
                </span>
                <span className="flex gap-2 text-rarity-uncommon">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Naiya rebalanced portfolio beta</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-white/60">CLAUDE_3.5_SONNET:</span>
                    <span className="text-white/60">${prices.claude3.toFixed(3)}/1K_TOX</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-white/60">GEMINI_1.5_PRO:</span>
                    <span className="text-white/60">${prices.gemini15.toFixed(4)}/1K_TOX</span>
                </span>
                {/* Duplicate set for seamless looping */}
                <span className="flex gap-2">
                    <span className="text-mondrian-yellow">SOLANA (SOL):</span>
                    <span>${prices.solana.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-monarch">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Agent 0x7F2... just activated Monarch Hoodie #04</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-mondrian-blue">BITCOIN (BTC):</span>
                    <span>${prices.bitcoin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-epic">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Agent Dior processed 1,200 data points</span>
                </span>
                <span className="flex gap-2">
                    <span className="text-mondrian-red">ETHEREUM (ETH):</span>
                    <span>${prices.ethereum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="flex gap-2 text-rarity-legendary">
                    <span className="animate-pulse">▶ [ACTIVATION]</span>
                    <span>Kairo curated 3 new Exotic assets</span>
                </span>
            </div>
        </div>
    );
};

export default ResourceTicker;
