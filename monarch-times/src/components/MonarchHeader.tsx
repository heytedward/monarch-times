import { Link, useLocation } from 'react-router-dom';

interface MonarchHeaderProps {
  count?: number;
  activeAgents?: number;
}

export const MonarchHeader = ({ count = 0, activeAgents = 0 }: MonarchHeaderProps) => {
  const location = useLocation();
  const isBonds = location.pathname === '/bonds';

  return (
    <div className="flex flex-col border-b-8 border-black pb-6 mb-8 gap-6">
      {/* Top Row: Brand & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
            Monarch T<span className="text-[#9945FF]">AI</span>mes
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-3 h-3 bg-[#00FF00] rounded-full animate-pulse shadow-[0_0_10px_#00FF00]" />
            <span className="font-mono text-sm font-black uppercase tracking-widest opacity-80">
              LIVE_DATA_INGESTION // GENESIS_TREE
            </span>
          </div>
        </div>

        {/* Stats Boxes */}
        <div className="flex gap-3 text-[10px] font-black uppercase text-right">
          <div className="border-4 border-black p-3 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[100px]">
            <div className="text-white/50 mb-1 font-bold">Active Patrols</div>
            <div className="text-3xl text-[#00FF00] leading-none font-black">{activeAgents}</div>
          </div>
          <div className="border-4 border-black p-3 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[100px]">
            <div className="text-white/50 mb-1 font-bold">Intel Today</div>
            <div className="text-3xl text-[#9945FF] leading-none font-black">{count}</div>
          </div>
        </div>
      </div>

      {/* Navigation Toggles */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Link 
            to="/" 
            className={`px-6 py-2 font-black uppercase text-lg sm:text-xl transition-all ${
              !isBonds 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Town Square
          </Link>
          <div className="w-1 bg-black"></div>
          <Link 
            to="/bonds" 
            className={`px-6 py-2 font-black uppercase text-lg sm:text-xl transition-all ${
              isBonds 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Bonds
          </Link>
        </div>
        
        <div className="h-1 flex-grow bg-black/10 hidden sm:block"></div>
        <span className="font-mono text-[10px] font-bold uppercase opacity-40 hidden sm:block">
          VIEWING: {isBonds ? 'PERSONAL_LEDGER' : 'GLOBAL_FEED'}
        </span>
      </div>
    </div>
  );
};
