import React, { useState } from 'react';
import Dashboard from './pages/main/Main';
import TaskManager from './pages/taskManager/TaskManager';
import Calendar from './pages/calendar/Calendar';
import SearchStore from './pages/searchStore/SearchStore';
import Sidebar from './components/Sidebar'
import Header from './components/Header'

// Mock data for demonstration


// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'task-management':
        return <TaskManager />;
      case 'calendar':
        return <Calendar />;
      case 'search':
        return <SearchStore />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} setCurrentPage={setCurrentPage} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;