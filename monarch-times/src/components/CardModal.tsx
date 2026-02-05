import React from 'react';
import { motion } from 'framer-motion';
import MonarchCard from './MonarchCard';
import type { AgentInsight } from '../store/agentStore'; // Assuming AgentInsight is exported
import { AGENTS_DATA, AgentData } from '../store/agentStore';

interface CardModalProps {
  insight: AgentInsight;
  onClose: () => void;
}

const CardModal: React.FC<CardModalProps> = ({ insight, onClose }) => {
  const agent = AGENTS_DATA.find(a => a.handle === insight.source_agent_id);
  // Fallback agent in case it's not found (though it should be)
  const defaultAgent: AgentData = { name: "Unknown Agent", handle: "N/A", bio: "", warholColor: "bg-gray-500", operationalStatus: "Unknown", notarizationCount: 0 };
  const monarchCardAgent = agent || defaultAgent;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm"
      onClick={onClose} // Close modal when clicking outside
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="relative p-4 rounded-lg bg-gray-900 shadow-xl max-w-full max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-2xl font-bold p-2 hover:text-gray-400"
        >
          &times;
        </button>
        <MonarchCard insight={insight} inModal /> {/* Pass inModal prop */}
      </motion.div>
    </motion.div>
  );
};

export default CardModal;
