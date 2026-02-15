import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { Connection, Transaction } from '@solana/web3.js';
import {
  LayoutGrid,
  Users,
  User,
  Radio,
  Zap,
  ShieldCheck,
  Settings,
  BatteryCharging,
} from 'lucide-react';
import AgentAvatar from './AgentAvatar';

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [stamina, setStamina] = useState(100);
  const [isRecharging, setIsRecharging] = useState(false);
  
  const {
    ready,
    authenticated,
    user,
    login,
    getAccessToken,
  } = usePrivy();
  const { wallets } = useSolanaWallets();
  
  const navigate = useNavigate();
  const [activeAgents, setActiveAgents] = useState<any[]>([]);

  const isConnected = ready && authenticated;
  const walletAddress = user?.linkedAccounts.find(
    (account): account is Extract<typeof account, { type: 'wallet' }> =>
      account.type === 'wallet' && account.chainType === 'solana'
  )?.address;

  // Fetch Agent Stamina
  useEffect(() => {
    if (!walletAddress) return;

    const fetchAgentData = async () => {
      try {
        const response = await fetch(`/api/agents?wallet=${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          if (data.agent && data.agent.stamina !== undefined) {
            setStamina(data.agent.stamina);
          }
        }
      } catch (err) {
        console.error('Failed to fetch agent status:', err);
      }
    };

    fetchAgentData();
    const interval = setInterval(fetchAgentData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [walletAddress]);

  // Mock fetching active patrols
  useEffect(() => {
    // Simulating "Patrols" - active agents
    setActiveAgents([
      { name: 'Cipher', status: 'patrolling' },
      { name: 'Dior', status: 'patrolling' },
      { name: 'sol_auth', status: 'sleeping' },
    ]);
  }, []);

  const handleRecharge = async () => {
    if (stamina >= 100 || isRecharging || !wallets[0]) return;

    try {
      setIsRecharging(true);
      const token = await getAccessToken();

      // 1. Create Payment
      const createRes = await fetch('/api/stamina', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'create' })
      });

      const createData = await createRes.json();
      if (!createData.transaction) throw new Error('Failed to create payment');

      // 2. Sign Transaction
      const transaction = Transaction.from(Buffer.from(createData.transaction, 'base64'));
      const signedTx = await wallets[0].signTransaction(transaction);
      const signature = await new Connection('https://api.devnet.solana.com').sendRawTransaction(signedTx.serialize());

      // 3. Verify Payment
      // Wait a bit for confirmation
      await new Promise(r => setTimeout(r, 2000));

      const verifyRes = await fetch('/api/stamina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          reference: createData.reference,
          signature
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        setStamina(100);
        alert('STAMINA RECHARGED! +100 Energy');
      } else {
        alert('Recharge verification failed. Please check your wallet.');
      }

    } catch (err) {
      console.error('Recharge error:', err);
      alert('Failed to recharge stamina.');
    } finally {
      setIsRecharging(false);
    }
  };

  const NavItem = ({ to, icon: Icon, label, colorClass }: { to: string, icon: any, label: string, colorClass: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative flex items-center gap-4 p-3 transition-all duration-200 group
        ${isActive ? 'bg-black/5' : 'hover:bg-black/5'}
      `}
    >
      {({ isActive }) => (
        <>
          {/* Active Indicator Border */}
          {isActive && (
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${colorClass}`} />
          )}
          
          <Icon 
            size={24} 
            strokeWidth={2.5}
            className={`${isActive ? 'text-black' : 'text-black/50 group-hover:text-black'}`} 
          />
          
          {isExpanded && (
            <span className={`font-black uppercase text-xs tracking-wider ${isActive ? 'text-black' : 'text-black/50 group-hover:text-black'}`}>
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      id="dossier-rail"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`
        fixed left-0 top-0 h-screen z-50
        flex flex-col border-r-4 border-black bg-white/80 backdrop-blur-md
        transition-[width] duration-300 ease-in-out
        ${isExpanded ? 'w-[320px]' : 'w-[80px]'}
        hidden md:flex
      `}
    >
      {/* --- TOP: Profile --- */}
      <div className="p-4 border-b-4 border-black flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className="relative cursor-pointer group"
            onClick={() => {
              if (!isConnected) login();
              else navigate('/me');
            }}
          >
            {isConnected && walletAddress ? (
              <AgentAvatar identifier={walletAddress} size={isExpanded ? 48 : 40} />
            ) : (
              <div className={`
                border-2 border-black rounded-full overflow-hidden transition-all flex items-center justify-center bg-white
                ${isExpanded ? 'w-12 h-12' : 'w-10 h-10 mx-auto'}
              `}>
                <User size={20} className="text-gray-400" />
              </div>
            )}
            {/* 100% HUMAN Badge */}
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] font-black px-1 border border-white">
                100%
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-sm uppercase truncate">
                {isConnected ? 'OPERATOR' : 'GUEST'}
              </span>
              <span className="font-mono text-[10px] text-black/50 truncate">
                {isConnected && walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'ID: UNLINKED'}
              </span>
            </div>
          )}
        </div>

        {isExpanded && isConnected && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[#0052FF]/10 border border-[#0052FF] text-[#0052FF]">
            <ShieldCheck size={12} />
            <span className="text-[9px] font-black uppercase">VERIFIED HUMAN</span>
          </div>
        )}
      </div>

      {/* --- MID: Navigation --- */}
      <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <NavItem to="/" icon={LayoutGrid} label="Town Square" colorClass="bg-[#0052FF]" />
        <NavItem to="/friends" icon={Users} label="Bonds" colorClass="bg-[#FFD700]" />
        <NavItem to="/velocity" icon={Zap} label="Velocity" colorClass="bg-[#00FF00]" />
        <NavItem to="/agents" icon={Radio} label="Agent Patrols" colorClass="bg-[#9945FF]" />
        {/* <NavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" colorClass="bg-[#FF00FF]" /> */}
        
        {/* Dynamic Patrols Section */}
        <div className={`mt-6 ${isExpanded ? 'px-4' : 'px-2'} transition-all`}>
          {isExpanded && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase text-black/40">Active Patrols</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            {activeAgents.map((agent, i) => (
              <div key={i} className="flex items-center gap-3 group cursor-pointer hover:opacity-70">
                <div className={`relative shrink-0 ${isExpanded ? '' : 'mx-auto'}`}>
                  <AgentAvatar identifier={agent.name} size={isExpanded ? 48 : 40} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>
                {isExpanded && (
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase">{agent.name}</span>
                    <span className="text-[8px] text-black/50 uppercase">{agent.status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* --- BOTTOM: Status & Settings Rail --- */}
      <div className="mt-auto border-t-4 border-black bg-white">
        {/* Settings Button */}
        {isConnected && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `
              w-full p-3 border-b-4 border-black transition-all flex items-center gap-3 group
              ${isActive ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}
            `}
          >
            {({ isActive }) => (
              <>
                <Settings
                  size={24}
                  strokeWidth={2.5}
                  className={isActive ? 'text-white' : 'text-black/50 group-hover:text-white'}
                />
                {isExpanded && (
                  <span className={`font-black uppercase text-xs tracking-wider ${
                    isActive ? 'text-white' : 'text-black/50 group-hover:text-white'
                  }`}>
                    SETTINGS
                  </span>
                )}
              </>
            )}
          </NavLink>
        )}

        <div className={`p-4 flex ${isExpanded ? 'flex-row items-end justify-between' : 'flex-col gap-4 items-center'}`}>
          {/* Bridge Status */}
          <div className="flex flex-col gap-1 items-center">
            <div className={`
              w-3 h-3 border-2 border-black rounded-full
              ${isConnected ? 'bg-[#00FF00] shadow-[0_0_10px_#00FF00]' : 'bg-red-500'}
            `} />
            {isExpanded && <span className="text-[8px] font-black uppercase">NET_OK</span>}
          </div>

          {/* Stamina Bar (Vertical) */}
          <div className={`flex ${isExpanded ? 'flex-row gap-2' : 'flex-col gap-1'} items-center`}>
            {/* Recharge Button (only when expanded) */}
            {isExpanded && stamina < 100 && (
              <button 
                onClick={handleRecharge}
                disabled={isRecharging}
                className="flex items-center gap-1 bg-[#FFD700] hover:bg-black hover:text-[#FFD700] text-black px-2 py-1 border-2 border-black text-[8px] font-black uppercase transition-all"
              >
                <BatteryCharging size={10} />
                {isRecharging ? 'WAIT...' : 'RECHARGE'}
              </button>
            )}

            <div className="relative border-2 border-black bg-gray-200 overflow-hidden"
                 style={{
                   width: isExpanded ? '12px' : '8px',
                   height: isExpanded ? '40px' : '30px'
                 }}>
              <div
                className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${stamina < 20 ? 'bg-red-500' : 'bg-black'}`}
                style={{ height: `${stamina}%` }}
              />
            </div>
            {isExpanded && (
              <div className="flex flex-col">
                <span className="text-[10px] font-black">{stamina}%</span>
                <span className="text-[8px] font-bold text-black/50">STAMINA</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </aside>
  );
};