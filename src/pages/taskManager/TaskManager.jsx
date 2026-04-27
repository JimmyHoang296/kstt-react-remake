import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, ListTodo, Plus } from "lucide-react";
import { toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import TaskDetailModal from "./TaskDetailModal";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const StatusBadge = ({ status }) => {
  const map = {
    'Đang xử lý': 'bg-yellow-100 text-yellow-800',
    'Hoàn thành':  'bg-green-100  text-green-800',
    'Đóng khác':   'bg-gray-100   text-gray-600',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status || '—'}
    </span>
  );
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 inline ml-1" />
    : <ChevronDown className="w-3 h-3 inline ml-1" />;
};

const taskFilterFn = (task, q) =>
  (!q.email  || task.email?.toLowerCase().includes(q.email.toLowerCase()))  &&
  (!q.pic    || task.pic?.toLowerCase().includes(q.pic.toLowerCase()))       &&
  (!q.status || task.status?.toLowerCase().includes(q.status.toLowerCase()));

const sortedCases = (cases) =>
  [...cases].sort((a, b) => {
    const dA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dB - dA;
  });

const TaskManager = () => {
  const data    = useStore((state) => state.data);
  const setData = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);

  const {
    items: tasks, setItems: setTasks,
    searchQuery, filteredItems,
    currentPage, setCurrentPage,
    isModalOpen, selectedItem: selectedTask,
    loading, setLoading,
    handleSearchChange, resetSearch,
    openModal, closeModal,
  } = useManagerPage({
    initialItems: sortedCases(data.cases),
    initialSearch: { email: '', status: '', pic: '' },
    filterFn: taskFilterFn,
  });

  const [sortField, setSortField] = useState('startDate');
  const [sortDir,   setSortDir]   = useState('desc');
  const PER_PAGE = 20;

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const paginatedTasks = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const vA = a[sortField] ?? '', vB = b[sortField] ?? '';
      const cmp = typeof vA === 'string' ? vA.localeCompare(vB) : vA < vB ? -1 : vA > vB ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    const start = (currentPage - 1) * PER_PAGE;
    return sorted.slice(start, start + PER_PAGE);
  }, [filteredItems, sortField, sortDir, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);

  useEffect(() => { setData((prev) => ({ ...prev, cases: tasks })); }, [tasks]);

  const COLS = [
    { label: 'Email',      field: 'email'     },
    { label: 'Trạng thái', field: 'status'    },
    { label: 'PIC',        field: 'pic'       },
    { label: 'Ngày giao',  field: 'startDate' },
  ];

  async function handleUpdate(updated) {
    try {
      setLoading(true);
      const r = await api.updateCase(updated);
      if (r.success) { setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t))); closeModal(); addToast('Cập nhật sự vụ thành công'); }
      else addToast('Cập nhật thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Bạn muốn xóa sự vụ này?')) return;
    try {
      setLoading(true);
      const r = await api.deleteCase(id);
      if (r.success) { setTasks((p) => p.filter((t) => t.id !== id)); closeModal(); addToast('Đã xóa sự vụ'); }
      else addToast('Xóa thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleSaveNew(newTask) {
    newTask.hod = data.user.hod;
    try {
      setLoading(true);
      const r = await api.createCase(newTask);
      if (r.success) { newTask.id = r.data; setTasks((p) => [...p, newTask]); closeModal(); addToast('Thêm sự vụ thành công'); }
      else addToast('Thêm thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Quản lý Sự vụ</h2>
        <button onClick={() => openModal(null)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Thêm sự vụ
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 width-full min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tiêu đề email</label>
            <input name="email" value={searchQuery.email} onChange={handleSearchChange} placeholder="Tìm theo email..." className={INPUT} />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
            <select name="status" value={searchQuery.status} onChange={handleSearchChange} className={INPUT}>
              <option value="">Tất cả</option>
              <option>Đang xử lý</option>
              <option>Hoàn thành</option>
              <option>Đóng khác</option>
            </select>
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">PIC</label>
            <input name="pic" value={searchQuery.pic} onChange={handleSearchChange} placeholder="Tìm theo PIC..." className={INPUT} />
          </div>
          <button onClick={resetSearch} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{paginatedTasks.length}</span> / <span className="font-medium text-gray-600">{filteredItems.length}</span> sự vụ
        </p>
      </div>

      {/* Desktop table */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ListTodo className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Không có sự vụ nào</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  {COLS.map(({ label, field }) => (
                    <th key={field} onClick={() => handleSort(field)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{task.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.pic}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{toDateInputValue(task.startDate)}</td>
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
              <div key={task.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{task.email}</p>
                  <button onClick={() => openModal(task)} className="shrink-0 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <StatusBadge status={task.status} />
                  <span>{task.pic}</span>
                  <span>{toDateInputValue(task.startDate)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-4">
            <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        </>
      )}

      {isModalOpen && (
        <TaskDetailModal data={data} task={selectedTask} onClose={closeModal} onSave={handleSaveNew} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default TaskManager;
