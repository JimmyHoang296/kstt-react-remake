import React, { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { URL } from "../../assets/variables";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import VisitPlanDetailModal from "./VisitPlanDetailModal";

const VisitPlanManager = ({ data, setData }) => {
  const [plans, setPlans] = useState(data.visitPlan || []);
  const [searchQuery, setSearchQuery] = useState({ site: "", status: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [filteredPlans, setFilteredPlans] = useState(plans);
  const [currentPage, setCurrentPage] = useState(1);
  const plansPerPage = 20;

  // search
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery({ ...searchQuery, [name]: value });
    setCurrentPage(1);
  };
  useEffect(() => {
    setFilteredPlans(
      plans.filter(
        (p) =>
          (!searchQuery.site ||
            p.site.toLowerCase().includes(searchQuery.site.toLowerCase())) &&
          (!searchQuery.status ||
            p.status.toLowerCase().includes(searchQuery.status.toLowerCase()))
      )
    );
  }, [searchQuery, plans]);

  useEffect(() => {
    setData((prev) => ({ ...prev, visitplans: plans }));
  }, [plans]);

  const handleOpenModal = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  async function handleSaveNew(plan) {
    const newPlan = { ...plan, user: data.user.id };
    const submitData = { type: "createVisitPlan", data: newPlan };

    try {
      setLoading(true);
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(submitData),
      });
      const result = await res.json();
      if (result.success) {
        newPlan.id = result.data;
        setPlans([...plans, newPlan]);
        handleCloseModal();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(plan) {
    const submitData = { type: "updateVisitPlan", data: plan };
    try {
      setLoading(true);
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(submitData),
      });
      const result = await res.json();
      if (result.success) {
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
        handleCloseModal();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(planId) {
    if (!confirm("Bạn muốn xóa kế hoạch này?")) return;
    const submitData = { type: "deleteVisitPlan", data: planId };
    try {
      setLoading(true);
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(submitData),
      });
      const result = await res.json();
      if (result.success) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        handleCloseModal();
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAddNew = () => {
    setSelectedPlan({
      date: getTodayDateString(),
      site: "",
      path: "",
      status: "pending",
      user: data.user?.id || "",
    });
    setIsModalOpen(true);
  };

  // pagination
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * plansPerPage;
    return filteredPlans.slice(start, start + plansPerPage);
  }, [filteredPlans, currentPage]);

  const totalPages = Math.ceil(filteredPlans.length / plansPerPage);

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="mb-6 border-b pb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quản lý kế hoạch viếng thăm</h2>
        <button
          onClick={handleAddNew}
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
              <th className="px-4 py-2 text-left">site</th>
              <th className="px-4 py-2 text-left">Path</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-2">{toDateInputValue(plan.date)}</td>
                <td className="px-4 py-2">{plan.site}</td>
                <td className="px-4 py-2">{plan.path}</td>
                <td className="px-4 py-2">{plan.status}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {isModalOpen && (
        <VisitPlanDetailModal
          plan={selectedPlan}
          onClose={handleCloseModal}
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
