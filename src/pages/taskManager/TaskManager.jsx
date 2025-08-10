import React, { useState } from "react";
import { mockData } from "../../assets/mockData";
import { Eye, Plus, Save, Trash } from "lucide-react";

// Task Management Component (CRUD)
const TaskManager = () => {
  const [tasks, setTasks] = useState(mockData.tasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState({email:''})
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.pic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdate = (updatedTask) => {
    setTasks(
      tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    handleCloseModal();
  };

  const handleDelete = (taskId) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
    handleCloseModal();
  };

  // Add functionality for creating a new task
  const handleAddNewTask = () => {
    setSelectedTask({}); // Open modal with empty form for new task
    setIsModalOpen(true);
  };

  const handleSaveNewTask = (newTask) => {
    setTasks([...tasks, { ...newTask, id: tasks.length + 1 }]);
    handleCloseModal();
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <div className="mb-6 border-b pb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Sự vụ</h2>
        <button
          onClick={handleAddNewTask}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center"
        >
          <Plus className="mr-2" /> Thêm sự vụ
        </button>
      </div>

      {/* Search section */}
      <div className="mb-2">
        <div className="col-span-2">
          <label className="block text-gray-700 text-sm mb-1">
            Tiêu đề email
          </label>
          <input
            type="text"
            name="email"
            value={search.email}
            onChange={handleSearchChange}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>
      {/* Task List Section */}
      <div className="pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Danh sách sự vụ</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="p-2 border rounded-lg"
            />
            <button
              onClick={() => setSearchQuery("")}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Clear Search
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  pic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  startDate
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{task.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.status === "Đang xử lý"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.pic}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.startDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleOpenModal(task)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Eye className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
          onSave={handleSaveNewTask}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

// Task Detail Modal Component
const TaskDetailModal = ({ task, onClose, onSave, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState(
    task || {
      email: "",
      status: "",
      category: "",
      source: "",
      shopCode: "",
      shopName: "",
      assignedTo: "",
      supporting: "",
      completionDate: "",
      violationGroup: "",
      lossValue: "",
      recoveredValue: "",
      summary: "",
      notes: "",
      conclusion: "",
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isNewTask = !task?.id;

  const handleSave = () => {
    if (isNewTask) {
      onSave(formData);
    } else {
      onUpdate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 mb-4 border-b">
          <h3 className="text-2xl font-bold">
            {isNewTask ? "Thêm sự vụ mới" : "Chi tiết sự vụ"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        {/* Form content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="col-span-2">
              <label className="block text-gray-700 text-sm mb-1">
                Tiêu đề email
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Nhân sự phụ trách
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option>Vinh Van Phuoc</option>
                <option>John Doe</option>
                <option>Jane Smith</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">Source</label>
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Phân loại
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option>Kiểm kê</option>
                <option>Sự vụ</option>
                <option>ABC</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">Mã SAP</label>
              <input
                type="text"
                name="shopCode"
                value={formData.shopCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Tên cơ sở
              </label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Trạng thái
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option>Đang xử lý</option>
                <option>Hoàn thành</option>
                <option>Đã đóng</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Phân loại mức độ
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Ngày giao việc
              </label>
              <input
                type="date"
                name="assignedDate"
                value={formData.assignedDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Ngày hoàn thành
              </label>
              <input
                type="date"
                name="completionDate"
                value={formData.completionDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Nhóm lỗi vi phạm
              </label>
              <input
                type="text"
                name="violationGroup"
                value={formData.violationGroup}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Giá trị thất thoát
              </label>
              <input
                type="number"
                name="lossValue"
                value={formData.lossValue}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Giá trị thu hồi
              </label>
              <input
                type="number"
                name="recoveredValue"
                value={formData.recoveredValue}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-gray-700 text-sm mb-1">
              Tóm tắt vấn đề
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md h-24"
            ></textarea>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-gray-700 text-sm mb-1">
              Note và cập nhật
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md h-24"
            ></textarea>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-gray-700 text-sm mb-1">Kết luận</label>
            <textarea
              name="conclusion"
              value={formData.conclusion}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md h-24"
            ></textarea>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 mt-4 border-t pt-4">
          <button
            onClick={handleSave}
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center"
          >
            <Save className="mr-2" /> Lưu
          </button>
          {!isNewTask && (
            <button
              onClick={() => onDelete(task.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
            >
              <Trash className="mr-2" /> Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
