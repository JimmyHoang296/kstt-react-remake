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

const NHOM_SHORT = {
  'Gian lận trục lợi':    'GL Trục lợi',
  'Gian lận bán hàng':    'GL Bán hàng',
  'Gian lận báo cáo':     'GL Báo cáo',
  'Sai phạm chấm công':   'SP Chấm công',
  'Sai phạm QT/QĐ':       'SP QT/QĐ',
  'Sai sót nghiệp vụ':    'SS Nghiệp vụ',
  'Liên đới trách nhiệm': 'LD Trách nhiệm',
  'Tồn đọng về hàng hóa': 'TĐ Hàng hóa',
  'Sai phạm khác':        'SP Khác',
};

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

const INSPECTION_TRANG_THAI_OPTIONS = ['Đang làm rõ', 'Đã hoàn thành'];
const INSPECTION_TRANG_THAI_COLOR = {
  'Đang làm rõ':  'bg-purple-100 text-purple-700',
  'Đã hoàn thành':'bg-green-100 text-green-700',
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

function KsttMultiSelect({ ksttList, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  const toggle = (k) => onChange(selected.includes(k) ? selected.filter((n) => n !== k) : [...selected, k]);
  const label = selected.length === 0 ? 'Tất cả KSTT' : `${selected.length} KSTT`;
  const visible = search.trim()
    ? ksttList.filter((k) => k.toLowerCase().includes(search.toLowerCase()))
    : ksttList;

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
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[210px]">
          <div className="px-2 pt-2 pb-1.5 border-b border-gray-100">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm KSTT..."
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {visible.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy</p>}
            {visible.map((k) => (
              <label key={k} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={selected.includes(k)} onChange={() => toggle(k)} className="accent-indigo-600" />
                {k}
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button onClick={() => onChange([])} className="text-xs text-indigo-600 hover:text-indigo-800">Xóa bộ lọc</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KsttStatsTable({ inspections, ksttHodMap }) {
  const byKstt = {};
  inspections.forEach((insp) => {
    const kstt = insp.kstt || '—';
    if (!byKstt[kstt]) byKstt[kstt] = { luotGN: 0, stores: new Set(), byNhom: {} };
    byKstt[kstt].luotGN++;
    if (insp.sap) byKstt[kstt].stores.add(insp.sap);
    (insp.violations || []).forEach((v) => {
      if (v.nhom) byKstt[kstt].byNhom[v.nhom] = (byKstt[kstt].byNhom[v.nhom] || 0) + 1;
    });
  });

  if (Object.keys(byKstt).length === 0) return null;

  const byHod = {};
  Object.entries(byKstt).forEach(([kstt, s]) => {
    const hod = ksttHodMap[kstt] || '—';
    if (!byHod[hod]) byHod[hod] = [];
    byHod[hod].push({ kstt, luotGN: s.luotGN, storeCount: s.stores.size, byNhom: s.byNhom });
  });

  const hodEntries = Object.entries(byHod).sort(([a], [b]) => a.localeCompare(b, 'vi'));
  hodEntries.forEach(([, list]) => list.sort((a, b) => a.kstt.localeCompare(b.kstt, 'vi')));

  const totalCols = 2 + S2_NHOM.length;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <BarChart2 size={16} className="text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-900">Thống kê theo KSTT</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10">KSTT</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Lượt GN</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">CH</th>
              {S2_NHOM.map((g) => (
                <th key={g.nhom} title={g.nhom} className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {NHOM_SHORT[g.nhom] || g.nhom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {hodEntries.map(([hod, list]) => {
              const tot = list.reduce((acc, k) => {
                acc.luotGN += k.luotGN;
                acc.storeCount += k.storeCount;
                S2_NHOM.forEach((g) => { acc.byNhom[g.nhom] = (acc.byNhom[g.nhom] || 0) + (k.byNhom[g.nhom] || 0); });
                return acc;
              }, { luotGN: 0, storeCount: 0, byNhom: {} });
              return (
                <React.Fragment key={hod}>
                  <tr className="bg-indigo-50/50">
                    <td colSpan={totalCols} className="px-4 py-1.5 font-semibold text-indigo-700 sticky left-0 bg-indigo-50/50">
                      {hod}
                      <span className="ml-2 font-normal text-indigo-400">
                        {tot.luotGN} lượt · {tot.storeCount} CH
                      </span>
                    </td>
                  </tr>
                  {list.map((k) => (
                    <tr key={k.kstt} className="hover:bg-gray-50">
                      <td className="px-4 py-2 pl-8 text-gray-700 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50">{k.kstt}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.luotGN}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.storeCount}</td>
                      {S2_NHOM.map((g) => {
                        const cnt = k.byNhom[g.nhom] || 0;
                        return (
                          <td key={g.nhom} className="px-3 py-2 text-right tabular-nums">
                            <span className={cnt > 0 ? 'font-semibold text-red-600' : 'text-gray-200'}>{cnt > 0 ? cnt : '—'}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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
        <td className="px-3 py-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${INSPECTION_TRANG_THAI_COLOR[insp.trang_thai] || 'bg-purple-100 text-purple-700'}`}>
            {insp.trang_thai || 'Đang làm rõ'}
          </span>
        </td>
      </tr>

      {open && vios.map((v) => (
        <tr key={v.id} className="bg-indigo-50/40 border-l-2 border-indigo-300">
          <td />
          <td colSpan={showKstt ? 7 : 6} className="px-4 py-2">
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
  const [selectedKstt, setSelectedKstt] = useState([]);
  const [selectedTrangThai, setSelectedTrangThai] = useState('');
  const [ksttHodMap, setKsttHodMap] = useState({});
  const [activeTab, setActiveTab] = useState('ch');

  const fetch = async (s, e) => {
    setLoading(true); setError('');
    const r = await api.getInspectionsForReport({ startDate: s, endDate: e, role, userName, emps, leadGhiNhan });
    if (r.success) setInspections(r.data);
    else setError(r.message);
    setLoading(false);
  };

  useEffect(() => { fetch(startDate, endDate); }, []);

  useEffect(() => {
    if (!showKstt) return;
    api.getKsttHodMap().then((r) => { if (r.success) setKsttHodMap(r.data); });
  }, [showKstt]);

  const applyRange = (s, e) => { setStartDate(s); setEndDate(e); fetch(s, e); };
  const applyThisMonth  = () => { const r = thisMonth();  applyRange(r.start, r.end); };
  const applyPrevMonth  = () => { const r = prevMonth();  applyRange(r.start, r.end); };
  const applyCustom     = () => fetch(startDate, endDate);

  const ksttList = useMemo(
    () => [...new Set(inspections.map((i) => i.kstt).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')),
    [inspections]
  );

  const filtered = useMemo(() => {
    let r = inspections;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      r = r.filter((i) => (i.sap || '').toLowerCase().includes(q) || (i.store || '').toLowerCase().includes(q));
    }
    if (selectedNhom.length > 0) {
      r = r.filter((i) => (i.violations || []).some((v) => selectedNhom.includes(v.nhom)));
    }
    if (selectedKstt.length > 0) {
      r = r.filter((i) => selectedKstt.includes(i.kstt));
    }
    if (selectedTrangThai) {
      r = r.filter((i) => i.trang_thai === selectedTrangThai);
    }
    return r;
  }, [inspections, searchText, selectedNhom, selectedKstt, selectedTrangThai]);

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
          {showKstt && <KsttMultiSelect ksttList={ksttList} selected={selectedKstt} onChange={setSelectedKstt} />}
          <div>
            <select
              value={selectedTrangThai}
              onChange={(e) => setSelectedTrangThai(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tất cả trạng thái</option>
              {INSPECTION_TRANG_THAI_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(searchText || selectedNhom.length > 0 || selectedKstt.length > 0 || selectedTrangThai) && (
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

      {/* Stats — always visible */}
      <div className="grid grid-cols-[minmax(130px,160px)_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <StatCard label="Cửa hàng" value={uniqueStores} sub={`${filtered.length} lượt GN`} />
        </div>
        <NhomBreakdownCard inspections={filtered} />
      </div>

      {/* Tab selector — only for hod/director/leadGhiNhan */}
      {showKstt && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('ch')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'ch' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Theo cửa hàng
          </button>
          <button
            onClick={() => setActiveTab('kstt')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'kstt' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Theo KSTT
          </button>
        </div>
      )}

      {/* Tab: Theo cửa hàng */}
      {(!showKstt || activeTab === 'ch') && (
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
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Trạng thái SV</th>
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
      )}

      {/* Tab: Theo KSTT */}
      {showKstt && activeTab === 'kstt' && (
        loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
        ) : (
          <KsttStatsTable inspections={filtered} ksttHodMap={ksttHodMap} />
        )
      )}
    </div>
  );
};

export default ViolationReport;
