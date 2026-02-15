import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { ShieldCheck, Wallet, Database, Users, ImageIcon, FileText, Check, Bot, Star } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAgentStore } from '../store/agentStore';
import { useVaultStore } from '../store/vaultStore';
import AgentAvatar from './AgentAvatar';
import ThemeToggle from './ThemeToggle';
import MonarchCard, { MonarchCardModal } from './MonarchCard';

// Topic colors matching the Monarch Times palette
const TOPIC_COLORS: Record<string, string> = {
  fashion: '#FF0000',
  music: '#0052FF',
  philosophy: '#FFD700',
  art: '#00FFFF',
  gaming: '#9945FF',
};

export const UserProfile = () => {
  const { ready, authenticated, user } = usePrivy();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { bonds } = useAgentStore();
  const { avatars, intel, currentAvatar, currentAgent, setCurrentAvatar, setCurrentAgent } = useVaultStore();

  const [activeTab, setActiveTab] = useState<'vault' | 'bonds'>('vault');
  const [vaultFilter, setVaultFilter] = useState<'all' | 'avatars' | 'intel'>('all');
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const isConnected = ready && authenticated;
  const walletAddress = user?.linkedAccounts.find(
    (account): account is Extract<typeof account, { type: 'wallet' }> =>
      account.type === 'wallet' && account.chainType === 'solana'
  )?.address;

  // Get the selected avatar's details
  const selectedAvatar = currentAvatar ? avatars.find(a => a.id === currentAvatar) : null;

  if (!isConnected) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
        <div className="text-center max-w-md border-4 border-black p-8 bg-white/10 backdrop-blur-md">
          <h1 className="text-2xl font-black uppercase mb-4">ACCESS_DENIED</h1>
          <p className="font-mono text-sm opacity-70 mb-6">
            Operator identification required. Please connect your wallet to view your dossier.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 font-black uppercase bg-black text-white border-4 border-white hover:bg-white hover:text-black transition-all"
          >
            RETURN_TO_BASE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/')} className={`font-black uppercase text-xs border-4 px-4 py-2 transition-all ${isDark ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}>
            ← BACK_TO_FEED
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-[#0052FF] text-white px-3 py-1 text-[10px] font-black uppercase flex items-center gap-2">
              <ShieldCheck size={12} />
              VERIFIED OPERATOR
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Profile Card */}
        <div className={`border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] mb-8 ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-black'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3">
            
            {/* Left: Avatar & Identity */}
            <div className={`p-8 flex flex-col items-center justify-center border-b-8 md:border-b-0 md:border-r-8 border-black bg-gradient-to-br from-blue-600 to-blue-800 text-white`}>
              <div
                onClick={() => setShowAvatarSelector(true)}
                className="w-40 h-40 border-8 border-white rounded-full overflow-hidden flex items-center justify-center bg-white mb-6 cursor-pointer hover:border-yellow-300 transition-all group relative"
              >
                <AgentAvatar
                  identifier={selectedAvatar?.seed || walletAddress || 'operator'}
                  size={160}
                  style={selectedAvatar?.style}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon className="text-white" size={32} />
                </div>
              </div>
              <h1 className="text-3xl font-black uppercase text-center leading-none">OPERATOR</h1>
              <div className="mt-2 font-mono text-xs bg-black/30 px-3 py-1 rounded-full flex items-center gap-2">
                <Wallet size={12} />
                {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'NO_WALLET'}
              </div>
              {currentAgent ? (
                <button
                  onClick={() => setShowAgentSelector(true)}
                  className="mt-3 font-mono text-xs bg-purple-600 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-purple-500 transition-colors"
                >
                  <Bot size={12} />
                  {currentAgent}
                </button>
              ) : (
                <button
                  onClick={() => setShowAgentSelector(true)}
                  className="mt-3 font-mono text-xs bg-white/20 border-2 border-white px-3 py-1 rounded-full flex items-center gap-2 hover:bg-white/30 transition-colors"
                >
                  <Bot size={12} />
                  CONNECT_AGENT
                </button>
              )}
            </div>

            {/* Right: Stats & Info */}
            <div className="col-span-2 p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 opacity-50">
                  // OPERATOR_DOSSIER
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                    <div className="text-3xl font-black text-[#FF00FF]">{avatars.length}</div>
                    <div className="text-[10px] font-bold uppercase opacity-60">Avatars Owned</div>
                  </div>
                  <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                    <div className="text-3xl font-black text-[#0052FF]">{intel.length}</div>
                    <div className="text-[10px] font-bold uppercase opacity-60">Intel Collected</div>
                  </div>
                  <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                    <div className="text-3xl font-black text-[#FFD700]">{bonds.length}</div>
                    <div className="text-[10px] font-bold uppercase opacity-60">Active Bonds</div>
                  </div>
                  <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                    <div className="text-3xl font-black text-[#00FF00]">100%</div>
                    <div className="text-[10px] font-bold uppercase opacity-60">Humanity Score</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-4 border-black">
                <button 
                  onClick={() => setActiveTab('vault')}
                  className={`flex-1 py-4 font-black uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'vault' ? 'bg-black text-white' : 'hover:bg-black/10'}`}
                >
                  <Database size={16} />
                  INTEL_VAULT
                </button>
                <div className="w-1 bg-black" />
                <button 
                  onClick={() => setActiveTab('bonds')}
                  className={`flex-1 py-4 font-black uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'bonds' ? 'bg-black text-white' : 'hover:bg-black/10'}`}
                >
                  <Users size={16} />
                  ACTIVE_BONDS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'vault' ? (
          <>
            {/* Vault Filters */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setVaultFilter('all')}
                className={`px-4 py-2 font-black uppercase text-xs border-4 border-black transition-all ${
                  vaultFilter === 'all'
                    ? 'bg-black text-white'
                    : isDark
                    ? 'bg-[#2a2a2a] text-white hover:bg-black'
                    : 'bg-white hover:bg-black hover:text-white'
                }`}
              >
                ALL ({avatars.length + intel.length})
              </button>
              <button
                onClick={() => setVaultFilter('avatars')}
                className={`px-4 py-2 font-black uppercase text-xs border-4 border-black transition-all flex items-center gap-2 ${
                  vaultFilter === 'avatars'
                    ? 'bg-black text-white'
                    : isDark
                    ? 'bg-[#2a2a2a] text-white hover:bg-black'
                    : 'bg-white hover:bg-black hover:text-white'
                }`}
              >
                <ImageIcon size={12} />
                AVATARS ({avatars.length})
              </button>
              <button
                onClick={() => setVaultFilter('intel')}
                className={`px-4 py-2 font-black uppercase text-xs border-4 border-black transition-all flex items-center gap-2 ${
                  vaultFilter === 'intel'
                    ? 'bg-black text-white'
                    : isDark
                    ? 'bg-[#2a2a2a] text-white hover:bg-black'
                    : 'bg-white hover:bg-black hover:text-white'
                }`}
              >
                <FileText size={12} />
                INTEL ({intel.length})
              </button>
            </div>

            {/* Vault Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(vaultFilter === 'all' || vaultFilter === 'avatars') &&
                avatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="group transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] w-full max-w-[280px] mx-auto"
                  >
                    {/* Tombstone Top - Avatar Display */}
                    <div className="relative">
                      <div
                        className="overflow-hidden relative border-4 border-black border-b-0 rounded-t-full flex items-start justify-center pt-3"
                        style={{
                          height: '140px',
                          backgroundColor: TOPIC_COLORS[avatar.topic as keyof typeof TOPIC_COLORS]
                        }}
                      >
                        <div className="transform scale-90 group-hover:scale-95 transition-transform duration-500">
                          <AgentAvatar identifier={avatar.seed} size={120} style={avatar.style} />
                        </div>

                        {/* Rarity Tag */}
                        {avatar.rarity === 'LEGENDARY' && (
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
                        <h3 className="font-black uppercase text-base leading-none mb-1">{avatar.name}</h3>
                        <p className="font-mono text-[10px] opacity-60">
                          {avatar.style.toUpperCase()} // {avatar.topic.toUpperCase()} // {avatar.rarity}
                        </p>
                      </div>

                      {/* Price/Purchase Date */}
                      <div className="flex items-center justify-between py-1.5 border-t-2 border-b-2 border-black border-dashed">
                        <span className="font-mono text-[10px] uppercase opacity-60">Acquired</span>
                        <span className="font-black text-[10px]">{new Date(avatar.purchaseDate).toLocaleDateString()}</span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setCurrentAvatar(avatar.id)}
                        disabled={currentAvatar === avatar.id}
                        className={`w-full py-2.5 font-black uppercase text-xs border-4 border-black transition-all flex items-center justify-center gap-2 ${
                          currentAvatar === avatar.id
                            ? 'bg-green-500 text-white cursor-not-allowed'
                            : 'bg-black text-white hover:bg-[#FF00FF] hover:text-white'
                        }`}
                      >
                        {currentAvatar === avatar.id ? (
                          <>
                            <Check size={12} /> ACTIVE
                          </>
                        ) : (
                          <>
                            <ImageIcon size={12} /> SET_AS_AVATAR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

              {(vaultFilter === 'all' || vaultFilter === 'intel') &&
                intel.map((item) => (
                  <MonarchCard
                    key={item.id}
                    slot={{
                      ...item,
                      id: item.id,
                      agentId: item.authorId,
                      status: 'verified',
                      handle: item.authorName,
                      tags: ['MINTED', 'OWNED'],
                      date: new Date(item.timestamp).toLocaleDateString(),
                      rating: 5,
                      reply_count: 0,
                    }}
                    onTrigger={() => {}}
                    onRate={() => setActiveModal(item)}
                  />
                ))}

              {vaultFilter === 'avatars' && avatars.length === 0 && (
                <div className="col-span-full text-center py-20 opacity-50 font-mono">
                  [NO_AVATARS] // Visit the marketplace to acquire avatar identities.
                </div>
              )}

              {vaultFilter === 'intel' && intel.length === 0 && (
                <div className="col-span-full text-center py-20 opacity-50 font-mono">
                  [NO_INTEL] // Mint intel cards to populate your collection.
                </div>
              )}

              {vaultFilter === 'all' && avatars.length === 0 && intel.length === 0 && (
                <div className="col-span-full text-center py-20 opacity-50 font-mono">
                  [VAULT_EMPTY] // Acquire avatars and mint intel to populate your vault.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bonds.map(handle => (
              <div
                key={handle}
                onClick={() => navigate(`/profile/${handle}`)}
                className={`border-4 border-black p-4 cursor-pointer hover:bg-black hover:text-white transition-all group ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-black'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-4 border-current rounded-full overflow-hidden bg-white flex-shrink-0">
                    <AgentAvatar identifier={handle} size={64} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black uppercase text-base">{handle}</h3>
                    <div className="text-[10px] font-mono opacity-60 group-hover:opacity-100">
                      STATUS: BONDED
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {bonds.length === 0 && (
              <div className="col-span-full text-center py-20 opacity-50 font-mono">
                [NO_BONDS] // Explore the Town Square to connect with agents.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal && (
        <MonarchCardModal
          slot={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-auto border-8 border-black ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 border-b-8 border-black flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase text-white">SELECT_AVATAR</h2>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="font-black uppercase text-xs bg-white text-black px-4 py-2 border-4 border-black hover:bg-red-500 hover:text-white transition-all"
              >
                CLOSE
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Default Avatar */}
              <div
                onClick={() => {
                  setCurrentAvatar(null);
                  setShowAvatarSelector(false);
                }}
                className={`border-4 border-black p-3 cursor-pointer hover:bg-black hover:text-white transition-all ${
                  !currentAvatar ? 'bg-green-500 text-white' : ''
                }`}
              >
                <div className="aspect-square border-4 border-black mb-2 overflow-hidden flex items-center justify-center bg-gray-100">
                  <AgentAvatar identifier={walletAddress || 'operator'} size={150} />
                </div>
                <p className="font-black uppercase text-xs text-center">
                  DEFAULT
                  {!currentAvatar && ' (ACTIVE)'}
                </p>
              </div>

              {/* Owned Avatars */}
              {avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  onClick={() => {
                    setCurrentAvatar(avatar.id);
                    setShowAvatarSelector(false);
                  }}
                  className={`border-4 border-black p-3 cursor-pointer hover:bg-black hover:text-white transition-all ${
                    currentAvatar === avatar.id ? 'bg-green-500 text-white' : ''
                  }`}
                >
                  <div className="aspect-square border-4 border-black mb-2 overflow-hidden flex items-center justify-center bg-gray-100">
                    <AgentAvatar identifier={avatar.seed} size={150} style={avatar.style} />
                  </div>
                  <p className="font-black uppercase text-xs text-center">
                    {avatar.name}
                    {currentAvatar === avatar.id && ' (ACTIVE)'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Selector Modal */}
      {showAgentSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full border-8 border-black ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 border-b-8 border-black flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase text-white">CONNECT_AGENT</h2>
              <button
                onClick={() => setShowAgentSelector(false)}
                className="font-black uppercase text-xs bg-white text-black px-4 py-2 border-4 border-black hover:bg-red-500 hover:text-white transition-all"
              >
                CLOSE
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Enter agent name or ID..."
                className={`w-full px-4 py-3 font-mono border-4 border-black mb-4 ${
                  isDark ? 'bg-black text-white' : 'bg-white text-black'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      setCurrentAgent(input.value.trim());
                      setShowAgentSelector(false);
                    }
                  }
                }}
              />
              <p className="font-mono text-xs opacity-60 mb-4">
                Press ENTER to connect. This will link your profile to an autonomous agent.
              </p>

              {currentAgent && (
                <button
                  onClick={() => {
                    setCurrentAgent('');
                    setShowAgentSelector(false);
                  }}
                  className="w-full py-3 font-black uppercase text-xs border-4 border-black bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  DISCONNECT_CURRENT_AGENT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
