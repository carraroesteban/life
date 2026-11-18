import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Droplet, Footprints, Scale, Dumbbell } from 'lucide-react';
import { Card, CheckBtn, Ring, SectionTitle, PageHeader, TYPE_LABEL, Art } from '../ui.jsx';
import { SCENE_ART } from '../art.js';
import { timeline, isWeekend, DAY_NAMES, DAYS, WATER_BOTTLES, workoutFor, dayMin } from '../plan.js';
import { api, ymd, addDays, parseYmd } from '../api.js';
import Reminders from './Reminders.jsx';

function fmtLeft(min) {
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `en ${h} h${m ? ` ${m} min` : ''}`;
}

export default function Today({ now, date, day, go, profile }) {
  const dow = now.getDay();
  const weekend = isWeekend(dow);
  const trains = !weekend || !!day.checks.train;
  const items = useMemo(() => timeline(dow, trains, profile), [dow, trains, profile]);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nowMin = dayMin(hhmm, profile);
  const toMin = (t) => dayMin(t, profile);

  const done = items.filter((i) => day.checks[i.key]).length;
  const water = Array.from({ length: WATER_BOTTLES }, (_, i) => !!day.checks[`agua${i + 1}`]).filter(Boolean).length;

  const pendingPast = items.filter((i) => !day.checks[i.key] && toMin(i.time) <= nowMin);
  const upcoming = items.find((i) => !day.checks[i.key] && toMin(i.time) > nowMin);
  const focus = pendingPast.length ? pendingPast[pendingPast.length - 1] : upcoming;
  const focusLate = focus && toMin(focus.time) <= nowMin;

  return (
    <div>
      <PageHeader
        sub={now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
        title={DAY_NAMES[dow]}
        right={
          <Ring value={done / items.length}>
            <span className="text-[15px] font-bold">{done}<span className="text-mute font-normal">/{items.length}</span></span>
          </Ring>
        }
      />

      <WeekStrip date={date} todayDone={done} todayTotal={items.length} profile={profile} />

      {weekend && (
        <Card className="p-4 mt-5 flex items-center gap-3">
          <Dumbbell size={20} className="text-mute shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold m-0">¿Entrenás hoy?</p>
            <p className="text-[14px] text-mute m-0">{workoutFor(dow, profile).title} · opcional</p>
          </div>
          <div className="seg">
            <button type="button" aria-pressed={!trains} onClick={() => day.setCheck('train', false)}>No</button>
            <button type="button" aria-pressed={trains} onClick={() => day.setCheck('train', true)}>Sí</button>
          </div>
        </Card>
      )}

      {focus ? (
        <Card className="mt-5 p-5">
          <p className="text-[14px] m-0">
            {focusLate ? <span className="live-word font-bold">Ahora</span> : <span className="text-mute">Próximo · {fmtLeft(toMin(focus.time) - nowMin)}</span>}
            <span className="text-mute"> · {focus.time} hs</span>
          </p>
          <div className="flex items-start gap-4 mt-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-[26px] m-0">{focus.title}</h2>
              <p className="text-[16px] text-mute mt-1.5 mb-0 leading-relaxed">{focus.detail}</p>
            </div>
            <CheckBtn size={44} done={false} label={`Marcar ${focus.title}`} onClick={() => day.setCheck(focus.key, true)} />
          </div>
          {focus.link && (
            <button type="button" onClick={() => go(focus.link)} className="btn primary w-full mt-4 h-11">Abrir <ChevronRight size={18} /></button>
          )}
        </Card>
      ) : (
        <Card className="mt-5 p-5">
          <Art src={SCENE_ART.completo} className="mb-4" ratio="16 / 9" />
          <h2 className="text-[24px] m-0">Día completo</h2>
          <p className="text-mute m-0 mt-1">Todo listo por hoy. A descansar.</p>
        </Card>
      )}

      <SectionTitle>Tu día</SectionTitle>
      <Card>
        {items.map((it, idx) => {
          const isDone = !!day.checks[it.key];
          const isFocus = focus?.key === it.key;
          return (
            <div key={it.key} className={`flex items-start gap-3 px-4 py-3.5 ${idx ? 'border-t border-line' : ''} ${isFocus ? 'bg-well/60' : ''}`}>
              <div className={`w-12 shrink-0 pt-0.5 text-[14px] font-bold ${isFocus ? '' : 'text-mute'}`}>{it.time}</div>
              <button type="button" className="flex-1 min-w-0 text-left" onClick={() => it.link && go(it.link)}>
                <p className={`m-0 font-bold text-[16px] ${isDone ? 'text-mute line-through decoration-1' : ''}`}>
                  {it.title}{it.link && <ChevronRight size={15} className="inline -mt-0.5 ml-0.5 text-mute" />}
                </p>
                <p className="m-0 text-[14px] leading-snug mt-0.5 text-mute">{it.detail}</p>
                <span className="chip mt-2 text-mute">{TYPE_LABEL[it.type]}</span>
              </button>
              <CheckBtn done={isDone} label={`Marcar ${it.title}`} onClick={() => day.setCheck(it.key, !isDone)} />
            </div>
          );
        })}
      </Card>

      <SectionTitle>Hábitos</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Droplet size={18} className="text-mute" />
            <p className="font-bold flex-1 m-0">Agua</p>
            <p className="text-[14px] text-mute m-0">{(water * 0.5).toLocaleString('es-AR')} / 3 L</p>
          </div>
          <div className="flex gap-2 mt-3">
            {Array.from({ length: WATER_BOTTLES }, (_, i) => {
              const k = `agua${i + 1}`;
              const on = !!day.checks[k];
              return (
                <button key={k} type="button" aria-label={`Botella ${i + 1}`} aria-pressed={on} onClick={() => day.setCheck(k, !on)}
                  className={`flex-1 h-11 rounded-[10px] border transition-colors active:scale-95 ${on ? 'bg-primary border-primary text-on-primary' : 'bg-well border-transparent text-mute'}`}>
                  <Droplet size={16} className="mx-auto" />
                </button>
              );
            })}
          </div>
          <p className="text-[13px] text-mute mt-2 mb-0">Cada toque es una botella de 500 ml</p>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Footprints size={20} className="text-mute shrink-0" />
          <div className="flex-1">
            <p className="font-bold m-0">8.000 pasos</p>
            <p className="text-[14px] text-mute m-0">Mirá el contador del celu o la Mi Band</p>
          </div>
          <CheckBtn done={!!day.checks.pasos} label="Marcar pasos" onClick={() => day.setCheck('pasos', !day.checks.pasos)} />
        </Card>
      </div>

      <WeighIn date={date} body={day.body} onSaved={day.reload} go={go} />
      <Reminders />
    </div>
  );
}

function WeighIn({ date, body, onSaved, go }) {
  const [w, setW] = useState('');
  const [saving, setSaving] = useState(false);
  if (body?.weight) {
    return (
      <Card className="p-4 mt-3 flex items-center gap-3">
        <Scale size={20} className="text-mute" />
        <p className="flex-1 font-bold m-0">Pesaje de hoy: {body.weight.toLocaleString('es-AR')} kg</p>
        <button type="button" onClick={() => go('progreso')} className="text-[14px] font-bold underline underline-offset-4">Ver progreso</button>
      </Card>
    );
  }
  const save = async (e) => {
    e.preventDefault();
    const v = Number(String(w).replace(',', '.'));
    if (!v || v < 30 || v > 300) return;
    setSaving(true);
    try { await api.saveBody({ date, weight: v }); setW(''); onSaved(); } finally { setSaving(false); }
  };
  return (
    <Card className="p-4 mt-3">
      <form onSubmit={save} className="flex items-center gap-3">
        <Scale size={20} className="text-mute shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold m-0">Pesaje de hoy</p>
          <p className="text-[14px] text-mute m-0">En ayunas, después del baño</p>
        </div>
        <input inputMode="decimal" placeholder="kg" value={w} onChange={(e) => setW(e.target.value)} aria-label="Peso en kg" className="field w-20 h-11 text-center font-bold" />
        <button disabled={saving || !w} className="btn primary h-11">Guardar</button>
      </form>
    </Card>
  );
}

function WeekStrip({ date, todayDone, todayTotal, profile }) {
  const [stats, setStats] = useState({ checks: {}, workout: {} });
  const d0 = parseYmd(date);
  const monday = addDays(d0, -((d0.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = ymd(days[0]), to = ymd(days[6]);
  useEffect(() => { api.stats(from, to).then(setStats).catch(() => {}); }, [from, to, todayDone]);
  return (
    <div className="grid grid-cols-7 gap-1.5 mt-5" role="list" aria-label="Esta semana">
      {days.map((d) => {
        const k = ymd(d);
        const dow = d.getDay();
        const isToday = k === date;
        const future = k > date;
        const total = isToday ? todayTotal : timeline(dow, !isWeekend(dow), profile).length;
        const doneN = isToday ? todayDone : stats.checks[k] || 0;
        const pct = Math.min(1, doneN / total);
        return (
          <div key={k} role="listitem" aria-label={`${DAY_NAMES[dow]}: ${doneN} de ${total}`}
            className={`flex flex-col items-center gap-1.5 py-2 rounded-[12px] ${isToday ? 'bg-primary text-on-primary' : ''} ${future ? 'opacity-40' : ''}`}>
            <span className="text-[12px] font-bold">{DAYS[dow]}</span>
            <MiniRing pct={future ? 0 : pct} inverted={isToday} />
            <span className="text-[13px]">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniRing({ pct, inverted }) {
  const r = 11, c = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" className="-rotate-90" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="none" stroke={inverted ? 'color-mix(in srgb, var(--primary-fg) 25%, transparent)' : 'var(--bg3)'} strokeWidth="4" />
      {pct > 0 && <circle cx="14" cy="14" r={r} fill="none" stroke={inverted ? 'var(--primary-fg)' : 'var(--accent-fg)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />}
    </svg>
  );
}
