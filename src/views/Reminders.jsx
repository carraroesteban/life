import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Card } from '../ui.jsx';
import { api, DEMO } from '../api.js';

const b64ToBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export default function Reminders() {
  const supported = !DEMO && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.register('/sw.js').then((r) => r.pushManager.getSubscription()).then(setSub).catch(() => {});
  }, [supported]);

  const enable = async () => {
    setBusy(true); setMsg('');
    try {
      if ((await Notification.requestPermission()) !== 'granted') { setMsg('Diste "no permitir". Activá las notificaciones para este sitio en la configuración del navegador.'); return; }
      const reg = await navigator.serviceWorker.ready;
      const { key } = await api.pushKey();
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
      await api.pushSubscribe(s.toJSON());
      setSub(s);
      await api.pushTest();
      setMsg('Listo. Te mandé una notificación de prueba.');
    } catch {
      setMsg('No se pudo activar. En iPhone primero agregá la app a la pantalla de inicio y abrila desde ahí.');
    } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await api.pushUnsubscribe(sub.endpoint); await sub.unsubscribe(); setSub(null); setMsg(''); } finally { setBusy(false); }
  };

  return (
    <Card className="p-4 mt-3">
      <div className="flex items-center gap-3">
        {sub ? <Bell size={20} className="shrink-0" /> : <BellOff size={20} className="text-mute shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold m-0">Recordatorios</p>
          <p className="text-[14px] text-mute m-0">
            {DEMO ? 'Funcionan cuando la app está subida a tu servidor.' : !supported ? 'Este navegador no los soporta.' : sub ? 'Activados en este dispositivo.' : 'Un aviso a la hora de cada tarea pendiente.'}
          </p>
        </div>
        {supported && (sub
          ? <button type="button" className="btn h-10" disabled={busy} onClick={disable}>Desactivar</button>
          : <button type="button" className="btn primary h-10" disabled={busy} onClick={enable}>Activar</button>)}
      </div>
      {msg && <p className="text-[14px] mt-3 mb-0">{msg}</p>}
    </Card>
  );
}
