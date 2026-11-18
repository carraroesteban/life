import { useEffect, useRef, useState } from 'react';
import { Check, X, SunMoon } from 'lucide-react';

export const TYPE_LABEL = { supp: 'Suplemento', food: 'Comida', train: 'Entreno', habit: 'Hábito' };

export function Card({ className = '', children, ...p }) {
  return <div className={`card ${className}`} {...p}>{children}</div>;
}

export function CheckBtn({ done, onClick, size = 30, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={done}
      className={`shrink-0 grid place-items-center rounded-full border-[1.5px] transition-colors active:scale-90 ${done ? 'bg-primary border-primary text-on-primary' : 'border-line-strong bg-card'}`}
      style={{ width: size, height: size }}>
      {done && <Check size={size * 0.58} strokeWidth={3} />}
    </button>
  );
}

export function Ring({ value, size = 64, stroke = 6, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-fg)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-end justify-between mt-8 mb-3">
      <h2 className="text-[20px] m-0">{children}</h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, sub, right }) {
  return (
    <header className="flex items-end justify-between gap-4 pt-6 md:pt-10 pb-1">
      <div className="min-w-0">
        {sub && <p className="text-[15px] text-mute m-0 first-letter:uppercase">{sub}</p>}
        <h1 className="text-[clamp(34px,8vw,46px)] m-0">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function Pills({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
      {options.map((o) => (
        <button key={o.value} type="button" className="pill shrink-0" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="flex items-start gap-3 mb-3">
        <h2 className="text-[22px] m-0 flex-1">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-well grid place-items-center shrink-0"><X size={18} /></button>
      </div>
      {children}
    </dialog>
  );
}

export function ThemeToggle() {
  const [t, setT] = useState(() => document.documentElement.dataset.theme || '');
  const next = () => {
    const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const v = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = v;
    try { localStorage.setItem('theme', v); } catch { /* sin storage */ }
    setT(v);
  };
  return (
    <button type="button" onClick={next} aria-label="Cambiar tema" title="Cambiar tema" className="btn !p-0 w-10 h-10"><SunMoon size={18} /></button>
  );
}

export function Brand() {
  return (
    <span className="display text-[22px] inline-flex items-center gap-2">
      <svg viewBox="0 0 512 512" width="26" height="26" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#D4FF3A" /><circle cx="256" cy="256" r="138" fill="none" stroke="#111014" strokeWidth="56" strokeLinecap="round" strokeDasharray="700 167" transform="rotate(-62 256 256)" /><rect x="236" y="96" width="210" height="44" rx="22" fill="#111014" /></svg>Life
    </span>
  );
}

// Las ilustraciones están dibujadas sobre papel: se enmarcan como una lámina, igual que en opencaptions.
export function Art({ src, alt = '', className = '', ratio = '4 / 3' }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden rounded-[16px] border border-line ${className}`} style={{ background: '#FAF8F3', aspectRatio: ratio }}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-full object-cover block" />
    </div>
  );
}
