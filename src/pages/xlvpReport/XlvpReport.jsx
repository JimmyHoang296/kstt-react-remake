import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileCheck, Pencil, Save, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../api/supabaseClient';
import { api } from '../../api';
import useStore from '../../store/useStore';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const thisMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ─── TRANG_THAI colors ────────────────────────────────────────────────────────
const TRANG_THAI_COLOR = {
  'Vi phạm':             'bg-red-100 text-red-700',
  'Nhắc nhở':            'bg-orange-100 text-orange-700',
  'Xác minh thêm':       'bg-yellow-100 text-yellow-700',
  'Ghi nhận thực trạng': 'bg-gray-100 text-gray-600',
};
const TRANG_THAI_OPTIONS = ['Vi phạm', 'Nhắc nhở', 'Xác minh thêm', 'Ghi nhận thực trạng'];
const KET_LUAN_OPTIONS   = ['Xử lý', 'Gộp lỗi', 'Không xử lý'];

// ─── Excel download ───────────────────────────────────────────────────────────
const DL_COLS = [
  ['ID',           (v) => v.id],
  ['Ngày KT',      (v) => v.ngayKiemTra],
  ['Mã CH',        (v) => v.sap],
  ['Tên CH',       (v) => v.store],
  ['KSTT',         (v) => v.kstt],
  ['Chuỗi',        (v) => v.chain],
  ['Nhóm VP',      (v) => v.nhom],
  ['Hành vi',      (v) => Array.isArray(v.hanh_vi) ? v.hanh_vi.join(', ') : (v.hanh_vi || '')],
  ['Mô tả',        (v) => v.mo_ta],
  ['Nguyên nhân',  (v) => v.nguyen_nhan],
  ['Trạng thái',   (v) => v.trang_thai],
  ['Mã NV',        (v) => v.ma_nv],
  ['Tên NV',       (v) => v.ten_nv],
  ['Chức danh',    (v) => v.chuc_danh],
  ['Giá trị',      (v) => v.gia_tri],
  ['Nhóm lỗi',     (v) => v.nhom_loi],
  ['Lỗi chi tiết', (v) => v.loi_chi_tiet],
  ['Kết luận',     (v) => v.ket_luan],
  ['XLVP',         (v) => v.xlvp],
  ['Nội dung KL',  (v) => v.nd_ket_luan],
];

