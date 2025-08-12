import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import LoadingModal from "../../components/LoadingModal";
import { URL } from "../../assets/variables";

// your provided data

const Calendar = ({ data,setData }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [weekData, setWeekData] = useState({});
  const [isChanged, setIsChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const { id: user, name } = data.user;
  const [calendar, setCalendar] = useState(data.calendar);
  const getWeekDays = (startOfWeek) => {
    const days = [];
    let day = new Date(startOfWeek);
    const dayOfWeek = day.getDay();
    const diff = day.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    day.setDate(diff);

    for (let i = 0; i < 5; i++) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    return days;
  };

  // ✅ fill weekData when currentWeekStart changes
  useEffect(() => {
    const weekdays = getWeekDays(currentWeekStart);

    const newWeekData = {};
    weekdays.forEach((day, index) => {
      if (calendar.length) {
        const match = calendar.find(
          (item) => new Date(item.date).toDateString() === day.toDateString()
        );
        newWeekData[index] = {
          work: match?.work ?? "",
          storeNumber: match?.storeNumber ?? "",
          martNumber: match?.martNumber ?? "",
        };
      }
    });

    setWeekData(newWeekData);
  }, [currentWeekStart]);

  useEffect(() => {
    setData((prev) => ({ ...prev, ["calendar"]: calendar }));
  }, [calendar]);
  const handlePreviousWeek = () => {
    if (isChanged && confirm("Bạn có muốn lưu lại thay đổi vừa rồi")) {
      handleUpdate();
    } else {
      const newDate = new Date(currentWeekStart);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentWeekStart(newDate);
      setIsChanged(false);
    }
  };

  const handleNextWeek = () => {
    if (isChanged && confirm("Bạn có muốn lưu lại thay đổi vừa rồi")) {
      handleUpdate();
    } else {
      const newDate = new Date(currentWeekStart);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentWeekStart(newDate);
      setIsChanged(false);
    }
  };

  const handleThisWeek = () => {
    if (isChanged && confirm("Bạn có muốn lưu lại thay đổi vừa rồi")) {
      handleUpdate();
    } else {
      setCurrentWeekStart(new Date());
      setIsChanged(false);
    }
  };

  const weekdays = getWeekDays(currentWeekStart);

  const handleChange = (index, field, value) => {
    setWeekData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
    setIsChanged(true);
  };

  const handleUpdate = async () => {
    const submitArray = weekdays.map((day, index) => ({
      date: day.toISOString().split("T")[0],
      user,
      name,
      work: weekData[index]?.work || "",
      storeNumber: weekData[index]?.storeNumber || "",
      martNumber: weekData[index]?.martNumber || "",
    }));

    const submitData = {
      type: "updateWork",
      data: submitArray,
    };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        // update to local
        setCalendar((prevCalendar) => {
          let updatedCalendar = [...prevCalendar];

          submitArray.forEach((dayData) => {
            const idx = updatedCalendar.findIndex(
              (item) =>
                new Date(item.date).toDateString() ===
                  new Date(dayData.date).toDateString() &&
                item.user === dayData.user
            );

            if (idx !== -1) {
              updatedCalendar[idx] = { ...updatedCalendar[idx], ...dayData };
            } else {
              updatedCalendar.push(dayData);
            }
          });

          return updatedCalendar;
        });

        setIsChanged(false);
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold mb-3">Lịch làm việc</h2>
      <div className="flex space-x-2 items-center justify-between mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <button
            onClick={handleThisWeek}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
          >
            Tuần này
          </button>
          <div className="flex items-center">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="font-semibold text-lg">
              {weekdays[0].toLocaleDateString()} -{" "}
              {weekdays[4].toLocaleDateString()}
            </span>

            <button
              onClick={handleNextWeek}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Cập nhật
        </button>
      </div>

      {/* Table header */}
      <div className="hidden md:grid md:grid-cols-5 gap-4 font-bold border-b pb-2 mb-2">
        <div>Ngày</div>
        <div className="col-span-2">Chi tiết công việc</div>
        <div>Số cửa hàng</div>
        <div>Số siêu thị</div>
      </div>

      {/* Rows */}
      {weekdays.map((day, index) => (
        <div
          key={index}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 items-start mb-4 border-b pb-4 md:border-0 md:pb-0"
        >
          <div className="flex gap-2 items-baseline">
            <p className="font-bold">
              {day.toLocaleDateString("vi-VN", { weekday: "long" })}
            </p>
            <p className="text-sm text-gray-500">{day.toLocaleDateString()}</p>
          </div>

          <div className="col-span-2">
            <textarea
              placeholder="Chi tiết công việc"
              className="border rounded p-2 resize-y min-h-[60px] w-full"
              value={weekData[index]?.work || ""}
              onChange={(e) => handleChange(index, "work", e.target.value)}
            ></textarea>
          </div>

          <div>
            <input
              type="number"
              placeholder="Số cửa hàng"
              className="border rounded p-2 w-full"
              value={weekData[index]?.storeNumber || ""}
              onChange={(e) =>
                handleChange(index, "storeNumber", e.target.value)
              }
            />
          </div>

          <div>
            <input
              type="number"
              placeholder="Số siêu thị"
              className="border rounded p-2 w-full"
              value={weekData[index]?.martNumber || ""}
              onChange={(e) =>
                handleChange(index, "martNumber", e.target.value)
              }
            />
          </div>
        </div>
      ))}
      {loading && <LoadingModal message={"Loading..."} />}
    </div>
  );
};

export default Calendar;
