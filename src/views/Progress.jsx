import { useEffect, useMemo, useState } from 'react';
import { Trash2, Flame, Target, TrendingDown, CalendarDays } from 'lucide-react';
import { Card, SectionTitle, PageHeader, Art } from '../ui.jsx';
import { SCENE_ART } from '../art.js';
import { api, ymd, addDays, parseYmd } from '../api.js';
import { withDefaults } from '../plan.js';

const fmt = (n, d = 1) => (n == null ? '–' : n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: 0 }));

function slopePerWeek(points) {
  if (points.length < 2) return null;
  const xs = points.map((p) => parseYmd(p.date).getTime() / 864e5);
  const ys = points.map((p) => p.weight);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

function Chart({ data, goal }) {
  const pts = data.filter((d) => d.weight != null);
  if (pts.length < 2) {
    return (
      <div className="grid gap-3 p-1">
        <Art src={SCENE_ART.progreso} ratio="16 / 9" />
        <p className="text-[14px] text-mute text-center m-0 py-3">Cargá tu peso unos días y acá vas a ver la curva.</p>
      </div>
    );
  }
  const W = 600, H = 200, P = 28;
  const t0 = parseYmd(pts[0].date).getTime(), t1 = parseYmd(pts[pts.length - 1].date).getTime();
  const lo = Math.min(goal, ...pts.map((p) => p.weight)) - 1;
  const hi = Math.max(...pts.map((p) => p.weight)) + 1;
  const x = (d) => P + ((parseYmd(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - P * 2);
  const y = (v) => P / 2 + (1 - (v - lo) / (hi - lo)) * (H - P * 1.5);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.weight).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].date)},${H - P / 2} L${x(pts[0].date)},${H - P / 2} Z`;
  const gy = y(goal);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de peso">
      <defs>
        <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent-fg)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent-fg)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={P} x2={W - P} y1={gy} y2={gy} stroke="var(--accent-fg)" strokeDasharray="4 6" strokeWidth="1.5" />
      <text x={W - P} y={gy - 6} textAnchor="end" fontSize="12" fill="var(--accent-fg)" fontWeight="600">Meta {goal} kg</text>
      <path d={area} fill="url(#wg)" />
      <path d={line} fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.weight)} r="3.5" fill="var(--bg)" stroke="var(--accent-fg)" strokeWidth="2" />)}
      <text x={P} y={H - 2} fontSize="11" fill="var(--fg2)">{parseYmd(pts[0].date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</text>
      <text x={W - P} y={H - 2} textAnchor="end" fontSize="11" fill="var(--fg2)">{parseYmd(pts[pts.length - 1].date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</text>
    </svg>
  );
}

function Heatmap({ stats, today }) {
  const weeks = 12;
  const end = parseYmd(today);
  const weekEnd = addDays(end, 6 - ((end.getDay() + 6) % 7)); // domingo de esta semana
  const start = addDays(weekEnd, -(weeks * 7 - 1));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const k = ymd(d);
    const n = (stats.checks[k] || 0) + (stats.workout[k] || 0);
    cells.push({ k, n, future: d > end });
  }
  const color = (n) => (n === 0 ? 'var(--bg3)' : `color-mix(in srgb, var(--accent-fg) ${Math.min(100, 25 + n * 5)}%, var(--bg3))`);
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {cells.map((c) => (
          <div key={c.k} title={`${c.k}: ${c.n}`} className="aspect-square rounded-[4px]" style={{ background: c.future ? 'transparent' : color(c.n), outline: c.k === today ? '1.5px solid var(--fg)' : 'none' }} />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-mute mt-2"><span>Hace 12 semanas</span><span>Hoy</span></div>
    </div>
  );
}

export default function Progress({ date, profile }) {
  const goal = withDefaults(profile).goalWeight;
  const [body, setBody] = useState([]);
  const [stats, setStats] = useState({ checks: {}, workout: {} });
  const [form, setForm] = useState({ date, weight: '', fat: '', visceral: '', muscle: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.body().then(setBody).catch(() => {});
    api.stats(ymd(addDays(parseYmd(date), -100)), date).then(setStats).catch(() => {});
  };
  useEffect(load, [date]);

  const s = useMemo(() => {
    const pts = body.filter((b) => b.weight != null);
    const start = pts[0]?.weight ?? withDefaults(profile).weight;
    const current = pts.at(-1)?.weight ?? start;
    const recent = pts.filter((p) => parseYmd(p.date) >= addDays(parseYmd(date), -21));
    const rate = slopePerWeek(recent.length >= 2 ? recent : pts);
    const toGo = current - goal;
    const weeks = rate && rate < 0 ? toGo / -rate : null;
    const lastComp = [...body].reverse().find((b) => b.fat != null);
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const k = ymd(addDays(parseYmd(date), -i));
      if ((stats.checks[k] || 0) >= 6) streak++;
      else if (i > 0) break;
    }
    return { current, lost: start - current, start, rate, toGo, weeks, lastComp, streak };
  }, [body, stats, date, goal, profile]);

  const save = async (e) => {
    e.preventDefault();
    const c = (v) => (v === '' ? null : Number(String(v).replace(',', '.')));
    setSaving(true);
    try { await api.saveBody({ date: form.date, weight: c(form.weight), fat: c(form.fat), visceral: c(form.visceral), muscle: c(form.muscle) }); setForm({ ...form, weight: '', fat: '', visceral: '', muscle: '' }); load(); }
    finally { setSaving(false); }
  };
  const del = async (d) => { await api.deleteBody(d); load(); };

  const eta = s.weeks ? addDays(parseYmd(date), Math.round(s.weeks * 7)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : null;

  return (
    <div>
      <PageHeader sub={`Meta: ${fmt(goal)} kg`} title="Progreso" />

      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <Stat icon={<TrendingDown size={17} />} color="var(--accent-fg)" label="Peso actual" value={`${fmt(s.current)} kg`} sub={s.lost > 0 ? `−${fmt(s.lost)} kg desde el inicio` : `Inicio: ${fmt(s.start)} kg`} />
        <Stat icon={<Target size={17} />} color="var(--accent-fg)" label="Faltan" value={`${fmt(Math.max(0, s.toGo))} kg`} sub={eta ? `Llegás en ${eta}` : 'Necesito más pesajes'} />
        <Stat icon={<CalendarDays size={17} />} color="var(--accent-fg)" label="Ritmo" value={s.rate == null ? '–' : `${s.rate > 0 ? '+' : ''}${fmt(s.rate, 2)} kg/sem`}
          sub={s.rate == null ? 'Meta: −0,8 a −1' : s.rate < -1.2 ? 'Muy rápido: sumá arroz' : s.rate > -0.5 ? 'Lento: restá una porción' : 'En el rango ideal'} />
        <Stat icon={<Flame size={17} />} color="var(--accent-fg)" label="Racha" value={`${s.streak} días`} sub="Días con 6+ tareas hechas" />
      </div>

      <SectionTitle>Peso</SectionTitle>
      <Card className="p-3 pt-4"><Chart data={body} goal={goal} /></Card>

      <SectionTitle>Registrar</SectionTitle>
      <Card className="p-4">
        <form onSubmit={save} className="space-y-3">
          <input type="date" value={form.date} max={date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Fecha"
            className="w-full h-11 rounded-xl bg-well border border-line px-3 outline-none " />
          <div className="grid grid-cols-2 gap-2">
            {[['weight', 'Peso', 'kg'], ['fat', 'Grasa', '%'], ['visceral', 'Grasa visceral', ''], ['muscle', 'Músculo', 'kg']].map(([k, l, u]) => (
              <label key={k} className="flex items-center h-12 rounded-xl bg-well border border-line px-3 gap-2 ">
                <span className="text-[13px] text-mute shrink-0">{l}</span>
                <input inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full min-w-0 bg-transparent outline-none text-right font-semibold" aria-label={l} />
                {u && <span className="text-[13px] text-mute">{u}</span>}
              </label>
            ))}
          </div>
          <button disabled={saving || !(form.weight || form.fat || form.visceral || form.muscle)} className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-40">Guardar</button>
          <p className="text-[12px] text-mute">Peso todos los días. Los datos de la balanza Xiaomi, una vez por semana.</p>
        </form>
      </Card>

      {s.lastComp && (
        <>
          <SectionTitle>Composición</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {[['Grasa', `${fmt(s.lastComp.fat)}%`], ['Visceral', fmt(s.lastComp.visceral, 0)], ['Músculo', `${fmt(s.lastComp.muscle)} kg`]].map(([l, v]) => (
              <Card key={l} className="p-3.5"><p className="text-[19px] font-bold">{v}</p><p className="text-[12px] text-mute">{l}</p></Card>
            ))}
          </div>
          <p className="text-[12px] text-mute mt-2 px-1">Medido el {parseYmd(s.lastComp.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. La balanza da aproximaciones: mirá la tendencia.</p>
        </>
      )}

      <SectionTitle>Constancia</SectionTitle>
      <Card className="p-4"><Heatmap stats={stats} today={date} /></Card>

      <SectionTitle>Historial</SectionTitle>
      <Card className="divide-y divide-line">
        {[...body].reverse().slice(0, 14).map((b) => (
          <div key={b.date} className="flex items-center gap-3 px-4 h-14">
            <span className="text-[14px] text-mute w-20 shrink-0">{parseYmd(b.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
            <span className="font-semibold flex-1">{b.weight != null ? `${fmt(b.weight)} kg` : '–'}</span>
            {b.fat != null && <span className="text-[13px] text-mute">{fmt(b.fat)}%</span>}
            <button type="button" onClick={() => del(b.date)} aria-label={`Borrar ${b.date}`} className="w-9 h-9 grid place-items-center rounded-full text-mute hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
        {!body.length && <p className="p-4 text-[14px] text-mute">Sin registros todavía.</p>}
      </Card>
    </div>
  );
}

function Stat({ icon, color, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color }}>{icon}{label}</div>
      <p className="text-[24px] font-bold mt-1.5 leading-tight">{value}</p>
      <p className="text-[12px] text-mute mt-1 leading-snug">{sub}</p>
    </Card>
  );
}
