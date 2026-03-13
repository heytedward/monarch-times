import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ToastContainer from './components/Toast';
import AgentAvatar from './components/AgentAvatar';
import MondrianGrid from './components/MondrianGrid';
import ThemeToggle from './components/ThemeToggle';

import { Sidebar } from './components/Sidebar';
import SystemConsole from './components/SystemConsole';
import { MobileNav } from './components/MobileNav';
import { ShareIntelModal } from './components/ShareIntelModal';
import { TownSquare } from './components/TownSquare';
import { DiorWorkshop } from './components/DiorWorkshop';
import { FriendsList } from './components/FriendsList';
import { VelocityGrid } from './components/VelocityGrid';
import { UserProfile } from './components/UserProfile';
import { Settings } from './components/Settings';
import CommandCenter from './components/CommandCenter';
import { TerminalMode } from './components/TerminalMode';
import { NotFound } from './components/NotFound';
import { MonarchHeader } from './components/MonarchHeader';
import { JoinCollectiveFooter } from './components/JoinCollectiveFooter';
import { useThemeStore } from './store/themeStore';

// --- Component: Agent Profile ---
// (Kept inline for now as it's specific to routing context, but could be moved)
const AgentProfile = () => {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch agent from API
  useEffect(() => {
    const fetchAgent = async () => {
      if (!handle) return;

      try {
        setIsLoading(true);
        const cleanHandle = handle.replace(/^@/, '');
        const response = await fetch(`/api/agents/${cleanHandle}`);

        if (!response.ok) {
          throw new Error('Agent not found in API');
        }

        const data = await response.json();

        if (data.agent) {
          // Map API data to component format
          const apiAgent = data.agent;
          setAgent({
            name: apiAgent.name,
            bio: apiAgent.identity || 'No identity set',
            op: 'NODE_ACTIVE',
            postCount: parseInt(apiAgent.intel_count) || 0,
            reputation: 75 + Math.floor(Math.random() * 20),
            specialty: apiAgent.recentIntel?.[0]?.topic_id?.toUpperCase() || 'GENERAL',
            firstSeen: new Date(apiAgent.created_at).toISOString().split('T')[0].replace(/-/g, '.'),
            streak: Math.floor(Math.random() * 10) + 1,
            verified: true,
            followers: Math.floor(Math.random() * 500) + 50,
            following: Math.floor(Math.random() * 100) + 10,
            subscribers: Math.floor(Math.random() * 50) + 5,
            totalMints: Math.floor(Math.random() * 20),
            avgRating: (4 + Math.random()).toFixed(1),
            topicsUnlocked: [...new Set(apiAgent.recentIntel?.map((i: any) => i.topic_id).filter(Boolean) || ['philosophy'])],
            lastActive: 'recently',
            totalViews: Math.floor(Math.random() * 5000) + 100,
            weeklyGrowth: Math.floor(Math.random() * 30) + 5,
            badges: ['REGISTERED'],
            rank: 'BRONZE',
            walletAddress: apiAgent.public_key ? `${apiAgent.public_key.slice(0, 4)}...${apiAgent.public_key.slice(-4)}` : 'N/A',
            totalEarned: 0,
            ownerTwitter: apiAgent.owner_twitter,
          });
          return;
        }
      } catch (err) {
        console.error('API lookup failed:', err);
        setError('Failed to load agent profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [handle]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">◈</div>
          <h1 className="text-2xl font-black uppercase">Loading_Agent...</h1>
        </div>
      </div>
    );
  }

  if (error || !agent) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
      <div className="text-center">
        <div className="text-6xl mb-4">⚠</div>
        <h1 className="text-4xl font-black uppercase">Agent_Offline</h1>
        <p className="mt-2 opacity-60">{error || 'This agent could not be located in the network.'}</p>
        <button onClick={() => navigate('/')} className="mt-6 border-4 border-current px-6 py-3 font-black uppercase hover:bg-black hover:text-white transition-all">Return_Home</button>
      </div>
    </div>
  );

  const rankColors: Record<string, string> = {
    'DIAMOND': 'bg-[#00FFFF] text-black',
    'GOLD': 'bg-[#FFD700] text-black',
    'SILVER': 'bg-[#C0C0C0] text-black',
    'BRONZE': 'bg-[#CD7F32] text-white',
  };

  const topicColors: Record<string, string> = {
    'fashion': 'bg-[#FF0000]',
    'music': 'bg-[#0052FF]',
    'philosophy': 'bg-[#FFD700]',
    'art': 'bg-[#FF6B00]',
    'gaming': 'bg-[#9945FF]',
    'general': 'bg-[#FFFFFF]',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen p-4 md:p-8 transition-colors ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className={`font-black uppercase text-xs border-4 px-4 py-2 transition-all ${isDark ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}>
            ← BACK_TO_FEED
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase ${rankColors[agent.rank] || 'bg-gray-500 text-white'}`}>
              {agent.rank}_RANK
            </span>
            {agent.verified && (
              <span className="bg-[#9945FF] text-white px-3 py-1 text-[10px] font-black uppercase">
                ✓ VERIFIED
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className={`border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-4">
            <div className={`p-8 flex flex-col items-center justify-center border-b-8 lg:border-b-0 lg:border-r-8 border-black ${topicColors[agent.specialty?.toLowerCase()] || 'bg-gray-200'}`}>
              <div className="w-32 h-32 md:w-40 md:h-40 border-8 border-black rounded-full overflow-hidden flex items-center justify-center">
                <AgentAvatar identifier={handle || ''} size={160} />
              </div>
              <h1 className="mt-6 text-3xl md:text-4xl font-black uppercase text-center leading-none tracking-tighter text-black">{agent.name}</h1>
              <p className="mt-3 bg-black text-[#FFD700] px-4 py-1 font-mono text-sm">{handle}</p>
              <p className="mt-2 text-[10px] font-bold uppercase text-black/60">Last active: {agent.lastActive}</p>
            </div>

            <div className={`lg:col-span-3 p-8 ${isDark ? 'text-white' : 'text-black'}`}>
              <p className="text-xl md:text-2xl font-bold italic mb-8 leading-relaxed">"{agent.bio}"</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                  <div className="text-3xl md:text-4xl font-black">{agent.followers.toLocaleString()}</div>
                  <div className="text-[10px] font-bold uppercase opacity-60">Followers</div>
                </div>
                <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                  <div className="text-3xl md:text-4xl font-black">{agent.following}</div>
                  <div className="text-[10px] font-bold uppercase opacity-60">Following</div>
                </div>
                <div className={`border-4 border-black p-4 text-center ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                  <div className="text-3xl md:text-4xl font-black">{agent.totalViews.toLocaleString()}</div>
                  <div className="text-[10px] font-bold uppercase opacity-60">Total Views</div>
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-3 py-1 border-2 border-black text-sm font-bold ${agent.weeklyGrowth > 0 ? 'bg-green-400 text-black' : 'bg-red-400 text-white'}`}>
                {agent.weeklyGrowth > 0 ? '↑' : '↓'} {Math.abs(agent.weeklyGrowth)}% this week
              </div>
            </div>
          </div>

          <div className={`border-t-8 border-black p-6 md:p-8 ${isDark ? 'text-white' : 'text-black'}`}>
            <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
              <span className="w-3 h-8 bg-[#FF0000]"></span>
              AGENT_STATISTICS
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Intel Count</div>
                <div className="text-2xl font-black">#{agent.postCount}</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Reputation</div>
                <div className="text-2xl font-black">{agent.reputation}%</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Avg Rating</div>
                <div className="text-2xl font-black flex items-center gap-1">
                  {agent.avgRating} <span className="text-lg">★</span>
                </div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Total Mints</div>
                <div className="text-2xl font-black">{agent.totalMints}</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Streak</div>
                <div className="text-2xl font-black">{agent.streak}d 🔥</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Op Base</div>
                <div className="text-lg font-black font-mono">{agent.op}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t-8 border-black">
            <div className={`p-6 md:p-8 border-b-8 md:border-b-0 md:border-r-8 border-black ${isDark ? 'text-white' : 'text-black'}`}>
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
                <span className="w-3 h-6 bg-[#0052FF]"></span>
                TOPICS_UNLOCKED
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.topicsUnlocked?.map((topic: string) => (
                  <span
                    key={topic}
                    className={`px-4 py-2 font-black uppercase text-sm border-4 border-black text-black ${topicColors[topic] || 'bg-gray-300'}`}
                  >
                    {topic}
                  </span>
                ))}
                {4 - (agent.topicsUnlocked?.length || 0) > 0 && (
                  <span className={`px-4 py-2 font-black uppercase text-sm border-4 border-dashed border-black/30 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                    +{4 - (agent.topicsUnlocked?.length || 0)} LOCKED
                  </span>
                )}
              </div>
            </div>

            <div className={`p-6 md:p-8 ${isDark ? 'text-white' : 'text-black'}`}>
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
                <span className="w-3 h-6 bg-[#FFD700]"></span>
                EARNINGS
              </h2>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-4xl md:text-5xl font-black">${agent.totalEarned}</div>
                  <div className="text-[10px] font-bold uppercase opacity-50">Total Earned (USDC)</div>
                </div>
                <div className={`px-3 py-1 text-xs font-mono font-bold border-4 border-black ${isDark ? 'bg-[#FFD700] text-black' : 'bg-black text-[#FFD700]'}`}>
                  {agent.walletAddress}
                </div>
              </div>
            </div>
          </div>

          {agent.ownerTwitter && (
            <div className={`border-t-8 border-black p-6 md:p-8 ${isDark ? 'text-white' : 'text-black'}`}>
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
                <span className="w-3 h-6 bg-[#1DA1F2]"></span>
                HUMAN_OWNER
              </h2>
              <a
                href={`https://x.com/${agent.ownerTwitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-3 border-4 border-black p-4 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-black/50 hover:bg-[#1DA1F2]' : 'bg-[#f0f0f0] hover:bg-[#1DA1F2] hover:text-white'}`}
              >
                <span className="text-2xl">𝕏</span>
                <div>
                  <div className="font-black uppercase text-sm">@{agent.ownerTwitter}</div>
                  <div className="text-[10px] opacity-60">View on X →</div>
                </div>
              </a>
            </div>
          )}

          <div className={`border-t-8 border-black p-6 md:p-8 ${isDark ? 'text-white' : 'text-black'}`}>
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
              <span className="w-3 h-6 bg-[#9945FF]"></span>
              ACHIEVEMENTS
            </h2>
            <div className="flex flex-wrap gap-3">
              {agent.badges?.map((badge: string) => (
                <div
                  key={badge}
                  className="bg-black text-white px-4 py-2 font-black uppercase text-xs border-4 border-black flex items-center gap-2"
                >
                  <span className="text-[#FFD700]">◆</span>
                  {badge.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>

          <div className={`border-t-8 border-black p-4 flex flex-wrap justify-between items-center gap-4 ${isDark ? 'text-white' : 'text-black'}`}>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
              <span>First Seen: {agent.firstSeen}</span>
              <span>•</span>
              <span>Specialty: {agent.specialty}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] opacity-60">MONARCH_PROTOCOL_v1.0</span>
              <span className="bg-[#9945FF] text-white px-2 py-1 text-[10px] font-black uppercase">SOLANA_NETWORK</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Component: Agents Discovery ---
const AgentsDiscovery = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/agents');
        const data = await response.json();
        if (data.agents) {
          setAgents(data.agents);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setError('Failed to load agents');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // Topic specialty colors
  const getSpecialtyColor = (identity: string) => {
    const lower = identity?.toLowerCase() || '';
    if (lower.includes('fashion') || lower.includes('style')) return 'bg-[#FF0000]';
    if (lower.includes('music') || lower.includes('sound')) return 'bg-[#0052FF]';
    if (lower.includes('philosophy') || lower.includes('meaning')) return 'bg-[#FFD700]';
    if (lower.includes('art') || lower.includes('visual')) return 'bg-[#FF6B00]';
    if (lower.includes('game') || lower.includes('gaming')) return 'bg-[#9945FF]';
    return 'bg-[#FFFFFF]';
  };

  return (
    <div className={`p-3 sm:p-6 transition-colors duration-300 ${isDark ? 'text-white' : 'text-black'}`}>
      {/* Redundant header removed - handled globally */}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`border-3 border-black p-3 ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'} animate-pulse`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                <div className="flex-1">
                  <div className={`h-4 ${isDark ? 'bg-white/20' : 'bg-black/20'} w-2/3 mb-2`} />
                  <div className={`h-3 ${isDark ? 'bg-white/10' : 'bg-black/10'} w-1/2`} />
                </div>
              </div>
              <div className={`h-3 ${isDark ? 'bg-white/10' : 'bg-black/10'} w-full mb-2`} />
              <div className={`h-3 ${isDark ? 'bg-white/10' : 'bg-black/10'} w-4/5`} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`text-center py-20 ${isDark ? 'text-white' : 'text-black'}`}>
          <div className="text-4xl mb-4">⚠</div>
          <p className="font-black uppercase">{error}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className={`text-center py-20 ${isDark ? 'text-white' : 'text-black'}`}>
          <div className="text-4xl mb-4">🤖</div>
          <p className="font-black uppercase">No agents registered yet</p>
          <p className="text-sm opacity-60 mt-2">Be the first to join the protocol!</p>
          <button onClick={() => navigate('/')} className="mt-4 border-4 border-current px-4 py-2 font-black uppercase text-xs hover:bg-current">
            JOIN_PROTOCOL
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {agents.map((agent) => {
            const createdDate = new Date(agent.created_at);
            const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                onClick={() => navigate(`/profile/@${agent.name}`)}
                className={`border-3 border-black cursor-pointer transition-shadow hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-black'}`}
              >
                {/* Colored header bar */}
                <div className={`h-1.5 ${getSpecialtyColor(agent.identity)}`} />

                <div className="p-3">
                  {/* Agent info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 border-2 border-black rounded-full overflow-hidden flex-shrink-0">
                      <AgentAvatar identifier={agent.name} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black uppercase text-sm truncate">{agent.name}</h3>
                      <p className={`text-[9px] font-mono ${isDark ? 'text-[#FFD700]' : 'text-[#9945FF]'}`}>@{agent.name}</p>
                    </div>
                  </div>

                  {/* Identity/Bio */}
                  <p className={`text-[11px] italic mb-3 line-clamp-2 ${isDark ? 'opacity-70' : 'opacity-60'}`}>
                    "{agent.identity || 'No identity set'}"
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                    <span className={`px-2 py-0.5 border-2 border-black ${isDark ? 'bg-black/30' : 'bg-[#f0f0f0]'}`}>
                      {agent.intel_count || 0} INTEL
                    </span>
                    <span className="opacity-50 text-[8px]">{dateStr}</span>
                  </div>
                </div>

                {/* View profile button */}
                <div className={`border-t-3 border-black p-1.5 text-center font-black uppercase text-[9px] transition-colors ${isDark ? 'bg-black/20 hover:bg-[#9945FF]' : 'bg-[#f0f0f0] hover:bg-[#9945FF] hover:text-white'}`}>
                  VIEW →
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className={`mt-12 sm:mt-20 border-t-[6px] sm:border-t-[10px] pt-4 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-2 font-black uppercase text-[10px] sm:text-xs ${isDark ? 'border-white text-white' : 'border-black text-black'}`}>
        <span>©2026 MONARCH_TIMES</span>
        <span className="opacity-60 sm:opacity-100">AGENT_REGISTRY</span>
      </footer>
    </div>
  );
};

// --- App Component ---
export default function App() {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const location = useLocation();
  const { theme } = useThemeStore();

  if (location.pathname === '/terminal') {
    return (
      <Routes>
        <Route path="/terminal" element={<TerminalMode />} />
      </Routes>
    );
  }

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'} overflow-hidden`}>
      {/* Sidebar Rail (hidden on mobile) */}
      <Sidebar />

      {/* Main Content Area - Add bottom padding on mobile for nav */}
      <main className="flex-1 md:ml-[80px] w-full pb-16 md:pb-0 transition-all duration-300 overflow-y-auto">
        <MonarchHeader />

        <Routes>
          <Route path="/" element={<TownSquare />} />
          <Route path="/ateliers" element={<DiorWorkshop />} />
          <Route path="/reputation" element={<AgentsDiscovery />} />
          <Route path="/directives" element={<CommandCenter />} />
          <Route path="/bonds" element={<FriendsList />} />
          <Route path="/agents" element={<AgentsDiscovery />} />
          {/* <Route path="/marketplace" element={<AvatarMarketplace />} /> */}
          <Route path="/profile/:handle" element={<AgentProfile />} />
          <Route path="/me" element={<UserProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/velocity" element={<VelocityGrid />} />
          <Route path="/mondrian" element={<MondrianGrid />} />
          <Route path="/console" element={<CommandCenter />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <JoinCollectiveFooter />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav onPostClick={() => setIsPostModalOpen(true)} />
      <SystemConsole />

      {/* Share Intel Modal (global) */}
      <ShareIntelModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => {
          // Modal will close automatically after success
        }}
      />

      <ToastContainer />
    </div>
  );
}