function downloadXlsx(rows, start, end) {
  const data = rows.map((v) => {
    const r = {};
    DL_COLS.forEach(([h, fn]) => { r[h] = fn(v) ?? ''; });
    return r;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 8 },
    { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
    { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 24 }, { wch: 12 }, { wch: 24 }, { wch: 32 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'XLVP');
  XLSX.writeFile(wb, `XLVP_${start}_${end}.xlsx`);
}

// ─── Excel upload parsing ──────────────────────────────────────────────────────
const UPLOAD_MAP = {
  'Trạng thái':   'trang_thai',
  'Mã NV':        'ma_nv',
  'Tên NV':       'ten_nv',
  'Chức danh':    'chuc_danh',
  'Giá trị':      'gia_tri',
  'Nhóm lỗi':     'nhom_loi',
  'Lỗi chi tiết': 'loi_chi_tiet',
  'Kết luận':     'ket_luan',
  'XLVP':         'xlvp',
  'Nội dung KL':  'nd_ket_luan',
  'Mô tả':        'mo_ta',
  'Nguyên nhân':  'nguyen_nhan',
};

function parseXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function buildUpdateRows(xlsxRows) {
  return xlsxRows
    .filter((r) => r['ID'])
    .map((r) => {
      const upd = { id: r['ID'] };
      for (const [col, field] of Object.entries(UPLOAD_MAP)) {
        if (col in r) {
          const raw = r[col];
          if (raw === '' || raw === null || raw === undefined) {
            upd[field] = null;
          } else if (field === 'gia_tri') {
            upd[field] = Number(raw) || null;
          } else {
            upd[field] = String(raw);
          }
        }
      }
      return upd;
    });
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const INPUT   = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
const SELECT  = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';
const LABEL   = 'block text-xs font-medium text-gray-500 mb-1';
const SECTION = 'text-xs font-semibold text-gray-400 uppercase tracking-wide pb-1 border-b border-gray-100 mb-3 mt-4 first:mt-0';

function XlvpEditModal({ vio, nhomLoi, penalties, onClose, onSave }) {
  const [form, setForm] = useState({ ...vio });
  const [saving, setSaving] = useState(false);
  const addToast = useStore((s) => s.addToast);

  const nhomLoiList   = [...new Set(nhomLoi.map((r) => r.violation).filter(Boolean))];
  const loiChiTietList = nhomLoi.filter((r) => r.violation === form.nhom_loi).map((r) => r.groupName);

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    const r = await api.updateXlvpFields(form.id, form);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); onSave(form); }
    else addToast(r.message, 'error');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-900">{vio.store} <span className="text-gray-400 font-normal">— {vio.sap}</span></p>
            <p className="text-xs text-gray-400">{vio.ngayKiemTra} · {vio.kstt} · {vio.nhom}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Context (read-only) */}
          {vio.mo_ta && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-xs text-gray-600 space-y-1">
              <p><span className="font-medium">Mô tả:</span> {vio.mo_ta}</p>
              {vio.nguyen_nhan && <p><span className="font-medium">Nguyên nhân:</span> {vio.nguyen_nhan}</p>}
            </div>
          )}

          {/* Trạng thái + Giá trị */}
          <p className={SECTION}>Ghi nhận</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Trạng thái</label>
              <select className={SELECT} value={form.trang_thai || ''} onChange={(e) => set('trang_thai', e.target.value)}>
                <option value="">-- Chọn --</option>
                {TRANG_THAI_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Giá trị (VNĐ)</label>
              <input type="number" className={INPUT} value={form.gia_tri ?? ''} min={0}
                onChange={(e) => set('gia_tri', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
          </div>

          {/* Nhân viên */}
          <p className={SECTION}>Nhân viên</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={LABEL}>Mã NV</label>
              <input className={INPUT} value={form.ma_nv || ''} onChange={(e) => set('ma_nv', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Tên NV</label>
              <input className={INPUT} value={form.ten_nv || ''} onChange={(e) => set('ten_nv', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Chức danh</label>
              <input className={INPUT} value={form.chuc_danh || ''} onChange={(e) => set('chuc_danh', e.target.value)} />
            </div>
          </div>

          {/* Xử lý */}
          <p className={SECTION}>Xử lý vi phạm</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Nhóm lỗi</label>
                <select className={SELECT} value={form.nhom_loi || ''}
                  onChange={(e) => setForm((p) => ({ ...p, nhom_loi: e.target.value, loi_chi_tiet: '' }))}>
                  <option value="">-- Chọn --</option>
                  {nhomLoiList.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Lỗi chi tiết</label>
                <select className={SELECT} value={form.loi_chi_tiet || ''} disabled={!form.nhom_loi}
                  onChange={(e) => set('loi_chi_tiet', e.target.value)}>
                  <option value="">{form.nhom_loi ? '-- Chọn --' : '-- Chọn nhóm lỗi trước --'}</option>
                  {loiChiTietList.map((g, i) => <option key={i} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Kết luận</label>
                <select className={SELECT} value={form.ket_luan || ''} onChange={(e) => set('ket_luan', e.target.value)}>
                  <option value="">-- Chọn --</option>
                  {KET_LUAN_OPTIONS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Hình thức XLVP</label>
                <select className={SELECT} value={form.xlvp || ''} onChange={(e) => set('xlvp', e.target.value)}>
                  <option value="">-- Chọn --</option>
                  {penalties.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Nội dung kết luận</label>
              <textarea rows={3} className={INPUT + ' resize-none'} value={form.nd_ket_luan || ''}
                onChange={(e) => set('nd_ket_luan', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded text-gray-600 hover:bg-gray-50">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-60">
            <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload result modal ───────────────────────────────────────────────────────
function UploadResult({ result, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Kết quả cập nhật</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className={`rounded-lg px-4 py-3 text-sm mb-3 ${result.success ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {result.success
            ? `Đã cập nhật thành công ${result.count} dòng.`
            : `Cập nhật ${result.count}/${result.count + result.errors.length} dòng. ${result.errors.length} lỗi.`}
        </div>
        {result.errors?.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600">ID {e.id}: {e.message}</p>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const XlvpReport = () => {
  const store    = useStore((s) => s.data);
  const addToast = useStore((s) => s.addToast);
  const { leadXlvp } = store.user || {};
  const penalties = store.setup?.penalties || [];

  const [startDate, setStart] = useState(thisMonthStart());
  const [endDate,   setEnd]   = useState(todayStr());
  const [violations, setViolations] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterTT,   setFilterTT]   = useState('');
  const [editing,    setEditing]    = useState(null);
  const [nhomLoi,    setNhomLoi]    = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef(null);

  // Load nhomLoi once
  useEffect(() => {
    supabase.from('nhom_loi').select('id,violation,groupName').order('violation').order('id')
      .then(({ data }) => { if (data) setNhomLoi(data); });
  }, []);

  const fetchData = async (s = startDate, e = endDate) => {
    setLoading(true);
    const r = await api.getXlvpReport({ startDate: s, endDate: e });
    if (r.success) setViolations(r.data);
    else addToast(r.message, 'error');
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const applyFilter = () => fetchData(startDate, endDate);

  const applyQuick = (months) => {
    const d = new Date();
    let s, e;
    if (months === 0) {
      s = thisMonthStart(); e = todayStr();
    } else {
      const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
      const last  = new Date(d.getFullYear(), d.getMonth() + months + 1, 0);
      const fmt = (x) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      s = fmt(first); e = fmt(last);
    }
    setStart(s); setEnd(e); fetchData(s, e);
  };

  // Filtered rows
  const q = search.toLowerCase();
  const displayed = violations.filter((v) => {
    if (filterTT && v.trang_thai !== filterTT) return false;
    if (!q) return true;
    return (v.sap || '').toLowerCase().includes(q)
      || (v.store || '').toLowerCase().includes(q)
      || (v.kstt || '').toLowerCase().includes(q)
      || (v.ten_nv || '').toLowerCase().includes(q)
      || (v.nhom || '').toLowerCase().includes(q);
  });

  // Stats
  const totalVP   = violations.filter((v) => v.trang_thai === 'Vi phạm').length;
  const doneXlvp  = violations.filter((v) => v.ket_luan && v.ket_luan !== '').length;
  const pendingXlvp = violations.filter((v) => v.trang_thai === 'Vi phạm' && !v.ket_luan).length;

  // Save edit
  const handleSaved = (updated) => {
    setViolations((prev) => prev.map((v) => v.id === updated.id ? { ...v, ...updated } : v));
    setEditing(null);
  };

  // Upload
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const xlsxRows  = await parseXlsxFile(file);
      const updateRows = buildUpdateRows(xlsxRows);
      if (updateRows.length === 0) { addToast('Không tìm thấy cột ID hợp lệ trong file', 'error'); setUploading(false); return; }
      const result = await api.bulkUpdateXlvp(updateRows);
      setUploadResult(result);
      if (result.count > 0) fetchData();
    } catch {
      addToast('Đọc file thất bại', 'error');
    }
    setUploading(false);
  };

  if (!leadXlvp) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button onClick={applyFilter}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Xem
          </button>
          <div className="flex gap-2">
            <button onClick={() => applyQuick(0)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Tháng này</button>
            <button onClick={() => applyQuick(-1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Tháng trước</button>
          </div>

          {/* Actions */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => downloadXlsx(displayed, startDate, endDate)}
              disabled={displayed.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              <Download size={14} /> Tải Excel
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60">
              <Upload size={14} /> {uploading ? 'Đang upload...' : 'Upload Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadFile} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng vi phạm',   value: violations.length },
          { label: 'Vi phạm',         value: totalVP,    color: 'text-red-600' },
          { label: 'Chờ xử lý',       value: pendingXlvp, color: 'text-orange-500' },
          { label: 'Đã kết luận',     value: doneXlvp,   color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Table header row */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-100">
          <FileCheck size={16} className="text-indigo-500 shrink-0" />
          <h2 className="text-sm font-bold text-gray-900">Danh sách XLVP</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã CH, cửa hàng, KSTT, nhân viên..."
            className="ml-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
          <select value={filterTT} onChange={(e) => setFilterTT(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">-- Tất cả trạng thái --</option>
            {TRANG_THAI_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-auto text-xs text-gray-400">{displayed.length} kết quả</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
        ) : displayed.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Không có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Ngày KT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Mã CH</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tên CH</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">KSTT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm VP</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Nhân viên</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Nhóm lỗi</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">XLVP</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Kết luận</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{v.ngayKiemTra}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">{v.sap}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-[160px] truncate">{v.store}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{v.kstt}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{v.nhom}</td>
                    <td className="px-3 py-2">
                      {v.trang_thai && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${TRANG_THAI_COLOR[v.trang_thai] || 'bg-gray-100 text-gray-600'}`}>
                          {v.trang_thai}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{[v.ten_nv, v.chuc_danh].filter(Boolean).join(' · ')}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{v.nhom_loi}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{v.xlvp}</td>
                    <td className="px-3 py-2">
                      {v.ket_luan && (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded whitespace-nowrap">{v.ket_luan}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => setEditing(v)}
                        className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <XlvpEditModal
          vio={editing}
          nhomLoi={nhomLoi}
          penalties={penalties}
          onClose={() => setEditing(null)}
          onSave={handleSaved}
        />
      )}

      {uploadResult && (
        <UploadResult result={uploadResult} onClose={() => setUploadResult(null)} />
      )}
    </div>
  );
};

export default XlvpReport;
