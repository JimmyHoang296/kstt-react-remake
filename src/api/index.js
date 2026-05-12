import { URL as MAIN_URL } from '../assets/variables';

const STORE_SEARCH_URL =
  'https://script.google.com/macros/s/AKfycbzpnjGlXSJheKpWsN9C-YqD5npxEF07yIiz3WTDAh3xFFmjDFHovVY7uSVDBmh4xjMu/exec';

async function apiFetch(type, data, url = MAIN_URL) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ type, data }),
  });
  return response.json();
}

export const api = {
  login: (credentials) => apiFetch('login', credentials),

  // Cases (TaskManager)
  createCase: (data) => apiFetch('new', data),
  updateCase: (data) => apiFetch('update', data),
  deleteCase: (id) => apiFetch('delete', id),

  // Violations
  createViolation: (data) => apiFetch('newViolation', data),
  updateViolation: (data) => apiFetch('updateViolation', data),
  deleteViolation: (id) => apiFetch('deleteViolation', id),
  createRecord: (id) => apiFetch('createRecord', id),

  // Visit Plans
  createVisitPlan: (data) => apiFetch('createVisitPlan', data),
  updateVisitPlan: (data) => apiFetch('updateVisitPlan', data),
  deleteVisitPlan: (id) => apiFetch('deleteVisitPlan', id),

  // Calendar
  updateWork: (data) => apiFetch('updateWork', data),
  getTeamCalendar: (data) => apiFetch('getTeamCalendar', data),
  getAllCalendar: (data) => apiFetch('getAllCalendar', data),

  // Store Search (different endpoint)
  searchStore: (query) => apiFetch('searchStore', query, STORE_SEARCH_URL),
};
