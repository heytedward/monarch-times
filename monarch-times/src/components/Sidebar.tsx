import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import {
  LayoutGrid,
  Users,
  User,
  Radio,
  Zap,
  ShieldCheck,
  Settings,
  Mail,
  Wallet as WalletIcon,
  Link as LinkIcon,
  X,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import AgentAvatar from './AgentAvatar';

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    linkEmail,
    linkWallet,
    linkGoogle,
    linkTwitter,
    unlinkEmail,
    unlinkWallet,
    unlinkGoogle,
    unlinkTwitter,
    exportWallet,
  } = usePrivy();
  const navigate = useNavigate();
  const [activeAgents, setActiveAgents] = useState<any[]>([]);

  const isConnected = ready && authenticated;
  const walletAddress = user?.linkedAccounts.find(
    (account): account is Extract<typeof account, { type: 'wallet' }> =>
      account.type === 'wallet' && account.chainType === 'solana'
  )?.address;


  // Mock fetching active patrols
  useEffect(() => {
    // Simulating "Patrols" - active agents
    setActiveAgents([
      { name: 'Cipher', status: 'patrolling' },
      { name: 'Dior', status: 'patrolling' },
      { name: 'sol_auth', status: 'sleeping' },
    ]);
  }, []);


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
          <button
            onClick={() => setShowSettings(true)}
            className="w-full p-3 border-b-4 border-black hover:bg-black hover:text-white transition-all flex items-center gap-3 group"
          >
            <Settings
              size={24}
              strokeWidth={2.5}
              className="text-black/50 group-hover:text-white"
            />
            {isExpanded && (
              <span className="font-black uppercase text-xs tracking-wider text-black/50 group-hover:text-white">
                SETTINGS
              </span>
            )}
          </button>
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
            <div className="relative border-2 border-black bg-gray-200 overflow-hidden"
                 style={{
                   width: isExpanded ? '12px' : '8px',
                   height: isExpanded ? '40px' : '30px'
                 }}>
              <div
                className="absolute bottom-0 left-0 w-full bg-black transition-all duration-500"
                style={{ height: '75%' }}
              />
            </div>
            {isExpanded && (
              <div className="flex flex-col">
                <span className="text-[10px] font-black">75%</span>
                <span className="text-[8px] font-bold text-black/50">STAMINA</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onLogout={logout}
          onLinkEmail={linkEmail}
          onLinkWallet={linkWallet}
          onLinkGoogle={linkGoogle}
          onLinkTwitter={linkTwitter}
          onUnlinkEmail={unlinkEmail}
          onUnlinkWallet={unlinkWallet}
          onUnlinkGoogle={unlinkGoogle}
          onUnlinkTwitter={unlinkTwitter}
          onExportWallet={exportWallet}
        />
      )}
    </aside>
  );
};

