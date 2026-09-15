import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { getTodayDateString, toDateInputValue } from '../../assets/helpers';
import { api } from '../../api';
import ViolationDetailModal from '../violation/ViolationDetailModal';

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const LABEL  = "block text-xs font-medium text-gray-500 mb-1";
const SECTION = "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100";

const typeList = [
  'N1_Gian lận trục lợi',
  'N1_Hành vi trộm cắp tham ô khác',
  'N1_Ra quyết định vượt thẩm quyền gây thiệt hại ĐB nghiêm trọng',
  'N1_Tự ý bỏ việc quá thời gian quy định',
  'N2_Gian lận KK',
  'N2_Gian lận báo cáo',
  'N2_Gian lận chấm công',
  'N2_Các hành vi không tuân thủ có tính chất nghiêm trọng ',
  'N2_Ứng xử thiếu văn hóa',
  'N2_Bao che',
  'N3_Không tuân thủ QTQĐHD',
  'N3_Không kiểm soát được công việc bộ phận',
  'N3_Không hoàn thành nhiệm vụ được giao',
  'N3_Ý thức kém',
  'N3_Lỗi lặp hệ thống',
  'N3_Vô ý tiết lộ thông tin bảo mật',
  'N4_Tác phong diện mạo/SD ĐT sai quy định',
  'N4_ Không thực hiện đầy đủ QTQĐHD/Lỗi KTNV/Sai sót BC',
  'N4_Không phản hồi thông tin theo QĐ',
  'N5_Không chấp hành đầy đủ các quy định hành chính',
];

