import React, { useEffect, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { api } from '../../api';
import useStore from '../../store/useStore';
import Pagination from '../../components/Pagination';

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
      const hay = [r.sap, r.store, r.emp_name, r.kstt_submitted].join(' ').toLowerCase();
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

// ─── Nhóm 1 Table ─────────────────────────────────────────────────────────────
function Nhom1Table({ rows, showKstt }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            {showKstt && <Th>KSTT</Th>}
            <Th>Tuần</Th><Th>Mã CH</Th><Th>Tên CH</Th>
            <Th>Nhân viên</Th><Th>Chức danh</Th><Th>Nội dung vi phạm</Th>
            <Th>Giá trị</Th><Th>Thu hồi</Th><Th>Ghi chú</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              {showKstt && <Td>{r.kstt_submitted}</Td>}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Nhóm Khác Table ──────────────────────────────────────────────────────────
function NhomKhacTable({ rows, showKstt }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr>
            {showKstt && <Th>KSTT</Th>}
            <Th>Tuần</Th><Th>Mã CH</Th><Th>Tên CH</Th>
            <Th>Nhân viên</Th><Th>Chức danh</Th><Th>Nội dung vi phạm</Th>
            <Th>Hình thức XLVP</Th><Th>Trạng thái</Th><Th>Ghi chú</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              {showKstt && <Td>{r.kstt_submitted}</Td>}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared primitives ─────────────────────────────────────────────────────────
const Th = ({ children }) => (
  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{children}</th>
);
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
  const { role, name: userName } = data.user || {};
  const emps = data.emps || [];
  const showKstt = role === 'hod' || role === 'director';

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

  useEffect(() => { fetchData(); }, []);

  const applyRange = (s, e) => { setStart(s); setEnd(e); fetchData(s, e); setPage1(1); setPageK(1); };
  const applyCustom = () => { fetchData(startDate, endDate); setPage1(1); setPageK(1); };

  const quickBtns = [
    { label: '30 ngày', action: () => applyRange(daysAgo(30), todayStr()) },
    { label: '60 ngày', action: () => applyRange(daysAgo(60), todayStr()) },
    { label: 'Tháng này', action: () => applyRange(thisMonthStart(), todayStr()) },
    { label: 'Tháng trước', action: () => { const pm = prevMonth(); applyRange(pm.start, pm.end); } },
  ];

  const handleQ = (e) => {
    const { name, value } = e.target;
    setQ((p) => ({ ...p, [name]: value }));
    setPage1(1); setPageK(1);
  };
  const clearQ = () => { setQ({ week: '', search: '' }); setPage1(1); setPageK(1); };

  const filtered1 = useFilter(rows1, q);
  const filteredK = useFilter(rowsKhac, q);
  const { paged: paged1, total: total1 } = usePaged(filtered1, page1);
  const { paged: pagedK, total: totalK } = usePaged(filteredK, pageK);

  const tabs = [
    { key: 'nhom1', label: 'Nhóm 1',    count: filtered1.length },
    { key: 'khac',  label: 'Nhóm Khác', count: filteredK.length },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
                placeholder="Mã CH, tên CH, nhân viên, KSTT..."
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
              <Nhom1Table rows={paged1} showKstt={showKstt} />
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
              <NhomKhacTable rows={pagedK} showKstt={showKstt} />
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
