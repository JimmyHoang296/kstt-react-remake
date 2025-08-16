import React, { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { downloadFile, getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { URL } from "../../assets/variables";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ViolationDetailModal from "./ViolationDetailModal";

// Task Management Component (CRUD)
const ViolationManager = ({ data, setData }) => {
  const [violations, setViolations] = useState(data.violations);
  const [searchQuery, setSearchQuery] = useState({
    sap: "",
    audit: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState(violations);
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  const handleSearchChange = (e) => {
    const name = e.target.name;
    setSearchQuery({ ...searchQuery, [name]: e.target.value });
    setCurrentPage(1);
  };
  useEffect(() => {
    setFilteredTasks(
      violations.filter(
        (task) =>
          (!searchQuery.email ||
            task.email
              .toLowerCase()
              .includes(searchQuery.email.toLowerCase())) &&
          (!searchQuery.pic ||
            task.pic.toLowerCase().includes(searchQuery.pic.toLowerCase())) &&
          (!searchQuery.status ||
            task.status
              .toLowerCase()
              .includes(searchQuery.status.toLowerCase()))
      )
    );
  }, [searchQuery, violations]);
  useEffect(() => {
    setData((prev) => ({ ...prev, ["caseObj"]: violations }));
  }, [violations]);
  const handleOpenModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const isValidViolation = (task) => {
    if (!task.sap) {
      alert("Bắt buộc nhập mã CH");
      return false;
    }
    if (
      !task.violations ||
      !task.violations.length ||
      !task.violations.filter((v) => v.violation).length
    ) {
      alert("Sự vụ bắt buộc phải có ghi nhận");
      return false;
    }
    return true;
  };

  async function handleUpdate(updatedTask) {
    if (!isValidViolation(updatedTask)) return;
    // update to dtbase
    const submitData = {
      type: "updateViolation",
      data: updatedTask,
    };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData), // body data type must match "Content-Type" header
      });

      const result = await response.json(); // Assuming response is JSON
      if (result.success) {
        // update to local
        const updatedViolations = [...violations].map((v) =>
          v.id === updatedTask.id ? updatedTask : v
        );
        setViolations(updatedViolations);
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRecord(taskId) {
    if (!confirm("Bạn muốn tạo biên bản sự vụ này")) return;
    // update to dtbase
    const submitData = {
      type: "createRecord",
      data: taskId,
    };
    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData), // body data type must match "Content-Type" header
      });

      const result = await response.json(); // Assuming response is JSON
      if (result.success) {
        // download file
        downloadFile (result.data)
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm("Bạn muốn xóa sự vụ này")) return;
    // update to dtbase
    const submitData = {
      type: "deleteViolation",
      data: taskId,
    };
    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData), // body data type must match "Content-Type" header
      });

      const result = await response.json(); // Assuming response is JSON
      if (result.success) {
        // delete in local
        setViolations((prev) => prev.filter((task) => task.id !== taskId));
        // setTasks([...violations, { ...newTask, id: violations.length + 1 }]);
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  }

  // Add functionality for creating a new task
  const handleAddNewViolation = () => {
    setSelectedTask({
      date: getTodayDateString(),
      violations: [],
    }); // Open modal with empty form for new task
    setIsModalOpen(true);
  };

  async function handleSaveNewTask(newTask) {
    const user = data.user;
    newTask.user = user.id;
    newTask.name = user.name;
    // update to dtbase

    if (!isValidViolation(newTask)) return;

    const submitData = {
      type: "newViolation",
      data: newTask,
    };
    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData), // body data type must match "Content-Type" header
      });

      const result = await response.json(); // Assuming response is JSON
      if (result.success) {
        // update to local
        newTask.id = result.data;
        newTask.violations.map((v, i) => ({
          ...v,
          vId: newTask.id + "_" + (i + 1),
        }));
        setViolations([...violations, newTask]);
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  }

  // Compute paginated violations
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * tasksPerPage;
    return filteredTasks.reverse().slice(startIndex, startIndex + tasksPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="mb-6 border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Tổng hợp ghi nhận</h2>
        <button
          onClick={handleAddNewViolation}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center"
        >
          <Plus className="mr-2" /> Ghi nhận mới
        </button>
      </div>

      {/* Search section */}
      <div className="mb-2">
        <h3 className="text-xl font-bold mb-2">Tìm ghi nhận</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-gray-700 text-sm mb-1">Mã CH</label>
            <input
              type="text"
              name="sap"
              value={searchQuery.email}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">
              Đợt kiểm tra
            </label>
            <input
              type="text"
              name="audit"
              value={searchQuery.audit}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="flex sm:justify-end items-end">
            <button
              onClick={() => setSearchQuery({ sap: "", audit: "" })}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 w-full sm:w-auto"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Danh sách ghi nhận</h3>
        </div>

        {/* Table view for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Đợt kiểm tra
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Ngày kiểm tra
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Mã CH
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Tên CH
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 max-w-80 text-wrap">{task.audit}</td>
                  <td className="px-4 py-3 ">{toDateInputValue(task.date)}</td>
                  <td className="px-4 py-3 ">{task.sap}</td>
                  <td className="px-4 py-3 ">{task.store}</td>

                  <td className="px-4 py-3  text-center">
                    <button
                      onClick={() => handleOpenModal(task)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Eye className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card view for mobile */}
        <div className="block md:hidden space-y-4">
          {paginatedTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border rounded-lg shadow-sm bg-white space-y-2"
            >
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Đợt kiểm tra:
                </span>
                <p className="text-sm">{task.audit}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Ngày kiểm tra:
                </span>
                <p className="text-sm">{toDateInputValue(task.date)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Mã CH:
                </span>
                <p className="text-sm">{task.sap}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Tên CH:
                </span>
                <p className="text-sm">{task.store}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenModal(task)}
                  className="text-indigo-600 hover:text-indigo-900 flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  <p>Xem chi tiết</p>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination controls */}
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {isModalOpen && (
        <ViolationDetailModal
          data={data}
          task={selectedTask}
          onClose={handleCloseModal}
          onSave={handleSaveNewTask}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCreateRecord={handleCreateRecord}
        />
      )}
      {loading && <LoadingModal message={"Loading..."} />}
    </div>
  );
};

export default ViolationManager;
