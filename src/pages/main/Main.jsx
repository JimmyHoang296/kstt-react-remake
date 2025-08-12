import React from 'react'
import { Clock, ListTodo } from 'lucide-react';

// Dashboard Component
const Dashboard = ({data}) => {
  
  const pendingTasks = data.caseObj.filter(task => task.status === 'Đang xử lý').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4">
        <div className="p-3 bg-indigo-100 rounded-full text-indigo-500">
          <ListTodo className="w-6 h-6" />
        </div>
        <div>
          <p className="text-gray-500">Việc đang xử lý</p>
          <p className="text-3xl font-bold">{pendingTasks}</p>
        </div>
      </div>
      {/* <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4">
        <div className="p-3 bg-red-100 rounded-full text-red-500">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-gray-500">Việc quá hạn</p>
          <p className="text-3xl font-bold">{overdueTasks}</p>
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard