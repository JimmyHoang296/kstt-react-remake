import React, { useEffect } from "react";
import { Eye, Plus } from "lucide-react";
import { getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import VisitPlanDetailModal from "./VisitPlanDetailModal";

const planFilterFn = (p, q) =>
  (!q.site || p.site?.toLowerCase().includes(q.site.toLowerCase())) &&
  (!q.status || p.status?.toLowerCase().includes(q.status.toLowerCase()));

const VisitPlanManager = () => {
  const data = useStore((state) => state.data);
  const setData = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);
  const {
    items: plans,
    setItems: setPlans,
    searchQuery,
    currentPage,
    setCurrentPage,
    isModalOpen,
    selectedItem: selectedPlan,
    loading,
    setLoading,
    paginatedItems: paginatedPlans,
    totalPages,
    handleSearchChange,
    openModal,
    closeModal,
  } = useManagerPage({
    initialItems: data.visitPlan || [],
    initialSearch: { site: "", status: "" },
    filterFn: planFilterFn,
  });

  useEffect(() => {
    setData((prev) => ({ ...prev, visitPlan: plans }));
  }, [plans]);

  async function handleSaveNew(plan) {
    const newPlan = { ...plan, user: data.user.id };
    try {
      setLoading(true);
      const result = await api.createVisitPlan(newPlan);
      if (result.success) {
        newPlan.id = result.data;
        setPlans((prev) => [...prev, newPlan]);
        closeModal();
        addToast("Thêm kế hoạch thành công");
      } else {
        addToast("Thêm thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(plan) {
    try {
      setLoading(true);
      const result = await api.updateVisitPlan(plan);
      if (result.success) {
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
        closeModal();
        addToast("Cập nhật kế hoạch thành công");
      } else {
        addToast("Cập nhật thất bại", "error");
      }
    } catch (error) {
      addToast("Lỗi kết nối, thử lại sau", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(planId) {
    if (!confirm("Bạn muốn xóa kế hoạch này?")) return;
    try {
      setLoading(true);
      const result = await api.deleteVisitPlan(planId);
      if (result.success) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        closeModal();
        addToast("Đã xóa kế hoạch");
      } else {
        addToast("Xóa thất bại", "error");
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
      <div className="mb-6 border-b pb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Đăng ký đổ dữ liệu</h2>
        <button
          onClick={() => openModal({ date: getTodayDateString(), site: "", path: "", status: "pending" })}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 flex items-center"
        >
          <Plus className="mr-2" /> Kế hoạch mới
        </button>
      </div>

      {/* Search */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <input
          type="text"
          name="site"
          placeholder="Tìm theo site"
          value={searchQuery.site}
          onChange={handleSearchChange}
          className="p-2 border rounded-md"
        />
        <input
          type="text"
          name="status"
          placeholder="Tìm theo trạng thái"
          value={searchQuery.status}
          onChange={handleSearchChange}
          className="p-2 border rounded-md"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Ngày</th>
              <th className="px-4 py-2 text-left">Site</th>
              <th className="px-4 py-2 text-left">Path</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-2">{toDateInputValue(plan.date)}</td>
                <td className="px-4 py-2">{plan.site}</td>
                <td className="px-4 py-2">{plan.path}</td>
                <td className="px-4 py-2">{plan.status}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openModal(plan)} className="text-indigo-600 hover:text-indigo-900">
                    <Eye className="w-5 h-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {isModalOpen && (
        <VisitPlanDetailModal
          plan={selectedPlan}
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

export default VisitPlanManager;
