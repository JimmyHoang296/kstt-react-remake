import React, { useState, useEffect } from 'react';
import { Pencil, Plus, Save, Settings, Trash2, Users, X } from 'lucide-react';
import { api } from '../../api';
import useStore from '../../store/useStore';

const TABS = [
  { key: 'app_user',      label: 'Người dùng' },
  { key: 'nhom_loi',      label: 'Nhóm lỗi' },
  { key: 'nhom_ghi_nhan', label: 'Nhóm ghi nhận' },
  { key: 'setup',         label: 'Cài đặt' },
];

const INPUT = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
const LABEL = 'block text-xs font-medium text-gray-600 mb-1';

function EditModal({ title, children, onClose, onSave, saving }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded text-gray-600 hover:bg-gray-50">Hủy</button>
          <button onClick={onSave} disabled={saving}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-60">
            <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableShell({ onAdd, children }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> Thêm
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        {children}
      </div>
    </div>
  );
}

function ActionCell({ onEdit, onDelete }) {
  return (
    <td className="px-3 py-2">
      <div className="flex gap-2 justify-end">
        <button onClick={onEdit} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Pencil size={13} /></button>
        <button onClick={onDelete} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
      </div>
    </td>
  );
}

// ─── App User Editor ──────────────────────────────────────────────────────────

const ROLE_OPTS = ['emp', 'hod', 'director'];

const EMPTY_USER = { user: '', name: '', password: '', role: 'emp', hod: '', director: '', is_admin: false, lead_xlvp: false };

