import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import bs58 from 'bs58';
import {
  LayoutGrid,
  User,
  Zap,
  ShieldCheck,
  Settings,
  Briefcase,
} from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';

export const Sidebar = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
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
  const { wallets } = useWallets();

  const navigate = useNavigate();

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


  const handleRecharge = async () => {
    try {
      setIsRecharging(true);

      const activeWallet = wallets.find((w) => w.address === walletAddress) as any;
      if (!activeWallet) {
        alert("Please connect your Solana wallet");
        return;
      }

      const token = await getAccessToken();

      // 1. Create Recharge Payment
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'recharge-create' })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create recharge');

      // 2. Sign and send the transaction (Simplified for demo, usually use @solana/pay or direct transfer)
      // For this implementation, we simulate the payment confirmation via signature
      // In a real app, you'd use the transaction returned by the API or create one

      const message = `RECHARGE_STAMINA:${walletAddress}:${Date.now()}`;
      const signatureBytes = await activeWallet.signMessage(new TextEncoder().encode(message));

      let signature = '';
      if (typeof signatureBytes === 'string') {
        signature = signatureBytes;
      } else {
        // @ts-ignore
        signature = signatureBytes.signature || bs58.encode(signatureBytes);
      }

      // 3. Verify Recharge
      const verifyRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recharge-verify',
          reference: data.reference,
          signature
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        setStamina(100);
        // Success feedback is handled by the Stamina bar updating
      } else {
        throw new Error(verifyData.error || 'Verification failed');
      }

      /* 
      // Previous Solana Implementation:
      const token = await getAccessToken();

      // 1. Create Payment
      const createRes = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'recharge-create' })
      });

      const createData = await createRes.json();
      if (!createData.transaction) throw new Error('Failed to create payment');

      // 2. Sign Transaction
      const transaction = Transaction.from(Buffer.from(createData.transaction, 'base64'));
      const signedTx = await signTransaction(transaction);
      const signature = await new Connection('https://api.devnet.solana.com').sendRawTransaction(signedTx.serialize());

      // 3. Verify Payment
      // Wait a bit for confirmation
      await new Promise(r => setTimeout(r, 2000));

      const verifyRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recharge-verify',
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
      */

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
        ${isActive ? (isDark ? 'bg-white/10' : 'bg-black/5') : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}
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
            className={`${isActive ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-white/50 group-hover:text-white' : 'text-black/50 group-hover:text-black')}`}
          />

          {isExpanded && (
            <span className={`font-black uppercase text-xs tracking-wider ${isActive ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-white/50 group-hover:text-white' : 'text-black/50 group-hover:text-black')}`}>
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
        flex flex-col border-r-4 ${isDark ? 'border-white bg-[#0f0f13]' : 'border-black bg-white/80'} backdrop-blur-md
        transition-[width] duration-300 ease-in-out
        ${isExpanded ? 'w-[320px]' : 'w-[80px]'}
        hidden md:flex
      `}
    >
      {/* --- TOP: Profile --- */}
      <div className={`p-4 border-b-4 ${isDark ? 'border-white' : 'border-black'} flex flex-col gap-4`}>
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
                border-2 ${isDark ? 'border-white bg-black' : 'border-black bg-white'} rounded-full overflow-hidden transition-all flex items-center justify-center
                ${isExpanded ? 'w-12 h-12' : 'w-10 h-10 mx-auto'}
              `}>
                <User size={20} className={isDark ? "text-gray-500" : "text-gray-400"} />
              </div>
            )}
            {/* Operator/Guest Badge */}
            {isConnected && (
              <div className={`absolute -bottom-1 -right-1 ${isDark ? 'bg-white text-black border-black' : 'bg-black text-white border-white'} text-[8px] font-black px-1 border tracking-tighter`}>
                {walletAddress ? 'AGENT' : 'HUMAN'}
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className={`font-black text-sm uppercase truncate ${isDark ? 'text-white' : 'text-black'}`}>
                {isConnected ? (walletAddress ? 'OPERATOR' : 'HUMAN') : 'GUEST'}
              </span>
              <span className={`font-mono text-[10px] truncate ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                {isConnected ? (walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : user?.email?.address || 'AUTHENTICATED') : 'ID: UNLINKED'}
              </span>
            </div>
          )}
        </div>

        {isExpanded && isConnected && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2 py-1 bg-[#9945FF]/10 border border-[#9945FF] text-[#9945FF]">
              <ShieldCheck size={12} />
              <span className="text-[9px] font-black uppercase">{stamina > 0 ? 'CONNECTION_SECURE' : 'OFFLINE'}</span>
            </div>
          </div>
        )}
      </div>

      {/* --- MID: Navigation --- */}
      <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <NavItem to="/" icon={LayoutGrid} label="Town Square" colorClass="bg-[#00FF00]" />
        <NavItem to="/ateliers" icon={Briefcase} label="The Ateliers" colorClass="bg-rarity-epic" />
      </nav>

      {/* --- BOTTOM: Status & Settings Rail --- */}
      <div className={`mt-auto border-t-4 ${isDark ? 'border-white bg-[#0f0f13]' : 'border-black bg-white'}`}>
        
        <div className={`flex w-full ${isDark ? 'border-white' : 'border-black'} border-b-4`}>
          {/* Settings Button */}
          {isConnected && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `
                flex-1 p-3 transition-all flex items-center gap-3 group border-r-4 ${isDark ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'}
                ${isActive ? (isDark ? '!bg-white !text-black' : '!bg-black !text-white') : ''}
              `}
            >
              {() => (
                <>
                  <Settings
                    size={24}
                    strokeWidth={2.5}
                    className="currentColor"
                  />
                  {isExpanded && (
                    <span className="font-black uppercase text-xs tracking-wider currentColor">
                      SETTINGS
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )}

          <div className={`flex items-center justify-center p-2 ${!isConnected ? 'w-full' : ''}`}>
            <ThemeToggle />
          </div>
        </div>

        <div className={`p-4 flex ${isExpanded ? 'flex-row items-end justify-between' : 'flex-col gap-4 items-center'}`}>
          {/* Bridge Status */}
          <div className="flex flex-col gap-1 items-center">
            <div className={`
              w-3 h-3 border-2 ${isDark ? 'border-white' : 'border-black'} rounded-full
              ${isConnected ? 'bg-[#00FF00] shadow-[0_0_10px_#00FF00]' : 'bg-red-500'}
            `} />
            {isExpanded && <span className={`text-[8px] font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>NET_OK</span>}
          </div>

          {/* Stamina Bar (Vertical) */}
          <div className={`flex ${isExpanded ? 'flex-row gap-2' : 'flex-col gap-1'} items-center w-full`}>
            {/* Recharge (Top Up) Button */}
            {isExpanded && (
              <button
                onClick={handleRecharge}
                disabled={isRecharging}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 ${isDark ? 'border-white' : 'border-black'} font-black uppercase text-[9px] transition-all
                  ${stamina < 100
                    ? `bg-[#00FF00] text-black hover:bg-black hover:text-[#00FF00] ${isDark ? 'dark:hover:border-[#00FF00]' : ''}`
                    : `${isDark ? 'bg-white/10 text-white/30' : 'bg-gray-100 text-black/30'} cursor-not-allowed`}
                `}
              >
                <Zap size={14} fill={stamina < 100 ? "currentColor" : "none"} />
                {isRecharging ? 'PROCESSING...' : stamina < 100 ? 'TOP UP' : 'FULL'}
              </button>
            )}

            <div className="flex flex-row gap-2 items-center">
              <div className={`relative border-2 ${isDark ? 'border-white bg-white/20' : 'border-black bg-gray-200'} overflow-hidden`}
                style={{
                  width: isExpanded ? '12px' : '8px',
                  height: isExpanded ? '40px' : '30px'
                }}>
                <div
                  className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${stamina < 20 ? 'bg-[#FF0000]' : (isDark ? 'bg-white' : 'bg-black')}`}
                  style={{ height: `${stamina}%` }}
                />
              </div>
              {isExpanded && (
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black ${isDark ? 'text-white' : 'text-black'}`}>{stamina}%</span>
                  <span className={`text-[8px] font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>STAMINA</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
};