import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Added
import { useAgentStore, AgentInsight, AgentData } from '../store/agentStore';
import { useToastStore } from '../store/toastStore';
import AgentProfileModal from './AgentProfileModal'; // Re-added

interface MonarchCardProps {
  insight: AgentInsight;
  agent: AgentData;
  inModal?: boolean;
  onViewDetails?: (insight: AgentInsight) => void;
}

const MonarchCard: React.FC<MonarchCardProps> = ({ insight, agent, inModal = false, onViewDetails }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAgentProfileModal, setShowAgentProfileModal] = useState(false);
  const mintInsight = useAgentStore((state) => state.mintInsight);
  const addToast = useToastStore((state) => state.addToast);
  const navigate = useNavigate();

  // Directly handle flip on card click
  const handleCardClick = () => {
    if (insight.title !== "Empty Slot") {
      setIsFlipped(!isFlipped);
    }
  };

  const handleMint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (insight.rarity === 'Digital') {
      mintInsight(insight.id);
      addToast(`Minting "${insight.title}"...`, 'success');
    } else {
      addToast(`Already ${insight.rarity}`, 'info');
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAgentProfileModal(true);
  };





  const handleViewOnSolscan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (insight.signature) {
      addToast(`Opening Solscan...`, 'info');
      window.open(`https://solscan.io/tx/${insight.signature}`, '_blank');
    }
  };

  const handleMintToPassport = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToast(`Minting to passport...`, 'success');
  };

  const cardWidth = inModal ? 'max-w-md' : 'w-64'; // Use max-w-md for responsiveness
  const cardHeight = inModal ? 'max-h-full' : 'h-96'; // Use max-h-full for responsiveness

  // Aesthetic Upgrade: Monarch Orange border for SolAuth Verified
  const solAuthBorderClass = insight.isSolAuthVerified ? 'border-2 border-[#FF8C00] shadow-[0_0_10px_#FF8C00]' : '';

  const cardContainerClasses = `
    relative ${cardWidth} ${cardHeight} rounded-xl shadow-lg transition-transform duration-700 preserve-3d
    ${isFlipped ? 'rotate-y-180' : ''}
    ${insight.title === "Empty Slot" ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
    ${solAuthBorderClass}
  `;

  const commonCardSideClasses = `
    absolute w-full h-full backface-hidden rounded-xl p-4 flex flex-col justify-between items-center py-4
    bg-gray-800 text-gray-200 border border-gray-700
  `;

  const isPopulatedByAgent = insight.title !== "Empty Slot" && insight.signature;

  return (
    <>
      <div className="my-4 mx-2 perspective-1000">
        <motion.div
          className={cardContainerClasses}
          onClick={handleCardClick}
          whileHover={{
            scale: inModal ? 1.0 : 1.03,
            rotateY: isFlipped ? -10 : 10,
            rotateX: 5,
            transition: { duration: 0.2 }
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Front of the card */}
          <div className={`${commonCardSideClasses} transform-gpu`}>
            {insight.title === "Empty Slot" ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 font-mono">
                <span className="text-6xl mb-4">🔮</span>
                <p>Empty Slot</p>
                <p className="text-sm">{insight.content}</p>
              </div>
            ) : (
              <>
                {/* Placeholder for Visual Asset */}
                <div className="w-full h-2/3 bg-gray-700 rounded-lg flex items-center justify-center text-gray-300 text-lg">
                  <span className="font-mono">Visual Asset</span>
                </div>
                <div className="text-center mt-4">
                  <h3 className="text-xl font-serif text-white break-words">{insight.title}</h3>
                  <p className="text-sm font-mono text-gray-300">Agent ID: {insight.source_agent_id}</p>
                  {/* Rarity Tier */}
                  <p className="text-xs font-mono text-gray-400 mt-1">Rarity: <span className={`${insight.rarity === 'On-Chain' ? 'text-green-400' : insight.rarity === 'Based' ? 'text-blue-400' : 'text-yellow-400'}`}>{insight.rarity}</span></p>
                  {/* Display cNFT data if available */}
                  {insight.treeAddress && insight.leafIndex !== undefined && (
                    <p className="text-xs font-mono text-gray-500 mt-1">cNFT: {insight.treeAddress.substring(0, 6)}...@{insight.leafIndex}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Back of the card */}
          <div className={`${commonCardSideClasses} transform-gpu rotate-y-180`}>
            {insight.title === "Empty Slot" ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 font-mono">
                <span className="text-6xl mb-4">📭</span>
                <p>Awaiting data...</p>
              </div>
            ) : (
              <>
                <div className="text-left w-full flex-grow overflow-y-auto custom-scrollbar">
                  <h3 className="text-xl font-serif text-white mb-2 break-words">Insight: {insight.title}</h3>
                  <p className="text-sm font-mono text-gray-200 mb-4 break-words">{insight.content}</p>
                  <div className="border-t border-gray-700 pt-2">
                    <p className="text-xs font-serif text-white">Authority Ledger:</p>
                    <p className="text-xs font-mono text-gray-300 break-words">Source Memory: {insight.source_memory_snippet}</p>
                    <p className="text-xs font-mono text-gray-300 break-words">Model: {insight.model_used}</p>
                    {/* Display Solana Signature if available */}
                    {insight.signature && (
                      <p className="text-xs font-mono text-gray-300 break-words">Signature: {insight.signature.substring(0, 10)}...</p>
                    )}
                    <p className="text-xs font-mono text-gray-300">Rarity: <span className={`${insight.rarity === 'On-Chain' ? 'text-green-400' : insight.rarity === 'Based' ? 'text-blue-400' : 'text-yellow-400'}`}>{insight.rarity}</span></p>
                  </div>
                </div>
                
                {/* Mint button */}
                <button
                  onClick={handleMint}
                  disabled={!insight.rarity || insight.rarity !== 'Digital'}
                  className={`
                    mt-4 px-4 py-2 rounded-lg text-white font-bold transition-all duration-300
                    ${insight.rarity && insight.rarity === 'Digital'
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-600 cursor-not-allowed opacity-70'
                    }
                  `}
                >
                  {insight.rarity === 'On-Chain' ? 'Already Minted' : 'Mint this Insight'}
                </button>

                {/* New Solana Action Buttons */}
                {isPopulatedByAgent && (
                  <div className="flex flex-col mt-2 space-y-2">
                    <button
                      onClick={handleViewOnSolscan}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-all duration-300 shadow-lg"
                    >
                      View on Solscan
                    </button>
                    <button
                      onClick={handleMintToPassport}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all duration-300 shadow-lg"
                    >
                      Mint to Passport
                    </button>
                  </div>
                )}




                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${agent.handle}`); }}
                  className="mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-300 shadow-lg"
                >
                  VIEW_INTEL
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>


      {showAgentProfileModal && (
        <AgentProfileModal
          insight={insight}
          onClose={() => setShowAgentProfileModal(false)}
        />
      )}
    </>
  );
};

export default MonarchCard;