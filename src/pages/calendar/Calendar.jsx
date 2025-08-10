import React, { useState } from 'react'
import { ChevronLeft } from 'lucide-react';
// Calendar Component
const Calendar = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  const getWeekDays = (startOfWeek) => {
    const days = [];
    let day = new Date(startOfWeek);
    const dayOfWeek = day.getDay();
    const diff = day.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
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

  const weekdays = getWeekDays(currentWeekStart);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Lịch làm việc</h2>
        <div className="flex space-x-2">
          <button onClick={handlePreviousWeek} className="p-2 rounded-full hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-lg">
            {weekdays[0].toLocaleDateString()} - {weekdays[4].toLocaleDateString()}
          </span>
          <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {weekdays.map((day, index) => (
          <div key={index} className="border rounded-lg p-4">
            <p className="font-bold">{day.toLocaleDateString('vi-VN', { weekday: 'long' })}</p>
            <p className="text-sm text-gray-500">{day.toLocaleDateString()}</p>
            <div className="mt-2 text-sm text-gray-700">
              {/* Lịch trình công việc sẽ được hiển thị tại đây */}
              Không có sự kiện
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar