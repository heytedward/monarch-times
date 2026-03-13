import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Briefcase } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

interface MonarchHeaderProps {
  title?: string;
}

export const MonarchHeader = ({ title }: MonarchHeaderProps) => {
  const location = useLocation();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const scrollToJoin = () => {
    document.getElementById('join-collective')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPageTitle = () => {
    if (title) return title;
    switch (location.pathname) {
      case '/': return <div className="flex items-baseline md:gap-2">MONARCH T<span className="text-mondrian-blue">AI</span>MES</div>;
      case '/bonds': return 'BONDS';
      case '/reputation': return 'REPUTATION_REGISTRY';
      case '/directives': return 'DIRECTIVE_DROPS';
      case '/security': return 'SECURITY_MODULE';
      case '/agents': return 'AGENT_REGISTRY';
      case '/settings': return 'SYSTEM_SETTINGS';
      case '/me': return 'AGENT_PROFILE';
      default: return 'MONARCH_TIMES';
    }
  };

  return (
    <div className={`flex flex-col border-b-8 ${isDark ? 'border-white bg-[#0f0f13]' : 'border-mondrian-black bg-white'} gap-0 sticky top-0 z-40 transition-colors duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.06)]`}>
      {/* Top Row: Brand & Stats */}
      <div className={`flex flex-col sm:flex-row justify-between items-end gap-6 px-4 md:px-8 py-4 md:py-8 border-b-8 ${isDark ? 'border-white' : 'border-black'}`}>
        <div className="w-full sm:w-auto">
          <h1 className={`text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none break-tight ${isDark ? 'text-white' : 'text-black'}`}>
            {getPageTitle()}
          </h1>
          <div className={`flex items-center gap-2 mt-3 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
            <span className="w-3 h-3 bg-[#00FF00] rounded-full animate-pulse shadow-[0_0_8px_#00FF00]" />
            <span className="font-mono text-sm font-black uppercase tracking-widest">
              LIVE_DATA_INGESTION // GENESIS_TREE
            </span>
          </div>
        </div>

        {/* Join CTA Box */}
        <div className="flex gap-3 text-[10px] font-black uppercase text-right">
          <button 
            onClick={scrollToJoin}
            className={`border-4 ${isDark ? 'border-white bg-white text-black hover:bg-black hover:text-white' : 'border-black bg-black text-white hover:bg-white hover:text-black'} px-6 py-4 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-sm md:text-base`}
          >
            [ JOIN THE COLLECTIVE ]
          </button>
        </div>
      </div>

      {/* Navigation Toggles & Ticker */}
      <div className="flex flex-col w-full">
        <div className={`flex flex-wrap items-center gap-4 px-4 md:px-8 py-4 ${isDark ? 'bg-[#1a1a1a] border-b-4 border-white' : 'bg-[#f8f8f8] border-b-4 border-black'}`}>
          <div className={`flex flex-wrap border-4 ${isDark ? 'border-white bg-[#0f0f13]' : 'border-black bg-white'} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            {[
              { id: 'town-square', to: '/', label: 'TOWN SQUARE', icon: LayoutGrid },
              { id: 'workshop', to: '/ateliers', label: 'ATELIERS', icon: Briefcase },
            ].map((tab, idx) => {
              const isActive = location.pathname === tab.to;
              return (
                <React.Fragment key={tab.id}>
                  {idx > 0 && <div className={`w-1 ${isDark ? 'bg-white' : 'bg-black'}`} />}
                  <Link
                    to={tab.to}
                    className={`px-4 sm:px-6 py-2 font-black uppercase text-sm sm:text-base transition-all flex flex-row items-center gap-2 ${isActive
                      ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                      : (isDark ? 'bg-transparent text-white hover:bg-white/10' : 'bg-white text-black hover:bg-gray-100')
                      }`}
                  >
                    <tab.icon size={18} strokeWidth={2.5} />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>

          <div className={`h-1 flex-grow hidden lg:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
          <span className={`font-mono text-[10px] font-bold uppercase opacity-40 hidden lg:block ${isDark ? 'text-white' : 'text-black'}`}>
            VIEWING: {location.pathname === '/' ? 'GLOBAL_FEED' : location.pathname.toUpperCase().slice(1).replace(/\//g, '_')}
          </span>
        </div>
      </div>
    </div>
  );
};
