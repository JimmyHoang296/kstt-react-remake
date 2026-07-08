import { supabase } from './supabaseClient';
import { URL as MAIN_URL } from '../assets/variables';

// Store search stays on its own Google Apps Script deployment.
const STORE_SEARCH_URL =
  'https://script.google.com/macros/s/AKfycbzpnjGlXSJheKpWsN9C-YqD5npxEF07yIiz3WTDAh3xFFmjDFHovVY7uSVDBmh4xjMu/exec';

// GAS fetch — kept only for features that need Google services (doc gen, store search).
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

// Build a DB row from a form object: keep only whitelisted columns and coerce types.
function sanitize(obj, { cols, nums = [], dates = [] }) {
  const row = {};
  for (const c of cols) {
    if (!(c in obj)) continue;
    let v = obj[c];
    if (nums.includes(c)) v = toNum(v);
    else if (dates.includes(c)) v = toDate(v);
    else if (v === '') v = null;
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
const VIOLATION_CFG = {
  cols: ['id', 'user', 'kstt', 'sap', 'store', 'qlkv', 'gdv', 'chain', 'ngayKiemTra',
    'vsattp', 'cauVsattp', 'tonKho', 'cauTonKho', 'gianLan', 'cauGianLan', 'kiemKe',
    'cauKiemKe', 'banHang', 'cauBanHang', 'huy', 'cauHuy', 'stoPo', 'cauStoPo',
    'khac', 'cauKhac', 'batCapVH'],
  dates: ['ngayKiemTra'],
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

// The project caps each response at 1000 rows (PostgREST db-max-rows) and .range()
// cannot exceed it, so page through results until a short page is returned.
// `makeQuery` must return a FRESH query builder on each call.
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

// Fetch a single column for all rows of a table (paginated).
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

async function nextViolationId() {
  const rows = await fetchColumn('violations', 'id');
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

  // Cases — role-based visibility (emp: own; hod: group; else: all).
  const makeCases = () => {
    let q = supabase.from('case').select('*');
    if (user.role === 'emp') q = q.eq('pic', user.name);
    else if (user.role === 'hod') q = q.eq('hod', user.name);
    return q;
  };

  // Violations / calendar / visit plan — the logged-in user's own records.
  const [cases, violations, calendar, visitPlan, empRes, setupRes] = await Promise.all([
    fetchAllRows(makeCases),
    fetchAllRows(() => supabase.from('violations').select('*').ilike('user', user.id)),
    fetchAllRows(() => supabase.from('calendar').select('*').ilike('user', user.id)),
    fetchAllRows(() => supabase.from('visit_plan').select('*').ilike('user', user.id).gte('date', today)),
    supabase.from('app_user').select('name').eq('hod', user.hod),
    supabase.from('setup').select('list,value,pos').order('pos'),
  ]);

  const emps = (empRes.data || []).map((r) => r.name).filter(Boolean);

  const setup = { audits: [], types: [], groups: [], penalties: [] };
  (setupRes.data || []).forEach((r) => {
    if (setup[r.list]) setup[r.list].push(r.value);
  });

  return { user, cases, violations, calendar, visitPlan, emps, setup };
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

  // ---- Violations ----
  createViolation: async (data) => {
    const id = await nextViolationId();
    const row = { ...sanitize(data, VIOLATION_CFG), id };
    const { error } = await supabase.from('violations').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateViolation: async (data) => {
    const { error } = await supabase.from('violations').update(sanitize(data, VIOLATION_CFG)).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteViolation: async (id) => {
    const { error } = await supabase.from('violations').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  // Word-doc generation still runs on Google Apps Script (Docs template in Drive).
  createRecord: (id) => gasFetch('createRecord', id),

  // ---- Visit Plans ----
  createVisitPlan: async (data) => {
    const id = await nextVisitPlanId();
    const row = { ...sanitize(data, VISITPLAN_CFG), id };
    const { error } = await supabase.from('visit_plan').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateVisitPlan: async (data) => {
    const { error } = await supabase.from('visit_plan').update(sanitize(data, VISITPLAN_CFG)).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteVisitPlan: async (id) => {
    const { error } = await supabase.from('visit_plan').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Calendar ----
  updateWork: async (submitArray) => {
    for (const item of submitArray) {
      const row = sanitize(item, CALENDAR_CFG);
      const { data: existing, error: selErr } = await supabase
        .from('calendar')
        .select('id')
        .eq('date', row.date)
        .ilike('user', item.user)
        .limit(1);
      if (selErr) return { success: false, message: selErr.message };
      const err = existing && existing.length
        ? (await supabase.from('calendar').update(row).eq('id', existing[0].id)).error
        : (await supabase.from('calendar').insert(row)).error;
      if (err) return { success: false, message: err.message };
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

  // ---- Store Search (separate GAS endpoint) ----
  searchStore: (query) => gasFetch('searchStore', query, STORE_SEARCH_URL),
};
