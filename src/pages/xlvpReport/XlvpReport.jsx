import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Download, Pencil, Save, Search, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api';
import useStore from '../../store/useStore';
import Pagination from '../../components/Pagination';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const daysAgo  = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
};
const thisMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const prevMonthRange = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last  = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (x) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  return { start: fmt(first), end: fmt(last) };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const BADGE = {
  'Đã trình':   'bg-green-100 text-green-700',
  'Chờ trình':  'bg-yellow-100 text-yellow-700',
  'Đang xử lý':'bg-blue-100 text-blue-700',
};
const STATUS_OPTS = ['Chờ trình', 'Đang xử lý', 'Đã trình'];
const INPUT  = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
const FINPUT = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
const LABEL  = 'block text-xs font-medium text-gray-500 mb-1';

// ─── Shared primitives ────────────────────────────────────────────────────────
const Th = ({ children, check }) => (
  <th className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${check ? 'w-8' : ''}`}>
    {children}
  </th>
);
const Td = ({ children, className = '' }) => (
  <td className={`px-3 py-2.5 text-xs text-gray-700 align-top ${className}`}>{children}</td>
);

function StatusBadge({ value }) {
  if (!value) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE[value] || 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  );
}

// ─── Filter helper ────────────────────────────────────────────────────────────
function applyFilter(rows, q) {
  const w = String(q.week || '').trim();
  const s = String(q.search || '').toLowerCase().trim();
  const st = q.status || '';
  return rows.filter((r) => {
    if (w && String(r.week || '') !== w) return false;
    if (st) {
      const statusVal = r.Note ?? r.status ?? '';
      if (statusVal !== st) return false;
    }
    if (s) {
      const hay = [r.sap, r.store, r.emp_name, r.kstt_submitted].join(' ').toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}

// ─── Excel helpers ─────────────────────────────────────────────────────────────
const WIDE = new Set(['clarificationDetail', 'violationText', 'disciplinaryAction', 'store']);
const MED  = new Set(['email', 'empId', 'empName', 'QLKV', 'GDV', 'GDVNote', 'disciplinaryGroup', 'Lỗi', 'NOTE', 'Note']);

const COLS_1 = [
  ['region',              (r) => r.region],
  ['week',                (r) => r.week],
  ['approvedDate',        (r) => r.approved_date],
  ['email',               (r) => r.email],
  ['ksttSubmitted',       (r) => r.kstt_submitted],
  ['ksttPIC',             (r) => r.kstt_pic],
  ['model',               (r) => r.model],
  ['sap',                 (r) => r.sap],
  ['store',               (r) => r.store],
  ['QLKV',                (r) => r.QLKV ?? r.qlkv],
  ['source',              (r) => r.source],
  ['empId',               (r) => r.emp_id],
  ['empName',             (r) => r.emp_name],
  ['empRank',             (r) => r.emp_rank],
  ['empTitle',            (r) => r.emp_title],
  ['clarificationDetail', (r) => r.clarification_detail],
  ['violationText',       (r) => r.violation_text],
  ['violationType',       (r) => r.violation_type],
  ['lossValue',           (r) => r.loss_value],
  ['recoverValue',        (r) => r.recover_value],
  ['GDV',                 (r) => r.GDV ?? r.gdv],
  ['GDVNote',             (r) => r.GDVNote ?? r.gdv_note],
  ['discoveryDate',       (r) => r.discovery_date],
  ['finishedDate',        (r) => r.finished_date],
  ['Note',                (r) => r.Note],
];
const COLS_K = [
  ['region',              (r) => r.region],
  ['week',                (r) => r.week],
  ['approvedDate',        (r) => r.approved_date],
  ['email',               (r) => r.email],
  ['ksttSubmitted',       (r) => r.kstt_submitted],
  ['ksttPIC',             (r) => r.kstt_pic],
  ['source',              (r) => r.source],
  ['model',               (r) => r.model],
  ['sap',                 (r) => r.sap],
  ['store',               (r) => r.store],
  ['empId',               (r) => r.emp_id],
  ['empName',             (r) => r.emp_name],
  ['empRank',             (r) => r.emp_rank],
  ['empTitle',            (r) => r.emp_title],
  ['violationText',       (r) => r.violation_text],
  ['disciplinaryGroup',   (r) => r.disciplinary_group],
  ['disciplinaryAction',  (r) => r.disciplinary_action],
  ['Lỗi',                 (r) => r.loi ?? r.Lỗi],
  ['status',              (r) => r.status],
  ['NOTE',                (r) => r.NOTE],
];

function makeSheet(rows, cols) {
  const data = rows.map((r) => {
    const obj = {};
    cols.forEach(([h, fn]) => { obj[h] = fn(r) ?? ''; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = cols.map(([h]) => ({ wch: WIDE.has(h) ? 48 : MED.has(h) ? 28 : 14 }));
  return ws;
}

function buildXlsxBoth(rows1, rowsK, filename) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows1, COLS_1), 'TH nhóm 1');
  XLSX.utils.book_append_sheet(wb, makeSheet(rowsK, COLS_K), 'TH nhóm khác');
  XLSX.writeFile(wb, filename);
}

const UPLOAD_MAP_1 = {
  'Tuần': 'week', 'Mã CH': 'sap', 'Tên CH': 'store', 'KSTT': 'kstt_submitted',
  'Nhân viên': 'emp_name', 'Chức danh': 'emp_title', 'Nội dung vi phạm': 'violation_text',
  'Giá trị': 'loss_value', 'Thu hồi': 'recover_value', 'Ghi chú': 'Note',
};
const UPLOAD_MAP_K = {
  'Tuần': 'week', 'Mã CH': 'sap', 'Tên CH': 'store', 'KSTT': 'kstt_submitted',
  'Nhân viên': 'emp_name', 'Chức danh': 'emp_title', 'Nội dung vi phạm': 'violation_text',
  'Hình thức XLVP': 'disciplinary_action', 'Trạng thái': 'status', 'Ghi chú': 'NOTE',
};
const NUM_FIELDS_1 = new Set(['loss_value', 'recover_value']);

function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function buildUpdateRows(xlsxRows, map, numFields = new Set()) {
  return xlsxRows.filter((r) => r['ID']).map((r) => {
    const upd = { id: r['ID'] };
    for (const [col, field] of Object.entries(map)) {
      if (!(col in r)) continue;
      const raw = r[col];
      if (raw === '' || raw === null || raw === undefined) { upd[field] = null; }
      else if (numFields.has(field)) { upd[field] = Number(raw) || null; }
      else { upd[field] = String(raw); }
    }
    return upd;
  });
}

// ─── Edit modals ──────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, onSave, saving, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded text-gray-600 hover:bg-gray-50">Hủy</button>
          <button onClick={onSave} disabled={saving}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-60">
            <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommonFields({ form, set }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={LABEL}>Tuần</label>
          <input className={FINPUT} value={form.week || ''} onChange={(e) => set('week', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Mã CH</label>
          <input className={FINPUT} value={form.sap || ''} onChange={(e) => set('sap', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>KSTT</label>
          <input className={FINPUT} value={form.kstt_submitted || ''} onChange={(e) => set('kstt_submitted', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Tên CH</label>
        <input className={FINPUT} value={form.store || ''} onChange={(e) => set('store', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Nhân viên</label>
          <input className={FINPUT} value={form.emp_name || ''} onChange={(e) => set('emp_name', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Chức danh</label>
          <input className={FINPUT} value={form.emp_title || ''} onChange={(e) => set('emp_title', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Nội dung vi phạm</label>
        <textarea rows={3} className={FINPUT + ' resize-none'} value={form.violation_text || ''}
          onChange={(e) => set('violation_text', e.target.value)} />
      </div>
    </>
  );
}

function EditNhom1Modal({ row, onClose, onSave }) {
  const [form, setForm] = useState({ ...row });
  const [saving, setSaving] = useState(false);
  const addToast = useStore((s) => s.addToast);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { id, ...fields } = form;
    const r = await api.updateThNhom1(id, fields);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); onSave(form); }
    else addToast(r.message, 'error');
  };

  return (
    <ModalShell title="Sửa — Nhóm 1" onClose={onClose} onSave={save} saving={saving}>
      <CommonFields form={form} set={set} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Giá trị (VNĐ)</label>
          <input type="number" className={FINPUT} value={form.loss_value ?? ''} min={0}
            onChange={(e) => set('loss_value', e.target.value === '' ? null : Number(e.target.value))} />
        </div>
        <div>
          <label className={LABEL}>Thu hồi (VNĐ)</label>
          <input type="number" className={FINPUT} value={form.recover_value ?? ''} min={0}
            onChange={(e) => set('recover_value', e.target.value === '' ? null : Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Ghi chú (trạng thái)</label>
        <select className={FINPUT + ' bg-white'} value={form.Note || ''}
          onChange={(e) => set('Note', e.target.value)}>
          <option value="">-- Chọn --</option>
          {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </ModalShell>
  );
}

function EditNhomKhacModal({ row, onClose, onSave }) {
  const [form, setForm] = useState({ ...row });
  const [saving, setSaving] = useState(false);
  const addToast = useStore((s) => s.addToast);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { id, ...fields } = form;
    const r = await api.updateThNhomKhac(id, fields);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); onSave(form); }
    else addToast(r.message, 'error');
  };

  return (
    <ModalShell title="Sửa — Nhóm Khác" onClose={onClose} onSave={save} saving={saving}>
      <CommonFields form={form} set={set} />
      <div>
        <label className={LABEL}>Hình thức XLVP</label>
        <textarea rows={2} className={FINPUT + ' resize-none'} value={form.disciplinary_action || ''}
          onChange={(e) => set('disciplinary_action', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Trạng thái</label>
          <select className={FINPUT + ' bg-white'} value={form.status || ''}
            onChange={(e) => set('status', e.target.value)}>
            <option value="">-- Chọn --</option>
            {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Ghi chú</label>
          <input className={FINPUT} value={form.NOTE || ''} onChange={(e) => set('NOTE', e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Upload result ─────────────────────────────────────────────────────────────
function UploadResult({ result, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Kết quả upload</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>
        <p className={`text-sm rounded-lg px-3 py-2 mb-2 ${result.success ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {result.success
            ? `Đã cập nhật ${result.count} dòng thành công.`
            : `Cập nhật ${result.count}/${result.count + result.errors.length} dòng. ${result.errors.length} lỗi.`}
        </p>
        {result.errors?.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">ID {e.id}: {e.message}</p>)}
          </div>
        )}
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Table components ──────────────────────────────────────────────────────────
function Nhom1Table({ rows, selected, onToggle, onToggleAll, onEdit }) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selected.has(r.id));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            <Th check>
              <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={() => onToggleAll(rows)} className="rounded" />
            </Th>
            <Th>KSTT</Th><Th>Tuần</Th><Th>Mã CH</Th><Th>Tên CH</Th>
            <Th>Nhân viên</Th><Th>Chức danh</Th><Th>Nội dung vi phạm</Th>
            <Th>Giá trị</Th><Th>Thu hồi</Th><Th>Ghi chú</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className={`hover:bg-gray-50 ${selected.has(r.id) ? 'bg-indigo-50/60' : ''}`}>
              <Td>
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} className="rounded" />
              </Td>
              <Td>{r.kstt_submitted}</Td>
              <Td>{r.week}</Td>
              <Td className="font-medium">{r.sap}</Td>
              <Td>{r.store}</Td>
              <Td>{r.emp_name}</Td>
              <Td>{r.emp_title}</Td>
              <Td className="max-w-xs"><p className="line-clamp-2">{r.violation_text}</p></Td>
              <Td className="text-right whitespace-nowrap">{r.loss_value != null ? r.loss_value.toLocaleString() + ' đ' : ''}</Td>
              <Td className="text-right whitespace-nowrap">{r.recover_value != null ? r.recover_value.toLocaleString() + ' đ' : ''}</Td>
              <Td><StatusBadge value={r.Note} /></Td>
              <Td>
                <button onClick={() => onEdit(r)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Pencil size={13} /></button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NhomKhacTable({ rows, selected, onToggle, onToggleAll, onEdit }) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selected.has(r.id));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            <Th check>
              <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={() => onToggleAll(rows)} className="rounded" />
            </Th>
            <Th>KSTT</Th><Th>Tuần</Th><Th>Mã CH</Th><Th>Tên CH</Th>
            <Th>Nhân viên</Th><Th>Chức danh</Th><Th>Nội dung vi phạm</Th>
            <Th>Hình thức XLVP</Th><Th>Trạng thái</Th><Th>Ghi chú</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className={`hover:bg-gray-50 ${selected.has(r.id) ? 'bg-indigo-50/60' : ''}`}>
              <Td>
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} className="rounded" />
              </Td>
              <Td>{r.kstt_submitted}</Td>
              <Td>{r.week}</Td>
              <Td className="font-medium">{r.sap}</Td>
              <Td>{r.store}</Td>
              <Td>{r.emp_name}</Td>
              <Td>{r.emp_title}</Td>
              <Td className="max-w-xs"><p className="line-clamp-2">{r.violation_text}</p></Td>
              <Td className="max-w-[150px]"><p className="line-clamp-2">{r.disciplinary_action}</p></Td>
              <Td><StatusBadge value={r.status} /></Td>
              <Td>{r.NOTE}</Td>
              <Td>
                <button onClick={() => onEdit(r)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Pencil size={13} /></button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const XlvpReport = () => {
  const { leadXlvp } = useStore((s) => s.data.user) || {};
  const addToast = useStore((s) => s.addToast);
  const refreshKey = useStore((s) => s.refreshKey);

  const [startDate, setStart] = useState(daysAgo(60));
  const [endDate,   setEnd]   = useState(todayStr());
  const [rows1,    setRows1]    = useState([]);
  const [rowsK,    setRowsK]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState('nhom1');
  const [q,        setQ]        = useState({ week: '', search: '', status: '' });
  const [page1,    setPage1]    = useState(1);
  const [pageK,    setPageK]    = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [editing,  setEditing]  = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async (s = startDate, e = endDate) => {
    setLoading(true);
    const [r1, rk] = await Promise.all([
      api.getAllThNhom1({ startDate: s, endDate: e }),
      api.getAllThNhomKhac({ startDate: s, endDate: e }),
    ]);
    if (r1.success) setRows1(r1.data); else addToast(r1.message, 'error');
    if (rk.success) setRowsK(rk.data); else addToast(rk.message, 'error');
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyRange = (s, e) => { setStart(s); setEnd(e); load(s, e); setPage1(1); setPageK(1); setSelected(new Set()); };
  const applyCustom = () => { load(startDate, endDate); setPage1(1); setPageK(1); setSelected(new Set()); };

  const QUICK_BTNS = [
    { label: '30 ngày',     fn: () => applyRange(daysAgo(30), todayStr()) },
    { label: '60 ngày',     fn: () => applyRange(daysAgo(60), todayStr()) },
    { label: 'Tháng này',   fn: () => applyRange(thisMonthStart(), todayStr()) },
    { label: 'Tháng trước', fn: () => { const pm = prevMonthRange(); applyRange(pm.start, pm.end); } },
  ];

  // Filter
  const filtered1 = applyFilter(rows1, q);
  const filteredK = applyFilter(rowsK, q);
  const total1 = Math.max(1, Math.ceil(filtered1.length / PAGE_SIZE));
  const totalK = Math.max(1, Math.ceil(filteredK.length / PAGE_SIZE));
  const p1 = Math.min(page1, total1);
  const pK = Math.min(pageK, totalK);
  const paged1 = filtered1.slice((p1 - 1) * PAGE_SIZE, p1 * PAGE_SIZE);
  const pagedK = filteredK.slice((pK - 1) * PAGE_SIZE, pK * PAGE_SIZE);

  const handleQ = (e) => {
    const { name, value } = e.target;
    setQ((p) => ({ ...p, [name]: value }));
    setPage1(1); setPageK(1); setSelected(new Set());
  };
  const clearQ = () => { setQ({ week: '', search: '', status: '' }); setPage1(1); setPageK(1); setSelected(new Set()); };

  // Selection
  const toggle = (id) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = (rows) => {
    const ids = rows.map((r) => r.id);
    const allIn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const s = new Set(prev);
      if (allIn) ids.forEach((id) => s.delete(id));
      else ids.forEach((id) => s.add(id));
      return s;
    });
  };

  // Tab switch → clear selection
  const switchTab = (t) => { setTab(t); setSelected(new Set()); };

  // Bulk "Đã trình"
  const handleBulkTrinh = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const table = tab === 'nhom1' ? 'th_nhom_1' : 'th_nhom_khac';
    const r = await api.bulkSetTrinh(table, [...selected]);
    setBulkLoading(false);
    if (r.success) {
      addToast(`Đã chuyển ${selected.size} mục sang Đã trình`);
      setSelected(new Set());
      load(startDate, endDate);
    } else {
      addToast(r.message, 'error');
    }
  };

  // Edit save
  const handleSaved = (updated) => {
    if (tab === 'nhom1') setRows1((p) => p.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
    else setRowsK((p) => p.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
    setEditing(null);
  };

  // Download
  const handleDownload = () => {
    buildXlsxBoth(filtered1, filteredK, `TH_XLVP_${startDate}_${endDate}.xlsx`);
  };

  // Upload
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const xlsxRows = await parseXlsx(file);
      const table = tab === 'nhom1' ? 'th_nhom_1' : 'th_nhom_khac';
      const map   = tab === 'nhom1' ? UPLOAD_MAP_1 : UPLOAD_MAP_K;
      const numF  = tab === 'nhom1' ? NUM_FIELDS_1 : new Set();
      const updateRows = buildUpdateRows(xlsxRows, map, numF);
      if (updateRows.length === 0) { addToast('Không tìm thấy cột ID hợp lệ', 'error'); setUploading(false); return; }
      const result = await api.bulkUpdateTh(table, updateRows);
      setUploadResult(result);
      if (result.count > 0) load(startDate, endDate);
    } catch { addToast('Đọc file thất bại', 'error'); }
    setUploading(false);
  };

  if (!leadXlvp) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Bạn không có quyền truy cập trang này.</div>;
  }

  const tabs = [
    { key: 'nhom1', label: 'Nhóm 1',    count: filtered1.length },
    { key: 'khac',  label: 'Nhóm Khác', count: filteredK.length },
  ];

  const activeRows = tab === 'nhom1' ? paged1 : pagedK;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Actions */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 justify-end">
        <button onClick={handleDownload} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          <Download size={14} /> Tải Excel
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
          <Upload size={14} /> {uploading ? 'Đang xử lý...' : 'Upload Excel'}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadFile} />
      </div>

      {/* Date range */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <Calendar size={14} className="text-gray-400 self-center" />
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
          <button onClick={applyCustom}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Xem
          </button>
          <div className="flex gap-2 flex-wrap">
            {QUICK_BTNS.map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white bg-white">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tuần</label>
            <input name="week" value={q.week} onChange={handleQ} placeholder="VD: 41" className={`${INPUT} w-24`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
            <select name="status" value={q.status} onChange={handleQ}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">-- Tất cả --</option>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="search" value={q.search} onChange={handleQ}
                placeholder="Mã CH, tên CH, nhân viên, KSTT..."
                className={`${INPUT} pl-8 w-full`} />
            </div>
          </div>
          {(q.week || q.search || q.status) && (
            <button onClick={clearQ}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
              <X size={13} /> Xoá lọc
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100">
          <span className="text-sm text-indigo-700 font-medium">{selected.size} mục đã chọn</span>
          <button onClick={handleBulkTrinh} disabled={bulkLoading}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {bulkLoading ? 'Đang xử lý...' : 'Chuyển Đã trình'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto flex items-center gap-1">
            <X size={13} /> Bỏ chọn
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
      ) : (
        <div className="pb-4">
          <div className="px-6 pt-3 pb-1">
            <p className="text-xs text-gray-400">
              Hiển thị <span className="font-medium text-gray-600">{activeRows.length}</span> /&nbsp;
              <span className="font-medium text-gray-600">{tab === 'nhom1' ? filtered1.length : filteredK.length}</span> bản ghi
            </p>
          </div>

          {tab === 'nhom1' ? (
            paged1.length === 0
              ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Không có dữ liệu</div>
              : <Nhom1Table rows={paged1} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onEdit={setEditing} />
          ) : (
            pagedK.length === 0
              ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Không có dữ liệu</div>
              : <NhomKhacTable rows={pagedK} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onEdit={setEditing} />
          )}

          <div className="px-6 pt-3">
            {tab === 'nhom1'
              ? <Pagination totalPages={total1} currentPage={p1} setCurrentPage={setPage1} />
              : <Pagination totalPages={totalK} currentPage={pK} setCurrentPage={setPageK} />}
          </div>
        </div>
      )}

      {/* Modals */}
      {editing && tab === 'nhom1' && <EditNhom1Modal row={editing} onClose={() => setEditing(null)} onSave={handleSaved} />}
      {editing && tab === 'khac'  && <EditNhomKhacModal row={editing} onClose={() => setEditing(null)} onSave={handleSaved} />}
      {uploadResult && <UploadResult result={uploadResult} onClose={() => setUploadResult(null)} />}
    </div>
  );
};

export default XlvpReport;
