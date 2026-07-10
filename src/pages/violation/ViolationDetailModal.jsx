import React, { useState, useEffect } from "react";
import { Save, Trash, Printer, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api";
import { supabase } from "../../api/supabaseClient";
import { downloadBase64 } from "../../assets/helpers";
import useStore from "../../store/useStore";
import LoadingModal from "../../components/LoadingModal";
import ViolationItemModal from "./ViolationItemModal";

const CHAIN_OPTIONS = ["rural", "urban", "winlife"];

const TRANG_THAI_COLORS = {
  'Mới': 'bg-blue-100 text-blue-700',
  'Đang xử lý': 'bg-yellow-100 text-yellow-700',
  'Đã xử lý': 'bg-green-100 text-green-700',
};

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const ViolationDetailModal = ({ data, inspection, onClose, onCreated, onUpdated, onDeleted }) => {
  const isEmp = data?.user?.role === 'emp';
  const addToast = useStore((s) => s.addToast);

  // Load nhomGhiNhan from store if available, else fetch directly
  const [nhomGhiNhan, setNhomGhiNhan] = useState(data?.setup?.nhomGhiNhan || []);

  useEffect(() => {
    if (nhomGhiNhan.length === 0) {
      supabase.from('nhom_ghi_nhan').select('*').order('STT').then(({ data: rows }) => {
        if (rows) setNhomGhiNhan(rows.map((r) => ({ nhom: r['Nhóm hành vi'], hanhVi: r['Hành vi'] })));
      });
    }
  }, []);

  // currentId: null = đang tạo mới, có giá trị = đã lưu
  const [currentId, setCurrentId] = useState(inspection?.id || null);
  const isNew = !currentId;

  const [formData, setFormData] = useState(() => {
    if (!inspection?.id) {
      return {
        sap: '', store: '', chain: '', qlkv: '', gdv: '',
        ngayKiemTra: today,
        kstt: isEmp ? data.user.name : '',
        thuTin: '',
      };
    }
    // map batCapVH → thuTin for existing records
    return { ...inspection, thuTin: inspection.thuTin ?? inspection.batCapVH ?? '' };
  });

  const [violations, setViolations] = useState([]);
  const [loadingVio, setLoadingVio] = useState(false);
  const [itemModal, setItemModal] = useState({ open: false, item: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentId) fetchViolations(currentId);
  }, [currentId]);

  const fetchViolations = async (id) => {
    setLoadingVio(true);
    const r = await api.getViolationsByInspection(id);
    if (r.success) setViolations(r.data);
    setLoadingVio(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSaveInspection = async () => {
    if (!formData.sap) { addToast('Bắt buộc nhập mã CH', 'error'); return; }
    if (!formData.ngayKiemTra) { addToast('Bắt buộc nhập ngày kiểm tra', 'error'); return; }
    setLoading(true);
    // map thuTin → batCapVH for DB column (backward compat)
    const payload = { ...formData, batCapVH: formData.thuTin };
    if (isNew) {
      payload.user = data.user.id;
      if (!payload.kstt) payload.kstt = data.user.name;
      const r = await api.createInspection(payload);
      if (r.success) {
        const created = { ...payload, id: r.data };
        setCurrentId(r.data);
        setFormData((p) => ({ ...p, id: r.data }));
        onCreated(created);
        addToast('Tạo ghi nhận thành công — có thể thêm vi phạm bên dưới');
        // Fire-and-forget Telegram notification
        api.notify({ inspection: created, violations: [] }).catch(() => {});
      } else addToast(r.message || 'Tạo thất bại', 'error');
    } else {
      const r = await api.updateInspection({ ...payload, id: currentId });
      if (r.success) {
        onUpdated({ ...payload, id: currentId });
        addToast('Cập nhật thành công');
      } else addToast(r.message || 'Cập nhật thất bại', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Xóa ghi nhận này? Tất cả vi phạm bên trong cũng sẽ bị xóa.')) return;
    setLoading(true);
    const r = await api.deleteInspection(currentId);
    if (r.success) {
      onDeleted(currentId);
      addToast('Đã xóa ghi nhận');
      onClose();
    } else addToast(r.message || 'Xóa thất bại', 'error');
    setLoading(false);
  };

  const handleCreateRecord = async () => {
    if (!confirm('Tạo biên bản sự vụ này?')) return;
    setLoading(true);
    const r = await api.createRecord({ inspection: { ...formData, id: currentId }, violations });
    if (r.success) {
      downloadBase64(r.data, r.filename || 'bienban.docx');
      addToast('Tạo biên bản thành công');
    } else addToast(r.message || 'Tạo biên bản thất bại', 'error');
    setLoading(false);
  };

  // ---- Violation item CRUD ----
  const handleSaveItem = async (item) => {
    setLoading(true);
    const payload = { ...item, inspection_id: currentId };
    if (item.id) {
      const r = await api.updateViolationItem(payload);
      if (r.success) {
        setViolations((p) => p.map((v) => v.id === item.id ? payload : v));
        addToast('Cập nhật vi phạm thành công');
      } else addToast(r.message || 'Lỗi cập nhật', 'error');
    } else {
      const r = await api.createViolationItem(payload);
      if (r.success) {
        setViolations((p) => [...p, { ...payload, id: r.data }]);
        addToast('Thêm vi phạm thành công');
      } else addToast(r.message || 'Lỗi thêm vi phạm', 'error');
    }
    setLoading(false);
    setItemModal({ open: false, item: null });
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Xóa vi phạm này?')) return;
    setLoading(true);
    const r = await api.deleteViolationItem(id);
    if (r.success) {
      setViolations((p) => p.filter((v) => v.id !== id));
      addToast('Đã xóa vi phạm');
    } else addToast(r.message || 'Xóa thất bại', 'error');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-start justify-center p-3 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl my-6">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">
              {isNew ? 'Ghi nhận mới' : `Chi tiết · ${currentId}`}
            </h3>
            <button onClick={handleSaveInspection}
              className="bg-indigo-500 text-white px-3 py-1.5 rounded-md hover:bg-indigo-600 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
              <Save size={13} /> {isNew ? 'Tạo mới' : 'Lưu'}
            </button>
            {!isNew && (
              <>
                <button onClick={handleCreateRecord}
                  className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Printer size={13} /> Biên bản
                </button>
                <button onClick={handleDelete}
                  className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Trash size={13} /> Xóa
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-2">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Inspection info grid */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mã CH <span className="text-red-500">*</span></label>
              <input type="text" name="sap" value={formData.sap || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tên CH</label>
              <input type="text" name="store" value={formData.store || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Chuỗi</label>
              <select name="chain" value={formData.chain || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm bg-white">
                <option value="">-- Chọn --</option>
                {CHAIN_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ngày kiểm tra <span className="text-red-500">*</span></label>
              <input type="date" name="ngayKiemTra" value={formData.ngayKiemTra || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">QLKV</label>
              <input type="text" name="qlkv" value={formData.qlkv || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">GĐV</label>
              <input type="text" name="gdv" value={formData.gdv || ''} onChange={handleChange}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nhân sự phụ trách</label>
              <input type="text" name="kstt" value={formData.kstt || ''} onChange={handleChange}
                readOnly={isEmp}
                className={`w-full px-2 py-1.5 border rounded text-sm ${isEmp ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ghi nhận thu tin</label>
              <textarea name="thuTin" value={formData.thuTin || ''} onChange={handleChange}
                rows={2} className="w-full px-2 py-1.5 border rounded text-sm resize-none"
                placeholder="Ghi nhận thu thập thông tin..." />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Violations section */}
          {isNew ? (
            <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center text-xs text-gray-400">
              Bấm "Tạo mới" để lưu thông tin kiểm tra, sau đó thêm vi phạm tại đây
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">
                  Vi phạm <span className="text-gray-400 font-normal">({violations.length})</span>
                </h4>
                <button onClick={() => setItemModal({ open: true, item: null })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700">
                  <Plus size={12} /> Thêm vi phạm
                </button>
              </div>

              {loadingVio ? (
                <div className="text-center py-6 text-gray-400 text-xs">Đang tải...</div>
              ) : violations.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs border rounded-lg border-dashed">
                  Chưa có vi phạm — bấm "Thêm vi phạm" để bắt đầu
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Nhóm', 'Hành vi', 'Mô tả', 'Nhân viên', 'Trạng thái', 'XLVP', ''].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {violations.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap align-top">{v.nhom}</td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-wrap gap-1">
                              {(v.hanh_vi || []).map((h, i) => (
                                <span key={i} className="inline-block bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 max-w-[180px] align-top">
                            <p className="line-clamp-2">{v.mo_ta}</p>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap align-top">
                            <div>{v.ten_nv}</div>
                            {v.ma_nv && <div className="text-gray-400">{v.ma_nv}</div>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap align-top">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${TRANG_THAI_COLORS[v.trang_thai] || 'bg-gray-100 text-gray-600'}`}>
                              {v.trang_thai}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 max-w-[140px] align-top">
                            <p className="line-clamp-2">{v.xlvp}</p>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setItemModal({ open: true, item: v })}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => handleDeleteItem(v.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {itemModal.open && (
        <ViolationItemModal
          item={itemModal.item}
          nhomGhiNhan={nhomGhiNhan}
          penalties={data?.setup?.penalties || []}
          onClose={() => setItemModal({ open: false, item: null })}
          onSave={handleSaveItem}
        />
      )}
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default ViolationDetailModal;
