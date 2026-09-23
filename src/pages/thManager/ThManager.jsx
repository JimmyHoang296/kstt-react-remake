import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronsUpDown, FileText, Search, Trash2, X } from 'lucide-react';
import { api } from '../../api';
import useStore from '../../store/useStore';
import Pagination from '../../components/Pagination';
import { toDateInputValue } from '../../assets/helpers';

const PAGE_SIZE = 20;

const BADGE = {
  'Đã trình':   'bg-green-100 text-green-700',
  'Chờ trình':  'bg-yellow-100 text-yellow-700',
  'Đang xử lý':'bg-blue-100 text-blue-700',
};

const INPUT = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
const prevMonth = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last  = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (x) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  return { start: fmt(first), end: fmt(last) };
};

// ─── Filter ────────────────────────────────────────────────────────────────────
function useFilter(rows, q) {
  return rows.filter((r) => {
    const w = String(q.week || '').trim();
    const s = String(q.search || '').toLowerCase().trim();
    if (w && String(r.week || '') !== w) return false;
    if (s) {
      const hay = [r.sap, r.store, r.emp_name, r.kstt_submitted, r.email].join(' ').toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}

function usePaged(rows, page) {
  const total = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const p = Math.min(page, total);
  return { paged: rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), total };
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ row, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-100 rounded-full">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">Xác nhận xóa</h3>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Bạn có chắc muốn xóa vi phạm của <span className="font-medium">{row.emp_name}</span>?
        </p>
        <p className="text-xs text-gray-400 mb-5 line-clamp-2">{row.violation_text}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5">
            {loading ? 'Đang xóa...' : <><Trash2 className="w-3.5 h-3.5" />Xóa</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View Modal ─────────────────────────────────────────────────────────
function Field({ label, value, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{value || value === 0 ? value : '—'}</p>
    </div>
  );
}

function DetailRecordModal({ record, group, onClose }) {
  const isNhom1 = group === 'nhom1';
  const title = isNhom1 ? 'Chi tiết biên bản — Nhóm 1' : 'Chi tiết biên bản — Nhóm Khác';
  const status = isNhom1 ? record.Note : record.status;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="ID" value={record.id} />
            <Field label="Tuần" value={record.week} />
            <Field label="Ngày duyệt" value={toDateInputValue(record.approved_date)} />
            <Field label="KSTT phụ trách" value={record.kstt_submitted} />
            <Field label="Tiêu đề Email" value={record.email} full />
            <Field label="Mã CH" value={record.sap} />
            <Field label="Tên CH" value={record.store} />
            <Field label="Nhân viên" value={record.emp_name} />
            <Field label="Chức danh" value={record.emp_title} />
            {isNhom1 ? (
              <>
                <Field label="Mã số NV" value={record.emp_id} />
                <Field label="Xếp hạng" value={record.emp_rank} />
                <Field label="Nguồn thông tin" value={record.source} />
                <Field label="QLKV" value={record.QLKV ?? record.qlkv} />
                <Field label="Phân loại vi phạm" value={record.violation_type} />
                <Field label="GDV" value={record.GDV ?? record.gdv} />
                <Field label="Giá trị thất thoát" value={formatMoney(record.loss_value)} />
                <Field label="Giá trị thu hồi" value={formatMoney(record.recover_value)} />
                <Field label="Ngày phát hiện" value={toDateInputValue(record.discovery_date)} />
                <Field label="Ngày hoàn thành" value={toDateInputValue(record.finished_date)} />
                <Field label="Nội dung giải trình" value={record.clarification_detail} full />
                <Field label="Ghi chú GDV" value={record.GDVNote ?? record.gdv_note} full />
              </>
            ) : (
              <>
                <Field label="Nhóm kỷ luật" value={record.disciplinary_group} />
                <Field label="Lỗi" value={record.loi ?? record.Lỗi} />
                <Field label="Hình thức XLVP" value={record.disciplinary_action} full />
              </>
            )}
            <Field label="Nội dung vi phạm" value={record.violation_text} full />
            <Field label="Ghi chú" value={isNhom1 ? record.Note : record.NOTE} full />
          </div>
        </div>
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

const formatMoney = (v) => (v != null && v !== '' ? Number(v).toLocaleString() + ' đ' : '—');

// ─── Nhóm 1 Table ─────────────────────────────────────────────────────────────
function Nhom1Table({ rows, showKstt, sort, onSort, canDelete, onDelete, onView, highlightId, rowRefs }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            <Th field="id" sort={sort} onSort={onSort}>ID</Th>
            {showKstt && <Th field="kstt_submitted" sort={sort} onSort={onSort}>KSTT</Th>}
            <Th field="email" sort={sort} onSort={onSort}>Tiêu đề Email</Th>
            <Th field="week" sort={sort} onSort={onSort}>Tuần</Th>
            <Th field="sap" sort={sort} onSort={onSort}>Mã CH</Th>
            <Th field="store" sort={sort} onSort={onSort}>Tên CH</Th>
            <Th field="emp_name" sort={sort} onSort={onSort}>Nhân viên</Th>
            <Th field="emp_title" sort={sort} onSort={onSort}>Chức danh</Th>
            <Th field="violation_text" sort={sort} onSort={onSort}>Nội dung vi phạm</Th>
            <Th field="loss_value" sort={sort} onSort={onSort}>Giá trị</Th>
            <Th field="recover_value" sort={sort} onSort={onSort}>Thu hồi</Th>
            <Th field="Note" sort={sort} onSort={onSort}>Ghi chú</Th>
            {canDelete && <th className="px-3 py-2.5 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} ref={(el) => rowRefs && (rowRefs.current[`nhom1-${r.id}`] = el)}
              onDoubleClick={() => onView && onView(r)}
              title="Nháy đúp để xem chi tiết"
              className={`hover:bg-gray-50 cursor-pointer transition-colors ${highlightId === `nhom1-${r.id}` ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''}`}>
              <Td>{r.id}</Td>
              {showKstt && <Td>{r.kstt_submitted}</Td>}
              <Td className="max-w-xs"><p className="line-clamp-2">{r.email}</p></Td>
              <Td>{r.week}</Td>
              <Td className="font-medium">{r.sap}</Td>
              <Td>{r.store}</Td>
              <Td>{r.emp_name}</Td>
              <Td>{r.emp_title}</Td>
              <Td className="max-w-xs"><p className="line-clamp-2 text-gray-600">{r.violation_text}</p></Td>
              <Td className="text-right whitespace-nowrap">{r.loss_value != null ? r.loss_value.toLocaleString() + ' đ' : ''}</Td>
              <Td className="text-right whitespace-nowrap">{r.recover_value != null ? r.recover_value.toLocaleString() + ' đ' : ''}</Td>
              <Td>
                {r.Note && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[r.Note] || 'bg-gray-100 text-gray-600'}`}>{r.Note}</span>
                )}
              </Td>
              {canDelete && (
                <td className="px-2 py-2.5 align-top">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Nhóm Khác Table ──────────────────────────────────────────────────────────
function NhomKhacTable({ rows, showKstt, sort, onSort, canDelete, onDelete, onView, highlightId, rowRefs }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            <Th field="id" sort={sort} onSort={onSort}>ID</Th>
            {showKstt && <Th field="kstt_submitted" sort={sort} onSort={onSort}>KSTT</Th>}
            <Th field="email" sort={sort} onSort={onSort}>Tiêu đề Email</Th>
            <Th field="week" sort={sort} onSort={onSort}>Tuần</Th>
            <Th field="sap" sort={sort} onSort={onSort}>Mã CH</Th>
            <Th field="store" sort={sort} onSort={onSort}>Tên CH</Th>
            <Th field="emp_name" sort={sort} onSort={onSort}>Nhân viên</Th>
            <Th field="emp_title" sort={sort} onSort={onSort}>Chức danh</Th>
            <Th field="violation_text" sort={sort} onSort={onSort}>Nội dung vi phạm</Th>
            <Th field="disciplinary_action" sort={sort} onSort={onSort}>Hình thức XLVP</Th>
            <Th field="status" sort={sort} onSort={onSort}>Trạng thái</Th>
            <Th field="NOTE" sort={sort} onSort={onSort}>Ghi chú</Th>
            {canDelete && <th className="px-3 py-2.5 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} ref={(el) => rowRefs && (rowRefs.current[`khac-${r.id}`] = el)}
              onDoubleClick={() => onView && onView(r)}
              title="Nháy đúp để xem chi tiết"
              className={`hover:bg-gray-50 cursor-pointer transition-colors ${highlightId === `khac-${r.id}` ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''}`}>
              <Td>{r.id}</Td>
              {showKstt && <Td>{r.kstt_submitted}</Td>}
              <Td className="max-w-xs"><p className="line-clamp-2">{r.email}</p></Td>
              <Td>{r.week}</Td>
              <Td className="font-medium">{r.sap}</Td>
              <Td>{r.store}</Td>
              <Td>{r.emp_name}</Td>
              <Td>{r.emp_title}</Td>
              <Td className="max-w-xs"><p className="line-clamp-2 text-gray-600">{r.violation_text}</p></Td>
              <Td className="max-w-[160px]"><p className="line-clamp-2">{r.disciplinary_action}</p></Td>
              <Td>
                {r.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                )}
              </Td>
              <Td>{r.NOTE}</Td>
              {canDelete && (
                <td className="px-2 py-2.5 align-top">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared primitives ─────────────────────────────────────────────────────────
const Th = ({ children, field, sort, onSort }) => {
  const active = sort && field && sort.field === field;
  return (
    <th
      className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${field && onSort ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
      onClick={field && onSort ? () => onSort(field) : undefined}
    >
      {children}
      {field && onSort && (
        active
          ? sort.dir === 'asc'
            ? <ChevronUp className="w-3 h-3 inline ml-1" />
            : <ChevronDown className="w-3 h-3 inline ml-1" />
          : <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />
      )}
    </th>
  );
};
const Td = ({ children, className = '' }) => (
  <td className={`px-3 py-2.5 text-xs text-gray-700 align-top ${className}`}>{children}</td>
);
const Empty = () => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <FileText className="w-10 h-10 mb-3 opacity-40" />
    <p className="text-sm">Không có dữ liệu</p>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ThManager = () => {
  const data = useStore((s) => s.data);
  const refreshKey = useStore((s) => s.refreshKey);
  const { role, name: userName } = data.user || {};
  const emps = data.emps || [];
  const showKstt = role === 'hod' || role === 'director';
  const canDelete = role === 'hod' || role === 'director';

  const location = useLocation();
  const navigate = useNavigate();
  const rowRefs = useRef({});
  const [viewing, setViewing] = useState(null); // { record, group }
  const [highlightKey, setHighlightKey] = useState(null); // e.g. "nhom1-123"

  const [deleteTarget, setDeleteTarget] = useState(null); // { row, table }
  const [deleting, setDeleting] = useState(false);

  const [startDate, setStart] = useState(daysAgo(60));
  const [endDate,   setEnd]   = useState(todayStr());

  const [activeTab, setActiveTab] = useState('nhom1');
  const [rows1, setRows1] = useState([]);
  const [rowsKhac, setRowsKhac] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [q, setQ] = useState({ week: '', search: '' });
  const [page1, setPage1] = useState(1);
  const [pageK, setPageK] = useState(1);
  const [sort1, setSort1] = useState({ field: 'week', dir: 'desc' });
  const [sortK, setSortK] = useState({ field: 'week', dir: 'desc' });

  const handleSort1 = (field) => {
    setSort1((s) => ({ field, dir: s.field === field ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
    setPage1(1);
  };
  const handleSortK = (field) => {
    setSortK((s) => ({ field, dir: s.field === field ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
    setPageK(1);
  };

  const applySort = (rows, sort) => {
    if (!sort.field) return rows;
    return [...rows].sort((a, b) => {
      const vA = a[sort.field] ?? '', vB = b[sort.field] ?? '';
      const cmp = typeof vA === 'number' && typeof vB === 'number' ? vA - vB : String(vA).localeCompare(String(vB), 'vi');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  };

  const fetchData = (s = startDate, e = endDate) => {
    const params = { role, userName, emps, startDate: s, endDate: e };
    setLoading(true);
    setError('');
    Promise.all([
      api.getThNhom1(params),
      api.getThNhomKhac(params),
    ]).then(([r1, rk]) => {
      if (r1.success) setRows1(r1.data); else setError(r1.message);
      if (rk.success) setRowsKhac(rk.data); else setError((p) => p || rk.message);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mở trực tiếp 1 biên bản khi được điều hướng tới từ trang khác (vd: nháy đúp ở modal Sự vụ)
  useEffect(() => {
    const openRecord = location.state?.openRecord;
    if (!openRecord) return;
    const { id, group } = openRecord;
    setActiveTab(group);
    const fn = group === 'nhom1' ? api.getThNhom1ById : api.getThNhomKhacById;
    fn(id).then((r) => {
      if (r.success && r.data) {
        setViewing({ record: r.data, group });
        setHighlightKey(`${group}-${id}`);
      }
    });
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!highlightKey) return;
    const el = rowRefs.current[highlightKey];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightKey(null), 4000);
    return () => clearTimeout(t);
  }, [highlightKey, rows1, rowsKhac, activeTab]);

  const applyRange = (s, e) => { setStart(s); setEnd(e); fetchData(s, e); setPage1(1); setPageK(1); };
  const applyCustom = () => { fetchData(startDate, endDate); setPage1(1); setPageK(1); };

  const quickBtns = [
    { label: '30 ngày', action: () => applyRange(daysAgo(30), todayStr()) },
    { label: '60 ngày', action: () => applyRange(daysAgo(60), todayStr()) },
    { label: 'Tháng này', action: () => applyRange(thisMonthStart(), todayStr()) },
    { label: 'Tháng trước', action: () => { const pm = prevMonth(); applyRange(pm.start, pm.end); } },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { row, table } = deleteTarget;
    const fn = table === 'nhom1' ? api.deleteThNhom1 : api.deleteThNhomKhac;
    const res = await fn(row.id);
    setDeleting(false);
    if (res.success) {
      if (table === 'nhom1') setRows1((prev) => prev.filter((r) => r.id !== row.id));
      else setRowsKhac((prev) => prev.filter((r) => r.id !== row.id));
      setDeleteTarget(null);
    } else {
      alert('Xóa thất bại: ' + res.message);
    }
  };

  const handleQ = (e) => {
    const { name, value } = e.target;
    setQ((p) => ({ ...p, [name]: value }));
    setPage1(1); setPageK(1);
  };
  const clearQ = () => { setQ({ week: '', search: '' }); setPage1(1); setPageK(1); };

  const filtered1 = useFilter(rows1, q);
  const filteredK = useFilter(rowsKhac, q);
  const { paged: paged1, total: total1 } = usePaged(applySort(filtered1, sort1), page1);
  const { paged: pagedK, total: totalK } = usePaged(applySort(filteredK, sortK), pageK);

  const tabs = [
    { key: 'nhom1', label: 'Nhóm 1',    count: filtered1.length },
    { key: 'khac',  label: 'Nhóm Khác', count: filteredK.length },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {deleteTarget && (
        <DeleteConfirmModal
          row={deleteTarget.row}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {viewing && (
        <DetailRecordModal
          record={viewing.record}
          group={viewing.group}
          onClose={() => setViewing(null)}
        />
      )}
      {/* Date range */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)}
              className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)}
              className={INPUT} />
          </div>
          <button onClick={applyCustom}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Xem
          </button>
          <div className="flex gap-2 flex-wrap">
            {quickBtns.map(({ label, action }) => (
              <button key={label} onClick={action}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white bg-white">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tuần</label>
            <input name="week" value={q.week} onChange={handleQ}
              placeholder="VD: 41" className={`${INPUT} w-24`} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="search" value={q.search} onChange={handleQ}
                placeholder="Mã CH, tên CH, nhân viên, KSTT, tiêu đề email..."
                className={`${INPUT} pl-8 w-full`} />
            </div>
          </div>
          {(q.week || q.search) && (
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
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
      ) : (
        <div className="pb-4">
          {activeTab === 'nhom1' ? (
            <>
              <div className="px-6 pt-3 pb-1">
                <p className="text-xs text-gray-400">
                  Hiển thị <span className="font-medium text-gray-600">{paged1.length}</span> / <span className="font-medium text-gray-600">{filtered1.length}</span> bản ghi
                </p>
              </div>
              <Nhom1Table rows={paged1} showKstt={showKstt} sort={sort1} onSort={handleSort1}
                canDelete={canDelete} onDelete={(row) => setDeleteTarget({ row, table: 'nhom1' })}
                onView={(row) => setViewing({ record: row, group: 'nhom1' })}
                highlightId={highlightKey} rowRefs={rowRefs} />
              <div className="px-6 pt-3">
                <Pagination totalPages={total1} currentPage={page1} setCurrentPage={setPage1} />
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-3 pb-1">
                <p className="text-xs text-gray-400">
                  Hiển thị <span className="font-medium text-gray-600">{pagedK.length}</span> / <span className="font-medium text-gray-600">{filteredK.length}</span> bản ghi
                </p>
              </div>
              <NhomKhacTable rows={pagedK} showKstt={showKstt} sort={sortK} onSort={handleSortK}
                canDelete={canDelete} onDelete={(row) => setDeleteTarget({ row, table: 'khac' })}
                onView={(row) => setViewing({ record: row, group: 'khac' })}
                highlightId={highlightKey} rowRefs={rowRefs} />
              <div className="px-6 pt-3">
                <Pagination totalPages={totalK} currentPage={pageK} setCurrentPage={setPageK} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ThManager;
