import React, { useEffect, useState, useRef } from "react";
import { Save, Trash, PlusCircle, Printer } from "lucide-react";
import { toDateInputValue } from "../../assets/helpers";
import SuggestInput from "../../components/SuggestInput";

const ViolationDetailModal = ({
  data,
  task,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onCreateRecord
}) => {
  const isNewTask = !task?.id;

  const [formData, setFormData] = useState(task || {});
  const [violations, setViolations] = useState(task?.violations || []);

  const violationsListRef = useRef(null);
  const prevLengthRef = useRef(violations.length);

  useEffect(() => {
    if (
      violations.length > prevLengthRef.current &&
      violationsListRef.current
    ) {
      violationsListRef.current.scrollTop = 0;
    }
    prevLengthRef.current = violations.length;
  }, [violations]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    var cleanedViolations = violations.filter((v) => v.violation?.trim());
    cleanedViolations = cleanedViolations.map((v, i) => ({
      ...v,
      vId: formData.id + "_" + (i + 1),
    }));
    const finalData = { ...formData, violations: cleanedViolations };

    if (isNewTask) {
      onSave(finalData);
    } else {
      onUpdate(finalData);
    }

    setViolations(cleanedViolations);
  };

  const handleCreateViolation = () => {
    const newViolation = {
      vId: "",
      violation: "",
      empId: "",
      empName: "",
      rank: "",
      title: "",
      group: data?.setup?.groups?.[0] || "",
      type: data?.setup?.types?.[0] || "",
      type2: "",
      conclusion: "",
      penalty: data?.setup?.penalties?.[0] || "",
    };
    setViolations((prev) => [newViolation, ...prev]);
  };

  const handleViolationChange = (index, field, value) => {
    setViolations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteViolation = (index) => {
    if (
      !violations[index].violation ||
      !confirm("Bạn có chắc muốn xóa ghi nhận này?")
    )
      return;
    setViolations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b">
          <div className="flex items-center space-x-4">
            <h3 className="text-2xl font-bold">
              {isNewTask ? "Ghi nhận mới" : "Chi tiết ghi nhận"}
            </h3>
            <button
              onClick={handleSave}
              className="bg-indigo-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center"
            >
              <Save className="mr-2" /> Lưu
            </button>
            {!isNewTask && (
              <>
              <button
                onClick={() => onDelete(task.id)}
                className="bg-red-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
              >
                <Trash className="mr-2" /> Xóa
              </button>
              <button
                onClick={() => onCreateRecord(task.id)}
                className="bg-green-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
              >
                <Printer className="mr-2" /> Tạo biên bản
              </button>
              
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-5xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SuggestInput
            label={"Đợt kiểm tra"}
            name={"audit"}
            onChange={handleInputChange}
            options={data.setup.audits}
            value={formData.audit || ""}
          />
          <div>
            <label className="block text-gray-700 text-sm mb-1">
              Ngày kiểm tra
            </label>
            <input
              type="date"
              name="date"
              value={toDateInputValue(formData.date) || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-1">Mã SAP</label>
            <input
              type="text"
              name="sap"
              value={formData.sap || ""}
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
              value={formData.store || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        {/* Violations List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-bold">Danh sách ghi nhận</h4>
            <button
              onClick={handleCreateViolation}
              className="bg-green-500 cursor-pointer text-white px-3 py-1 rounded-lg hover:bg-green-600 flex items-center"
            >
              <PlusCircle className="mr-1" size={18} /> Thêm ghi nhận
            </button>
          </div>
          {violations.length === 0 && (
            <p className="text-gray-500 italic">Chưa có ghi nhận nào.</p>
          )}
          <div
            ref={violationsListRef}
            className="space-y-4 max-h-[700px] overflow-y-auto"
          >
            {violations.map((v, index) => (
              <div
                key={index}
                className="border p-4 rounded-lg shadow-sm bg-gray-50"
              >
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleDeleteViolation(index)}
                    className="text-red-500 cursor-pointer hover:text-red-700 flex items-center gap-2"
                  >
                    <Trash size={18} />
                    <span>Xóa ghi nhận</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <textarea
                    value={v.violation || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "violation", e.target.value)
                    }
                    className="p-2 border col-span-2 rounded-md md:col-span-4"
                    placeholder="Nội dung ghi nhận"
                    rows={3}
                  />
                  <input
                    type="text"
                    value={v.empId || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "empId", e.target.value)
                    }
                    className="p-2 border rounded-md"
                    placeholder="Mã nhân viên"
                  />
                  <input
                    type="text"
                    value={v.empName || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "empName", e.target.value)
                    }
                    className="p-2 border rounded-md"
                    placeholder="Tên nhân viên"
                  />
                  <input
                    type="text"
                    value={v.rank || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "rank", e.target.value)
                    }
                    className="p-2 border rounded-md"
                    placeholder="Rank nhân viên"
                  />
                  <input
                    type="text"
                    value={v.title || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "title", e.target.value)
                    }
                    className="p-2 border rounded-md"
                    placeholder="Chức vụ"
                  />
                  <select
                    value={v.group || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "group", e.target.value)
                    }
                    className="p-2 border rounded-md"
                  >
                    {data.setup.groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <select
                    value={v.type || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "type", e.target.value)
                    }
                    className="p-2 border rounded-md"
                  >
                    {data.setup.types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={v.type2 || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "type2", e.target.value)
                    }
                    className="p-2 border rounded-md md:col-span-2"
                    placeholder="Chi tiết"
                  />
                  <input
                    type="text"
                    value={v.conclusion || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "conclusion", e.target.value)
                    }
                    className="p-2 border rounded-md md:col-span-2"
                    placeholder="Kết luận"
                  />
                  <select
                    value={v.penalty || ""}
                    onChange={(e) =>
                      handleViolationChange(index, "penalty", e.target.value)
                    }
                    className="p-2 border rounded-md md:col-span-2"
                  >
                    {data.setup.penalties.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationDetailModal;
