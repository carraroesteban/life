import { useEffect, useState } from 'react';
import { LogOut, Trash2, KeyRound, UserPlus } from 'lucide-react';
import { Card, SectionTitle, PageHeader } from '../ui.jsx';
import { api } from '../api.js';
import { withDefaults, targets, SUPPS, OBJECTIVES, LOCATIONS } from '../plan.js';

function Field({ label, children, hint }) {
  return (
    <label className="grid gap-1.5 text-[14px] text-mute">
      {label}
      {children}
      {hint && <span className="text-[12px]">{hint}</span>}
    </label>
  );
}

export function ProfileForm({ me, onSaved, first }) {
  const [p, setP] = useState(() => (me.profile ? withDefaults(me.profile) : { ...withDefaults(null), age: '', height: '', weight: '', goalWeight: '' }));
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setSaved(false); setErr(''); };
  const t = targets(p);

  const save = async (e) => {
    e.preventDefault();
    for (const [k, l, lo, hi] of [['age', 'Edad', 12, 100], ['height', 'Altura', 120, 230], ['weight', 'Peso', 30, 300], ['goalWeight', 'Peso meta', 30, 300]]) {
      const v = Number(p[k]);
      if (!v || v < lo || v > hi) { setErr(`Revisá el campo "${l}".`); return; }
    }
    setBusy(true);
    try { await api.saveProfile({ ...p, age: +p.age, height: +p.height, weight: +p.weight, goalWeight: +p.goalWeight }); setSaved(true); onSaved(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const inp = 'field h-11 text-[16px] text-fg w-full';

  return (
    <form onSubmit={save} noValidate>
      <Card className="p-5 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select className={inp} value={p.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="m">Hombre</option><option value="f">Mujer</option>
            </select>
          </Field>
          <Field label="Edad"><input className={inp} inputMode="numeric" value={p.age} onChange={(e) => set('age', e.target.value)} /></Field>
          <Field label="Altura (cm)"><input className={inp} inputMode="numeric" value={p.height} onChange={(e) => set('height', e.target.value)} /></Field>
          <Field label="Peso (kg)"><input className={inp} inputMode="decimal" value={p.weight} onChange={(e) => set('weight', e.target.value.replace(',', '.'))} /></Field>
          <Field label="Peso meta (kg)"><input className={inp} inputMode="decimal" value={p.goalWeight} onChange={(e) => set('goalWeight', e.target.value.replace(',', '.'))} /></Field>
          <Field label="Objetivo">
            <select className={inp} value={p.objective} onChange={(e) => set('objective', e.target.value)}>
              {Object.entries(OBJECTIVES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        {+p.weight > 0 && +p.height > 0 && +p.age > 0 && +p.goalWeight > 0 && <div className="rounded-[12px] bg-well p-3.5 text-[15px]">
          Tu plan: <b>{t.kcal.toLocaleString('es-AR')} kcal</b> y <b>{t.protein} g de proteína</b> por día. Las porciones de los tuppers se ajustan solas.
        </div>}
      </Card>

      <SectionTitle>Dónde entrenás</SectionTitle>
      <Card className="p-3 flex flex-wrap gap-2">
        {Object.entries(LOCATIONS).map(([k, l]) => (
          <button key={k} type="button" className="pill" aria-pressed={p.location === k} onClick={() => set('location', k)}>{l}</button>
        ))}
        <p className="w-full text-[13px] text-mute m-1">Cambia la rutina y los ejercicios.</p>
      </Card>

      <SectionTitle>Horarios</SectionTitle>
      <Card className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[['wake', 'Me levanto'], ['lunch', 'Almuerzo'], ['train', 'Entreno'], ['dinner', 'Cena'], ['sleep', 'Me duermo']].map(([k, l]) => (
          <Field key={k} label={l}><input type="time" className={inp} value={p[k]} onChange={(e) => set(k, e.target.value)} /></Field>
        ))}
      </Card>

      <SectionTitle>Suplementos que tenés</SectionTitle>
      <Card className="p-3 flex flex-wrap gap-2">
        {Object.entries(SUPPS).map(([k, l]) => (
          <button key={k} type="button" className="pill" aria-pressed={!!p.supps[k]} onClick={() => set('supps', { ...p.supps, [k]: !p.supps[k] })}>{l}</button>
        ))}
        <p className="w-full text-[13px] text-mute m-1">El plan del día solo te muestra los que marques.</p>
      </Card>

      {err && <p className="text-bad text-[14px] mt-4 mb-0" role="alert">{err}</p>}
      <button className="btn primary w-full h-12 mt-4" disabled={busy}>{first ? 'Empezar' : saved ? 'Guardado' : 'Guardar cambios'}</button>
    </form>
  );
}

function PasswordCard() {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (nw.length < 8) { setMsg({ bad: true, t: 'La nueva contraseña necesita al menos 8 caracteres.' }); return; }
    try { await api.changePassword(cur, nw); setCur(''); setNw(''); setMsg({ t: 'Contraseña cambiada.' }); } catch (x) { setMsg({ bad: true, t: x.message }); }
  };
  return (
    <Card className="p-5">
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <input className="field h-11" type="password" placeholder="Contraseña actual" autoComplete="current-password" value={cur} onChange={(e) => { setCur(e.target.value); setMsg(null); }} />
        <input className="field h-11" type="password" placeholder="Nueva contraseña (8+ caracteres)" autoComplete="new-password" value={nw} onChange={(e) => { setNw(e.target.value); setMsg(null); }} />
        {msg && <p className={`text-[14px] m-0 ${msg.bad ? 'text-bad' : ''}`} role="status">{msg.t}</p>}
        <button className="btn h-11" disabled={!cur || !nw}><KeyRound size={16} />Cambiar contraseña</button>
      </form>
    </Card>
  );
}

function UsersAdmin({ me }) {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ username: '', name: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const load = () => api.users().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(f.username)) { setMsg({ bad: true, t: 'Usuario: 3 a 30 letras, números, punto o guion.' }); return; }
    if (f.password.length < 8) { setMsg({ bad: true, t: 'La contraseña necesita al menos 8 caracteres.' }); return; }
    try { await api.createUser(f); setMsg({ t: `Listo. Pasale a ${f.name || f.username} su usuario "${f.username}" y la contraseña.` }); setF({ username: '', name: '', password: '' }); load(); }
    catch (x) { setMsg({ bad: true, t: x.message }); }
  };
  const reset = async (u) => {
    const pw = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 8);
    await api.resetPassword(u.id, pw);
    setMsg({ t: `Nueva contraseña de ${u.username}: ${pw}` });
  };
  const del = async (u) => { await api.deleteUser(u.id); setConfirm(null); load(); };

  return (
    <>
      <SectionTitle>Usuarios</SectionTitle>
      <Card>
        {users.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-line' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="m-0 font-bold truncate">{u.name} {u.isAdmin && <span className="chip ml-1">Admin</span>}</p>
              <p className="m-0 text-[13px] text-mute">@{u.username}{!u.hasProfile && ' · todavía no completó su perfil'}</p>
            </div>
            {u.id !== me.id && (confirm === u.id ? (
              <>
                <button type="button" className="btn h-9 !px-3 text-bad" onClick={() => del(u)}>Borrar</button>
                <button type="button" className="btn h-9 !px-3" onClick={() => setConfirm(null)}>No</button>
              </>
            ) : (
              <>
                <button type="button" className="btn h-9 !px-3 text-[14px]" onClick={() => reset(u)} title="Generar nueva contraseña"><KeyRound size={15} /></button>
                <button type="button" className="btn h-9 !px-3" onClick={() => setConfirm(u.id)} aria-label={`Borrar ${u.username}`}><Trash2 size={15} /></button>
              </>
            ))}
          </div>
        ))}
      </Card>
      <Card className="p-5 mt-3">
        <form onSubmit={create} className="grid gap-3" noValidate>
          <p className="m-0 font-bold">Crear usuario</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="field h-11" placeholder="Nombre" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setMsg(null); }} />
            <input className="field h-11" placeholder="Usuario" autoCapitalize="none" value={f.username} onChange={(e) => { setF({ ...f, username: e.target.value }); setMsg(null); }} />
          </div>
          <input className="field h-11" placeholder="Contraseña inicial (8+ caracteres)" value={f.password} onChange={(e) => { setF({ ...f, password: e.target.value }); setMsg(null); }} />
          {msg && <p className={`text-[14px] m-0 ${msg.bad ? 'text-bad' : ''}`} role="status">{msg.t}</p>}
          <button className="btn primary h-11"><UserPlus size={16} />Crear</button>
          <p className="m-0 text-[13px] text-mute">Cuando entre por primera vez, carga su peso, meta y horarios, y la app arma su plan.</p>
        </form>
      </Card>
    </>
  );
}

export default function Profile({ me, reloadMe, onLogout }) {
  return (
    <div>
      <PageHeader sub={`@${me.username}`} title={me.name} />
      <SectionTitle>Tu perfil</SectionTitle>
      <ProfileForm me={me} onSaved={reloadMe} />
      <SectionTitle>Contraseña</SectionTitle>
      <PasswordCard />
      {me.isAdmin && <UsersAdmin me={me} />}
      <button type="button" className="btn w-full h-12 mt-8" onClick={onLogout}><LogOut size={17} />Cerrar sesión</button>
    </div>
  );
}
