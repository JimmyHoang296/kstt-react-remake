
import React, { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { toDateInputValue } from "../../assets/helpers";
import { URL } from "../../assets/variables";
import TaskDetailModal from "./TaskDetailModal";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";

// Task Management Component (CRUD)
const TaskManager = ({ data, setData }) => {
  const [tasks, setTasks] = useState(data.cases);
  const [searchQuery, setSearchQuery] = useState({
    email: "",
    status: "",
    pic: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  const handleSearchChange = (e) => {
    const name = e.target.name;
    setSearchQuery({ ...searchQuery, [name]: e.target.value });
    setCurrentPage(1);
  };
  useEffect(() => {
    setFilteredTasks(
      tasks.filter(
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
  }, [searchQuery, tasks]);
  useEffect(() => {
    setData((prev) => ({ ...prev, ["cases"]: tasks }));
  }, [tasks]);
  const handleOpenModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  async function handleUpdate(updatedTask) {
    // update to dtbase
    const submitData = {
      type: "update",
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
        setTasks(
          tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        );
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
      type: "delete",
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
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        // setTasks([...tasks, { ...newTask, id: tasks.length + 1 }]);
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
  const handleAddNewTask = () => {
    setSelectedTask(null); // Open modal with empty form for new task
    setIsModalOpen(true);
  };

  async function handleSaveNewTask(newTask) {
    const user = data.user;
    newTask.hod = user.hod;

    // update to dtbase

    const submitData = {
      type: "new",
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
        setTasks([...tasks, newTask]);
        // setTasks([...tasks, { ...newTask, id: tasks.length + 1 }]);
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  }

  // Compute paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * tasksPerPage;
    return filteredTasks.reverse().slice(startIndex, startIndex + tasksPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="mb-6 border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Sự vụ</h2>
        <button
          onClick={handleAddNewTask}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center"
        >
          <Plus className="mr-2" /> Thêm sự vụ
        </button>
      </div>

      {/* Search section */}
      <div className="mb-2">
        <h3 className="text-xl font-bold mb-2">Tìm kiếm sự vụ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-gray-700 text-sm mb-1">
              Tiêu đề email
            </label>
            <input
              type="text"
              name="email"
              value={searchQuery.email}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">Status</label>
            <select
              name="status"
              value={searchQuery.status}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            >
              <option></option>
              <option>Đang xử lý</option>
              <option>Hoàn thành</option>
              <option>Đóng khác</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">PIC</label>
            <input
              type="text"
              name="pic"
              value={searchQuery.pic}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="flex sm:justify-end items-end">
            <button
              onClick={() => setSearchQuery({ email: "", status: "", pic: "" })}
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
          <h3 className="text-xl font-bold">Danh sách sự vụ</h3>
        </div>

        {/* Table view for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  PIC
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 max-w-80 text-wrap">{task.email}</td>
                  <td className="px-4 py-3 ">
                    <span
                      className={`px-2 inline-flex text-center text-xs leading-5 font-semibold rounded-full ${
                        task.status === "Đang xử lý"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 ">{task.pic}</td>
                  <td className="px-4 py-3 ">
                    {toDateInputValue(task.startDate)}
                  </td>
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
                  Email:
                </span>
                <p className="text-sm">{task.email}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Status:
                </span>
                <p>
                  <span
                    className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                      task.status === "Đang xử lý"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {task.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  PIC:
                </span>
                <p className="text-sm">{task.pic}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">
                  Start Date:
                </span>
                <p className="text-sm">{toDateInputValue(task.startDate)}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenModal(task)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <Eye className="w-5 h-5" />
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
        <TaskDetailModal
          data={data}
          task={selectedTask}
          onClose={handleCloseModal}
          onSave={handleSaveNewTask}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
      {loading && <LoadingModal message={"Loading..."} />}
    </div>
  );
};

export default TaskManager;
