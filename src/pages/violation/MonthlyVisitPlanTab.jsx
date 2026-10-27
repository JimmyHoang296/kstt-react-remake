import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import useStore from '../../store/useStore';
import LoadingModal from '../../components/LoadingModal';
import { findProvince, shortProvinceName } from '../../assets/provinceLookup';

const todayMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthRange = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

// Accepts a JS Date (when the sheet column is Excel date-formatted) or text
// like "2026-11", "11/2026", "Tháng 11/2026".
function parseMonthCell(v) {
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-01`;
  }
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-01`;
  m = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}-01`;
  m = s.match(/th[áa]ng\s*(\d{1,2})[/-](\d{4})/i);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}-01`;
  return null;
}

const GroupSummaryTable = ({ title, labelHeader, rows }) => {
  const totals = rows.reduce((a, r) => ({ planned: a.planned + r.planned, visited: a.visited + r.visited }), { planned: 0, visited: 0 });
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{labelHeader}</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Kế hoạch</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Đã đi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 text-xs">Không có dữ liệu</td></tr>
            ) : rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-1.5 text-gray-700">{r.label}</td>
                <td className="px-4 py-1.5 text-right font-medium text-gray-700">{r.planned}</td>
                <td className="px-4 py-1.5 text-right text-green-600 font-medium">{r.visited}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-4 py-1.5 text-gray-700">Tổng</td>
                <td className="px-4 py-1.5 text-right text-gray-800">{totals.planned}</td>
                <td className="px-4 py-1.5 text-right text-green-700">{totals.visited}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const VIETNAM_CENTER = [16.047079, 108.20623];
const VIETNAM_ZOOM = 5.3;

// Khoảng toạ độ hợp lý cho Việt Nam — lọc bỏ dữ liệu lat/long lỗi (vd: thiếu
// dấu thập phân, 9.928089 bị lưu thành 9928089) để 1 dòng dữ liệu rác không
// làm fitBounds() tính sai và ẩn mất toàn bộ marker trên bản đồ.
function isValidVNCoord(lat, lng) {
  const la = Number(lat), lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= 8 && la <= 24 && lo >= 101 && lo <= 110;
}

function buildTooltipEl(r) {
  const div = document.createElement('div');
  div.style.fontSize = '12px';
  const strong = document.createElement('strong');
  strong.textContent = `${r.sap} — ${r.store.store_name || ''}`;
  div.appendChild(strong);
  if (r.store.address) {
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode(r.store.address));
  }
  if (r.pic) {
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode(`PIC: ${r.pic}`));
  }
  div.appendChild(document.createElement('br'));
  const status = document.createElement('span');
  status.style.color = r.visited ? '#16a34a' : '#d97706';
  status.textContent = r.visited ? 'Đã đi' : 'Chưa đi';
  div.appendChild(status);
  return div;
}

// Bản đồ dựng bằng Leaflet thuần (không dùng react-leaflet) — react-leaflet
// v5 dưới React 19 StrictMode không khởi tạo lại đúng sau lần mount thứ 2
// (double-invoke effect của dev mode), khiến bản đồ không zoom/không hiện
// marker dù dữ liệu đúng. Tự quản lý vòng đời map qua ref tránh được lỗi này.
const PlanMap = ({ mapRows, points, height }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(VIETNAM_CENTER, VIETNAM_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    groupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = groupRef.current;
    if (!map || !group) return;

    // invalidateSize() + đặt view TRƯỚC khi thêm marker: renderer SVG của
    // Leaflet cache kích thước/bounds lúc khởi tạo map (có thể là 0 nếu
    // container chưa kịp layout), và marker thêm vào trước khi bounds đó
    // đúng sẽ bị coi là "nằm ngoài khung hình" nên vẽ path rỗng (d="M0 0").
    map.invalidateSize();
    if (points.length === 0) map.setView(VIETNAM_CENTER, VIETNAM_ZOOM, { animate: false });
    else if (points.length === 1) map.setView(points[0], 15, { animate: false });
    else map.fitBounds(points, { padding: [32, 32], animate: false });

    group.clearLayers();
    mapRows.forEach((r) => {
      L.circleMarker([Number(r.store.lat), Number(r.store.long)], {
        radius: 5,
        color: r.visited ? '#16a34a' : '#d97706',
        fillColor: r.visited ? '#22c55e' : '#f59e0b',
        fillOpacity: 0.85,
        weight: 1.5,
      })
        .bindTooltip(buildTooltipEl(r))
        .addTo(group);
    });
  }, [mapRows, points]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
};

