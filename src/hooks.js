import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ymd } from './api.js';

// Reloj que avanza cada 30 s y detecta el cambio de día.
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return now;
}

export function useDay(date) {
  const [data, setData] = useState({ checks: {}, workout: {}, body: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.day(date).then((d) => { setData(d); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [date]);
  useEffect(reload, [reload]);

  const setCheck = useCallback((key, done) => {
    setData((d) => ({ ...d, checks: { ...d.checks, [key]: done } }));
    api.check(date, key, done).catch(() => { setError(true); setData((d) => ({ ...d, checks: { ...d.checks, [key]: !done } })); });
  }, [date]);

  const ref = useRef(data);
  ref.current = data;
  const setWorkout = useCallback((exercise, patch, save = true) => {
    const next = { done: false, kg: null, reps: null, ...ref.current.workout[exercise], ...patch };
    setData((d) => ({ ...d, workout: { ...d.workout, [exercise]: next } }));
    if (save) api.workout({ date, exercise, ...next }).catch(() => setError(true));
  }, [date]);

  return { ...data, loading, error, setCheck, setWorkout, reload };
}

export const today = () => ymd(new Date());
