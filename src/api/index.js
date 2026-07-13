import { supabase } from './supabaseClient';
import { URL as MAIN_URL } from '../assets/variables';

// GAS fetch — kept only for features that need Google services (doc gen).
async function gasFetch(type, data, url = MAIN_URL) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ type, data }),
  });
  return response.json();
}

// ───────────────────────── helpers ──────────────────────────────────────────

const toNum = (v) =>
  v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
const toDate = (v) =>
  v === '' || v === null || v === undefined ? null : String(v).slice(0, 10);

function sanitize(obj, { cols, nums = [], dates = [] }) {
  const row = {};
  for (const c of cols) {
    if (!(c in obj)) continue;
    let v = obj[c];
    if (nums.includes(c)) v = toNum(v);
    else if (dates.includes(c)) v = toDate(v);
    else if (!Array.isArray(v) && v === '') v = null;
    row[c] = v;
  }
  return row;
}

const CASE_CFG = {
  cols: ['id', 'email', 'rank', 'status', 'source', 'sap', 'store', 'summarize', 'pic',
    'support', 'hod', 'startDate', 'endDate', 'group', 'lossValue', 'returnValue',
    'conclusion', 'note', 'type'],
  nums: ['rank', 'lossValue', 'returnValue'],
  dates: ['startDate', 'endDate'],
};

const INSPECTION_CFG = {
  cols: ['id', 'user', 'kstt', 'sap', 'store', 'qlkv', 'gdv', 'chain', 'ngayKiemTra', 'batCapVH'],
  dates: ['ngayKiemTra'],
};

const VIOLATION_ITEM_CFG = {
  cols: ['id', 'inspection_id', 'nhom', 'hanh_vi', 'mo_ta', 'nguyen_nhan',
    'trang_thai', 'gia_tri', 'ma_nv', 'ten_nv', 'xlvp',
    'ket_luan', 'nd_ket_luan', 'nd_vi_pham', 'nhom_loi', 'loi_chi_tiet', 'chuc_danh'],
  nums: ['gia_tri'],
};

const VISITPLAN_CFG = {
  cols: ['id', 'date', 'site', 'path', 'status', 'user'],
  dates: ['date'],
};

const CALENDAR_CFG = {
  cols: ['date', 'user', 'name', 'work', 'storeNumber', 'martNumber'],
  nums: ['storeNumber', 'martNumber'],
  dates: ['date'],
};

const bangkokToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const PAGE_SIZE = 1000;
async function fetchAllRows(makeQuery) {
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function fetchColumn(table, col) {
  return fetchAllRows(() => supabase.from(table).select(col));
}

async function nextCaseId() {
  const rows = await fetchColumn('case', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.id).replace(/^I/i, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'I' + (max + 1);
}

async function nextInspectionId() {
  const rows = await fetchColumn('inspections', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.id).replace(/^SV/i, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'SV' + String(max + 1).padStart(5, '0');
}

async function nextVisitPlanId() {
  const rows = await fetchColumn('visit_plan', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = Number(r.id);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

// ───────────────────────── bulk load (login / refresh) ───────────────────────

async function getData(u) {
  const user = { id: u.user, name: u.name, role: u.role, hod: u.hod, director: u.director };
  const today = bangkokToday();

  const makeCases = () => {
    let q = supabase.from('case').select('*');
    if (user.role === 'emp') q = q.eq('pic', user.name);
    else if (user.role === 'hod') q = q.eq('hod', user.name);
    return q;
  };

  const [cases, inspections, calendar, visitPlan, empRes, setupRes, nhomRes] = await Promise.all([
    fetchAllRows(makeCases),
    fetchAllRows(() => supabase.from('inspections').select('*').ilike('user', user.id)),
    fetchAllRows(() => supabase.from('calendar').select('*').ilike('user', user.id)),
    fetchAllRows(() => supabase.from('visit_plan').select('*').ilike('user', user.id).gte('date', today)),
    supabase.from('app_user').select('name').eq('hod', user.hod),
    supabase.from('setup').select('list,value,pos').order('pos'),
    supabase.from('nhom_ghi_nhan').select('*').order('STT'),
  ]);

  const emps = (empRes.data || []).map((r) => r.name).filter(Boolean);

  const setup = { audits: [], types: [], groups: [], penalties: [] };
  (setupRes.data || []).forEach((r) => {
    if (setup[r.list]) setup[r.list].push(r.value);
  });

  const nhomGhiNhan = (nhomRes.data || []).map((r) => ({
    nhom: r['Nhóm hành vi'],
    hanhVi: r['Hành vi'],
  }));

  return { user, cases, inspections, calendar, visitPlan, emps, setup: { ...setup, nhomGhiNhan } };
}

async function findUser(username) {
  const { data, error } = await supabase.from('app_user').select('*').ilike('user', username);
  if (error) throw error;
  return (data || []).find(
    (r) => String(r.user).toLowerCase() === String(username).toLowerCase()
  );
}

// ───────────────────────── calendar (team / director) ────────────────────────

async function calendarInRange(startDate, endDate, userSet) {
  const rows = await fetchAllRows(() =>
    supabase.from('calendar').select('*').gte('date', startDate).lte('date', endDate)
  );
  return rows.filter((r) => userSet.has(String(r.user || '').toLowerCase()));
}

// ───────────────────────── public API ────────────────────────────────────────

export const api = {
  // ---- auth / bulk load ----
  login: async ({ username, password }) => {
    const u = await findUser(username);
    if (!u || String(u.password) !== String(password)) return { success: false };
    return { success: true, data: await getData(u) };
  },

  refreshData: async (userId) => {
    const u = await findUser(userId);
    if (!u) return { success: false };
    return { success: true, data: await getData(u) };
  },

  // ---- Cases (TaskManager) ----
  createCase: async (data) => {
    const id = await nextCaseId();
    const row = { ...sanitize(data, CASE_CFG), id };
    const { error } = await supabase.from('case').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateCase: async (data) => {
    const { error } = await supabase.from('case').update(sanitize(data, CASE_CFG)).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteCase: async (id) => {
    const { error } = await supabase.from('case').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Inspections ----
  createInspection: async (data) => {
    const id = await nextInspectionId();
    const row = { ...sanitize(data, INSPECTION_CFG), id };
    const { error } = await supabase.from('inspections').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateInspection: async (data) => {
    const { error } = await supabase
      .from('inspections')
      .update(sanitize(data, INSPECTION_CFG))
      .eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteInspection: async (id) => {
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Violation items ----
  getViolationsByInspection: async (inspectionId) => {
    const { data, error } = await supabase
      .from('violations')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('id');
    if (error) return { success: false, message: error.message };
    return { success: true, data: data || [] };
  },
  createViolationItem: async (data) => {
    const row = sanitize(data, VIOLATION_ITEM_CFG);
    delete row.id;
    const { data: inserted, error } = await supabase
      .from('violations')
      .insert(row)
      .select('id')
      .single();
    return error ? { success: false, message: error.message } : { success: true, data: inserted.id };
  },
  updateViolationItem: async (data) => {
    const row = sanitize(data, VIOLATION_ITEM_CFG);
    const { error } = await supabase.from('violations').update(row).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteViolationItem: async (id) => {
    const { error } = await supabase.from('violations').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- TH Nhóm 1 & Nhóm Khác ----
  getThNhom1: async ({ role, userName, emps }) => {
    let q = supabase.from('th_nhom_1').select('*').order('week', { ascending: false });
    if (role === 'emp') q = q.eq('kstt_submitted', userName);
    else if (role === 'hod') q = q.in('kstt_submitted', [...new Set([userName, ...emps])]);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  getThNhomKhac: async ({ role, userName, emps }) => {
    let q = supabase.from('th_nhom_khac').select('*').order('week', { ascending: false });
    if (role === 'emp') q = q.eq('kstt_submitted', userName);
    else if (role === 'hod') q = q.in('kstt_submitted', [...new Set([userName, ...emps])]);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },

  // Word-doc generation still runs on Google Apps Script (Docs template in Drive).
  createRecord: (data) => gasFetch('createRecord', data),
  // Fire-and-forget Telegram notification after creating a new inspection.
  notify: (data) => gasFetch('notify', data),

  // ---- Visit Plans ----
  createVisitPlan: async (data) => {
    const id = await nextVisitPlanId();
    const row = { ...sanitize(data, VISITPLAN_CFG), id };
    const { error } = await supabase.from('visit_plan').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateVisitPlan: async (data) => {
    const { error } = await supabase
      .from('visit_plan')
      .update(sanitize(data, VISITPLAN_CFG))
      .eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteVisitPlan: async (id) => {
    const { error } = await supabase.from('visit_plan').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Calendar ----
  updateWork: async (submitArray) => {
    for (const item of submitArray) {
      const row = { ...sanitize(item, CALENDAR_CFG), user: String(item.user).toLowerCase() };
      const { data: updated, error: updErr } = await supabase
        .from('calendar')
        .update(row)
        .eq('date', row.date)
        .ilike('user', row.user)
        .select('date');
      if (updErr) return { success: false, message: updErr.message };
      if (!updated || updated.length === 0) {
        const { error: insErr } = await supabase.from('calendar').insert(row);
        if (insErr) {
          if (insErr.code === '23505') {
            const { error: retryErr } = await supabase
              .from('calendar').update(row).eq('date', row.date).ilike('user', row.user);
            if (retryErr) return { success: false, message: retryErr.message };
          } else {
            return { success: false, message: insErr.message };
          }
        }
      }
    }
    return { success: true };
  },

  getTeamCalendar: async ({ hodName, startDate, endDate }) => {
    const { data: empRows, error } = await supabase
      .from('app_user').select('user,name').eq('hod', hodName).eq('role', 'emp');
    if (error) return { success: false, message: error.message };
    const emps = (empRows || []).map((r) => ({ user: r.user, name: r.name }));
    const userSet = new Set(emps.map((e) => String(e.user).toLowerCase()));
    const calendar = userSet.size ? await calendarInRange(startDate, endDate, userSet) : [];
    return { success: true, data: { emps, calendar } };
  },

  getAllCalendar: async ({ directorName, startDate, endDate }) => {
    const { data: empRows, error } = await supabase
      .from('app_user').select('user,name,role').eq('director', directorName);
    if (error) return { success: false, message: error.message };
    const emps = (empRows || [])
      .filter((r) => r.role !== 'director')
      .map((r) => ({ user: r.user, name: r.name }));
    const userSet = new Set(emps.map((e) => String(e.user).toLowerCase()));
    const calendar = userSet.size ? await calendarInRange(startDate, endDate, userSet) : [];
    return { success: true, data: { emps, calendar } };
  },

  // ---- Store Search ----
  searchStore: async ({ site, siteName, siteAdd }) => {
    let q = supabase.from('stores').select('*');
    if (site) q = q.ilike('store', `%${site}%`);
    if (siteName) q = q.ilike('store_name', `%${siteName}%`);
    if (siteAdd) q = q.ilike('address', `%${siteAdd}%`);
    const { data, error } = await q.limit(100);
    if (error) return { result: [] };
    const result = (data || []).map((r) => ({
      site: r.store,
      siteName: r.store_name,
      address: r.address,
      CHT: r.CHT,
      CHTPhone: r['SDT CHT'],
      QLKV: r.QLKV,
      GDV: r.GDV,
      KSTT: r.kstt,
      lat: r.lat,
      long: r.long,
    }));
    return { result };
  },
};
