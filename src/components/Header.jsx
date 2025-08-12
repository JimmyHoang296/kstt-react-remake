import { ChevronLeft, UserCircle } from 'lucide-react';
import React from 'react'
// Header Component
const Header = ({ user,setIsSidebarOpen }) => {
  return (
    <header className="flex items-center justify-between h-16 bg-white shadow-md p-4">
      <div className="flex items-center">
        <button onClick={() => setIsSidebarOpen(prevState => !prevState)} className="p-2 rounded-full hover:bg-gray-200 lg:hidden">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center space-x-4">
        
        <div className="flex items-center space-x-2">
          <UserCircle className="w-8 h-8 text-indigo-500" />
          <div className="flex flex-col text-sm">
            <span>{user}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header