function AppUserEditor() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | { row, isNew }
  const [saving,  setSaving]  = useState(false);
  const addToast = useStore((s) => s.addToast);

  const load = async () => {
    setLoading(true);
    const r = await api.adminGetUsers();
    if (r.success) setRows(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => setEditing({ row: { ...EMPTY_USER }, isNew: true });
  const openEdit = (row) => setEditing({ row: { ...row }, isNew: false });
  const close    = () => setEditing(null);

  const save = async () => {
    const { row, isNew } = editing;
    if (!row.user?.trim() || !row.name?.trim()) {
      addToast('Tên đăng nhập và tên hiển thị không được để trống', 'error'); return;
    }
    if (isNew && !row.password?.trim()) {
      addToast('Mật khẩu không được để trống', 'error'); return;
    }
    setSaving(true);
    const r = await api.adminSaveUser(row, isNew);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); close(); load(); }
    else addToast(r.message, 'error');
  };

  const del = async (row) => {
    if (!window.confirm(`Xoá người dùng "${row.name}"?`)) return;
    const r = await api.adminDeleteUser(row.user);
    if (r.success) { addToast('Đã xoá'); load(); }
    else addToast(r.message, 'error');
  };

  const setField = (k, v) => setEditing((p) => ({ ...p, row: { ...p.row, [k]: v } }));

  const ROLE_BADGE = { emp: 'bg-blue-50 text-blue-700', hod: 'bg-purple-50 text-purple-700', director: 'bg-red-50 text-red-700' };

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="text-gray-400" />
        <span className="text-xs text-gray-500">{rows.length} người dùng</span>
        <button onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> Thêm người dùng
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tên</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">HOD</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Admin</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Lead XLVP</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
            ) : rows.map((row) => (
              <tr key={row.user} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-800 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-gray-500 text-xs font-mono">{row.user}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE[row.role] || 'bg-gray-100 text-gray-600'}`}>{row.role}</span>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{row.hod}</td>
                <td className="px-3 py-2 text-center">
                  {row.is_admin && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">✓</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.lead_xlvp && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(row)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Pencil size={13} /></button>
                    <button onClick={() => del(row)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">
                {editing.isNew ? 'Thêm người dùng' : `Sửa — ${editing.row.name}`}
              </h3>
              <button onClick={close} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Tên đăng nhập</label>
                  <input className={INPUT} value={editing.row.user || ''}
                    readOnly={!editing.isNew}
                    onChange={(e) => setField('user', e.target.value.toLowerCase().trim())}
                    placeholder="login_name"
                    style={!editing.isNew ? { background: '#f9fafb', color: '#6b7280' } : {}} />
                </div>
                <div>
                  <label className={LABEL}>Mật khẩu {!editing.isNew && <span className="text-gray-400">(để trống = không đổi)</span>}</label>
                  <input className={INPUT} value={editing.row.password || ''}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder={editing.isNew ? 'Bắt buộc' : 'Nhập để đổi mật khẩu'} />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={LABEL}>Tên hiển thị</label>
                <input className={INPUT} value={editing.row.name || ''}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Nguyễn Văn A" />
              </div>

              {/* Role + HOD + Director */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={LABEL}>Role</label>
                  <select className={INPUT + ' bg-white'} value={editing.row.role || 'emp'}
                    onChange={(e) => setField('role', e.target.value)}>
                    {ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>HOD</label>
                  <input className={INPUT} value={editing.row.hod || ''}
                    onChange={(e) => setField('hod', e.target.value)} placeholder="Tên HOD" />
                </div>
                <div>
                  <label className={LABEL}>Director</label>
                  <input className={INPUT} value={editing.row.director || ''}
                    onChange={(e) => setField('director', e.target.value)} placeholder="Tên Director" />
                </div>
              </div>

              {/* Flags */}
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                  <input type="checkbox" checked={!!editing.row.is_admin}
                    onChange={(e) => setField('is_admin', e.target.checked)}
                    className="rounded text-indigo-600" />
                  Admin
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                  <input type="checkbox" checked={!!editing.row.lead_xlvp}
                    onChange={(e) => setField('lead_xlvp', e.target.checked)}
                    className="rounded text-indigo-600" />
                  Lead XLVP
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t">
              <button onClick={close} className="px-3 py-1.5 text-sm border rounded text-gray-600 hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-60">
                <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Nhóm lỗi ─────────────────────────────────────────────────────────────────

function NhomLoiEditor() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const addToast = useStore((s) => s.addToast);

  const load = async () => {
    setLoading(true);
    const r = await api.adminGetNhomLoi();
    if (r.success) setRows(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => setEditing({ violation: '', groupName: '' });
  const openEdit = (row) => setEditing({ ...row });
  const close    = () => setEditing(null);

  const save = async () => {
    if (!editing.violation.trim() || !editing.groupName.trim()) {
      addToast('Vui lòng nhập đầy đủ thông tin', 'error'); return;
    }
    setSaving(true);
    const r = await api.adminSaveNhomLoi(editing);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); close(); load(); }
    else addToast(r.message, 'error');
  };

  const del = async (row) => {
    if (!window.confirm('Xoá dòng này?')) return;
    const r = await api.adminDeleteNhomLoi(row.id);
    if (r.success) { addToast('Đã xoá'); load(); }
    else addToast(r.message, 'error');
  };

  return (
    <>
      <TableShell onAdd={openAdd}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm lỗi</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Lỗi chi tiết</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{row.violation}</td>
                <td className="px-3 py-2 text-gray-600">{row.groupName}</td>
                <ActionCell onEdit={() => openEdit(row)} onDelete={() => del(row)} />
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {editing && (
        <EditModal title={editing.id ? 'Sửa nhóm lỗi' : 'Thêm nhóm lỗi'} onClose={close} onSave={save} saving={saving}>
          <div>
            <label className={LABEL}>Nhóm lỗi</label>
            <input className={INPUT} value={editing.violation}
              onChange={(e) => setEditing((p) => ({ ...p, violation: e.target.value }))}
              placeholder="VD: Hành chính" />
          </div>
          <div>
            <label className={LABEL}>Lỗi chi tiết</label>
            <input className={INPUT} value={editing.groupName}
              onChange={(e) => setEditing((p) => ({ ...p, groupName: e.target.value }))}
              placeholder="VD: Sai mẫu biên bản" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Nhóm ghi nhận ────────────────────────────────────────────────────────────

const NHOM_KEY = 'Nhóm hành vi';
const HV_KEY   = 'Hành vi';

function NhomGhiNhanEditor() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const addToast = useStore((s) => s.addToast);

  const load = async () => {
    setLoading(true);
    const r = await api.adminGetNhomGhiNhan();
    if (r.success) setRows(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => setEditing({ STT: '', [NHOM_KEY]: '', [HV_KEY]: '' });
  const openEdit = (row) => setEditing({ ...row });
  const close    = () => setEditing(null);

  const save = async () => {
    if (!editing[NHOM_KEY]?.trim() || !editing[HV_KEY]?.trim()) {
      addToast('Vui lòng nhập nhóm hành vi và hành vi', 'error'); return;
    }
    setSaving(true);
    const r = await api.adminSaveNhomGhiNhan(editing);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); close(); load(); }
    else addToast(r.message, 'error');
  };

  const del = async (row) => {
    if (!window.confirm('Xoá dòng này?')) return;
    const r = await api.adminDeleteNhomGhiNhan(row.id);
    if (r.success) { addToast('Đã xoá'); load(); }
    else addToast(r.message, 'error');
  };

  return (
    <>
      <TableShell onAdd={openAdd}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-16">STT</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm hành vi</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Hành vi</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 text-xs">{row.STT}</td>
                <td className="px-3 py-2 text-gray-700">{row[NHOM_KEY]}</td>
                <td className="px-3 py-2 text-gray-600">{row[HV_KEY]}</td>
                <ActionCell onEdit={() => openEdit(row)} onDelete={() => del(row)} />
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {editing && (
        <EditModal title={editing.id ? 'Sửa hành vi' : 'Thêm hành vi'} onClose={close} onSave={save} saving={saving}>
          <div>
            <label className={LABEL}>STT (thứ tự)</label>
            <input type="number" className={INPUT} value={editing.STT ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, STT: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder="1, 2, 3..." />
          </div>
          <div>
            <label className={LABEL}>Nhóm hành vi</label>
            <input className={INPUT} value={editing[NHOM_KEY] ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, [NHOM_KEY]: e.target.value }))}
              placeholder="VD: An toàn thực phẩm" />
          </div>
          <div>
            <label className={LABEL}>Hành vi</label>
            <input className={INPUT} value={editing[HV_KEY] ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, [HV_KEY]: e.target.value }))}
              placeholder="VD: Dùng dụng cụ không sạch" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function SetupEditor() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [filterList, setFilter] = useState('');
  const addToast = useStore((s) => s.addToast);

  const load = async () => {
    setLoading(true);
    const r = await api.adminGetSetup();
    if (r.success) setRows(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const listOptions = [...new Set(rows.map((r) => r.list).filter(Boolean))].sort();
  const filtered    = filterList ? rows.filter((r) => r.list === filterList) : rows;

  const openAdd  = () => setEditing({ list: filterList || '', value: '', pos: '' });
  const openEdit = (row) => setEditing({ ...row });
  const close    = () => setEditing(null);

  const save = async () => {
    if (!editing.list?.trim() || !editing.value?.trim()) {
      addToast('Vui lòng nhập đầy đủ thông tin', 'error'); return;
    }
    setSaving(true);
    const r = await api.adminSaveSetup(editing);
    setSaving(false);
    if (r.success) { addToast('Đã lưu'); close(); load(); }
    else addToast(r.message, 'error');
  };

  const del = async (row) => {
    if (!window.confirm('Xoá dòng này?')) return;
    const r = await api.adminDeleteSetup(row.id);
    if (r.success) { addToast('Đã xoá'); load(); }
    else addToast(r.message, 'error');
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <select value={filterList} onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">-- Tất cả danh mục --</option>
          {listOptions.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> Thêm
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Danh mục</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Giá trị</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Thứ tự</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 text-xs">{row.list}</td>
                <td className="px-3 py-2 text-gray-700">{row.value}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{row.pos}</td>
                <ActionCell onEdit={() => openEdit(row)} onDelete={() => del(row)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal title={editing.id ? 'Sửa cài đặt' : 'Thêm cài đặt'} onClose={close} onSave={save} saving={saving}>
          <div>
            <label className={LABEL}>Danh mục</label>
            <input className={INPUT} value={editing.list ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, list: e.target.value }))}
              list="admin-list-opts" placeholder="audits / types / groups / penalties" />
            <datalist id="admin-list-opts">
              {listOptions.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
          <div>
            <label className={LABEL}>Giá trị</label>
            <input className={INPUT} value={editing.value ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, value: e.target.value }))}
              placeholder="Giá trị" />
          </div>
          <div>
            <label className={LABEL}>Thứ tự</label>
            <input type="number" className={INPUT} value={editing.pos ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, pos: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder="1, 2, 3..." />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const AdminPage = () => {
  const [tab, setTab] = useState('nhom_loi');
  const isAdmin = useStore((s) => s.data.user?.isAdmin);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 flex items-center gap-2">
        <Settings size={18} className="text-indigo-500" />
        <h2 className="text-base font-bold text-gray-900">Quản trị hệ thống</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'app_user'      && <AppUserEditor />}
          {tab === 'nhom_loi'      && <NhomLoiEditor />}
          {tab === 'nhom_ghi_nhan' && <NhomGhiNhanEditor />}
          {tab === 'setup'         && <SetupEditor />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
