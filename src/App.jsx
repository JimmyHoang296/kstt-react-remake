import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/main/Main";
import TaskManager from "./pages/taskManager/TaskManager";
import Calendar from "./pages/calendar/Calendar";
import SearchStore from "./pages/searchStore/SearchStore";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ViolationManager from "./pages/violation/ViolationManager";
import VisitPlanManager from "./pages/visitPlan/VisitPlanManager";
import ThManager from "./pages/thManager/ThManager";
import ViolationReport from "./pages/violation/ViolationReport";
import AdminPage from "./pages/admin/AdminPage";
import XlvpReport from "./pages/xlvpReport/XlvpReport";
import Login from "./pages/login/Login";
import useStore from "./store/useStore";
import { Toast } from "./components/Toast";

const App = () => {
  const isLogin = useStore((state) => state.isLogin);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const userRole = useStore((state) => state.data.user?.role);

  return (
    <>
      <Toast />
      {!isLogin ? (
        <Login />
      ) : (
        <div className="flex min-h-screen bg-gray-100 font-sans">
          <Sidebar />
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
            <Header />
            <main className="flex-1 p-0.5 overflow-auto">
              <Routes>
                <Route path="/" element={<Navigate to={userRole === "director" ? "/calendar" : "/dashboard"} replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/task-management" element={<TaskManager />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/search" element={<SearchStore />} />
                <Route path="/violation-management" element={<ViolationManager />} />
                <Route path="/visit-plan-management" element={<VisitPlanManager />} />
                <Route path="/th-management" element={<ThManager />} />
                <Route path="/violation-report" element={<ViolationReport />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/xlvp-report" element={<XlvpReport />} />
                <Route path="*" element={<Navigate to={userRole === "director" ? "/calendar" : "/dashboard"} replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