const TaskDetailModal = ({ data, task, onClose, onSave, onUpdate, onDelete }) => {
  const isEmp = data?.user?.role === 'emp';
  const [formData, setFormData] = useState(task || {
    id: '', email: '', rank: '', status: 'Đang xử lý', type: '', source: '',
    sap: '', store: '', user: data.user.id, name: data.user.name,
    startDate: getTodayDateString(), endDate: '', group: '',
    lossValue: '', returnValue: '', summarize: '', note: '', conclusion: '',
    pic: isEmp ? data.user.name : '',
  });
  const [errors, setErrors] = useState({});

  const isNew = !task?.id;

  // ---- Biên bản liên quan (inspections linked via case_id) ----
  const [relatedInspections, setRelatedInspections] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [violationModalData, setViolationModalData] = useState(null);

  useEffect(() => {
    if (!task?.id) return;
    setLoadingRelated(true);
    api.getInspectionsByCase(task.id).then((r) => {
      if (r.success) setRelatedInspections(r.data);
      setLoadingRelated(false);
    });
  }, [task?.id]);

  const handleInspectionCreated = (insp) => setRelatedInspections((p) => [insp, ...p]);
  const handleInspectionUpdated = (insp) => setRelatedInspections((p) => p.map((v) => (v.id === insp.id ? insp : v)));
  const handleInspectionDeleted = (id) => setRelatedInspections((p) => p.filter((v) => v.id !== id));

  const set = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSave = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Bắt buộc nhập tiêu đề email';
    if (isNew && !isEmp && !formData.pic) errs.pic = 'Bắt buộc chọn nhân sự phụ trách';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    isNew ? onSave(formData) : onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? 'Thêm sự vụ mới' : 'Chi tiết sự vụ'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Section: Thông tin chính */}
          <div>
            <p className={SECTION}>Thông tin chính</p>
            <div className="space-y-3">
              {!isNew && (
                <div>
                  <label className={LABEL}>Mã sự vụ</label>
                  <input value={formData.id || ''} readOnly className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </div>
              )}
              <div>
                <label className={LABEL}>Tiêu đề email <span className="text-red-500">*</span></label>
                <input name="email" value={formData.email} onChange={set} className={`${INPUT} ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Nhân sự phụ trách {isNew && <span className="text-red-500">*</span>}</label>
                  {isEmp ? (
                    <input value={formData.pic || ''} readOnly className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                  ) : (
                    <select name="pic" value={formData.pic || ''} onChange={set} className={`${INPUT} ${errors.pic ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                      <option value="">— Chọn PIC —</option>
                      {data.emps.map((emp, i) => <option key={i}>{emp}</option>)}
                    </select>
                  )}
                  {errors.pic && <p className="mt-1 text-xs text-red-500">{errors.pic}</p>}
                </div>
                <div>
                  <label className={LABEL}>Nguồn thông tin</label>
                  <input name="source" value={formData.source || ''} onChange={set} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Mã SAP</label>
                  <input name="sap" value={formData.sap || ''} onChange={set} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Tên cơ sở</label>
                  <input name="store" value={formData.store || ''} onChange={set} className={INPUT} />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Phân loại & Tiến độ */}
          <div>
            <p className={SECTION}>Phân loại &amp; Tiến độ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Trạng thái</label>
                <select name="status" value={formData.status} onChange={set} className={INPUT}>
                  <option>Đang xử lý</option>
                  <option>Hoàn thành</option>
                  <option>Đóng khác</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Mức độ</label>
                <select name="level" value={formData.level || ''} onChange={set} className={INPUT}>
                  <option value="">— Chọn mức độ —</option>
                  <option>Đơn giản</option>
                  <option>Trung bình</option>
                  <option>Phức tạp</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Ngày giao việc</label>
                <input type="date" name="startDate" value={toDateInputValue(formData.startDate)} onChange={set} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Ngày hoàn thành</label>
                <input type="date" name="endDate" value={toDateInputValue(formData.endDate)} onChange={set} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Phân loại vi phạm</label>
                <select name="type" value={formData.type || ''} onChange={set} className={INPUT}>
                  <option value="">— Chọn phân loại —</option>
                  {typeList.map((t, i) => <option key={i}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Nhóm lỗi vi phạm</label>
                <select name="group" value={formData.group || ''} onChange={set} className={INPUT}>
                  <option value="">— Chọn nhóm —</option>
                  <option>Nhóm 1</option>
                  <option>Nhóm 2</option>
                  <option>Nhóm 3</option>
                  <option>Nhóm 4</option>
                  <option>Nhóm 5</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Giá trị thất thoát</label>
                <input type="number" name="lossValue" value={formData.lossValue || ''} onChange={set} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Giá trị thu hồi</label>
                <input type="number" name="returnValue" value={formData.returnValue || ''} onChange={set} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Section: Nội dung */}
          <div>
            <p className={SECTION}>Nội dung</p>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Tóm tắt vấn đề</label>
                <textarea name="summarize" value={formData.summarize || ''} onChange={set} rows={3} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Note và cập nhật</label>
                <textarea name="note" value={formData.note || ''} onChange={set} rows={3} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Kết luận</label>
                <textarea name="conclusion" value={formData.conclusion || ''} onChange={set} rows={3} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Section: Biên bản liên quan */}
          {!isNew && (
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Biên bản liên quan {relatedInspections.length > 0 && `(${relatedInspections.length})`}
                </p>
                <button
                  onClick={() => setViolationModalData({ case_id: task.id, sap: formData.sap, store: formData.store })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
                >
                  <Plus size={12} /> Thêm biên bản
                </button>
              </div>
              {loadingRelated ? (
                <p className="text-xs text-gray-400">Đang tải...</p>
              ) : relatedInspections.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Chưa có biên bản nào liên quan đến sự vụ này.</p>
              ) : (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {relatedInspections.map((insp) => (
                    <button key={insp.id} type="button" onClick={() => setViolationModalData(insp)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-3">
                      <span className="font-medium text-gray-700 shrink-0">{insp.id}</span>
                      <span className="text-gray-500 truncate flex-1">{insp.store}</span>
                      <span className="text-gray-400 shrink-0">{insp.chain}</span>
                      <span className="text-gray-400 shrink-0">{toDateInputValue(insp.ngayKiemTra)}</span>
                      <span className="text-gray-500 shrink-0">{insp.trang_thai}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-2xl">
          <div>
            {!isNew && (
              <button onClick={() => onDelete(task.id)} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              Huỷ
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <Save className="w-4 h-4" /> {isNew ? 'Thêm sự vụ' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>

      {violationModalData && (
        <ViolationDetailModal
          data={data}
          inspection={violationModalData}
          onClose={() => setViolationModalData(null)}
          onCreated={handleInspectionCreated}
          onUpdated={handleInspectionUpdated}
          onDeleted={handleInspectionDeleted}
        />
      )}
    </div>
  );
};

export default TaskDetailModal;
