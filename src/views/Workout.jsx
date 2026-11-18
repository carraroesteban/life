import { useEffect, useRef, useState } from 'react';
import { Timer, X, Info, ChevronRight, PlayCircle, TrendingUp } from 'lucide-react';
import { Card, CheckBtn, Ring, SectionTitle, PageHeader, Pills, Sheet, Art } from '../ui.jsx';
import { EX_ART } from '../art.js';
import { workoutFor, withDefaults, WEEK_ORDER, DAYS, TECHNIQUE, isWeekend } from '../plan.js';
import { EX, tierClass, tierLabel, videoSearch } from '../exercises.js';
import { api } from '../api.js';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* sin audio */ }
  navigator.vibrate?.([200, 100, 200]);
}

function RestTimer() {
  const [end, setEnd] = useState(null);
  const [left, setLeft] = useState(0);
  const total = useRef(0);
  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setEnd(null); beep(); }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [end]);
  const start = (s) => { total.current = s; setEnd(Date.now() + s * 1000); };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Ring value={end ? left / total.current : 0} size={52} stroke={5}>
          {end ? <span className="text-[15px] font-bold">{left}</span> : <Timer size={20} className="text-mute" />}
        </Ring>
        <div className="flex-1 min-w-0">
          <p className="font-bold m-0">Descanso</p>
          <p className="text-[14px] text-mute m-0">{end ? 'Suena y vibra al terminar' : 'Tocá un tiempo al terminar la serie'}</p>
        </div>
        {end && <button type="button" onClick={() => setEnd(null)} aria-label="Cancelar descanso" className="btn !p-0 w-10 h-10 !rounded-full"><X size={18} /></button>}
      </div>
      {!end && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[15, 60, 75, 90].map((s) => <button key={s} type="button" onClick={() => start(s)} className="btn h-10">{s} s</button>)}
        </div>
      )}
    </Card>
  );
}

// Progresión: mira la última vez y sugiere qué hacer hoy.
export function suggest(scheme, prev, location = 'dumbbells') {
  const m = scheme.match(/x\s*(\d+)(?:-(\d+))?/);
  if (!m) return null;
  const top = Number(m[2] || m[1]);
  if (location === 'bodyweight') {
    const reps = (prev?.reps || '').split(/[^\d]+/).filter(Boolean).map(Number);
    if (!reps.length) return 'Primera vez: anotá cuántas reps hacés en cada serie.';
    if (reps.every((r) => r >= top)) return `Llegaste a ${top} reps en todas las series: pasá a la versión más difícil.`;
    return `Buscá 1 rep más por serie que la última vez (${reps.join(', ')}).`;
  }
  if (!prev?.kg) return `Primera vez: elegí un peso que te deje 1 o 2 reps en reserva al llegar a ${top}.`;
  const kg = prev.kg.toLocaleString('es-AR');
  const reps = (prev.reps || '').split(/[^\d]+/).filter(Boolean).map(Number);
  if (!reps.length) return `Mismo peso (${kg} kg). Anotá las reps para que te diga cuándo subir.`;
  if (reps.every((r) => r >= top)) {
    if (location === 'gym') return `Llegaste a ${top} reps en todas las series: subí el peso la próxima.`;
    return prev.kg >= 15
      ? `Llegaste al tope con 15 kg. Bajá en 4 segundos o pasá a la versión a un brazo o una pierna.`
      : `Llegaste a ${top} reps en todas las series: subí al siguiente peso, más de ${kg} kg.`;
  }
  return `Mismo peso (${kg} kg). Buscá 1 rep más por serie que la última vez (${reps.join(', ')}).`;
}

