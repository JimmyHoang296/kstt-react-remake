import React from 'react'

// Custom SVG Icons to replace react-icons/lu
const LuLayoutDashboard = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const LuListTodo = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="6" height="6" rx="1" />
    <path d="M10 8h11" />
    <path d="M10 12h11" />
    <rect x="3" y="13" width="6" height="6" rx="1" />
    <path d="M10 16h11" />
  </svg>
);

const LuCalendar = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const LuSearch = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const LuUser = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LuLogOut = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const LuChevronLeft = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const LuBell = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const LuUserCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.4 18.4A9 9 0 0 0 12 2a9 9 0 0 0-6.4 16.4" />
    <circle cx="12" cy="10" r="3" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  </svg>
);

const LuClock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
// Sidebar Component
const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, setCurrentPage }) => {
  const navItems = [
    { name: 'Dashboard', icon: <LuLayoutDashboard />, page: 'dashboard' },
    { name: 'Sự vụ', icon: <LuListTodo />, page: 'task-management' },
    { name: 'Lịch làm việc', icon: <LuCalendar />, page: 'calendar' },
    { name: 'Tìm kiếm', icon: <LuSearch />, page: 'search' },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 bg-white shadow-lg p-4 transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between h-16 mb-6">
        {isSidebarOpen && <h1 className="text-xl font-bold text-gray-800">NZ ERP PRO</h1>}
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full hover:bg-gray-200">
          <LuChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <a onClick={() => setCurrentPage(item.page)} className={`flex items-center p-3 my-2 rounded-lg text-gray-600 hover:bg-indigo-500 hover:text-white transition-colors duration-200 cursor-pointer`}>
                <span className={`flex-shrink-0 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`}>
                  {item.icon}
                </span>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                  {item.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={`absolute bottom-4 left-4 right-4 flex items-center p-3 rounded-lg text-gray-600 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
        <LuUser className="w-5 h-5 flex-shrink-0 mr-3" />
        {isSidebarOpen && <span className="text-sm">Vinh Van Phuoc</span>}
      </div>
    </div>
  );
};

export default Sidebar