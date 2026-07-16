import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, ChevronDown, ChevronRight, Download, FileText, Search, X } from 'lucide-react';
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

const S2_BASE = ['Ngày KT', 'Mã CH', 'Tên CH', 'Chuỗi', 'QLKV', 'GĐV', 'KSTT', 'Thu tin', 'Số GN'];
const S2_BASE_W = [12, 8, 28, 8, 14, 14, 16, 20, 6];
const S2_NHOM = [
  { nhom: 'Gian lận trục lợi',     hasGiaTri: true },
  { nhom: 'Gian lận bán hàng',     hasGiaTri: true },
  { nhom: 'Gian lận báo cáo',      hasGiaTri: true },
  { nhom: 'Sai phạm chấm công',    hasGiaTri: false },
  { nhom: 'Sai phạm QT/QĐ',        hasGiaTri: false },
  { nhom: 'Sai sót nghiệp vụ',     hasGiaTri: false },
  { nhom: 'Liên đới trách nhiệm',  hasGiaTri: false },
  { nhom: 'Tồn đọng về hàng hóa',  hasGiaTri: false },
  { nhom: 'Sai phạm khác',          hasGiaTri: false },
];

function buildSheet2Aoa(inspections) {
  // Build col start index for each nhom group
  const colStart = {};
  let col = S2_BASE.length;
  S2_NHOM.forEach((g) => { colStart[g.nhom] = col; col += g.hasGiaTri ? 3 : 2; });
  const totalCols = col;

  // Header row 1: base names + group names (merged horizontally)
  // Header row 2: empty for base (merged vertically) + sub-column names
  const h1 = Array(totalCols).fill('');
  const h2 = Array(totalCols).fill('');
  S2_BASE.forEach((name, i) => { h1[i] = name; });

  const merges = [];
  S2_BASE.forEach((_, i) => merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } }));

  S2_NHOM.forEach((g) => {
    const sc = colStart[g.nhom];
    const span = g.hasGiaTri ? 3 : 2;
    h1[sc] = g.nhom;
    if (span > 1) merges.push({ s: { r: 0, c: sc }, e: { r: 0, c: sc + span - 1 } });
    h2[sc]     = 'Trạng thái';
    h2[sc + 1] = 'Nội dung';
    if (g.hasGiaTri) h2[sc + 2] = 'Giá trị';
  });

  const dataRows = inspections.map((insp) => {
    const byNhom = {};
    (insp.violations || []).forEach((v) => {
      if (!v.nhom) return;
      (byNhom[v.nhom] = byNhom[v.nhom] || []).push(v);
    });

    const row = Array(totalCols).fill('');
    [insp.ngayKiemTra, insp.sap, insp.store, insp.chain, insp.qlkv, insp.gdv,
      insp.kstt, insp.batCapVH, (insp.violations || []).length].forEach((v, i) => { row[i] = v ?? ''; });

    S2_NHOM.forEach((g) => {
      const sc = colStart[g.nhom];
      const vios = byNhom[g.nhom] || [];
      if (!vios.length) return;
      row[sc]     = vios.map((v) => v.trang_thai).filter(Boolean).join(' | ');
      row[sc + 1] = vios.map((v) => [v.mo_ta, v.nguyen_nhan].filter(Boolean).join(' - ')).filter(Boolean).join(' | ');
      if (g.hasGiaTri) row[sc + 2] = vios.map((v) => v.gia_tri).filter(Boolean).join(' | ');
    });

    return row;
  });

  const colWidths = [
    ...S2_BASE_W.map((w) => ({ wch: w })),
    ...S2_NHOM.flatMap((g) => [{ wch: 14 }, { wch: 45 }, ...(g.hasGiaTri ? [{ wch: 12 }] : [])]),
  ];

  return { aoa: [h1, h2, ...dataRows], merges, colWidths };
}

