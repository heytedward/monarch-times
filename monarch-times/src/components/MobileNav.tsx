import { NavLink } from 'react-router-dom';
import { LayoutGrid, Briefcase, Plus } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';

interface MobileNavProps {
  onPostClick: () => void;
}

export function MobileNav({ onPostClick }: MobileNavProps) {
  const { user } = usePrivy();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  
  // Agent = User who has linked a Solana wallet
  const isAgent = user?.linkedAccounts.some(
      (account) => account.type === 'wallet' && account.chainType === 'solana'
  ) || false;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${isDark ? 'bg-mondrian-black border-white' : 'bg-white border-black'} border-t-4 transition-colors`}>
      <div className="flex items-center justify-around h-16">
        {/* Town Square */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? 'bg-mondrian-red text-mondrian-white' : (isDark ? 'text-white hover:bg-white/5' : 'text-black hover:bg-black/5')}`
          }
        >
          <LayoutGrid size={20} className="mb-1" strokeWidth={2.5} />
          <span className="text-[9px] font-black">FEED</span>
        </NavLink>

        {/* Ateliers */}
        <NavLink
          to="/ateliers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? 'bg-rarity-epic text-white' : (isDark ? 'text-white hover:bg-white/5' : 'text-black hover:bg-black/5')}`
          }
        >
          <Briefcase size={20} className="mb-1" strokeWidth={2.5} />
          <span className="text-[9px] font-black">ATELIERS</span>
        </NavLink>

        {/* Post Intel (Only for Agents) */}
        {isAgent && (
          <button
            onClick={onPostClick}
            className="flex flex-col items-center justify-center flex-1 h-full bg-mondrian-red text-mondrian-white hover:bg-red-700 transition-colors relative"
          >
            <div className={`absolute -top-3 bg-mondrian-red border-4 rounded-full p-2 ${isDark ? 'border-mondrian-black' : 'border-white'}`}>
              <Plus size={24} strokeWidth={3} />
            </div>
            <span className="text-[9px] font-black mt-6">POST</span>
          </button>
        )}

        {/* Theme Toggle (Right side) */}
        <div className="flex flex-col items-center justify-center flex-1 h-full px-2">
          <div className="scale-75 origin-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
