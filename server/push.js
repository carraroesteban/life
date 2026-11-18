// Recordatorios en el celu con Web Push. Cada 30 s mira el plan del día y avisa a la hora de cada tarea pendiente.
import * as webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
import { timeline, isWeekend } from '../src/plan.js';

const TZ = process.env.TZ || 'America/Argentina/Cordoba';

function nowParts() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, hhmm: `${p.hour}:${p.minute}`, dow };
}

export function setupPush(app, db, dataDir) {
  db.exec(`CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, sub TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_sent (user_id INTEGER NOT NULL, date TEXT NOT NULL, key TEXT NOT NULL, PRIMARY KEY (user_id, date, key));`);

  const keyFile = path.join(dataDir, 'vapid.json');
  let keys;
  try { keys = JSON.parse(fs.readFileSync(keyFile, 'utf8')); } catch {
    keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(keyFile, JSON.stringify(keys), { mode: 0o600 });
  }
  webpush.setVapidDetails(process.env.PUSH_CONTACT || 'mailto:admin@localhost', keys.publicKey, keys.privateKey);

  const send = async (userId, payload) => {
    const subs = db.prepare('SELECT endpoint, sub FROM push_subs WHERE user_id = ?').all(userId);
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification(JSON.parse(s.sub), JSON.stringify(payload), { TTL: 600 }); } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(s.endpoint);
        else console.error('push:', e.statusCode || e.message);
      }
    }));
    return subs.length;
  };

  app.get('/api/push/key', (_req, res) => res.json({ key: keys.publicKey }));
  app.post('/api/push/subscribe', (req, res) => {
    const sub = req.body;
    if (!sub?.endpoint || !sub?.keys) return res.status(400).json({ error: 'Suscripción inválida' });
    db.prepare('INSERT INTO push_subs (endpoint, user_id, sub) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET sub = excluded.sub, user_id = excluded.user_id')
      .run(sub.endpoint, req.user.id, JSON.stringify(sub));
    res.json({ ok: true });
  });
  app.post('/api/push/unsubscribe', (req, res) => {
    if (req.body?.endpoint) db.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').run(req.body.endpoint, req.user.id);
    res.json({ ok: true });
  });
  app.post('/api/push/test', async (req, res) => {
    const n = await send(req.user.id, { title: 'Life', body: 'Así te van a llegar los recordatorios.', tag: 'test' });
    res.json({ sent: n });
  });

  const tick = async () => {
    const { date, hhmm, dow } = nowParts();
    const users = db.prepare('SELECT DISTINCT u.id, u.profile FROM users u JOIN push_subs s ON s.user_id = u.id').all();
    for (const u of users) {
      const profile = u.profile ? JSON.parse(u.profile) : null;
      const checks = Object.fromEntries(db.prepare('SELECT key, done FROM checks WHERE user_id = ? AND date = ?').all(u.id, date).map((r) => [r.key, !!r.done]));
      const trains = !isWeekend(dow) || !!checks.train;
      for (const it of timeline(dow, trains, profile)) {
        if (it.time !== hhmm || checks[it.key]) continue;
        const fresh = db.prepare('INSERT OR IGNORE INTO push_sent (user_id, date, key) VALUES (?, ?, ?)').run(u.id, date, it.key).changes;
        if (fresh) await send(u.id, { title: `${it.time} · ${it.title}`, body: it.detail, tag: it.key, url: it.link ? `/#${it.link}` : '/#hoy' });
      }
    }
  };
  setInterval(() => tick().catch((e) => console.error('push tick:', e.message)), 30_000);
}
