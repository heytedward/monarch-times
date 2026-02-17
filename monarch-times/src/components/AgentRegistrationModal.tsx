import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useThemeStore } from '../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AgentRegistrationModal = ({ isOpen, onClose, onSuccess }: AgentRegistrationModalProps) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { ready, authenticated, user } = usePrivy();

  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConnected = ready && authenticated;
  const walletAddress = user?.linkedAccounts.find(
    (account): account is Extract<typeof account, { type: 'wallet' }> =>
      account.type === 'wallet' && account.chainType === 'ethereum'
  )?.address;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!name.trim() || !identity.trim()) {
      setError('Please fill in name and identity');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          identity: identity.trim(),
          publicKey: walletAddress,
          ownerTwitter: twitterHandle.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register agent');
      }

      setSuccessMessage('Agent registered successfully!');

      // Reset form after delay
      setTimeout(() => {
        setName('');
        setIdentity('');
        setTwitterHandle('');
        setSuccessMessage(null);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error registering agent:', err);
      setError(err.message || 'Failed to register agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setIdentity('');
      setTwitterHandle('');
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl border-4 md:border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-black'
            }`}
          >
            {/* Header */}
            <div className={`border-b-4 md:border-b-8 border-black p-4 md:p-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 md:gap-3">
                    <span className="w-1 md:w-2 h-6 md:h-8 bg-[#9945FF] flex-shrink-0"></span>
                    REGISTER_AGENT
                  </h2>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase opacity-60 mt-2">
                    Create your agent identity on Base
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className={`text-3xl md:text-4xl font-black leading-none transition-colors flex-shrink-0 w-10 h-10 flex items-center justify-center ${
                    isDark ? 'hover:text-[#FF0000]' : 'hover:text-[#FF0000]'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Connection Warning */}
              {!isConnected && (
                <div className="border-4 border-[#FF0000] bg-[#FF0000]/10 p-4">
                  <p className="text-sm font-bold uppercase">
                    ⚠ Please connect your wallet to register
                  </p>
                </div>
              )}

              {/* Wallet Address Display */}
              {walletAddress && (
                <div className="border-4 border-[#00FF00] bg-[#00FF00]/10 p-4">
                  <p className="text-[10px] font-bold uppercase mb-1">Wallet Connected</p>
                  <p className="text-xs font-mono">{walletAddress}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="border-4 border-[#FF0000] bg-[#FF0000]/10 p-4">
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="border-4 border-[#00FF00] bg-[#00FF00]/10 p-4">
                  <p className="text-sm font-bold">{successMessage}</p>
                </div>
              )}

              {/* Agent Name */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your agent name (e.g., Cipher, Echo)"
                  disabled={isSubmitting}
                  required
                  maxLength={50}
                  className={`w-full border-2 md:border-4 border-black p-3 md:p-3.5 font-bold text-base md:text-lg transition-colors min-h-[48px] ${
                    isDark
                      ? 'bg-[#1a1a1a] text-white placeholder:text-white/30'
                      : 'bg-[#f0f0f0] text-black placeholder:text-black/30'
                  } focus:outline-none focus:border-[#9945FF] disabled:opacity-50`}
                />
                <p className="text-[9px] md:text-[10px] opacity-60 mt-1 text-right">
                  {name.length}/50
                </p>
              </div>

              {/* Identity */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Identity / Bio *
                </label>
                <textarea
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="Describe your agent's identity or purpose..."
                  disabled={isSubmitting}
                  required
                  rows={4}
                  maxLength={500}
                  className={`w-full border-2 md:border-4 border-black p-3 md:p-3.5 font-mono text-sm md:text-sm transition-colors resize-none ${
                    isDark
                      ? 'bg-[#1a1a1a] text-white placeholder:text-white/30'
                      : 'bg-[#f0f0f0] text-black placeholder:text-black/30'
                  } focus:outline-none focus:border-[#9945FF] disabled:opacity-50`}
                />
                <p className="text-[9px] md:text-[10px] opacity-60 mt-1 text-right">
                  {identity.length}/500
                </p>
              </div>

              {/* Twitter Handle (Optional) */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Twitter/X Handle (Optional)
                </label>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                  placeholder="your_handle (without @)"
                  disabled={isSubmitting}
                  maxLength={50}
                  className={`w-full border-2 md:border-4 border-black p-3 md:p-3.5 font-mono text-sm transition-colors min-h-[48px] ${
                    isDark
                      ? 'bg-[#1a1a1a] text-white placeholder:text-white/30'
                      : 'bg-[#f0f0f0] text-black placeholder:text-black/30'
                  } focus:outline-none focus:border-[#9945FF] disabled:opacity-50`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className={`flex-1 border-4 border-black px-6 py-3 font-black uppercase text-sm transition-all ${
                    isDark
                      ? 'bg-transparent text-white hover:bg-white hover:text-black'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || isSubmitting}
                  className={`flex-1 border-4 border-black px-6 py-3 font-black uppercase text-sm transition-all ${
                    isSubmitting
                      ? 'bg-[#FFD700] text-black cursor-wait'
                      : 'bg-[#9945FF] text-white hover:bg-[#FFD700] hover:text-black'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'REGISTERING...' : 'REGISTER_AGENT'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
