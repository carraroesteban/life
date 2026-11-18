import { demoApi } from './api-demo.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function req(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login' && url !== '/api/me') window.dispatchEvent(new Event('life:logout'));
  if (!r.ok) throw new HttpError(r.status, data.error || `Error ${r.status}`);
  return data;
}

const realApi = {
  login: (username, password) => req('POST', '/api/login', { username, password }),
  logout: () => req('POST', '/api/logout'),
  me: () => req('GET', '/api/me'),
  saveProfile: (p) => req('PUT', '/api/me/profile', p),
  changePassword: (current, next) => req('PUT', '/api/me/password', { current, next }),
  users: () => req('GET', '/api/users'),
  createUser: (u) => req('POST', '/api/users', u),
  resetPassword: (id, password) => req('PUT', `/api/users/${id}/password`, { password }),
  deleteUser: (id) => req('DELETE', `/api/users/${id}`),
  day: (date) => req('GET', `/api/day/${date}`),
  check: (date, key, done) => req('PUT', '/api/check', { date, key, done }),
  workout: (data) => req('PUT', '/api/workout', data),
  lastLoads: (before) => req('GET', `/api/workout/last?before=${before}`),
  body: () => req('GET', '/api/body'),
  saveBody: (data) => req('PUT', '/api/body', data),
  deleteBody: (date) => req('DELETE', `/api/body/${date}`),
  stats: (from, to) => req('GET', `/api/stats?from=${from}&to=${to}`),
  shopping: () => req('GET', '/api/shopping'),
  addItem: (data) => req('POST', '/api/shopping', data),
  toggleItem: (id, checked) => req('PATCH', `/api/shopping/${id}`, { checked }),
  deleteItem: (id) => req('DELETE', `/api/shopping/${id}`),
  resetShopping: () => req('POST', '/api/shopping/reset'),
  pushKey: () => req('GET', '/api/push/key'),
  pushSubscribe: (sub) => req('POST', '/api/push/subscribe', sub),
  pushUnsubscribe: (endpoint) => req('POST', '/api/push/unsubscribe', { endpoint }),
  pushTest: () => req('POST', '/api/push/test'),
};

export const DEMO = import.meta.env.VITE_DEMO === '1';
export const api = DEMO ? demoApi : realApi;

export const ymd = (d = new Date()) => d.toLocaleDateString('en-CA');
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export { toMin } from './plan.js';
