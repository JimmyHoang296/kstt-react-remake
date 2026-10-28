import React from 'react';
import { AlertTriangle, Clock, ListTodo } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts';
import useStore from '../../store/useStore';

const DEADLINE_DAYS = { "Đơn giản": 3, "Trung bình": 5, "Phức tạp": 7 };
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const AGING_THRESHOLDS = { warn: 7, critical: 14 };

function countWorkingDaysSince(dateStr) {
  if (!dateStr) return 0;
  let count = 0;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (d <= today) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function countCalendarDaysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today - d) / 86400000);
}

function isOverdue(task) {
  if (task.status !== 'Đang xử lý') return false;
  const deadline = DEADLINE_DAYS[task.level];
  if (!deadline || !task.startDate) return false;
  return countWorkingDaysSince(task.startDate) > deadline;
}

function agingGroup(elapsedDays) {
  if (elapsedDays > AGING_THRESHOLDS.critical) return 'critical';
  if (elapsedDays > AGING_THRESHOLDS.warn) return 'warn';
  return 'ok';
}

const StatCard = ({ icon, label, value, colorClass }) => (
  <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-indigo-600">Đang xử lý: <span className="font-bold">{d.total}</span></p>
      {d.overdue > 0 && (
        <p className="text-red-500">Quá hạn: <span className="font-bold">{d.overdue}</span></p>
      )}
    </div>
  );
};

const PendingByEmpChart = ({ pendingCases }) => {
  const chartData = React.useMemo(() => {
    const byPic = {};
    pendingCases.forEach((c) => {
      const pic = c.pic || 'Chưa phân công';
      if (!byPic[pic]) byPic[pic] = { total: 0, overdue: 0 };
      byPic[pic].total += 1;
      if (isOverdue(c)) byPic[pic].overdue += 1;
    });
    return Object.entries(byPic)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [pendingCases]);

  if (chartData.length === 0) return null;

  const barHeight = 52;
  const chartHeight = Math.max(chartData.length * barHeight + 40, 180);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-5 text-gray-800">
        Sự vụ đang xử lý theo nhân viên
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.overdue > 0 ? '#fca5a5' : BAR_COLORS[i % BAR_COLORS.length]}
                stroke={entry.overdue > 0 ? '#ef4444' : 'none'}
                strokeWidth={entry.overdue > 0 ? 1 : 0}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-3">
        Cột màu đỏ nhạt = có sự vụ quá hạn. Hover để xem chi tiết.
      </p>
    </div>
  );
};

const AGING_BADGE = {
  warn: { label: `> ${AGING_THRESHOLDS.warn} ngày`, className: 'bg-yellow-100 text-yellow-700' },
  critical: { label: `> ${AGING_THRESHOLDS.critical} ngày`, className: 'bg-red-100 text-red-700' },
};

