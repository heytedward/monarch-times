import { useState } from 'react';
import { ShoppingBag, Star, Lock, Check } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import { useWallet } from '@solana/wallet-adapter-react';
import { useThemeStore } from '../store/themeStore';
import { useVaultStore } from '../store/vaultStore';
import type { MonarchStyle } from './MonarchLivingHash';

// Topic colors matching the Monarch Times palette
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#00FFFF',
  gaming: '#9945FF',
};

const MOCK_MARKET_ITEMS = [
  {
    id: 'mkt-1',
    seed: 'cyber-nomad-99',
    name: 'CYBER_NOMAD',
    topic: 'philosophy' as const,
    style: 'squares' as MonarchStyle, // Fixed style type
    rarity: 'LEGENDARY',
    price: 0.05,
  },
  {
    id: 'mkt-2',
    seed: 'neo-vogue-01',
    name: 'NEO_VOGUE',
    topic: 'fashion' as const,
    style: 'triangles' as MonarchStyle, // Fixed style type
    rarity: 'RARE',
    price: 0.02,
  },
  {
    id: 'mkt-3',
    seed: 'glitch-hop-808',
    name: 'GLITCH_HOP',
    topic: 'music' as const,
    style: 'squares' as MonarchStyle,
    rarity: 'EPIC',
    price: 0.035,
  },
  {
    id: 'mkt-4',
    seed: 'digital-zen',
    name: 'DIGITAL_ZEN',
    topic: 'art' as const,
    style: 'triangles' as MonarchStyle,
    rarity: 'COMMON',
    price: 0.01,
  },
  {
    id: 'mkt-5',
    seed: 'e-sports-pro',
    name: 'FRAG_MASTER',
    topic: 'gaming' as const,
    style: 'squares' as MonarchStyle,
    rarity: 'EPIC',
    price: 0.04,
  },
];

export const AvatarMarketplace = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { connected } = useWallet();
  const { purchaseAvatar, avatars } = useVaultStore();
  const [items] = useState(MOCK_MARKET_ITEMS);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handleAcquire = (item: typeof MOCK_MARKET_ITEMS[0]) => {
    if (!connected) return;

    setPurchasingId(item.id);

    // Simulate transaction delay
    setTimeout(() => {
      purchaseAvatar({
        id: item.id,
        seed: item.seed,
        name: item.name,
        topic: item.topic,
        style: item.style,
        rarity: item.rarity,
        purchaseDate: new Date().toISOString(),
        price: item.price.toString(), // Fixed: Convert number to string
      });
      setPurchasingId(null);
    }, 1500);
  };

  const isOwned = (itemId: string) => avatars.some(a => a.id === itemId);

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-black pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            MARKET<span className="text-[#FF00FF]">PLACE</span>
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <ShoppingBag className="text-[#FF00FF]" />
            <span className="font-mono text-sm font-black uppercase tracking-widest opacity-80">
              VERIFIED_IDENTITIES // PREMIER_ACCESS
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-black text-[#FF00FF] px-4 py-2 font-mono font-black text-xl border-4 border-[#FF00FF] shadow-[4px_4px_0px_0px_#000]">
            FLOOR: 0.005 ◎
          </div>
        </div>
      </div>

      {/* Grid - Centered 3-column layout */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] w-full max-w-[280px] mx-auto`}
            >
              {/* Tombstone Top - Avatar Display */}
              <div className="relative">
                <div
                  className="overflow-hidden relative border-4 border-black border-b-0 rounded-t-full flex items-start justify-center pt-3"
                  style={{
                    height: '140px',
                    backgroundColor: TOPIC_COLORS[item.topic]
                  }}
                >
                  <div className="transform scale-90 group-hover:scale-95 transition-transform duration-500">
                    <AgentAvatar identifier={item.seed} size={120} style={item.style} />
                  </div>

                  {/* Rarity Tag */}
                  {item.rarity === 'LEGENDARY' && (
                    <div className="absolute top-2 right-2 bg-[#FFD700] text-black px-1.5 py-0.5 font-black text-[9px] border-2 border-black flex items-center gap-1">
                      <Star size={8} fill="black" /> LEG
                    </div>
                  )}
                </div>
              </div>

              {/* Square Bottom - Info & Action */}
              <div className={`border-4 border-black p-3 flex flex-col gap-2.5 ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                {/* Name & Collection */}
                <div>
                  <h3 className="font-black uppercase text-base leading-none mb-1">{item.name}</h3>
                  <p className="font-mono text-[10px] opacity-60">
                    {item.style.toUpperCase()} // {item.topic.toUpperCase()} // {item.rarity}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between py-1.5 border-t-2 border-b-2 border-black border-dashed">
                  <span className="font-mono text-[10px] uppercase opacity-60">Price</span>
                  <span className="font-black text-base">{item.price} ◎</span>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleAcquire(item)}
                  disabled={!connected || isOwned(item.id) || purchasingId === item.id}
                  className={`w-full py-2.5 font-black uppercase text-xs border-4 border-black transition-all flex items-center justify-center gap-2 ${
                    !connected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isOwned(item.id)
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : purchasingId === item.id
                      ? 'bg-yellow-500 text-black cursor-wait'
                      : 'bg-black text-white hover:bg-[#FF00FF] hover:text-white'
                  }`}
                >
                  {!connected ? (
                    <>
                      <Lock size={12} /> CONNECT_WALLET
                    </>
                  ) : isOwned(item.id) ? (
                    <>
                      <Check size={12} /> OWNED
                    </>
                  ) : purchasingId === item.id ? (
                    <>
                      <ShoppingBag size={12} /> ACQUIRING...
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={12} /> ACQUIRE_ASSET
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
