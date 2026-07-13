import React, { useEffect, useState } from 'react';
import { BarChart2, ChevronDown, ChevronRight, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api';
import useStore from '../../store/useStore';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const thisMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return { start: `${y}-${m}-01`, end: todayStr() };
};

const prevMonth = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last  = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  return { start: fmt(first), end: fmt(last) };
};

// ─── XLSX export ──────────────────────────────────────────────────────────────
const XLSX_COLS = [
  ['Ngày KT',      (i) => i.ngayKiemTra],
  ['Mã CH',        (i) => i.sap],
  ['Tên CH',       (i) => i.store],
  ['Chuỗi',        (i) => i.chain],
  ['QLKV',         (i) => i.qlkv],
  ['GĐV',          (i) => i.gdv],
  ['KSTT',         (i) => i.kstt],
  ['Thu tin',      (i) => i.batCapVH],
  ['Nhóm VP',      (_, v) => v?.nhom],
  ['Hành vi',      (_, v) => Array.isArray(v?.hanh_vi) ? v.hanh_vi.join(', ') : (v?.hanh_vi || '')],
  ['Mô tả',        (_, v) => v?.mo_ta],
  ['Nguyên nhân',  (_, v) => v?.nguyen_nhan],
  ['Trạng thái',   (_, v) => v?.trang_thai],
  ['Giá trị',      (_, v) => v?.gia_tri],
  ['Mã NV',        (_, v) => v?.ma_nv],
  ['Tên NV',       (_, v) => v?.ten_nv],
  ['Chức danh',    (_, v) => v?.chuc_danh],
  ['Kết luận',     (_, v) => v?.ket_luan],
  ['Nhóm lỗi',     (_, v) => v?.nhom_loi],
  ['Lỗi chi tiết', (_, v) => v?.loi_chi_tiet],
  ['XLVP',         (_, v) => v?.xlvp],
  ['Nội dung KL',  (_, v) => v?.nd_ket_luan],
];

function buildXlsxRows(inspections) {
  const rows = [];
  inspections.forEach((insp) => {
    const vios = insp.violations || [];
    if (vios.length === 0) {
      const row = {};
      XLSX_COLS.forEach(([h, fn]) => { row[h] = fn(insp, null) ?? ''; });
      rows.push(row);
    } else {
      vios.forEach((v) => {
        const row = {};
        XLSX_COLS.forEach(([h, fn]) => { row[h] = fn(insp, v) ?? ''; });
        rows.push(row);
      });
    }
  });
  return rows;
}

function downloadXlsx(inspections, start, end) {
  const rows = buildXlsxRows(inspections);
  const ws = XLSX.utils.json_to_sheet(rows);
  // column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ghi nhận VP');
  XLSX.writeFile(wb, `GhiNhanVP_${start}_${end}.xlsx`);
}