// Settings Modal Component
const SettingsModal = ({
  user,
  onClose,
  onLogout,
  onLinkEmail,
  onLinkWallet,
  onLinkGoogle,
  onLinkTwitter,
  onUnlinkEmail,
  onUnlinkWallet,
  onUnlinkGoogle,
  onUnlinkTwitter,
  onExportWallet,
}: {
  user: any;
  onClose: () => void;
  onLogout: () => void;
  onLinkEmail: () => void;
  onLinkWallet: () => void;
  onLinkGoogle: () => void;
  onLinkTwitter: () => void;
  onUnlinkEmail: (email: string) => void;
  onUnlinkWallet: (address: string) => void;
  onUnlinkGoogle: (subject: string) => void;
  onUnlinkTwitter: (subject: string) => void;
  onExportWallet: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'wallets' | 'security'>('accounts');

  const emailAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'email') || [];
  const walletAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'wallet') || [];
  const googleAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'google_oauth') || [];
  const twitterAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'twitter_oauth') || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-hidden border-8 border-black bg-white shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="bg-[#9945FF] p-6 border-b-8 border-black flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase text-white flex items-center gap-3">
            <Settings size={28} />
            OPERATOR_SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="font-black uppercase text-xs bg-white text-black px-4 py-2 border-4 border-black hover:bg-red-500 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-4 border-black">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 py-3 font-black uppercase text-xs border-r-4 border-black transition-all ${
              activeTab === 'accounts' ? 'bg-black text-white' : 'hover:bg-black/10'
            }`}
          >
            <LinkIcon size={14} className="inline mr-2" />
            ACCOUNTS
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`flex-1 py-3 font-black uppercase text-xs border-r-4 border-black transition-all ${
              activeTab === 'wallets' ? 'bg-black text-white' : 'hover:bg-black/10'
            }`}
          >
            <WalletIcon size={14} className="inline mr-2" />
            WALLETS
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 font-black uppercase text-xs transition-all ${
              activeTab === 'security' ? 'bg-black text-white' : 'hover:bg-black/10'
            }`}
          >
            <ShieldCheck size={14} className="inline mr-2" />
            SECURITY
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {activeTab === 'accounts' && (
            <div className="space-y-8">
              {/* Email Accounts */}
              <div>
                <h3 className="text-base font-black uppercase mb-4 flex items-center gap-2">
                  <Mail size={18} />
                  EMAIL ACCOUNTS
                </h3>
                {emailAccounts.map((email: any) => (
                  <div key={email.address} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-[#f0f0f0]">
                    <span className="font-mono text-sm">{email.address}</span>
                    <button
                      onClick={() => onUnlinkEmail(email.address)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                <button
                  onClick={onLinkEmail}
                  className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  ADD EMAIL
                </button>
              </div>

              {/* Google Accounts */}
              <div>
                <h3 className="text-base font-black uppercase mb-4">GOOGLE ACCOUNTS</h3>
                {googleAccounts.map((google: any) => (
                  <div key={google.subject} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-[#f0f0f0]">
                    <span className="font-mono text-sm">{google.email || 'Google Account'}</span>
                    <button
                      onClick={() => onUnlinkGoogle(google.subject)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                {googleAccounts.length === 0 && (
                  <button
                    onClick={onLinkGoogle}
                    className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    LINK GOOGLE
                  </button>
                )}
              </div>

              {/* Twitter Accounts */}
              <div>
                <h3 className="text-base font-black uppercase mb-4">TWITTER / X ACCOUNTS</h3>
                {twitterAccounts.map((twitter: any) => (
                  <div key={twitter.subject} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-[#f0f0f0]">
                    <span className="font-mono text-sm">{twitter.username || 'Twitter Account'}</span>
                    <button
                      onClick={() => onUnlinkTwitter(twitter.subject)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                {twitterAccounts.length === 0 && (
                  <button
                    onClick={onLinkTwitter}
                    className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    LINK TWITTER
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-black uppercase mb-4 flex items-center gap-2">
                  <WalletIcon size={18} />
                  CONNECTED WALLETS
                </h3>
                {walletAccounts.map((wallet: any) => (
                  <div key={wallet.address} className="border-4 border-black p-5 mb-4 bg-[#f0f0f0]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono text-sm mb-2">
                          {wallet.address.slice(0, 12)}...{wallet.address.slice(-12)}
                        </div>
                        <div className="text-xs font-bold uppercase opacity-60">
                          {wallet.chainType} • {wallet.walletClient || 'Embedded'}
                        </div>
                      </div>
                      {wallet.walletClient !== 'privy' && (
                        <button
                          onClick={() => onUnlinkWallet(wallet.address)}
                          className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={12} className="inline mr-1" />
                          REMOVE
                        </button>
                      )}
                    </div>
                    {wallet.walletClient === 'privy' && (
                      <button
                        onClick={onExportWallet}
                        className="w-full mt-3 border-4 border-black p-3 font-black uppercase text-sm hover:bg-[#FFD700] hover:text-black transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        EXPORT PRIVATE KEY
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={onLinkWallet}
                  className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  CONNECT WALLET
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="border-4 border-[#FF0000] bg-[#FF0000]/10 p-6">
                <h3 className="text-base font-black uppercase mb-3 text-[#FF0000]">⚠ DANGER ZONE</h3>
                <p className="text-sm mb-5 opacity-80">
                  This action will disconnect all accounts and sign you out of Monarch Times.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to log out?')) {
                      onLogout();
                      onClose();
                    }
                  }}
                  className="w-full bg-[#FF0000] text-white p-4 font-black uppercase text-sm border-4 border-black hover:bg-black hover:text-white transition-all"
                >
                  LOGOUT
                </button>
              </div>

              <div className="border-4 border-black p-6 bg-[#f0f0f0]">
                <h3 className="text-base font-black uppercase mb-4">SESSION INFO</h3>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-60">User ID:</span>
                    <span>{user?.id?.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Accounts:</span>
                    <span>{user?.linkedAccounts?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Created:</span>
                    <span>{new Date(user?.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};