function downloadXlsx(inspections, start, end) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Chi tiết
  const detail = buildXlsxRows(inspections);
  const ws1 = XLSX.utils.json_to_sheet(detail);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết');

  // Sheet 2 — Theo site
  const { aoa, merges, colWidths } = buildSheet2Aoa(inspections);
  const ws2 = XLSX.utils.aoa_to_sheet(aoa);
  ws2['!merges'] = merges;
  ws2['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws2, 'Theo site');

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

function NhomBreakdownCard({ inspections }) {
  const counts = Object.fromEntries(S2_NHOM.map((g) => [g.nhom, 0]));
  inspections.forEach((insp) => {
    (insp.violations || []).forEach((v) => {
      if (v.nhom && v.nhom in counts) counts[v.nhom]++;
    });
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm flex gap-5 items-center">
      <div className="shrink-0 border-r border-gray-100 pr-5">
        <p className="text-xs text-gray-500 mb-1">Ghi nhận</p>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-400 mt-0.5">vi phạm</p>
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-1 flex-1">
        {S2_NHOM.map((g) => (
          <div key={g.nhom} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{g.nhom}</span>
            <span className={`text-xs font-bold tabular-nums shrink-0 ${counts[g.nhom] > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {counts[g.nhom]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NhomMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (nhom) =>
    onChange(selected.includes(nhom) ? selected.filter((n) => n !== nhom) : [...selected, nhom]);

  const label = selected.length === 0 ? 'Tất cả nhóm' : `${selected.length} nhóm`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
      >
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[210px]">
          {S2_NHOM.map((g) => (
            <label key={g.nhom} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={selected.includes(g.nhom)} onChange={() => toggle(g.nhom)} className="accent-indigo-600" />
              {g.nhom}
            </label>
          ))}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
              <button onClick={() => onChange([])} className="text-xs text-indigo-600 hover:text-indigo-800">Xóa bộ lọc</button>
            </div>
          )}
        </div>
      )}
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
  const { role, name: userName, leadGhiNhan } = store.user || {};
  const emps = store.emps || [];
  const showKstt = role === 'hod' || role === 'director' || leadGhiNhan;

  const init = thisMonth();
  const [startDate, setStartDate] = useState(init.start);
  const [endDate,   setEndDate]   = useState(init.end);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [searchText, setSearchText]   = useState('');
  const [selectedNhom, setSelectedNhom] = useState([]);

  const fetch = async (s, e) => {
    setLoading(true); setError('');
    const r = await api.getInspectionsForReport({ startDate: s, endDate: e, role, userName, emps, leadGhiNhan });
    if (r.success) setInspections(r.data);
    else setError(r.message);
    setLoading(false);
  };

  useEffect(() => { fetch(startDate, endDate); }, []);

  const applyRange = (s, e) => { setStartDate(s); setEndDate(e); fetch(s, e); };
  const applyThisMonth  = () => { const r = thisMonth();  applyRange(r.start, r.end); };
  const applyPrevMonth  = () => { const r = prevMonth();  applyRange(r.start, r.end); };
  const applyCustom     = () => fetch(startDate, endDate);

  const filtered = useMemo(() => {
    let r = inspections;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      r = r.filter((i) => (i.sap || '').toLowerCase().includes(q) || (i.store || '').toLowerCase().includes(q));
    }
    if (selectedNhom.length > 0) {
      r = r.filter((i) => (i.violations || []).some((v) => selectedNhom.includes(v.nhom)));
    }
    return r;
  }, [inspections, searchText, selectedNhom]);

  const uniqueStores = new Set(filtered.map((i) => i.sap).filter(Boolean)).size;

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
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Mã CH / tên CH..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <NhomMultiSelect selected={selectedNhom} onChange={setSelectedNhom} />
          {(searchText || selectedNhom.length > 0) && (
            <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length}/{inspections.length}</span>
          )}
          <button
            onClick={() => downloadXlsx(filtered, startDate, endDate)}
            disabled={filtered.length === 0}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={15} /> Tải XLSX
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[minmax(130px,160px)_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <StatCard label="Cửa hàng" value={uniqueStores} sub={`${filtered.length} lượt GN`} />
        </div>
        <NhomBreakdownCard inspections={filtered} />
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{inspections.length === 0 ? 'Không có dữ liệu trong khoảng thời gian này' : 'Không có kết quả phù hợp'}</p>
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
                {filtered.map((insp) => (
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
