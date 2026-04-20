import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, Plus } from "lucide-react";
import { toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import TaskDetailModal from "./TaskDetailModal";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";

const taskFilterFn = (task, q) =>
  (!q.email || task.email?.toLowerCase().includes(q.email.toLowerCase())) &&
  (!q.pic || task.pic?.toLowerCase().includes(q.pic.toLowerCase())) &&
  (!q.status || task.status?.toLowerCase().includes(q.status.toLowerCase()));

const sortedCases = (cases) =>
  [...cases].sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dateB - dateA;
  });

const TaskManager = () => {
  const data = useStore((state) => state.data);
  const setData = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);
  const {
    items: tasks,
    setItems: setTasks,
    searchQuery,
    filteredItems,
    currentPage,
    setCurrentPage,
    isModalOpen,
    selectedItem: selectedTask,
    loading,
    setLoading,
    handleSearchChange,
    resetSearch,
    openModal,
    closeModal,
  } = useManagerPage({
    initialItems: sortedCases(data.cases),
    initialSearch: { email: "", status: "", pic: "" },
    filterFn: taskFilterFn,
  });

  const [sortField, setSortField] = useState("startDate");
  const [sortDir, setSortDir] = useState("desc");
  const tasksPerPage = 20;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const paginatedTasks = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";
      const cmp =
        typeof valA === "string"
          ? valA.localeCompare(valB)
          : valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    const start = (currentPage - 1) * tasksPerPage;
    return sorted.slice(start, start + tasksPerPage);
  }, [filteredItems, sortField, sortDir, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / tasksPerPage);

  useEffect(() => {
    setData((prev) => ({ ...prev, cases: tasks }));
  }, [tasks]);

  async function handleUpdate(updatedTask) {
    try {
      setLoading(true);
      const result = await api.updateCase(updatedTask);
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
        closeModal();
        addToast("Cập nhật sự vụ thành công");
      } else {
        addToast("Cập nhật thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm("Bạn muốn xóa sự vụ này")) return;
    try {
      setLoading(true);
      const result = await api.deleteCase(taskId);
      if (result.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        closeModal();
        addToast("Đã xóa sự vụ");
      } else {
        addToast("Xóa thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNew(newTask) {
    newTask.hod = data.user.hod;
    try {
      setLoading(true);
      const result = await api.createCase(newTask);
      if (result.success) {
        newTask.id = result.data;
        setTasks((prev) => [...prev, newTask]);
        closeModal();
        addToast("Thêm sự vụ thành công");
      } else {
        addToast("Thêm thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="mb-6 border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Sự vụ</h2>
        <button
          onClick={() => openModal(null)}
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
            <label className="block text-gray-700 text-sm mb-1">Tiêu đề email</label>
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
              onClick={resetSearch}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 w-full sm:w-auto"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4">Danh sách sự vụ</h3>

        {/* Table view for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: "Email", field: "email" },
                  { label: "Status", field: "status" },
                  { label: "PIC", field: "pic" },
                  { label: "Start Date", field: "startDate" },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                  >
                    {label}
                    <SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 max-w-80 text-wrap">{task.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 inline-flex text-center text-xs leading-5 font-semibold rounded-full ${task.status === "Đang xử lý" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{task.pic}</td>
                  <td className="px-4 py-3">{toDateInputValue(task.startDate)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openModal(task)} className="text-indigo-600 hover:text-indigo-900">
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
            <div key={task.id} className="p-4 border rounded-lg shadow-sm bg-white space-y-2">
              <div>
                <span className="text-xs font-semibold text-gray-500">Email:</span>
                <p className="text-sm">{task.email}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">Status:</span>
                <p>
                  <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${task.status === "Đang xử lý" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                    {task.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">PIC:</span>
                <p className="text-sm">{task.pic}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">Start Date:</span>
                <p className="text-sm">{toDateInputValue(task.startDate)}</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => openModal(task)} className="text-indigo-600 hover:text-indigo-900">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {isModalOpen && (
        <TaskDetailModal
          data={data}
          task={selectedTask}
          onClose={closeModal}
          onSave={handleSaveNew}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
      {loading && <LoadingModal message="Loading..." />}
    </div>
  );
};

export default TaskManager;
