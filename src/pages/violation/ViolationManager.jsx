import React, { useEffect } from "react";
import { Eye, FileText, Plus } from "lucide-react";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ViolationDetailModal from "./ViolationDetailModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const filterFn = (item, q) =>
  (!q.sap   || item.sap?.toLowerCase().includes(q.sap.toLowerCase())) &&
  (!q.store || item.store?.toLowerCase().includes(q.store.toLowerCase()));

const ViolationManager = () => {
  const data     = useStore((state) => state.data);
  const setData  = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);

  const {
    items: inspections, setItems: setInspections,
    searchQuery,
    currentPage, setCurrentPage,
    isModalOpen, selectedItem: selectedInspection,
    loading, setLoading,
    paginatedItems, totalPages,
    handleSearchChange, resetSearch,
    openModal, closeModal,
  } = useManagerPage({
    initialItems: data.inspections || [],
    initialSearch: { sap: '', store: '' },
    filterFn,
  });

  useEffect(() => { setData((prev) => ({ ...prev, inspections })); }, [inspections]);

  // ViolationDetailModal handles its own API calls; these callbacks just update the list
  const handleCreated = (inspection) => setInspections((p) => [...p, inspection]);
  const handleUpdated = (inspection) => setInspections((p) => p.map((v) => v.id === inspection.id ? inspection : v));
  const handleDeleted = (id) => setInspections((p) => p.filter((v) => v.id !== id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tổng hợp ghi nhận</h2>
        <button
          onClick={() => openModal({ sap: '', store: '', qlkv: '', gdv: '', chain: '' })}
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Tên CH</label>
            <input name="store" value={searchQuery.store} onChange={handleSearchChange} placeholder="Tìm theo tên CH..." className={INPUT} />
          </div>
          <button onClick={resetSearch} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{paginatedItems.length}</span> / <span className="font-medium text-gray-600">{inspections.length}</span> ghi nhận
        </p>
      </div>

      {/* Table */}
      {paginatedItems.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã CH</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên CH</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày KT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">KSTT</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.sap}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.store}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.ngayKiemTra}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.kstt}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openModal(item)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
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
            {paginatedItems.map((item) => (
              <div key={item.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.sap} — {item.store}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.ngayKiemTra} · {item.kstt}</p>
                  </div>
                  <button onClick={() => openModal(item)} className="shrink-0 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-mono">{item.id}</p>
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
          inspection={selectedInspection}
          onClose={closeModal}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default ViolationManager;
