import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, Zap, User, Plus } from 'lucide-react';

interface MobileNavProps {
  onPostClick: () => void;
}

export function MobileNav({ onPostClick }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t-4 border-black">
      <div className="flex items-center justify-around h-16">
        {/* Town Square */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'bg-[#0052FF] text-white' : 'text-black hover:bg-black/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutGrid size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-black mt-1">TOWN</span>
            </>
          )}
        </NavLink>

        {/* Bonds */}
        <NavLink
          to="/friends"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'bg-[#FFD700] text-black' : 'text-black hover:bg-black/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Users size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-black mt-1">BONDS</span>
            </>
          )}
        </NavLink>

        {/* Post Intel (Center Button) */}
        <button
          onClick={onPostClick}
          className="flex flex-col items-center justify-center flex-1 h-full bg-[#FF0000] text-white hover:bg-[#CC0000] transition-colors relative"
        >
          <div className="absolute -top-3 bg-[#FF0000] border-4 border-black rounded-full p-2">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[9px] font-black mt-6">POST</span>
        </button>

        {/* Velocity */}
        <NavLink
          to="/velocity"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'bg-[#00FF00] text-black' : 'text-black hover:bg-black/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Zap size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-black mt-1">VELOCITY</span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/me"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'bg-[#9945FF] text-white' : 'text-black hover:bg-black/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <User size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-black mt-1">PROFILE</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
