import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Mail,
  Wallet as WalletIcon,
  Link as LinkIcon,
  ShieldCheck,
  Download,
  Plus,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'wallets' | 'security'>('accounts');
  const navigate = useNavigate();

  const {
    user,
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

  const emailAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'email') || [];
  const walletAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'wallet') || [];
  const googleAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'google_oauth') || [];
  const twitterAccounts = user?.linkedAccounts?.filter((a: any) => a.type === 'twitter_oauth') || [];

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#9945FF] p-8 border-b-8 border-black flex justify-between items-center">
        <h2 className="text-4xl font-black uppercase text-white flex items-center gap-4">
          <SettingsIcon size={36} />
          OPERATOR_SETTINGS
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="font-black uppercase text-sm bg-white text-black px-6 py-3 border-4 border-black hover:bg-black hover:text-white transition-all flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          BACK
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-8 border-black">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-5 font-black uppercase text-lg border-r-4 border-black transition-all ${
            activeTab === 'accounts' ? 'bg-black text-white' : 'hover:bg-black/10'
          }`}
        >
          <LinkIcon size={20} className="inline mr-2" />
          ACCOUNTS
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex-1 py-5 font-black uppercase text-lg border-r-4 border-black transition-all ${
            activeTab === 'wallets' ? 'bg-black text-white' : 'hover:bg-black/10'
          }`}
        >
          <WalletIcon size={20} className="inline mr-2" />
          WALLETS
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-5 font-black uppercase text-lg transition-all ${
            activeTab === 'security' ? 'bg-black text-white' : 'hover:bg-black/10'
          }`}
        >
          <ShieldCheck size={20} className="inline mr-2" />
          SECURITY
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f0f0f0]">
        <div className="max-w-6xl mx-auto p-12">
          {activeTab === 'accounts' && (
            <div className="space-y-10">
              {/* Email Accounts */}
              <div>
                <h3 className="text-xl font-black uppercase mb-5 flex items-center gap-3">
                  <Mail size={24} />
                  EMAIL ACCOUNTS
                </h3>
                {emailAccounts.map((email: any) => (
                  <div key={email.address} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-white">
                    <span className="font-mono text-sm">{email.address}</span>
                    <button
                      onClick={() => unlinkEmail(email.address)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                <button
                  onClick={linkEmail}
                  className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 bg-white"
                >
                  <Plus size={16} />
                  ADD EMAIL
                </button>
              </div>

              {/* Google Accounts */}
              <div>
                <h3 className="text-xl font-black uppercase mb-5">GOOGLE ACCOUNTS</h3>
                {googleAccounts.map((google: any) => (
                  <div key={google.subject} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-white">
                    <span className="font-mono text-sm">{google.email || 'Google Account'}</span>
                    <button
                      onClick={() => unlinkGoogle(google.subject)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                {googleAccounts.length === 0 && (
                  <button
                    onClick={linkGoogle}
                    className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 bg-white"
                  >
                    <Plus size={16} />
                    LINK GOOGLE
                  </button>
                )}
              </div>

              {/* Twitter Accounts */}
              <div>
                <h3 className="text-xl font-black uppercase mb-5">TWITTER / X ACCOUNTS</h3>
                {twitterAccounts.map((twitter: any) => (
                  <div key={twitter.subject} className="border-4 border-black p-4 mb-3 flex justify-between items-center bg-white">
                    <span className="font-mono text-sm">{twitter.username || 'Twitter Account'}</span>
                    <button
                      onClick={() => unlinkTwitter(twitter.subject)}
                      className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1" />
                      REMOVE
                    </button>
                  </div>
                ))}
                {twitterAccounts.length === 0 && (
                  <button
                    onClick={linkTwitter}
                    className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 bg-white"
                  >
                    <Plus size={16} />
                    LINK TWITTER
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black uppercase mb-5 flex items-center gap-3">
                  <WalletIcon size={24} />
                  CONNECTED WALLETS
                </h3>
                {walletAccounts.map((wallet: any) => (
                  <div key={wallet.address} className="border-4 border-black p-5 mb-4 bg-white">
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
                          onClick={() => unlinkWallet(wallet.address)}
                          className="text-xs font-black uppercase px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={12} className="inline mr-1" />
                          REMOVE
                        </button>
                      )}
                    </div>
                    {wallet.walletClient === 'privy' && (
                      <button
                        onClick={exportWallet}
                        className="w-full mt-3 border-4 border-black p-3 font-black uppercase text-sm hover:bg-[#FFD700] hover:text-black transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        EXPORT PRIVATE KEY
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={linkWallet}
                  className="w-full border-4 border-black p-4 font-black uppercase text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 bg-white"
                >
                  <Plus size={16} />
                  CONNECT WALLET
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-10">
              <div className="border-8 border-[#FF0000] bg-[#FF0000]/10 p-8">
                <h3 className="text-xl font-black uppercase mb-4 text-[#FF0000]">⚠ DANGER ZONE</h3>
                <p className="text-sm mb-5 opacity-80">
                  This action will disconnect all accounts and sign you out of Monarch Times.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to log out?')) {
                      logout();
                      navigate('/');
                    }
                  }}
                  className="w-full bg-[#FF0000] text-white p-4 font-black uppercase text-sm border-4 border-black hover:bg-black hover:text-white transition-all"
                >
                  LOGOUT
                </button>
              </div>

              <div className="border-8 border-black p-8 bg-white">
                <h3 className="text-xl font-black uppercase mb-5">SESSION INFO</h3>
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
                    <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
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
