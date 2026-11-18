import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { setupPush } from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SESSION_DAYS = 180;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'life.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  pass TEXT NOT NULL, is_admin INTEGER NOT NULL DEFAULT 0, profile TEXT, created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS checks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, key TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, date, key)
);
CREATE TABLE IF NOT EXISTS workout (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, exercise TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0, kg REAL, reps TEXT, PRIMARY KEY (user_id, date, exercise)
);
CREATE TABLE IF NOT EXISTS body (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL,
  weight REAL, fat REAL, visceral REAL, muscle REAL, PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS shopping (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, qty TEXT, section TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
`);

// ---------- contraseñas y sesiones ----------
const hashPass = (pw) => {
  const salt = crypto.randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
const checkPass = (pw, stored) => {
  const [, salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const DUMMY_HASH = hashPass(crypto.randomBytes(8).toString('hex'));

const SHOPPING_SEED = [
  ['Pechuga de pollo', '3 kg', 'Carnicería y huevos'], ['Huevos', '45 (maple y medio)', 'Carnicería y huevos'],
  ['Papa', '1,5 kg', 'Verdulería'], ['Tomate', '1 kg', 'Verdulería'], ['Zanahoria', '500 g', 'Verdulería'],
  ['Zapallitos', '500 g', 'Verdulería'], ['Lechuga', '1', 'Verdulería'], ['Cebolla', '3', 'Verdulería'],
  ['Frutas (bananas y manzanas)', '7', 'Verdulería'], ['Arroz', '400 g', 'Almacén'], ['Fideos secos', '250 g', 'Almacén'],
  ['Atún al natural', '2 latas', 'Almacén'], ['Aceite', '1 (si no tenés)', 'Almacén'],
  ['Sal, pimienta, pimentón, ajo, orégano', 'si faltan', 'Almacén'], ['Brócoli o mix de verduras', '1 kg', 'Congelados'],
];
function createUser({ username, name, password, isAdmin = false, profile = null }) {
  const r = db.prepare('INSERT INTO users (username, name, pass, is_admin, profile) VALUES (?, ?, ?, ?, ?)')
    .run(username, name, hashPass(password), isAdmin ? 1 : 0, profile ? JSON.stringify(profile) : null);
  const id = Number(r.lastInsertRowid);
  const ins = db.prepare('INSERT INTO shopping (user_id, name, qty, section, sort) VALUES (?, ?, ?, ?, ?)');
  SHOPPING_SEED.forEach(([n, q, s], i) => ins.run(id, n, q, s, i));
  return id;
}

// Primer arranque: crea el admin con ADMIN_USERNAME / ADMIN_PASSWORD del .env.
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  const u = process.env.ADMIN_USERNAME, pw = process.env.ADMIN_PASSWORD;
  if (u && pw) {
    createUser({ username: u, name: process.env.ADMIN_NAME || u, password: pw, isAdmin: true });
    console.log(`Admin "${u}" creado.`);
  } else {
    console.warn('No hay usuarios. Definí ADMIN_USERNAME y ADMIN_PASSWORD en el .env y reiniciá.');
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'uniquelocal');
app.use(express.json({ limit: '50kb' }));

const parseCookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const setSession = (req, res, userId) => {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_DAYS * 864e5);
  const secure = req.secure || req.get('x-forwarded-proto') === 'https' || req.get('cf-visitor')?.includes('https');
  res.cookie('life_session', token, { httpOnly: true, sameSite: 'lax', secure: !!secure, maxAge: SESSION_DAYS * 864e5, path: '/' });
};

// Freno simple contra adivinar contraseñas: 8 intentos fallidos por IP cada 15 min.
const fails = new Map();
const tooMany = (ip) => { const f = fails.get(ip); return f && f.n >= 8 && Date.now() - f.t < 15 * 60e3; };
const failed = (ip) => { const f = fails.get(ip); fails.set(ip, f && Date.now() - f.t < 15 * 60e3 ? { n: f.n + 1, t: f.t } : { n: 1, t: Date.now() }); };

app.get('/healthz', (_req, res) => res.send('ok'));

app.post('/api/login', (req, res) => {
  const ip = req.get('cf-connecting-ip') || req.ip;
  if (tooMany(ip)) return res.status(429).json({ error: 'Demasiados intentos. Probá en 15 minutos.' });
  const { username, password } = req.body || {};
  const u = typeof username === 'string' ? db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) : null;
  const ok = checkPass(String(password || ''), u?.pass || DUMMY_HASH) && !!u;
  if (!ok) { failed(ip); return res.status(401).json({ error: 'Usuario o contraseña incorrectos' }); }
  fails.delete(ip);
  setSession(req, res, u.id);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const t = parseCookies(req).life_session;
  if (t) db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
  res.clearCookie('life_session', { path: '/' });
  res.json({ ok: true });
});

// Todo lo que sigue requiere sesión.
app.use('/api', (req, res, next) => {
  const t = parseCookies(req).life_session;
  const row = t && db.prepare(`SELECT u.id, u.username, u.name, u.is_admin, u.profile FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires > ?`).get(t, Date.now());
  if (!row) return res.status(401).json({ error: 'Sesión vencida' });
  req.user = { id: row.id, username: row.username, name: row.name, isAdmin: !!row.is_admin, profile: row.profile ? JSON.parse(row.profile) : null };
  next();
});
const adminOnly = (req, res, next) => (req.user.isAdmin ? next() : res.status(403).json({ error: 'Solo el admin' }));

const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const bad = (res, msg = 'Datos inválidos') => res.status(400).json({ error: msg });
const num = (v) => (v === '' || v == null ? null : Number(v));

app.get('/api/me', (req, res) => res.json(req.user));

const PROFILE_KEYS = ['sex', 'age', 'height', 'weight', 'goalWeight', 'objective', 'wake', 'lunch', 'train', 'dinner', 'sleep', 'location'];
app.put('/api/me/profile', (req, res) => {
  const b = req.body || {};
  const p = {};
  for (const k of PROFILE_KEYS) if (b[k] != null) p[k] = b[k];
  for (const k of ['age', 'height', 'weight', 'goalWeight']) {
    if (p[k] != null) { p[k] = Number(p[k]); if (!Number.isFinite(p[k]) || p[k] <= 0 || p[k] > 400) return bad(res); }
  }
  for (const k of ['wake', 'lunch', 'train', 'dinner', 'sleep']) if (p[k] != null && !/^\d{2}:\d{2}$/.test(p[k])) return bad(res);
  if (p.sex && !['m', 'f'].includes(p.sex)) return bad(res);
  if (p.location != null && !['dumbbells', 'gym', 'bodyweight'].includes(p.location)) return bad(res);
  if (p.objective && !['cut_fast', 'cut', 'maintain', 'gain'].includes(p.objective)) return bad(res);
  p.supps = Object.fromEntries(['ripped', 'carnitina', 'proteina', 'creatina', 'magnesio'].map((k) => [k, !!b.supps?.[k]]));
  db.prepare('UPDATE users SET profile = ? WHERE id = ?').run(JSON.stringify(p), req.user.id);
  if (p.weight) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: process.env.TZ || 'America/Argentina/Cordoba' });
    const hasAny = db.prepare('SELECT 1 FROM body WHERE user_id = ? LIMIT 1').get(req.user.id);
    if (!hasAny) db.prepare('INSERT INTO body (user_id, date, weight) VALUES (?, ?, ?)').run(req.user.id, today, p.weight);
  }
  res.json({ ok: true });
});

app.put('/api/me/password', (req, res) => {
  const { current, next: nw } = req.body || {};
  const u = db.prepare('SELECT pass FROM users WHERE id = ?').get(req.user.id);
  if (!checkPass(String(current || ''), u.pass)) return bad(res, 'La contraseña actual no es correcta');
  if (typeof nw !== 'string' || nw.length < 8) return bad(res, 'La nueva contraseña necesita al menos 8 caracteres');
  db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(hashPass(nw), req.user.id);
  res.json({ ok: true });
});

// ---------- admin: usuarios ----------
app.get('/api/users', adminOnly, (_req, res) => {
  res.json(db.prepare('SELECT id, username, name, is_admin AS isAdmin, created, profile IS NOT NULL AS hasProfile FROM users ORDER BY id').all()
    .map((u) => ({ ...u, isAdmin: !!u.isAdmin, hasProfile: !!u.hasProfile })));
});
app.post('/api/users', adminOnly, (req, res) => {
  const { username, name, password } = req.body || {};
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) return bad(res, 'Usuario: 3 a 30 letras, números, punto o guion');
  if (typeof password !== 'string' || password.length < 8) return bad(res, 'La contraseña necesita al menos 8 caracteres');
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return bad(res, 'Ese usuario ya existe');
  const id = createUser({ username, name: (name || username).slice(0, 60), password });
  res.json({ id });
});
app.put('/api/users/:id/password', adminOnly, (req, res) => {
  const pw = req.body?.password;
  if (typeof pw !== 'string' || pw.length < 8) return bad(res, 'La contraseña necesita al menos 8 caracteres');
  db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(hashPass(pw), Number(req.params.id));
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
app.delete('/api/users/:id', adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return bad(res, 'No podés borrar tu propio usuario');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------- datos del día ----------
app.get('/api/day/:date', (req, res) => {
  const { date } = req.params;
  if (!isDate(date)) return bad(res);
  const uid = req.user.id;
  const checks = Object.fromEntries(db.prepare('SELECT key, done FROM checks WHERE user_id = ? AND date = ?').all(uid, date).map((r) => [r.key, !!r.done]));
  const workout = Object.fromEntries(db.prepare('SELECT exercise, done, kg, reps FROM workout WHERE user_id = ? AND date = ?').all(uid, date)
    .map((r) => [r.exercise, { done: !!r.done, kg: r.kg, reps: r.reps }]));
  const body = db.prepare('SELECT date, weight, fat, visceral, muscle FROM body WHERE user_id = ? AND date = ?').get(uid, date) || null;
  res.json({ checks, workout, body });
});

app.put('/api/check', (req, res) => {
  const { date, key, done } = req.body || {};
  if (!isDate(date) || typeof key !== 'string' || !key || key.length > 40) return bad(res);
  db.prepare(`INSERT INTO checks (user_id, date, key, done) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date, key) DO UPDATE SET done = excluded.done`).run(req.user.id, date, key, done ? 1 : 0);
  res.json({ ok: true });
});

app.put('/api/workout', (req, res) => {
  const { date, exercise, done, kg, reps } = req.body || {};
  if (!isDate(date) || typeof exercise !== 'string' || !exercise || exercise.length > 60) return bad(res);
  const kgVal = num(kg);
  if (kgVal != null && !Number.isFinite(kgVal)) return bad(res);
  db.prepare(`INSERT INTO workout (user_id, date, exercise, done, kg, reps) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date, exercise) DO UPDATE SET done = excluded.done, kg = excluded.kg, reps = excluded.reps`)
    .run(req.user.id, date, exercise, done ? 1 : 0, kgVal, reps ? String(reps).slice(0, 40) : null);
  res.json({ ok: true });
});

app.get('/api/workout/last', (req, res) => {
  const before = isDate(req.query.before) ? req.query.before : '9999-12-31';
  const rows = db.prepare(`SELECT exercise, kg, reps, date FROM workout w
    WHERE user_id = ? AND (kg IS NOT NULL OR reps IS NOT NULL) AND date = (SELECT MAX(date) FROM workout
      WHERE user_id = w.user_id AND exercise = w.exercise AND (kg IS NOT NULL OR reps IS NOT NULL) AND date < ?)`).all(req.user.id, before);
  res.json(Object.fromEntries(rows.map((r) => [r.exercise, { kg: r.kg, reps: r.reps, date: r.date }])));
});

app.get('/api/body', (req, res) => {
  res.json(db.prepare('SELECT date, weight, fat, visceral, muscle FROM body WHERE user_id = ? ORDER BY date').all(req.user.id));
});
app.put('/api/body', (req, res) => {
  const { date } = req.body || {};
  if (!isDate(date)) return bad(res);
  const vals = ['weight', 'fat', 'visceral', 'muscle'].map((k) => num(req.body[k]));
  if (vals.some((v) => v != null && !Number.isFinite(v))) return bad(res);
  db.prepare(`INSERT INTO body (user_id, date, weight, fat, visceral, muscle) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      weight = COALESCE(excluded.weight, weight), fat = COALESCE(excluded.fat, fat),
      visceral = COALESCE(excluded.visceral, visceral), muscle = COALESCE(excluded.muscle, muscle)`)
    .run(req.user.id, date, ...vals);
  res.json({ ok: true });
});
app.delete('/api/body/:date', (req, res) => {
  if (!isDate(req.params.date)) return bad(res);
  db.prepare('DELETE FROM body WHERE user_id = ? AND date = ?').run(req.user.id, req.params.date);
  res.json({ ok: true });
});

app.get('/api/stats', (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return bad(res);
  const rows = db.prepare(`SELECT date, SUM(done) AS done FROM checks
    WHERE user_id = ? AND date BETWEEN ? AND ? AND key NOT LIKE 'agua%' AND key NOT IN ('pasos', 'train') GROUP BY date`).all(req.user.id, from, to);
  const wk = db.prepare('SELECT date, SUM(done) AS done FROM workout WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date').all(req.user.id, from, to);
  res.json({ checks: Object.fromEntries(rows.map((r) => [r.date, r.done])), workout: Object.fromEntries(wk.map((r) => [r.date, r.done])) });
});

app.get('/api/shopping', (req, res) => {
  res.json(db.prepare('SELECT id, name, qty, section, checked, sort FROM shopping WHERE user_id = ? ORDER BY sort, id').all(req.user.id)
    .map((r) => ({ ...r, checked: !!r.checked })));
});
app.post('/api/shopping', (req, res) => {
  const { name, qty, section } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return bad(res);
  const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM shopping WHERE user_id = ?').get(req.user.id).s;
  const r = db.prepare('INSERT INTO shopping (user_id, name, qty, section, sort) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, name.trim().slice(0, 80), String(qty || '').slice(0, 40), String(section || 'Otros').slice(0, 40), sort);
  res.json({ id: Number(r.lastInsertRowid) });
});
app.patch('/api/shopping/:id', (req, res) => {
  db.prepare('UPDATE shopping SET checked = ? WHERE id = ? AND user_id = ?').run(req.body?.checked ? 1 : 0, Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
app.delete('/api/shopping/:id', (req, res) => {
  db.prepare('DELETE FROM shopping WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
app.post('/api/shopping/reset', (req, res) => {
  db.prepare('UPDATE shopping SET checked = 0 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

setupPush(app, db, DATA_DIR);

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist, { maxAge: '1h', index: false }));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`life escuchando en :${PORT}`));
