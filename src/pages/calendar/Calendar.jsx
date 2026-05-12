import React, { useState, useEffect } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import LoadingModal from "../../components/LoadingModal";
import { api } from "../../api";
import useStore from "../../store/useStore";

const getWeekDays = (date) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  d.setDate(diff);
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
};

// ─── Personal calendar ────────────────────────────────────────────────────────

const PersonalCalendar = ({ weekdays, calendar, setCalendar, userId, userName }) => {
  const [weekData, setWeekData] = useState({});
  const [isChanged, setIsChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const setData = useStore((state) => state.setData);

  useEffect(() => {
    const newWeekData = {};
    weekdays.forEach((day, i) => {
      const match = calendar.find(
        (item) => new Date(item.date).toDateString() === day.toDateString()
      );
      newWeekData[i] = {
        work: match?.work ?? "",
        storeNumber: match?.storeNumber ?? "",
        martNumber: match?.martNumber ?? "",
      };
    });
    setWeekData(newWeekData);
    setIsChanged(false);
  }, [weekdays]);

  useEffect(() => {
    setData((prev) => ({ ...prev, calendar }));
  }, [calendar]);

  const handleChange = (index, field, value) => {
    setWeekData((prev) => ({ ...prev, [index]: { ...prev[index], [field]: value } }));
    setIsChanged(true);
  };

  const handleUpdate = async () => {
    const submitArray = weekdays.map((day, i) => ({
      date: day.toISOString().split("T")[0],
      user: userId,
      name: userName,
      work: weekData[i]?.work || "",
      storeNumber: weekData[i]?.storeNumber || "",
      martNumber: weekData[i]?.martNumber || "",
    }));
    try {
      setLoading(true);
      const result = await api.updateWork(submitArray);
      if (result.success) {
        setCalendar((prev) => {
          const updated = [...prev];
          submitArray.forEach((dayData) => {
            const idx = updated.findIndex(
              (item) =>
                new Date(item.date).toDateString() === new Date(dayData.date).toDateString() &&
                item.user === dayData.user
            );
            if (idx !== -1) updated[idx] = { ...updated[idx], ...dayData };
            else updated.push(dayData);
          });
          return updated;
        });
        setIsChanged(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleUpdate}
          disabled={!isChanged}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cập nhật
        </button>
      </div>

      <div className="hidden md:grid md:grid-cols-5 gap-4 font-bold border-b pb-2 mb-2 text-sm text-gray-600">
        <div>Ngày</div>
        <div className="col-span-2">Chi tiết công việc</div>
        <div>Số cửa hàng</div>
        <div>Số siêu thị</div>
      </div>

      {weekdays.map((day, i) => (
        <div
          key={i}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 items-start mb-4 border-b pb-4 md:border-0 md:pb-2"
        >
          <div className="flex gap-2 items-baseline flex-wrap">
            <p className="font-semibold">{day.toLocaleDateString("vi-VN", { weekday: "long" })}</p>
            <p className="text-sm text-gray-500">{day.toLocaleDateString("vi-VN")}</p>
          </div>
          <div className="col-span-2">
            <textarea
              placeholder="Chi tiết công việc"
              className="border rounded p-2 resize-y min-h-[60px] w-full text-sm"
              value={weekData[i]?.work || ""}
              onChange={(e) => handleChange(i, "work", e.target.value)}
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Số cửa hàng"
              className="border rounded p-2 w-full text-sm"
              value={weekData[i]?.storeNumber || ""}
              onChange={(e) => handleChange(i, "storeNumber", e.target.value)}
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Số siêu thị"
              className="border rounded p-2 w-full text-sm"
              value={weekData[i]?.martNumber || ""}
              onChange={(e) => handleChange(i, "martNumber", e.target.value)}
            />
          </div>
        </div>
      ))}
      {loading && <LoadingModal message="Đang lưu..." />}
    </>
  );
};

// ─── Team calendar ────────────────────────────────────────────────────────────

const TeamCalendar = ({ weekdays, hodName }) => {
  const [emps, setEmps] = useState([]);
  const [teamCalendar, setTeamCalendar] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const result = await api.getTeamCalendar({
        hodName,
        startDate: weekdays[0].toISOString().split("T")[0],
        endDate: weekdays[4].toISOString().split("T")[0],
      });
      if (result.success) {
        setEmps(result.data.emps);
        setTeamCalendar(result.data.calendar);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [weekdays]);

  const getCell = (empUser, day) =>
    teamCalendar.find(
      (item) =>
        item.user?.toString().toLowerCase() === empUser.toLowerCase() &&
        new Date(item.date).toDateString() === day.toDateString()
    );

  const totalByDay = weekdays.map((day) => {
    const cells = emps.map((emp) => getCell(emp.user, day)).filter(Boolean);
    const stores = cells.reduce((s, c) => s + (Number(c.storeNumber) || 0), 0);
    const marts = cells.reduce((s, c) => s + (Number(c.martNumber) || 0), 0);
    return { stores, marts };
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={fetch}
          className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm hover:bg-gray-100"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left min-w-[150px] text-gray-600 font-semibold">
                Nhân viên
              </th>
              {weekdays.map((day, i) => (
                <th key={i} className="border px-3 py-2 text-center min-w-[200px]">
                  <div className="font-semibold text-gray-700">
                    {day.toLocaleDateString("vi-VN", { weekday: "long" })}
                  </div>
                  <div className="text-xs text-gray-400 font-normal">
                    {day.toLocaleDateString("vi-VN")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emps.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Không có dữ liệu nhân viên trong nhóm
                </td>
              </tr>
            ) : (
              <>
                {emps.map((emp) => (
                  <tr key={emp.user} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 font-medium text-gray-800 whitespace-nowrap align-top">
                      {emp.name}
                    </td>
                    {weekdays.map((day, i) => {
                      const cell = getCell(emp.user, day);
                      return (
                        <td key={i} className="border px-3 py-2 align-top">
                          {cell ? (
                            <div className="space-y-1.5">
                              <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
                                {cell.work}
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {Number(cell.storeNumber) > 0 && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    CH: {cell.storeNumber}
                                  </span>
                                )}
                                {Number(cell.martNumber) > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    SM: {cell.martNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-gray-50 font-semibold text-gray-700">
                  <td className="border px-3 py-2">Tổng</td>
                  {totalByDay.map((total, i) => (
                    <td key={i} className="border px-3 py-2 text-center">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {total.stores > 0 && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                            CH: {total.stores}
                          </span>
                        )}
                        {total.marts > 0 && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                            SM: {total.marts}
                          </span>
                        )}
                        {total.stores === 0 && total.marts === 0 && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── Director calendar (all users) ───────────────────────────────────────────

const DirectorCalendar = ({ weekdays, directorName }) => {
  const [emps, setEmps] = useState([]);
  const [allCalendar, setAllCalendar] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const result = await api.getAllCalendar({
        directorName,
        startDate: weekdays[0].toISOString().split("T")[0],
        endDate: weekdays[4].toISOString().split("T")[0],
      });
      if (result.success) {
        setEmps(result.data.emps);
        setAllCalendar(result.data.calendar);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [weekdays]);

  const getCell = (empUser, day) =>
    allCalendar.find(
      (item) =>
        item.user?.toString().toLowerCase() === empUser.toLowerCase() &&
        new Date(item.date).toDateString() === day.toDateString()
    );

  const totalByDay = weekdays.map((day) => {
    const cells = emps.map((emp) => getCell(emp.user, day)).filter(Boolean);
    const stores = cells.reduce((s, c) => s + (Number(c.storeNumber) || 0), 0);
    const marts = cells.reduce((s, c) => s + (Number(c.martNumber) || 0), 0);
    return { stores, marts };
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm hover:bg-gray-100"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left min-w-[150px] text-gray-600 font-semibold">
                Nhân viên
              </th>
              {weekdays.map((day, i) => (
                <th key={i} className="border px-3 py-2 text-center min-w-[200px]">
                  <div className="font-semibold text-gray-700">
                    {day.toLocaleDateString("vi-VN", { weekday: "long" })}
                  </div>
                  <div className="text-xs text-gray-400 font-normal">
                    {day.toLocaleDateString("vi-VN")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emps.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              <>
                {emps.map((emp) => (
                  <tr key={emp.user} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 font-medium text-gray-800 whitespace-nowrap align-top">
                      {emp.name}
                    </td>
                    {weekdays.map((day, i) => {
                      const cell = getCell(emp.user, day);
                      return (
                        <td key={i} className="border px-3 py-2 align-top">
                          {cell ? (
                            <div className="space-y-1.5">
                              <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
                                {cell.work}
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {Number(cell.storeNumber) > 0 && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    CH: {cell.storeNumber}
                                  </span>
                                )}
                                {Number(cell.martNumber) > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    SM: {cell.martNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="bg-gray-50 font-semibold text-gray-700">
                  <td className="border px-3 py-2">Tổng</td>
                  {totalByDay.map((total, i) => (
                    <td key={i} className="border px-3 py-2 text-center">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {total.stores > 0 && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                            CH: {total.stores}
                          </span>
                        )}
                        {total.marts > 0 && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                            SM: {total.marts}
                          </span>
                        )}
                        {total.stores === 0 && total.marts === 0 && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── Main Calendar page ───────────────────────────────────────────────────────

const Calendar = () => {
  const data = useStore((state) => state.data);
  const { id: userId, name, role } = data.user;
  const isHod = role === "hod";
  const isDirector = role === "director";

  const [activeTab, setActiveTab] = useState("personal");
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [calendar, setCalendar] = useState(data.calendar);

  const weekdays = getWeekDays(currentWeekStart);

  const navigateWeek = (delta) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + delta * 7);
    setCurrentWeekStart(d);
  };

  const weekLabel = `${weekdays[0].toLocaleDateString("vi-VN")} – ${weekdays[4].toLocaleDateString("vi-VN")}`;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-3">Lịch làm việc</h2>

      {/* Tabs (HOD or Director) */}
      {(isHod || isDirector) && (
        <div className="flex gap-0 mb-5 border-b">
          {[
            { key: "personal", label: "Lịch của tôi" },
            ...(isHod ? [{ key: "team", label: "Lịch nhóm" }] : []),
            ...(isDirector ? [{ key: "all", label: "Lịch toàn bộ" }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekStart(new Date())}
            className="px-3 py-1.5 border rounded hover:bg-gray-100 text-sm"
          >
            Tuần này
          </button>
          <div className="flex items-center">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-base px-2 min-w-[220px] text-center">
              {weekLabel}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "personal" && (
        <PersonalCalendar
          weekdays={weekdays}
          calendar={calendar}
          setCalendar={setCalendar}
          userId={userId}
          userName={name}
        />
      )}

      {activeTab === "team" && isHod && (
        <TeamCalendar weekdays={weekdays} hodName={name} />
      )}

      {activeTab === "all" && isDirector && (
        <DirectorCalendar weekdays={weekdays} directorName={name} />
      )}
    </div>
  );
};

export default Calendar;
