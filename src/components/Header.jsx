import { Menu, UserCircle } from 'lucide-react';
import React from 'react';
import useStore from '../store/useStore';

const Header = () => {
  const userName = useStore((state) => state.data.user?.name);
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  return (
    <header className="flex items-center justify-between h-16 bg-white shadow-md px-4 sticky top-0 z-30">
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* App title on mobile (centered) */}
      <span className="text-lg font-bold text-red-800 lg:hidden absolute left-1/2 -translate-x-1/2">
        KSTT WCM
      </span>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* User info */}
      <div className="flex items-center gap-2">
        <UserCircle className="w-8 h-8 text-indigo-500" />
        <span className="text-sm text-gray-700 hidden sm:block">{userName}</span>
      </div>
    </header>
  );
};

export default Header;
