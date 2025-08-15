import React, { useEffect, useState } from 'react'
import { Save, Trash, PlusCircle } from 'lucide-react';
import { getTodayDateString, toDateInputValue } from '../../assets/helpers';
import SuggestInput from '../../components/SuggestInput';

const ViolationDetailModal = ({ data, task, onClose, onSave, onUpdate, onDelete }) => {
    const [formData, setFormData] = useState(task || {
        id: "",
        email: "",
        rank: "",
        status: "",
        type: "",
        source: "",
        sap: "",
        store: "",
        pic: data.user.name,
        date: getTodayDateString(),
        endDate: "",
        group: "",
        lossValue: "",
        returnValue: "",
        summarize: "",
        note: "",
        conclusion: "",
    });

    const [violations, setViolations] = useState(task.violations);

    const isNewTask = !task?.id;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const finalData = {
            ...formData,
            violations
        };

        if (isNewTask) {
            if (!formData.email) {
                alert('Hãy nhập email');
                return;
            }
            if (!formData.pic) {
                alert('Hãy chọn PIC');
                return;
            }
            onSave(finalData);
        } else {
            onUpdate(finalData);
        }
    };

    const handleCreateViolation = () => {
        const newViolation = {};
        setViolations(prev => [...prev, newViolation]);
    };

    const handleViolationChange = (index, field, value) => {
        setViolations(prev => {
            const updated = [...prev];
            updated[index][field] = value;
            return updated;
        });
    };

    const handleDeleteViolation = (index) => {
        setViolations(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 mb-4 border-b">
                    <h3 className="text-2xl font-bold">
                        {isNewTask ? "Ghi nhận mới" : "Chi tiết ghi nhận"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-600 text-5xl"
                    >
                        &times;
                    </button>
                </div>

                {/* Form nội dung chính */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <SuggestInput label={"Đợt kiểm tra"} name={"audit"} onChange={handleInputChange} options={data.setup.audit} value={formData.audit} />
                        <div>
                            <label className="block text-gray-700 text-sm mb-1">Ngày kiểm tra</label>
                            <input
                                type="date"
                                name="date"
                                value={toDateInputValue(formData.date)}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            />
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
                            <label className="block text-gray-700 text-sm mb-1">Tên cơ sở</label>
                            <input
                                type="text"
                                name="store"
                                value={formData.store}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Danh sách violations */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-bold">Danh sách ghi nhận</h4>
                        <button
                            onClick={handleCreateViolation}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 flex items-center"
                        >
                            <PlusCircle className="mr-1" size={18} /> Thêm ghi nhận
                        </button>
                    </div>
                    {violations.length === 0 && (
                        <p className="text-gray-500 italic">Chưa có ghi nhận nào.</p>
                    )}
                    <div className="space-y-4">
                        {violations.map((v, index) => (
                            <div key={v.vId} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <strong>{v.vId}</strong>
                                    <button
                                        onClick={() => handleDeleteViolation(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <textarea
                                        value={v.violation}
                                        onChange={(e) => handleViolationChange(index, "violation", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="Nội dung ghi nhận"
                                        rows={3} // số dòng hiển thị ban đầu
                                    />
                                    <input
                                        type="text"
                                        value={v.empId}
                                        onChange={(e) => handleViolationChange(index, "empId", e.target.value)}
                                        className="p-2 border rounded-md"
                                        placeholder="Mã nhân viên"
                                    />
                                    <input
                                        type="text"
                                        value={v.empName}
                                        onChange={(e) => handleViolationChange(index, "empName", e.target.value)}
                                        className="p-2 border rounded-md"
                                        placeholder="Tên nhân viên"
                                    />
                                    <input
                                        type="text"
                                        value={v.rank}
                                        onChange={(e) => handleViolationChange(index, "rank", e.target.value)}
                                        className="p-2 border rounded-md"
                                        placeholder="Rank nhân viên"
                                    />
                                    <input
                                        type="text"
                                        value={v.title}
                                        onChange={(e) => handleViolationChange(index, "title", e.target.value)}
                                        className="p-2 border rounded-md"
                                        placeholder="Chức vụ"
                                    />
                                    <input
                                        type="text"
                                        value={v.group}
                                        onChange={(e) => handleViolationChange(index, "group", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="Nhóm lỗi"
                                    />
                                    <input
                                        type="text"
                                        value={v.type}
                                        onChange={(e) => handleViolationChange(index, "type", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="Phân loại"
                                    />
                                    <input
                                        type="text"
                                        value={v.type2}
                                        onChange={(e) => handleViolationChange(index, "type2", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="chi tiết"
                                    />
                                    <input
                                        type="text"
                                        value={v.conclusion}
                                        onChange={(e) => handleViolationChange(index, "conclusion", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="Kết luận"
                                    />
                                    <input
                                        type="text"
                                        value={v.penalty}
                                        onChange={(e) => handleViolationChange(index, "penalty", e.target.value)}
                                        className="p-2 border rounded-md md:col-span-2"
                                        placeholder="Hình thức XLVP"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nút hành động */}
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

export default ViolationDetailModal;
