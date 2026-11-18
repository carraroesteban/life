import { useState } from 'react';
import { api } from '../api.js';
import { Card, Brand, Art } from '../ui.jsx';
import { SCENE_ART } from '../art.js';


export default function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('Completá usuario y contraseña.'); return; }
    setBusy(true); setErr('');
    try { await api.login(u.trim(), p); onLogin(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6"><Brand /></div>
        <Art src={SCENE_ART.bienvenida} className="mb-6" ratio="16 / 9" />
        <h1 className="text-[40px] m-0">Hola de nuevo</h1>
        <p className="text-mute mt-1 mb-6">Entrá con tu usuario para ver tu plan del día.</p>
        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-3" noValidate>
            <label className="grid gap-1.5 text-[14px] text-mute">Usuario
              <input className="field h-12 text-[16px] text-fg" autoComplete="username" autoCapitalize="none" value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} />
            </label>
            <label className="grid gap-1.5 text-[14px] text-mute">Contraseña
              <input className="field h-12 text-[16px] text-fg" type="password" autoComplete="current-password" value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} />
            </label>
            {err && <p className="text-bad text-[14px] m-0" role="alert">{err}</p>}
            <button className="btn primary h-12 mt-1" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
        </Card>
        <p className="text-[13px] text-mute mt-4">¿No tenés usuario? Pedíselo a quien administra Life.</p>
      </div>
    </div>
  );
}
