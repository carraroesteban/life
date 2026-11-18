// API de prueba: todo vive en memoria y se pierde al recargar. No toca ninguna base de datos.
const today = new Date().toLocaleDateString('en-CA');
const ME = {
  id: 1, username: 'demo', name: 'Demo', isAdmin: true,
  profile: { sex: 'm', age: 26, height: 180, weight: 104, goalWeight: 87, objective: 'cut_fast', location: 'dumbbells', wake: '08:45', lunch: '12:00', train: '19:00', dinner: '21:00', sleep: '00:00',
    supps: { ripped: true, carnitina: true, proteina: true, creatina: true, magnesio: true } },
};
const USERS = [{ id: 1, username: 'demo', name: 'Demo', isAdmin: true, hasProfile: true, created: today }];
const S = {
  checks: {}, // date -> { key: bool }
  workout: {}, // date -> { exercise: {done,kg,reps} }
  body: [{ date: today, weight: 104, fat: 33.2, visceral: 13, muscle: 66 }],
  shopping: [
    ['Pechuga de pollo', '3 kg', 'Carnicería y huevos'], ['Huevos', '45 (maple y medio)', 'Carnicería y huevos'],
    ['Papa', '1,5 kg', 'Verdulería'], ['Tomate', '1 kg', 'Verdulería'], ['Zanahoria', '500 g', 'Verdulería'],
    ['Zapallitos', '500 g', 'Verdulería'], ['Lechuga', '1', 'Verdulería'], ['Cebolla', '3', 'Verdulería'],
    ['Frutas (bananas y manzanas)', '7', 'Verdulería'], ['Arroz', '400 g', 'Almacén'], ['Fideos secos', '250 g', 'Almacén'],
    ['Atún al natural', '2 latas', 'Almacén'], ['Aceite', '1 (si no tenés)', 'Almacén'],
    ['Sal, pimienta, pimentón, ajo, orégano', 'si faltan', 'Almacén'], ['Brócoli o mix de verduras', '1 kg', 'Congelados'],
  ].map(([name, qty, section], i) => ({ id: i + 1, name, qty, section, checked: false, sort: i })),
  nextId: 100,
};
const ok = (v = { ok: true }) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 40));
const num = (v) => (v === '' || v == null ? null : Number(v));

export const demoApi = {
  login: () => ok(),
  logout: () => ok(),
  me: () => ok(ME),
  saveProfile: (p) => { ME.profile = { ...p }; return ok(); },
  changePassword: () => ok(),
  users: () => ok(USERS),
  createUser: ({ username, name }) => { const id = USERS.length + 1; USERS.push({ id, username, name: name || username, isAdmin: false, hasProfile: false, created: today }); return ok({ id }); },
  resetPassword: () => ok(),
  deleteUser: (id) => { const i = USERS.findIndex((u) => u.id === id); if (i > 0) USERS.splice(i, 1); return ok(); },
  day: (date) => ok({ checks: S.checks[date] || {}, workout: S.workout[date] || {}, body: S.body.find((b) => b.date === date) || null }),
  check: (date, key, done) => { (S.checks[date] ||= {})[key] = !!done; return ok(); },
  workout: ({ date, exercise, done, kg, reps }) => { (S.workout[date] ||= {})[exercise] = { done: !!done, kg: num(kg), reps: reps || null }; return ok(); },
  lastLoads: (before = '9999') => {
    const out = {};
    Object.keys(S.workout).filter((d) => d < before).sort().forEach((d) => Object.entries(S.workout[d]).forEach(([e, v]) => { if (v.kg != null || v.reps) out[e] = { kg: v.kg, reps: v.reps, date: d }; }));
    return ok(out);
  },
  body: () => ok([...S.body].sort((a, b) => a.date.localeCompare(b.date))),
  saveBody: (b) => {
    const cur = S.body.find((x) => x.date === b.date);
    const vals = Object.fromEntries(['weight', 'fat', 'visceral', 'muscle'].map((k) => [k, num(b[k])]));
    if (cur) Object.entries(vals).forEach(([k, v]) => { if (v != null) cur[k] = v; });
    else S.body.push({ date: b.date, ...vals });
    return ok();
  },
  deleteBody: (date) => { S.body = S.body.filter((b) => b.date !== date); return ok(); },
  stats: (from, to) => {
    const sum = (src) => Object.fromEntries(Object.entries(src).filter(([d]) => d >= from && d <= to)
      .map(([d, o]) => [d, Object.entries(o).filter(([k, v]) => !/^agua|^pasos$|^train$/.test(k) && (typeof v === 'object' ? v.done : v)).length]));
    return ok({ checks: sum(S.checks), workout: sum(S.workout) });
  },
  shopping: () => ok(S.shopping),
  addItem: ({ name, qty, section }) => { const id = S.nextId++; S.shopping.push({ id, name, qty: qty || '', section: section || 'Otros', checked: false, sort: id }); return ok({ id }); },
  toggleItem: (id, checked) => { const it = S.shopping.find((x) => x.id === id); if (it) it.checked = !!checked; return ok(); },
  deleteItem: (id) => { S.shopping = S.shopping.filter((x) => x.id !== id); return ok(); },
  resetShopping: () => { S.shopping.forEach((x) => { x.checked = false; }); return ok(); },
};
