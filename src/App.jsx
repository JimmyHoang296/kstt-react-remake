import { useState } from "react";
import Dashboard from "./pages/main/Main";
import TaskManager from "./pages/taskManager/TaskManager";
import Calendar from "./pages/calendar/Calendar";
import SearchStore from "./pages/searchStore/SearchStore";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { mockdata } from "./assets/mockData";
import ViolationManager from "./pages/violation/ViolationManager";
import VisitPlanManager from "./pages/visitPlan/VisitPlanManager";
import Login from "./pages/login/Login";

// Mock data for demonstration

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [data, setData] = useState(mockdata)

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard data={data} />;
      case "task-management":
        return <TaskManager data={data} setData={setData} />;
      case "calendar":
        return <Calendar data={data} setData={setData} />;
      case "search":
        return <SearchStore />;
      case "violation-management":
        return <ViolationManager data={data} setData={setData} />;
      case "visit-plan-management":
        return <VisitPlanManager data={data} setData={setData} />

      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {!isLogin ? (
        <Login setData={setData} setIsLogin={setIsLogin} />
      ) : (
        <div className="flex min-h-screen bg-gray-100 font-sans">
          <Sidebar
            user={data.user}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            setCurrentPage={setCurrentPage}
          />
          <div
            className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-16"
              }`}
          >
            <Header user={data.user.name} setIsSidebarOpen={setIsSidebarOpen} />
            <main className="flex-1 p-2 ">{renderContent()}</main>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