const AgingBreakdown = ({ pendingCases }) => {
  const aged = React.useMemo(
    () =>
      pendingCases
        .filter((c) => c.startDate)
        .map((c) => ({ ...c, elapsedDays: countCalendarDaysSince(c.startDate) }))
        .filter((c) => c.elapsedDays > AGING_THRESHOLDS.warn)
        .sort((a, b) => b.elapsedDays - a.elapsedDays),
    [pendingCases]
  );

  const warnCount = aged.filter((c) => agingGroup(c.elapsedDays) === 'warn').length;
  const criticalCount = aged.filter((c) => agingGroup(c.elapsedDays) === 'critical').length;

  if (aged.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Sự vụ đã giao lâu chưa xử lý
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-gray-500">Trên {AGING_THRESHOLDS.warn} ngày</p>
          <p className="text-2xl font-bold text-yellow-600">{warnCount}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-gray-500">Trên {AGING_THRESHOLDS.critical} ngày</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Email</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">PIC</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Ngày giao</th>
              <th className="px-4 py-2 text-right text-gray-500 font-medium">Số ngày đã giao</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Nhóm</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Nội dung tóm tắt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {aged.map((c) => {
              const badge = AGING_BADGE[agingGroup(c.elapsedDays)];
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 max-w-xs truncate">{c.email}</td>
                  <td className="px-4 py-2">{c.pic}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(c.startDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-700">{c.elapsedDays}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-sm truncate" title={c.summarize}>{c.summarize}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PendingBySourceChart = ({ pendingCases }) => {
  const chartData = React.useMemo(() => {
    const bySource = {};
    pendingCases.forEach((c) => {
      const source = c.source || 'Không rõ nguồn';
      if (!bySource[source]) bySource[source] = { total: 0, overdue: 0 };
      bySource[source].total += 1;
      if (isOverdue(c)) bySource[source].overdue += 1;
    });
    return Object.entries(bySource)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [pendingCases]);

  if (chartData.length === 0) return null;

  const barHeight = 52;
  const chartHeight = Math.max(chartData.length * barHeight + 40, 180);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-5 text-gray-800">
        Sự vụ đang xử lý theo nguồn thông tin
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.overdue > 0 ? '#fca5a5' : BAR_COLORS[i % BAR_COLORS.length]}
                stroke={entry.overdue > 0 ? '#ef4444' : 'none'}
                strokeWidth={entry.overdue > 0 ? 1 : 0}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-3">
        Cột màu đỏ nhạt = có sự vụ quá hạn. Hover để xem chi tiết.
      </p>
    </div>
  );
};

const Dashboard = () => {
  const cases = useStore((state) => state.data.cases);
  const user  = useStore((state) => state.data.user);
  const isHod = user?.role === 'hod';

  const pendingCases = cases.filter((c) => c.status === 'Đang xử lý');
  const overdueCases = pendingCases.filter(isOverdue);

  const overdueByLevel = {
    "Đơn giản":  overdueCases.filter((c) => c.level === 'Đơn giản').length,
    "Trung bình": overdueCases.filter((c) => c.level === 'Trung bình').length,
    "Phức tạp":  overdueCases.filter((c) => c.level === 'Phức tạp').length,
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<ListTodo className="w-6 h-6 text-indigo-500" />}
          label="Việc đang xử lý"
          value={pendingCases.length}
          colorClass="bg-indigo-100"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-red-500" />}
          label="Việc quá hạn"
          value={overdueCases.length}
          colorClass="bg-red-100"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-yellow-500" />}
          label="Chưa phân loại mức độ"
          value={pendingCases.filter((c) => !DEADLINE_DAYS[c.level]).length}
          colorClass="bg-yellow-100"
        />
      </div>

      {/* Aging breakdown */}
      <AgingBreakdown pendingCases={pendingCases} />

      {/* Charts */}
      <div className={`grid grid-cols-1 gap-6 ${isHod ? 'lg:grid-cols-2' : ''}`}>
        {isHod && <PendingByEmpChart pendingCases={pendingCases} />}
        <PendingBySourceChart pendingCases={pendingCases} />
      </div>

      {/* Overdue detail table */}
      {overdueCases.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Chi tiết quá hạn</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(overdueByLevel).map(([level, count]) => (
              <div key={level} className="text-center p-3 rounded-lg bg-gray-50 border">
                <p className="text-sm text-gray-500">{level} (≤{DEADLINE_DAYS[level]} ngày)</p>
                <p className="text-2xl font-bold text-red-600">{count}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Email</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Mức độ</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">PIC</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Ngày giao</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Ngày LV đã qua</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Hạn</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Nội dung tóm tắt</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overdueCases.map((c) => {
                  const elapsed  = countWorkingDaysSince(c.startDate);
                  const deadline = DEADLINE_DAYS[c.level];
                  return (
                    <tr key={c.id} className="hover:bg-red-50">
                      <td className="px-4 py-2 max-w-xs truncate">{c.email}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {c.level}
                        </span>
                      </td>
                      <td className="px-4 py-2">{c.pic}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-red-600">{elapsed}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{deadline}</td>
                      <td className="px-4 py-2 max-w-sm truncate" title={c.summarize}>{c.summarize}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
