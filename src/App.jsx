import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Dumbbell, UtensilsCrossed, ShoppingCart, TrendingUp, WifiOff, CircleUser } from 'lucide-react';
import { useNow, useDay } from './hooks.js';
import { ThemeToggle, Brand, PageHeader, Art } from './ui.jsx';
import { SCENE_ART } from './art.js';
import { api, ymd, DEMO } from './api.js';
import Today from './views/Today.jsx';
import Workout from './views/Workout.jsx';
import Meals from './views/Meals.jsx';
import Shopping from './views/Shopping.jsx';
import Progress from './views/Progress.jsx';
import Login from './views/Login.jsx';
import Profile, { ProfileForm } from './views/Profile.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: CalendarCheck },
  { id: 'entreno', label: 'Entreno', icon: Dumbbell },
  { id: 'comidas', label: 'Comidas', icon: UtensilsCrossed },
  { id: 'super', label: 'Súper', icon: ShoppingCart },
  { id: 'progreso', label: 'Progreso', icon: TrendingUp },
];
const ROUTES = [...TABS.map((t) => t.id), 'perfil'];
const fromHash = () => { const h = location.hash.replace('#', ''); return ROUTES.includes(h) ? h : 'hoy'; };

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = cargando, null = sin sesión
  const loadMe = useCallback(() => api.me().then(setMe).catch(() => setMe(null)), []);
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => {
    const out = () => setMe(null);
    window.addEventListener('life:logout', out);
    return () => window.removeEventListener('life:logout', out);
  }, []);

  if (me === undefined) return <div className="min-h-dvh grid place-items-center"><Brand /></div>;
  if (me === null) return <Login onLogin={loadMe} />;
  if (!me.profile) {
    return (
      <div className="max-w-2xl mx-auto px-5 pb-16 pt-safe">
        <div className="flex items-center justify-between pt-4"><Brand /><ThemeToggle /></div>
        <Art src={SCENE_ART.bienvenida} className="mt-5" ratio="16 / 9" />
        <PageHeader sub={`Hola, ${me.name}`} title="Armemos tu plan" />
        <p className="text-mute text-[16px] mt-2 mb-5">Con estos datos calculo tus calorías, tus porciones y los horarios de cada día. Lo podés cambiar cuando quieras.</p>
        <ProfileForm me={me} onSaved={loadMe} first />
      </div>
    );
  }
  return <Shell me={me} reloadMe={loadMe} onLogout={async () => { await api.logout().catch(() => {}); setMe(null); }} />;
}

function Shell({ me, reloadMe, onLogout }) {
  const now = useNow();
  const date = ymd(now);
  const day = useDay(date);
  const [tab, setTab] = useState(fromHash);

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (id) => { location.hash = id; window.scrollTo({ top: 0 }); };
  const props = { now, date, day, go, profile: me.profile, me };

  const ProfileBtn = ({ className = '' }) => (
    <button type="button" onClick={() => go('perfil')} aria-label="Perfil" title="Perfil" className={`btn !p-0 w-10 h-10 ${tab === 'perfil' ? 'primary' : ''} ${className}`}><CircleUser size={19} /></button>
  );

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-dvh sticky top-0 border-r border-line px-4 py-8">
        <div className="px-3 mb-8 flex items-center justify-between gap-2">
          <Brand />
          <div className="flex gap-1.5"><ThemeToggle /><ProfileBtn /></div>
        </div>
        <nav className="grid gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 h-11 px-3 rounded-[10px] text-[16px] transition-colors ${tab === id ? 'bg-primary text-on-primary font-bold' : 'text-mute hover:text-fg hover:bg-well'}`}>
              <Icon size={19} />{label}
            </button>
          ))}
        </nav>
        <p className="mt-auto px-3 text-[13px] text-mute">{me.name}</p>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-2xl mx-auto px-5 md:px-8 pt-safe pb-32 md:pb-16">
          <div className="md:hidden flex items-center justify-between pt-4"><Brand /><div className="flex gap-1.5"><ThemeToggle /><ProfileBtn /></div></div>
          {DEMO && (
            <div className="mt-4 rounded-[12px] bg-well px-4 py-2.5 text-[14px]"><b>Modo prueba.</b> Podés tocar todo, pero nada se guarda: al recargar vuelve a cero.</div>
          )}
          {day.error && (
            <div className="mt-4 flex items-center gap-2 rounded-[12px] px-4 py-3 bg-well text-bad text-[14px] font-bold">
              <WifiOff size={16} />No se pudo guardar. Revisá la conexión.
              <button type="button" onClick={day.reload} className="ml-auto underline">Reintentar</button>
            </div>
          )}
          {tab === 'hoy' && <Today {...props} />}
          {tab === 'entreno' && <Workout {...props} />}
          {tab === 'comidas' && <Meals {...props} />}
          {tab === 'super' && <Shopping {...props} />}
          {tab === 'progreso' && <Progress {...props} />}
          {tab === 'perfil' && <Profile me={me} reloadMe={reloadMe} onLogout={onLogout} />}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line pb-safe"
        style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1 text-[11px] transition-colors ${tab === id ? 'text-fg font-bold' : 'text-mute'}`}>
              <span className={`grid place-items-center w-14 h-8 rounded-full transition-colors ${tab === id ? 'bg-primary text-on-primary' : ''}`}><Icon size={21} strokeWidth={tab === id ? 2.2 : 1.8} /></span>{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
