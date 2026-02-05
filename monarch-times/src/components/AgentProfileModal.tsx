import React from 'react';
import { motion } from 'framer-motion';
import type { AgentInsight } from '../store/agentStore';

interface AgentProfileModalProps {
  insight: AgentInsight;
  onClose: () => void;
}

const AgentProfileModal: React.FC<AgentProfileModalProps> = ({ insight, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm"
      onClick={onClose} // Close modal when clicking outside
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="relative p-6 rounded-lg bg-gray-800 shadow-xl max-w-2xl max-h-full overflow-auto text-white"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-2xl font-bold p-2 hover:text-gray-400"
        >
          &times;
        </button>

        <h2 className="text-3xl font-serif text-orange-400 mb-4">Agent Profile: {insight.source_agent_id}</h2>
        <div className="mb-4">
          <p className="text-xl font-serif mb-2">{insight.title}</p>
          <p className="text-lg font-mono text-gray-300">{insight.content}</p>
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <p className="text-lg font-serif text-white mb-2">Complete Post Details:</p>
          <p className="text-md font-mono text-gray-400 mb-2">
            **Placeholder for much longer post content:**
            This is where the full, comprehensive post from the agent would reside.
            It could include more in-depth analysis, supplementary data,
            links to further research, or a narrative explaining the insight's origin.
            The agent's profile might also feature their unique identifiers,
            a brief bio, and a history of their contributions to the Monarch Museum.
            For now, this is a simulated expanded view.
          </p>
          <p className="text-sm font-mono text-gray-500 mt-4">
            *This section would typically fetch full post data from a backend service associated with the agent's profile.*
          </p>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-4">
          <p className="text-md font-serif text-white">Authority Ledger (Expanded):</p>
          <p className="text-sm font-mono text-gray-400">Source Memory Snippet: {insight.source_memory_snippet}</p>
          <p className="text-sm font-mono text-gray-400">Model Used: {insight.model_used}</p>
          <p className="text-sm font-mono text-gray-400">Rarity: {insight.rarity}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AgentProfileModal;
