import {
  Calendar,
  ChevronLeft,
  DownloadCloud,
  LayoutDashboard,
  ListTodo,
  Search,
  User,
} from "lucide-react";
import React from "react";
// Sidebar Component
const Sidebar = ({ user, isSidebarOpen, setIsSidebarOpen, setCurrentPage }) => {
  const navItemsUser = [
    { name: "Dashboard", icon: <LayoutDashboard />, page: "dashboard" },
    { name: "Sự vụ", icon: <ListTodo />, page: "task-management" },
    { name: "Lịch làm việc", icon: <Calendar />, page: "calendar" },
    { name: "Tìm kiếm", icon: <Search />, page: "search" },
  ];
  const navItemsLeader = [
    { name: "Dashboard", icon: <LayoutDashboard />, page: "dashboard" },
    { name: "Sự vụ", icon: <ListTodo />, page: "task-management" },
    { name: "Tìm kiếm", icon: <Search />, page: "search" },
    { name: "Ghi nhận", icon: <DownloadCloud />, page: "violation-management" },
  ];
  const navItems = user.role === "emp" ? navItemsUser : navItemsLeader;
  return (
    <div
      className={`fixed inset-y-0 left-0 bg-white shadow-lg p-4 transition-all duration-300 z-50 ${
        isSidebarOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between h-16 mb-6">
        {isSidebarOpen && (
          <h1 className="text-xl font-bold text-red-800">KSTT WCM</h1>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform duration-300 ${
              isSidebarOpen ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <a
                onClick={() => setCurrentPage(item.page)}
                className={`flex items-center p-3 my-2 rounded-lg text-gray-600 hover:bg-indigo-500 hover:text-white transition-colors duration-200 cursor-pointer`}
              >
                <span
                  className={`flex-shrink-0 ${isSidebarOpen ? "mr-3" : "mr-0"}`}
                >
                  {item.icon}
                </span>
                <span
                  className={`whitespace-nowrap transition-opacity duration-300 ${
                    isSidebarOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {item.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div
        className={`absolute bottom-4 left-4 right-4 flex items-center p-3 rounded-lg text-gray-600 transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <User className="w-5 h-5 flex-shrink-0 mr-3" />
        {isSidebarOpen && <span className="text-sm">{user.name}</span>}
      </div>
    </div>
  );
};

export default Sidebar;
