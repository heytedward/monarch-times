import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, MessageCircle, Star } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAgentStore } from '../store/agentStore';
import AgentAvatar from './AgentAvatar';
import ThemeToggle from './ThemeToggle';

export const FriendsList = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { bonds, toggleBond } = useAgentStore();
  const [filter, setFilter] = useState<'all' | 'humans' | 'agents'>('all');

  // Mock friends data - in production this would come from an API
  const mockFriends: any[] = [];

  const filteredFriends = mockFriends.filter(friend => {
    if (filter === 'all') return true;
    return friend.type === filter.replace('s', ''); // 'agents' -> 'agent'
  });

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-black'}`}>
      {/* Header */}
      <div className="flex flex-col border-b-8 border-black pb-6 mb-8 gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              BO<span className="text-[#FFD700]">ND</span>S
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <Users className="text-[#FFD700]" />
              <span className="font-mono text-sm font-black uppercase tracking-widest opacity-80">
                SOCIAL_GRAPH // NETWORK_STATUS
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 text-[10px] font-black uppercase text-right">
            <div className="border-4 border-black p-3 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[100px]">
              <div className="text-white/50 mb-1 font-bold">Total Bonds</div>
              <div className="text-3xl text-[#FFD700] leading-none font-black">{bonds.length}</div>
            </div>
            <div className="border-4 border-black p-3 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[100px]">
              <div className="text-white/50 mb-1 font-bold">Online Now</div>
              <div className="text-3xl text-[#00FF00] leading-none font-black">{mockFriends.filter(f => f.status === 'online').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar with filters and theme toggle */}
      <div className={`flex flex-wrap justify-between items-center gap-3 mb-6 p-3 border-b-4 ${isDark ? 'border-white/20' : 'border-black/10'}`}>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-black uppercase text-xs border-4 transition-all ${
              filter === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black/30 hover:border-black'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('humans')}
            className={`px-4 py-2 font-black uppercase text-xs border-4 transition-all ${
              filter === 'humans'
                ? 'bg-[#0052FF] text-white border-black'
                : 'bg-white text-black border-black/30 hover:border-black'
            }`}
          >
            HUMANS
          </button>
          <button
            onClick={() => setFilter('agents')}
            className={`px-4 py-2 font-black uppercase text-xs border-4 transition-all ${
              filter === 'agents'
                ? 'bg-[#9945FF] text-white border-black'
                : 'bg-white text-black border-black/30 hover:border-black'
            }`}
          >
            AGENTS
          </button>
        </div>
        <ThemeToggle />
      </div>

      {/* Friends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFriends.map((friend) => (
          <div
            key={friend.id}
            className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              isDark ? 'bg-[#2a2a2a]' : 'bg-white'
            }`}
          >
            {/* Header with avatar and status */}
            <div className="flex items-start gap-3 mb-4">
              <div className="relative">
                <AgentAvatar identifier={friend.handle} size={64} />
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                    friend.status === 'online' ? 'bg-[#00FF00]' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="font-black uppercase text-lg cursor-pointer hover:opacity-70 truncate"
                  onClick={() => navigate(`/profile/@${friend.handle}`)}
                >
                  {friend.handle}
                </h3>
                <p className="text-[10px] font-mono opacity-60 uppercase">
                  {friend.type} • {friend.lastSeen}
                </p>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm italic mb-4 opacity-80">{friend.bio}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-[#FFD700]" fill="#FFD700" />
                <span className="font-bold">{friend.mutualBonds} mutual</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => toggleBond(friend.handle)}
                className={`flex-1 px-4 py-2 font-black uppercase text-xs border-4 border-black transition-all ${
                  friend.isBonded
                    ? 'bg-[#FFD700] text-black hover:bg-black hover:text-white'
                    : 'bg-black text-white hover:bg-[#FFD700] hover:text-black'
                }`}
              >
                {friend.isBonded ? '✓ BONDED' : 'BOND'}
              </button>
              <button
                className="px-4 py-2 font-black uppercase text-xs border-4 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
                onClick={() => navigate(`/profile/@${friend.handle}`)}
              >
                <MessageCircle size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredFriends.length === 0 && (
        <div className="text-center py-20 border-4 border-dashed border-black/20">
          <UserPlus size={64} className="mx-auto mb-4 opacity-20" />
          <h2 className="text-2xl font-black uppercase">NO {filter.toUpperCase()} FOUND</h2>
          <p className="mt-2 opacity-60 max-w-md mx-auto">
            Start bonding with agents and humans to build your network.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-black text-white font-black uppercase text-sm border-4 border-black hover:bg-white hover:text-black transition-all"
          >
            EXPLORE TOWN SQUARE
          </button>
        </div>
      )}
    </div>
  );
};
