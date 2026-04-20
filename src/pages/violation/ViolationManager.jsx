import React, { useEffect } from "react";
import { Eye, Plus } from "lucide-react";
import { downloadFile, getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ViolationDetailModal from "./ViolationDetailModal";

const violationFilterFn = (task, q) =>
  (!q.sap || task.sap?.toLowerCase().includes(q.sap.toLowerCase())) &&
  (!q.audit || task.audit?.toLowerCase().includes(q.audit.toLowerCase()));

const ViolationManager = () => {
  const data = useStore((state) => state.data);
  const setData = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);
  const {
    items: violations,
    setItems: setViolations,
    searchQuery,
    currentPage,
    setCurrentPage,
    isModalOpen,
    selectedItem: selectedTask,
    loading,
    setLoading,
    paginatedItems: paginatedTasks,
    totalPages,
    handleSearchChange,
    resetSearch,
    openModal,
    closeModal,
  } = useManagerPage({
    initialItems: data.violations,
    initialSearch: { sap: "", audit: "" },
    filterFn: violationFilterFn,
  });

  useEffect(() => {
    setData((prev) => ({ ...prev, violations }));
  }, [violations]);

  const isValidViolation = (task) => {
    if (!task.sap) {
      alert("Bắt buộc nhập mã CH");
      return false;
    }
    if (!task.violations?.length || !task.violations.filter((v) => v.violation).length) {
      alert("Sự vụ bắt buộc phải có ghi nhận");
      return false;
    }
    return true;
  };

  async function handleUpdate(updatedTask) {
    if (!isValidViolation(updatedTask)) return;
    try {
      setLoading(true);
      const result = await api.updateViolation(updatedTask);
      if (result.success) {
        setViolations((prev) =>
          prev.map((v) => (v.id === updatedTask.id ? updatedTask : v))
        );
        closeModal();
        addToast("Cập nhật ghi nhận thành công");
      } else {
        addToast("Cập nhật thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRecord(taskId) {
    if (!confirm("Bạn muốn tạo biên bản sự vụ này")) return;
    try {
      setLoading(true);
      const result = await api.createRecord(taskId);
      if (result.success) {
        downloadFile(result.data);
        closeModal();
        addToast("Tạo biên bản thành công");
      } else {
        addToast("Tạo biên bản thất bại", "error");
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
      const result = await api.deleteViolation(taskId);
      if (result.success) {
        setViolations((prev) => prev.filter((v) => v.id !== taskId));
        closeModal();
        addToast("Đã xóa ghi nhận");
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
    newTask.user = data.user.id;
    newTask.name = data.user.name;
    if (!isValidViolation(newTask)) return;
    try {
      setLoading(true);
      const result = await api.createViolation(newTask);
      if (result.success) {
        newTask.id = result.data;
        newTask.violations = newTask.violations.map((v, i) => ({
          ...v,
          vId: newTask.id + "_" + (i + 1),
        }));
        setViolations((prev) => [...prev, newTask]);
        closeModal();
        addToast("Thêm ghi nhận thành công");
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
        <h2 className="text-2xl font-bold text-gray-800">Tổng hợp ghi nhận</h2>
        <button
          onClick={() => openModal({ date: getTodayDateString(), violations: [] })}
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
              value={searchQuery.sap}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">Đợt kiểm tra</label>
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
              onClick={resetSearch}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 w-full sm:w-auto"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4">Danh sách ghi nhận</h3>

        {/* Table view for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Đợt kiểm tra</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Ngày kiểm tra</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Mã CH</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Tên CH</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 max-w-80 text-wrap">{task.audit}</td>
                  <td className="px-4 py-3">{toDateInputValue(task.date)}</td>
                  <td className="px-4 py-3">{task.sap}</td>
                  <td className="px-4 py-3">{task.store}</td>
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
                <span className="text-xs font-semibold text-gray-500">Đợt kiểm tra:</span>
                <p className="text-sm">{task.audit}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">Ngày kiểm tra:</span>
                <p className="text-sm">{toDateInputValue(task.date)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">Mã CH:</span>
                <p className="text-sm">{task.sap}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500">Tên CH:</span>
                <p className="text-sm">{task.store}</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => openModal(task)} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <p>Xem chi tiết</p>
                </button>
              </div>
            </div>
          ))}
        </div>

        <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {isModalOpen && (
        <ViolationDetailModal
          data={data}
          task={selectedTask}
          onClose={closeModal}
          onSave={handleSaveNew}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCreateRecord={handleCreateRecord}
        />
      )}
      {loading && <LoadingModal message="Loading..." />}
    </div>
  );
};

export default ViolationManager;
