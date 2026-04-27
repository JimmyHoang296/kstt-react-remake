import React, { useEffect } from "react";
import { Eye, FileText, Plus } from "lucide-react";
import { downloadFile, getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ViolationDetailModal from "./ViolationDetailModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const violationFilterFn = (task, q) =>
  (!q.sap  || task.sap?.toLowerCase().includes(q.sap.toLowerCase()))  &&
  (!q.audit || task.audit?.toLowerCase().includes(q.audit.toLowerCase()));

const ViolationManager = () => {
  const data     = useStore((state) => state.data);
  const setData  = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);

  const {
    items: violations, setItems: setViolations,
    searchQuery,
    currentPage, setCurrentPage,
    isModalOpen, selectedItem: selectedTask,
    loading, setLoading,
    paginatedItems: paginatedTasks, totalPages,
    handleSearchChange, resetSearch,
    openModal, closeModal,
  } = useManagerPage({
    initialItems: data.violations,
    initialSearch: { sap: '', audit: '' },
    filterFn: violationFilterFn,
  });

  useEffect(() => { setData((prev) => ({ ...prev, violations })); }, [violations]);

  const isValidViolation = (task) => {
    if (!task.sap) { addToast('Bắt buộc nhập mã CH', 'error'); return false; }
    if (!task.violations?.length || !task.violations.filter((v) => v.violation).length) {
      addToast('Sự vụ bắt buộc phải có ghi nhận', 'error'); return false;
    }
    return true;
  };

  async function handleUpdate(updatedTask) {
    if (!isValidViolation(updatedTask)) return;
    try {
      setLoading(true);
      const r = await api.updateViolation(updatedTask);
      if (r.success) { setViolations((p) => p.map((v) => (v.id === updatedTask.id ? updatedTask : v))); closeModal(); addToast('Cập nhật ghi nhận thành công'); }
      else addToast('Cập nhật thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleCreateRecord(taskId) {
    if (!confirm('Bạn muốn tạo biên bản sự vụ này')) return;
    try {
      setLoading(true);
      const r = await api.createRecord(taskId);
      if (r.success) { downloadFile(r.data); closeModal(); addToast('Tạo biên bản thành công'); }
      else addToast('Tạo biên bản thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDelete(taskId) {
    if (!confirm('Bạn muốn xóa ghi nhận này?')) return;
    try {
      setLoading(true);
      const r = await api.deleteViolation(taskId);
      if (r.success) { setViolations((p) => p.filter((v) => v.id !== taskId)); closeModal(); addToast('Đã xóa ghi nhận'); }
      else addToast('Xóa thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleSaveNew(newTask) {
    newTask.user = data.user.id;
    newTask.name = data.user.name;
    if (!isValidViolation(newTask)) return;
    try {
      setLoading(true);
      const r = await api.createViolation(newTask);
      if (r.success) {
        newTask.id = r.data;
        newTask.violations = newTask.violations.map((v, i) => ({ ...v, vId: newTask.id + '_' + (i + 1) }));
        setViolations((p) => [...p, newTask]);
        closeModal();
        addToast('Thêm ghi nhận thành công');
      } else addToast('Thêm thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tổng hợp ghi nhận</h2>
        <button
          onClick={() => openModal({ date: getTodayDateString(), violations: [] })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ghi nhận mới
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mã CH</label>
            <input name="sap" value={searchQuery.sap} onChange={handleSearchChange} placeholder="Tìm theo mã CH..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Đợt kiểm tra</label>
            <input name="audit" value={searchQuery.audit} onChange={handleSearchChange} placeholder="Tìm theo đợt kiểm tra..." className={INPUT} />
          </div>
          <button onClick={resetSearch} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{paginatedTasks.length}</span> / <span className="font-medium text-gray-600">{violations.length}</span> ghi nhận
        </p>
      </div>

      {/* Desktop table */}
      {paginatedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Không có ghi nhận nào</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Đợt kiểm tra</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày kiểm tra</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã CH</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên CH</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{task.audit}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{toDateInputValue(task.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{task.sap}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.store}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openModal(task)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden divide-y divide-gray-100">
            {paginatedTasks.map((task) => (
              <div key={task.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{task.sap} — {task.store}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.audit}</p>
                  </div>
                  <button onClick={() => openModal(task)} className="shrink-0 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">{toDateInputValue(task.date)}</p>
              </div>
            ))}
          </div>

          <div className="px-6 pb-4">
            <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        </>
      )}

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
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default ViolationManager;