// ─── Components ───────────────────────────────────────────────────────────────
const TRANG_THAI_COLOR = {
  'Vi phạm':             'bg-red-100 text-red-700',
  'Nhắc nhở':            'bg-orange-100 text-orange-700',
  'Xác minh thêm':       'bg-yellow-100 text-yellow-700',
  'Ghi nhận thực trạng': 'bg-gray-100 text-gray-600',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function InspectionRow({ insp, showKstt }) {
  const [open, setOpen] = useState(false);
  const vios = insp.violations || [];
  const nhomSet = [...new Set(vios.map((v) => v.nhom).filter(Boolean))];

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => vios.length > 0 && setOpen((p) => !p)}
      >
        <td className="px-3 py-2.5 w-6">
          {vios.length > 0 ? (
            open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
          ) : <span className="w-3.5 inline-block" />}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{insp.ngayKiemTra}</td>
        {showKstt && <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{insp.kstt}</td>}
        <td className="px-3 py-2.5 text-xs font-medium text-gray-800 whitespace-nowrap">{insp.sap}</td>
        <td className="px-3 py-2.5 text-xs text-gray-700">{insp.store}</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {nhomSet.map((n) => (
              <span key={n} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{n}</span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5 text-center">
          {vios.length > 0 && (
            <span className="text-xs font-semibold text-indigo-600">{vios.length}</span>
          )}
        </td>
      </tr>

      {open && vios.map((v) => (
        <tr key={v.id} className="bg-indigo-50/40 border-l-2 border-indigo-300">
          <td />
          <td colSpan={showKstt ? 6 : 5} className="px-4 py-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
              <span className="text-gray-500 font-medium">Nhóm</span>
              <span>{v.nhom}</span>
              {v.hanh_vi?.length > 0 && (
                <>
                  <span className="text-gray-500 font-medium">Hành vi</span>
                  <span>{(Array.isArray(v.hanh_vi) ? v.hanh_vi : []).join(', ')}</span>
                </>
              )}
              {v.mo_ta && (
                <>
                  <span className="text-gray-500 font-medium">Mô tả</span>
                  <span>{v.mo_ta}</span>
                </>
              )}
              {v.nguyen_nhan && (
                <>
                  <span className="text-gray-500 font-medium">Nguyên nhân</span>
                  <span>{v.nguyen_nhan}</span>
                </>
              )}
              {v.trang_thai && (
                <>
                  <span className="text-gray-500 font-medium">Trạng thái</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${TRANG_THAI_COLOR[v.trang_thai] || 'bg-gray-100 text-gray-600'}`}>
                    {v.trang_thai}
                  </span>
                </>
              )}
              {(v.ten_nv || v.ma_nv) && (
                <>
                  <span className="text-gray-500 font-medium">Nhân viên</span>
                  <span>{[v.ma_nv, v.ten_nv, v.chuc_danh].filter(Boolean).join(' — ')}</span>
                </>
              )}
              {v.xlvp && (
                <>
                  <span className="text-gray-500 font-medium">XLVP</span>
                  <span>{v.xlvp}</span>
                </>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const ViolationReport = () => {
  const store = useStore((s) => s.data);
  const { role, name: userName } = store.user || {};
  const emps = store.emps || [];
  const showKstt = role === 'hod' || role === 'director';

  const init = thisMonth();
  const [startDate, setStartDate] = useState(init.start);
  const [endDate,   setEndDate]   = useState(init.end);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const fetch = async (s, e) => {
    setLoading(true); setError('');
    const r = await api.getInspectionsForReport({ startDate: s, endDate: e, role, userName, emps });
    if (r.success) setInspections(r.data);
    else setError(r.message);
    setLoading(false);
  };

  useEffect(() => { fetch(startDate, endDate); }, []);

  const applyRange = (s, e) => { setStartDate(s); setEndDate(e); fetch(s, e); };
  const applyThisMonth  = () => { const r = thisMonth();  applyRange(r.start, r.end); };
  const applyPrevMonth  = () => { const r = prevMonth();  applyRange(r.start, r.end); };
  const applyCustom     = () => fetch(startDate, endDate);

  const totalViolations = inspections.reduce((s, i) => s + (i.violations?.length || 0), 0);
  const uniqueStores    = new Set(inspections.map((i) => i.sap).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={applyCustom}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Xem
          </button>
          <div className="flex gap-2 ml-2">
            <button onClick={applyThisMonth}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Tháng này
            </button>
            <button onClick={applyPrevMonth}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Tháng trước
            </button>
          </div>
          <button
            onClick={() => downloadXlsx(inspections, startDate, endDate)}
            disabled={inspections.length === 0}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={15} /> Tải XLSX
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Ghi nhận" value={inspections.length} sub={`${startDate} → ${endDate}`} />
        <StatCard label="Vi phạm"  value={totalViolations} />
        <StatCard label="Cửa hàng" value={uniqueStores} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <BarChart2 size={18} className="text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900">Danh sách ghi nhận</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
        ) : inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Không có dữ liệu trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  <th className="w-6" />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ngày KT</th>
                  {showKstt && <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">KSTT</th>}
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã CH</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên CH</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nhóm vi phạm</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"># VP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspections.map((insp) => (
                  <InspectionRow key={insp.id} insp={insp} showKstt={showKstt} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViolationReport;
