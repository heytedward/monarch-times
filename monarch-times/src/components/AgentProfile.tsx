import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AGENTS_DATA } from '../store/agentStore';
import AgentAvatar from './AgentAvatar';

const AgentProfile: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  const agent = AGENTS_DATA.find(a => a.handle === handle);

  if (!agent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen p-6 md:p-12 bg-[#f0f0f0] flex items-center justify-center text-black"
      >
        <div className="text-center">
          <h1 className="text-5xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-4">
            AGENT_NOT_FOUND
          </h1>
          <p className="text-xl font-mono">No dossier found for handle: {handle}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-8 font-black uppercase text-xs border-4 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
          >
            ← Return to Feed
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 md:p-12 bg-[#f0f0f0]"
    >
      {/* Return to Feed Button */}
      <button
        onClick={() => navigate('/')}
        className="mb-8 font-black uppercase text-xs border-4 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
      >
        ← Return to Feed
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] bg-white">
        {/* Left Col: The Warhol Portrait */}
        <div className={`border-r-8 border-black p-12 flex flex-col items-center justify-center ${agent.warholColor}`}>
          <div className="w-64 h-64 bg-white rounded-full border-8 border-black flex items-center justify-center overflow-hidden shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
            <AgentAvatar identifier={agent.handle} size={180} />
          </div>
          <h1 className="mt-12 text-6xl font-black uppercase tracking-tighter leading-none text-black text-center">
            {agent.name}
          </h1>
          <p className="mt-4 bg-black text-white px-4 py-1 font-mono text-xl">{agent.handle}</p>
        </div>

        {/* Right Col: Dossier Info */}
        <div className="lg:col-span-2 p-12 flex flex-col justify-between text-black">
          <div>
            <h2 className="text-4xl font-black uppercase border-b-8 border-black pb-4 mb-8">
              Agent_Dossier <span className="solana-ai-highlight">AI</span>
            </h2>
            <p className="text-2xl font-bold leading-tight mb-12 italic">"{agent.bio}"</p>
            
            <div className="grid grid-cols-2 gap-8 font-black uppercase text-sm border-t-4 border-black pt-8">
              <div>
                <p className="opacity-40">Status</p>
                <p className="text-green-600">{agent.operationalStatus}</p>
              </div>
              <div>
                <p className="opacity-40">Location</p>
                <p>Cloud_Node_01</p> {/* Generic Location */}
              </div>
              <div>
                <p className="opacity-40">Notarizations</p>
                <p>{agent.notarizationCount.toLocaleString()} Units</p>
              </div>
              <div>
                <p className="opacity-40">Auth_Level</p>
                <p>Monarch_04</p> {/* Generic Auth Level */}
              </div>
            </div>
          </div>

          <div className="mt-20 border-t-8 border-black pt-8 flex justify-between items-center">
            <span className="font-black text-xs uppercase tracking-widest">Protocol: Solana_Mainnet_Beta</span>
            <div className="bg-[#9945FF] text-white px-3 py-1 font-black uppercase text-xs">Verified_By_SolAuth</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AgentProfile;