const MonthlyVisitPlanTab = () => {
  const data     = useStore((state) => state.data);
  const addToast = useStore((state) => state.addToast);

  const [month, setMonth] = useState(todayMonthStr());
  const [planRows, setPlanRows] = useState([]);
  const [storeInfo, setStoreInfo] = useState({}); // sap -> { store_name, address, lat, long }
  const [visitedSaps, setVisitedSaps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null); // { rows, fileName }
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = async (m) => {
    setLoading(true);
    try {
      const { start, end } = monthRange(m);
      const planRes = await api.getMonthlyVisitPlan(start, data.user);
      const rows = planRes.success ? planRes.data : [];
      setPlanRows(rows);

      const saps = [...new Set(rows.map((r) => r.sap).filter(Boolean))];
      const storesRes = await api.getStoresBySap(saps);
      // Khoá theo chữ hoa vì mã CH trong kế hoạch đôi khi viết thường trong khi
      // bảng stores lưu chữ hoa (vd: "2ap1" vs "2AP1") — getStoresBySap đã trả
      // về cả 2 biến thể, ở đây chuẩn hoá để tra cứu không phân biệt hoa/thường.
      const info = {};
      (storesRes.data || []).forEach((s) => { info[s.store.toUpperCase()] = s; });
      setStoreInfo(info);

      // "Đã đi" = có biên bản ghi nhận trong tháng — dùng cùng cách lấy dữ liệu
      // (và cùng phạm vi quyền theo vai trò) với phần còn lại của trang TH ghi
      // nhận, thay vì data.inspections toàn cục (có thể bị lọc khác với trang này).
      const { role, name: userName, leadGhiNhan } = data.user || {};
      const inspRes = await api.getInspectionsForReport({
        startDate: start, endDate: end, role, userName, emps: data.emps || [], leadGhiNhan,
      });
      const visited = new Set((inspRes.data || []).map((i) => i.sap).filter(Boolean));
      setVisitedSaps(visited);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Tỉnh/thành suy ra từ lat/long qua ranh giới 34 tỉnh/thành (tham khảo dự án
  // "Danh sach BHX") — chỉ tính 1 lần mỗi khi danh sách store thay đổi.
  const provinceBySap = useMemo(() => {
    const m = {};
    Object.values(storeInfo).forEach((s) => {
      if (isValidVNCoord(s.lat, s.long)) m[s.store.toUpperCase()] = findProvince(s.lat, s.long);
    });
    return m;
  }, [storeInfo]);

  const rowsWithStatus = useMemo(
    () => planRows.map((r) => ({
      ...r,
      visited: visitedSaps.has(r.sap),
      store: storeInfo[r.sap?.toUpperCase()],
      province: provinceBySap[r.sap?.toUpperCase()] || null,
    })),
    [planRows, visitedSaps, storeInfo, provinceBySap]
  );

  const mapRows = rowsWithStatus.filter((r) => isValidVNCoord(r.store?.lat, r.store?.long));
  const noCoordCount = rowsWithStatus.length - mapRows.length;
  const visitedCount = rowsWithStatus.filter((r) => r.visited).length;

  const points = mapRows.map((r) => [Number(r.store.lat), Number(r.store.long)]);

  const byKstt = useMemo(() => {
    const m = new Map();
    rowsWithStatus.forEach((r) => {
      const key = r.pic || 'Chưa phân công';
      if (!m.has(key)) m.set(key, { label: key, planned: 0, visited: 0 });
      const e = m.get(key);
      e.planned += 1;
      if (r.visited) e.visited += 1;
    });
    return [...m.values()].sort((a, b) => b.planned - a.planned);
  }, [rowsWithStatus]);

  const byProvince = useMemo(() => {
    const m = new Map();
    rowsWithStatus.forEach((r) => {
      const key = r.province ? shortProvinceName(r.province) : 'Không rõ địa phương';
      if (!m.has(key)) m.set(key, { label: key, planned: 0, visited: 0 });
      const e = m.get(key);
      e.planned += 1;
      if (r.visited) e.visited += 1;
    });
    return [...m.values()].sort((a, b) => b.planned - a.planned);
  }, [rowsWithStatus]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const rows = raw
          .map((r) => ({
            month: parseMonthCell(r['Tháng kế hoạch']) || `${month}-01`,
            sap: String(r['Mã CH'] ?? '').trim(),
            pic: String(r['PIC'] ?? '').trim(),
          }))
          .filter((r) => r.sap);

        if (rows.length === 0) {
          addToast('File không có dòng hợp lệ — thiếu cột "Mã CH"', 'error');
          return;
        }
        setPreview({ rows, fileName: file.name });
      } catch {
        addToast('Không đọc được file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!preview?.rows?.length) return;
    setImporting(true);
    try {
      const rows = preview.rows.map((r) => ({ ...r, user: data.user.id }));
      const r = await api.importMonthlyVisitPlan(rows);
      if (r.success) {
        addToast(`Đã tải lên ${r.count} dòng kế hoạch`);
        setPreview(null);
        const months = [...new Set(rows.map((x) => x.month.slice(0, 7)))];
        if (months.includes(month)) await load(month);
      } else {
        addToast(r.message || 'Tải lên thất bại', 'error');
      }
    } catch {
      addToast('Lỗi kết nối, thử lại sau', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!confirm('Xóa CH này khỏi kế hoạch tháng?')) return;
    const r = await api.deleteMonthlyVisitPlanRow(id);
    if (r.success) { setPlanRows((p) => p.filter((x) => x.id !== id)); addToast('Đã xóa'); }
    else addToast(r.message || 'Xóa thất bại', 'error');
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tháng kế hoạch</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Upload size={14} /> Tải lên kế hoạch (.xlsx)
        </button>
        <p className="text-xs text-gray-400">
          Cột cần có: <span className="font-medium text-gray-600">Tháng kế hoạch</span>, <span className="font-medium text-gray-600">Mã CH</span>, <span className="font-medium text-gray-600">PIC</span>
        </p>

        {preview && (
          <div className="w-full flex items-center gap-3 flex-wrap mt-1">
            <span className="text-sm text-gray-700">
              <span className="font-medium text-indigo-600">{preview.fileName}</span>
              {' — '}<span className="font-semibold">{preview.rows.length}</span> dòng hợp lệ
            </span>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {importing ? 'Đang tải lên...' : 'Xác nhận tải lên'}
            </button>
            <button onClick={() => setPreview(null)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-white transition-colors">
              Hủy
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6">
        <div className="text-center p-3 rounded-lg bg-gray-50 border">
          <p className="text-sm text-gray-500">Tổng CH kế hoạch</p>
          <p className="text-2xl font-bold text-gray-800">{rowsWithStatus.length}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-gray-500">Đã đi</p>
          <p className="text-2xl font-bold text-green-600">{visitedCount}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-gray-500">Chưa đi</p>
          <p className="text-2xl font-bold text-amber-600">{rowsWithStatus.length - visitedCount}</p>
        </div>
      </div>

      {/* Trái: tổng hợp theo KSTT / theo địa phương (xếp ngang) — Phải: bản đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.6fr] gap-5 px-6">
        <GroupSummaryTable title="Tổng hợp theo KSTT" labelHeader="KSTT" rows={byKstt} />
        <GroupSummaryTable title="Tổng hợp theo địa phương" labelHeader="Tỉnh/Thành" rows={byProvince} />

        <div>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <PlanMap mapRows={mapRows} points={points} height={720} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Xanh = đã đi (có biên bản ghi nhận trong tháng) · Vàng = chưa đi.
            {rowsWithStatus.length === 0 && ' Chưa có kế hoạch cho tháng này.'}
            {noCoordCount > 0 && ` ${noCoordCount} CH chưa có tọa độ nên không hiển thị trên bản đồ.`}
          </p>
        </div>
      </div>

      {/* Detail table */}
      <div className="px-6 pb-6 overflow-x-auto">
        {rowsWithStatus.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có kế hoạch cho tháng này</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Mã CH</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Tên CH</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">PIC</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Trạng thái</th>
                <th className="px-4 py-2 text-center text-gray-500 font-medium">Xóa</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rowsWithStatus.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">{r.sap}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{r.store?.store_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{r.pic || '—'}</td>
                  <td className="px-4 py-2">
                    {r.visited ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={12} /> Đã đi
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Chưa đi</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleDeleteRow(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {loading && <LoadingModal message="Đang tải kế hoạch..." />}
    </div>
  );
};

export default MonthlyVisitPlanTab;