export function HowTo({ id, scheme, location }) {
  const e = EX[id];
  return (
    <div>
      <Art src={EX_ART[id]} alt={`Cómo se hace: ${e.name}. A la izquierda la posición inicial y a la derecha la final.`} className="mb-4" />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={tierClass(e.tier)} title="Tier de Jeff Nippard">{tierLabel(e.tier)}</span>
        <span className="chip">{e.muscle}</span>
        {scheme && <span className="chip font-bold">{scheme}</span>}
      </div>
      <ol className="m-0 p-0 list-none grid gap-3">
        {e.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-well grid place-items-center text-[14px] font-bold shrink-0">{i + 1}</span>
            <p className="m-0 text-[16px] leading-relaxed pt-0.5">{s}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-2.5">
        <div className="rounded-[12px] bg-well p-3.5">
          <p className="m-0 text-[13px] font-bold">La clave</p>
          <p className="m-0 text-[15px] leading-relaxed mt-0.5">{e.cue}</p>
        </div>
        <div className="rounded-[12px] border border-line p-3.5">
          <p className="m-0 text-[13px] font-bold text-bad">Error común</p>
          <p className="m-0 text-[15px] leading-relaxed mt-0.5">{e.mistake}</p>
        </div>
      </div>
      <a href={videoSearch(e.name, location)} target="_blank" rel="noreferrer" className="btn w-full mt-4 h-11 no-underline"><PlayCircle size={18} />Ver videos de la técnica</a>
      <p className="text-[12px] text-mute mt-3 mb-0">{e.tier === 'nr' ? 'Nippard no lo rankeó en sus tier lists.' : `Tier ${e.tier} en las tier lists de Jeff Nippard.`}</p>
    </div>
  );
}

const SUB_LOCATION = { gym: 'en el gimnasio', dumbbells: 'mancuernas y banco', bodyweight: 'sin equipo' };

export default function Workout({ now, date, day, profile }) {
  const location = withDefaults(profile).location;
  const todayDow = now.getDay();
  const [dow, setDow] = useState(todayDow);
  const [last, setLast] = useState({});
  const [open, setOpen] = useState(null);
  useEffect(() => { api.lastLoads(date).then(setLast).catch(() => {}); }, [date]);
  const w = workoutFor(dow, profile);
  const isToday = dow === todayDow;
  const doneCount = isToday ? w.ex.filter(([id]) => day.workout[id]?.done).length : 0;
  const weekendOff = isToday && isWeekend(dow) && !day.checks.train;

  return (
    <div>
      <PageHeader
        sub={isToday ? 'Hoy' : DAYS[dow]}
        title={w.title}
        right={isToday && (
          <Ring value={doneCount / w.ex.length}>
            <span className="text-[15px] font-bold">{doneCount}<span className="text-mute font-normal">/{w.ex.length}</span></span>
          </Ring>
        )}
      />
      <p className="text-mute text-[16px] mt-1 mb-4">{w.sub} · {SUB_LOCATION[location]}</p>

      <Pills value={dow} onChange={setDow} options={WEEK_ORDER.map((d) => ({ value: d, label: d === todayDow ? `${DAYS[d]} · hoy` : DAYS[d] }))} />

      {weekendOff && <Card className="p-4 mt-4 text-[15px] text-mute">Hoy marcaste que no entrenás. Si cambiás de idea, activalo en la pantalla Hoy.</Card>}
      {isToday && !weekendOff && <div className="mt-4"><RestTimer /></div>}

      <SectionTitle right={<span className="text-[13px] text-mute">Tocá un ejercicio para ver cómo se hace</span>}>Ejercicios</SectionTitle>
      <div className="grid gap-2.5">
        {w.ex.map(([id, scheme], i) => {
          const e = EX[id];
          const log = day.workout[id] || {};
          const prev = last[id];
          const done = isToday && !!log.done;
          return (
            <Card key={id + i} className={`p-4 ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                {EX_ART[id] && (
                  <button type="button" onClick={() => setOpen([id, scheme])} className="shrink-0 w-[76px] rounded-[10px] overflow-hidden border border-line" style={{ background: '#FAF8F3', aspectRatio: '4 / 3' }} aria-label={`Ver cómo se hace ${e.name}`}>
                    <img src={EX_ART[id]} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen([id, scheme])} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={tierClass(e.tier)}>{tierLabel(e.tier)}</span>
                    <span className="text-[13px] text-mute truncate">{e.muscle}</span>
                  </div>
                  <p className={`m-0 font-bold text-[17px] leading-snug ${done ? 'line-through decoration-1' : ''}`}>
                    {e.name}<ChevronRight size={16} className="inline -mt-0.5 ml-0.5 text-mute" />
                  </p>
                  <p className="m-0 text-[15px] mt-0.5">{scheme}</p>
                </button>
                {isToday && <CheckBtn done={done} label={`Marcar ${e.name}`} onClick={() => day.setWorkout(id, { done: !done })} />}
              </div>
              {isToday && !w.optional && suggest(scheme, prev, location) && (
                <p className="m-0 text-[14px] mt-3 flex gap-1.5 items-start"><TrendingUp size={15} className="shrink-0 mt-0.5" /><span>{suggest(scheme, prev, location)}</span></p>
              )}
              {isToday && !w.optional && (
                <div className="flex gap-2 mt-3">
                  {location !== 'bodyweight' && <label className="field flex-1 flex items-center h-10 gap-2">
                    <input inputMode="decimal" placeholder={prev?.kg ? String(prev.kg) : '0'} value={log.kg ?? ''}
                      onChange={(ev) => day.setWorkout(id, { kg: ev.target.value.replace(',', '.') }, false)}
                      onBlur={(ev) => day.setWorkout(id, { kg: ev.target.value.replace(',', '.') })}
                      className="w-full bg-transparent border-0 p-0 font-bold !shadow-none" aria-label={`Kilos en ${e.name}`} />
                    <span className="text-[13px] text-mute">kg</span>
                  </label>}
                  <label className="field flex-1 flex items-center h-10 gap-2">
                    <input placeholder={prev?.reps || 'ej. 15,14,12'} value={log.reps ?? ''}
                      onChange={(ev) => day.setWorkout(id, { reps: ev.target.value }, false)}
                      onBlur={(ev) => day.setWorkout(id, { reps: ev.target.value })}
                      className="w-full bg-transparent border-0 p-0 font-bold !shadow-none" aria-label={`Repeticiones en ${e.name}`} />
                    <span className="text-[13px] text-mute">reps</span>
                  </label>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!w.optional && (
        <Card className="p-4 mt-4 flex gap-3">
          <Info size={18} className="text-mute shrink-0 mt-1" />
          <p className="text-[15px] m-0 leading-relaxed">{TECHNIQUE[location]}</p>
        </Card>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? EX[open[0]].name : ''}>
        {open && <HowTo id={open[0]} scheme={open[1]} location={location} />}
      </Sheet>
    </div>
  );
}
