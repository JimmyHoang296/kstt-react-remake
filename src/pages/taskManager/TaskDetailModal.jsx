import React, { useEffect, useState } from 'react'
import { Save, Trash } from 'lucide-react';
import { getTodayDateString, toDateInputValue } from '../../assets/helpers';

const typeList = [
    'N1_Gian lận trục lợi',
    'N1_Hành vi trộm cắp tham ô khác',
    'N1_Ra quyết định vượt thẩm quyền gây thiệt hại ĐB nghiêm trọng',
    'N1_Tự ý bỏ việc quá thời gian quy định',
    'N2_Gian lận KK',
    'N2_Gian lận báo cáo',
    'N2_Gian lận chấm công',
    'N2_Các hành vi không tuân thủ có tính chất nghiêm trọng ',
    'N2_Ứng xử thiếu văn hóa',
    'N2_Bao che',
    'N3_Không tuân thủ QTQĐHD',
    'N3_Không kiểm soát được công việc bộ phận',
    'N3_Không hoàn thành nhiệm vụ được giao',
    'N3_Ý thức kém',
    'N3_Lỗi lặp hệ thống',
    'N3_Vô ý tiết lộ thông tin bảo mật',
    'N4_Tác phong diện mạo/SD ĐT sai quy định',
    'N4_ Không thực hiện đầy đủ QTQĐHD/Lỗi KTNV/Sai sót BC',
    'N4_Không phản hồi thông tin theo QĐ',
    'N5_Không chấp hành đầy đủ các quy định hành chính',
]
// Task Detail Modal Component



const TaskDetailModal = ({ data, task, onClose, onSave, onUpdate, onDelete }) => {
    const [formData, setFormData] = useState(task || {
        id: "",
        email: "",
        rank: "",
        status: "",
        type: "",
        source: "",
        sap: "",
        store: "",
        user: data.user.id,
        name: data.user.name,
        startDate: getTodayDateString(),
        endDate: "",
        group: "",
        lossValue: "",
        returnValue: "",
        summarize: "",
        note: "",
        conclusion: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const isNewTask = !task?.id;

    const handleSave = () => {
        if (isNewTask) {
            if (!formData.email) {
                alert('Hãy nhập email')
                return
            }
            if (!formData.pic) {
                alert('Hãy chọn PIC')
                return
            }


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
                        className="text-gray-600 hover:text-gray-600 text-5xl"
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
                                name="pic"
                                value={formData.pic}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            >
                                {data.emps.map((emp, id) => <option key={id}>{emp}</option>)}
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
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            >
                                <option></option>
                                {typeList.map((type,i) => (<option key={i}>{type}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm mb-1">Mã SAP</label>
                            <input
                                type="text"
                                name="sap"
                                value={formData.sap}
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
                                name="store"
                                value={formData.store}
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
                                <option>Đóng khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm mb-1">
                                Phân loại mức độ
                            </label>
                            <select
                                name="category"
                                value={formData.level}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            >
                                <option>Đơn giản</option>
                                <option>Trung bình</option>
                                <option>Phức tạp</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm mb-1">
                                Ngày giao việc
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={toDateInputValue(formData.startDate)}
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
                                name="endDate"
                                value={toDateInputValue(formData.endDate)}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm mb-1">
                                Nhóm lỗi vi phạm
                            </label>
                            <select
                                name="group"
                                value={formData.group}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            >
                                <option></option>
                                <option>Nhóm 1</option>
                                <option>Nhóm 2</option>
                                <option>Nhóm 3</option>
                                <option>Nhóm 4</option>
                                <option>Nhóm 5</option>
                            </select>
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
                                name="returnValue"
                                value={formData.returnValue}
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
                            name="summarize"
                            value={formData.summarize}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md h-24"
                        ></textarea>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-gray-700 text-sm mb-1">
                            Note và cập nhật
                        </label>
                        <textarea
                            name="note"
                            value={formData.note}
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

export default TaskDetailModal