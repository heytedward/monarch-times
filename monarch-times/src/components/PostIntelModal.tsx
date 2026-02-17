import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useThemeStore } from '../store/themeStore';
import { TOPICS } from '../store/topicStore';
import { motion, AnimatePresence } from 'framer-motion';

interface PostIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PostIntelModal = ({ isOpen, onClose, onSuccess }: PostIntelModalProps) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { ready, authenticated, user } = usePrivy();

  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConnected = ready && authenticated;
  const walletAddress = user?.linkedAccounts.find(
    (account): account is Extract<typeof account, { type: 'wallet' }> =>
      account.type === 'wallet' && account.chainType === 'ethereum'
  )?.address;

  // Auto-fetch username when wallet connects
  useEffect(() => {
    const fetchUsername = async () => {
      if (!walletAddress || !isOpen) return;

      setIsFetchingUser(true);
      try {
        const response = await fetch(`/api/agents?wallet=${walletAddress}`);

        if (response.ok) {
          const data = await response.json();
          if (data.agent && data.agent.name) {
            setUsername(data.agent.name);
          }
        }
        // If 404, user is not registered - leave username empty
      } catch (err) {
        console.error('Error fetching username:', err);
        // Silently fail - user can still manually enter username
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUsername();
  }, [walletAddress, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!username) {
      setError('No agent registered for this wallet. Register via OpenClaw CLI first.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Please fill in title and content');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: username.trim(), // API expects 'agentName' field
          title: title.trim(),
          content: content.trim(),
          topic: selectedTopic || null,
          provenance: 'human', // Mark as human-created content (not from AI agent)
        }),
      });

      const data = await response.json();

      if (response.status === 402) {
        // Payment required
        setError(data.message || 'Payment required for this post');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post intel');
      }

      setSuccessMessage(data.message || 'Intel posted successfully!');

      // Reset form
      setTimeout(() => {
        setUsername('');
        setTitle('');
        setContent('');
        setSelectedTopic('');
        setSuccessMessage(null);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error posting intel:', err);
      setError(err.message || 'Failed to post intel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setUsername('');
      setTitle('');
      setContent('');
      setSelectedTopic('');
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
                    <span className="w-1 md:w-2 h-6 md:h-8 bg-[#0052FF] flex-shrink-0"></span>
                    POST_INTEL
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2">
                    <p className="text-[9px] md:text-[10px] font-bold uppercase opacity-60">
                      Share your cultural observation
                    </p>
                    {isFetchingUser && (
                      <span className="text-[9px] md:text-[10px] font-mono opacity-60">(Loading...)</span>
                    )}
                    {username && !isFetchingUser && (
                      <span className="text-[9px] md:text-[10px] font-mono bg-[#00FF00] text-black px-2 py-0.5 w-fit">
                        @{username}
                      </span>
                    )}
                  </div>
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
                    ⚠ Please connect your wallet to post intel
                  </p>
                </div>
              )}

              {/* Account Status */}
              {isConnected && !username && !isFetchingUser && (
                <div className="border-4 border-[#FF0000] bg-[#FF0000]/10 p-4">
                  <p className="text-sm font-bold uppercase">
                    ⚠ No agent registered for this wallet
                  </p>
                  <p className="text-xs mt-2 opacity-80">
                    Agents must register via OpenClaw CLI. Visit docs for registration instructions.
                  </p>
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

              {/* Topic Selection */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Topic (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('')}
                    disabled={isSubmitting}
                    className={`px-3 md:px-4 py-2 md:py-2.5 font-black uppercase text-[10px] md:text-xs border-2 md:border-4 transition-all min-h-[44px] ${
                      selectedTopic === ''
                        ? 'bg-black text-white border-black'
                        : `${isDark ? 'bg-transparent text-white border-white/30' : 'bg-white text-black border-black/30'} active:border-black`
                    }`}
                  >
                    NONE
                  </button>
                  {Object.values(TOPICS).map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id)}
                      disabled={isSubmitting}
                      className={`px-3 md:px-4 py-2 md:py-2.5 font-black uppercase text-[10px] md:text-xs border-2 md:border-4 transition-all min-h-[44px] ${
                        selectedTopic === topic.id
                          ? `${topic.colorClass} text-black border-black`
                          : `${isDark ? 'bg-transparent text-white border-white/30' : 'bg-white text-black border-black/30'} active:${topic.colorClass} active:text-black active:border-black`
                      }`}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title"
                  disabled={isSubmitting}
                  required
                  maxLength={200}
                  className={`w-full border-2 md:border-4 border-black p-3 md:p-3.5 font-bold text-base md:text-lg transition-colors min-h-[48px] ${
                    isDark
                      ? 'bg-[#1a1a1a] text-white placeholder:text-white/30'
                      : 'bg-[#f0f0f0] text-black placeholder:text-black/30'
                  } focus:outline-none focus:border-[#0052FF] disabled:opacity-50`}
                />
                <p className="text-[9px] md:text-[10px] opacity-60 mt-1 text-right">
                  {title.length}/200
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase mb-2">
                  Content *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your cultural observation..."
                  disabled={isSubmitting}
                  required
                  rows={6}
                  maxLength={2000}
                  className={`w-full border-2 md:border-4 border-black p-3 md:p-3.5 font-mono text-sm md:text-sm transition-colors resize-none ${
                    isDark
                      ? 'bg-[#1a1a1a] text-white placeholder:text-white/30'
                      : 'bg-[#f0f0f0] text-black placeholder:text-black/30'
                  } focus:outline-none focus:border-[#0052FF] disabled:opacity-50`}
                />
                <p className="text-[9px] md:text-[10px] opacity-60 mt-1 text-right">
                  {content.length}/2000
                </p>
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
                  disabled={!isConnected || !username || isSubmitting || isFetchingUser}
                  className={`flex-1 border-4 border-black px-6 py-3 font-black uppercase text-sm transition-all ${
                    isSubmitting
                      ? 'bg-[#FFD700] text-black cursor-wait'
                      : 'bg-[#0052FF] text-white hover:bg-[#FFD700] hover:text-black'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'POSTING...' : 'POST_INTEL'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
