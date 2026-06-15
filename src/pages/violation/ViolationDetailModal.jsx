import React, { useState } from "react";
import { Save, Trash, Printer, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { label: "VSATTP", exp: "Ghi nhận về VSATTP", key: "vsattp", causeKey: "cauVsattp" },
  { label: "Tồn kho", exp: "Tồn ảo, tồn âm,...", key: "tonKho", causeKey: "cauTonKho" },
  { label: "Gian lận", exp: "Hủy dòng, trả hàng, lấy hàng, tích điểm trục lợi", key: "gianLan", causeKey: "cauGianLan" },
  { label: "Kiểm kê", exp: "Gian lận kiểm kê", key: "kiemKe", causeKey: "cauKiemKe" },
  { label: "Bán hàng", exp: "Thu thay chờ coupon,", key: "banHang", causeKey: "cauBanHang" },
  { label: "Hủy", exp: "Không hủy hàng", key: "huy", causeKey: "cauHuy" },
  { label: "STO PO", exp: "Không chuyển giao, hủy dòng PO", key: "stoPo", causeKey: "cauStoPo" },
  { label: "Khác", exp: "Các ghi nhận khác", key: "khac", causeKey: "cauKhac" },
];

const CHAIN_OPTIONS = ["rural", "urban", "winlife"];

const ViolationDetailModal = ({ data, task, onClose, onSave, onUpdate, onDelete, onCreateRecord }) => {
  const isNewTask = !task?.id;
  const [formData, setFormData] = useState(task || {});

  const [expanded, setExpanded] = useState(() => {
    const initial = new Set();
    CATEGORIES.forEach(({ key, causeKey }) => {
      if (task?.[key] || task?.[causeKey]) initial.add(key);
    });
    if (task?.batCapVH) initial.add("batCapVH");
    return initial;
  });

  const toggleCategory = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (isNewTask) onSave(formData);
    else onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-4 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl font-bold">{isNewTask ? "Ghi nhận mới" : `Chi tiết ghi nhận${task.id ? ' · ' + task.id : ''}`}</h3>
            <button onClick={handleSave} className="bg-indigo-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2">
              <Save size={16} /> Lưu
            </button>
            {!isNewTask && (
              <>
                <button onClick={() => onDelete(task.id)} className="bg-red-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
                  <Trash size={16} /> Xóa
                </button>
                <button onClick={() => onCreateRecord(task.id)} className="bg-green-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2">
                  <Printer size={16} /> Tạo biên bản
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-4xl leading-none ml-4">&times;</button>
        </div>

        {/* Store info */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm mb-1">Mã CH <span className="text-red-500">*</span></label>
            <input type="text" name="sap" value={formData.sap || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">Tên CH</label>
            <input type="text" name="store" value={formData.store || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">Chuỗi</label>
            <select name="chain" value={formData.chain || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white">
              <option value="">-- Chọn chuỗi --</option>
              {CHAIN_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">Ngày kiểm tra</label>
            <input type="date" name="ngayKiemTra" value={formData.ngayKiemTra || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">QLKV</label>
            <input type="text" name="qlkv" value={formData.qlkv || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">GĐV</label>
            <input type="text" name="gdv" value={formData.gdv || ""} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
          </div>
        </div>

        {/* Violation categories - accordion */}
        <h4 className="text-base font-semibold text-gray-800 mb-3">Nội dung ghi nhận</h4>
        <div className="space-y-2">
          {CATEGORIES.map(({ label, exp, key, causeKey }) => {
            const hasData = !!(formData[key] || formData[causeKey]);
            const isOpen = expanded.has(key);
            return (
              <div key={key} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{label} - {exp}</span>
                    {hasData && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Có ghi nhận</span>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>

                {isOpen && (
                  <div className="p-4 border-t bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ghi nhận</label>
                        <textarea
                          name={key}
                          value={formData[key] || ""}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full p-2 border rounded-md text-sm"
                          placeholder={`Ghi nhận ${label.toLowerCase()}...`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nguyên nhân</label>
                        <textarea
                          name={causeKey}
                          value={formData[causeKey] || ""}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full p-2 border rounded-md text-sm"
                          placeholder="Nguyên nhân..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bất cập VH - accordion */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory("batCapVH")}
              className="w-full flex items-center justify-between px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Bất cập VH</span>
                {formData.batCapVH && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Có ghi nhận</span>
                )}
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${expanded.has("batCapVH") ? "" : "-rotate-90"}`}
              />
            </button>

            {expanded.has("batCapVH") && (
              <div className="p-4 border-t bg-white">
                <textarea
                  name="batCapVH"
                  value={formData.batCapVH || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Ghi nhận bất cập văn hóa..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationDetailModal;
