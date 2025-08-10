import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

const Calendar = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  const getWeekDays = (startOfWeek) => {
    const days = [];
    let day = new Date(startOfWeek);
    const dayOfWeek = day.getDay();
    const diff = day.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
    day.setDate(diff);

    for (let i = 0; i < 5; i++) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    return days;
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(new Date());
  };

  const weekdays = getWeekDays(currentWeekStart);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <h2 className="text-2xl font-bold">Lịch làm việc</h2>
        <div className="flex space-x-2 items-center">
          <button onClick={handlePreviousWeek} className="p-2 rounded-full hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-semibold text-lg">
            {weekdays[0].toLocaleDateString()} - {weekdays[4].toLocaleDateString()}
          </span>

          <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>

          <button
            onClick={handleThisWeek}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
          >
            Tuần này
          </button>
        </div>
      </div>

      {/* Table header for desktop only */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 font-bold border-b pb-2 mb-2">
        <div>Ngày</div>
        <div>Chi tiết công việc</div>
        <div>Số cửa hàng</div>
        <div>Số siêu thị</div>
      </div>

      {/* Rows */}
      {weekdays.map((day, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start mb-4 border-b pb-4 md:border-0 md:pb-0"
        >
          {/* Date */}
          <div>
            <p className="font-bold">
              {day.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </p>
            <p className="text-sm text-gray-500">{day.toLocaleDateString()}</p>
          </div>

          {/* Detail Work */}
          <div>
            <label className="block text-sm font-medium text-gray-600 md:hidden mb-1">
              Chi tiết công việc
            </label>
            <textarea
              placeholder="Chi tiết công việc"
              className="border rounded p-2 resize-y min-h-[60px] w-full"
            ></textarea>
          </div>

          {/* Store Number */}
          <div>
            <label className="block text-sm font-medium text-gray-600 md:hidden mb-1">
              Số cửa hàng
            </label>
            <input
              type="number"
              placeholder="Số cửa hàng"
              className="border rounded p-2 w-full"
            />
          </div>

          {/* Mart Number */}
          <div>
            <label className="block text-sm font-medium text-gray-600 md:hidden mb-1">
              Số siêu thị
            </label>
            <input
              type="number"
              placeholder="Số siêu thị"
              className="border rounded p-2 w-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Calendar;
