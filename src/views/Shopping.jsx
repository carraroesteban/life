import { useEffect, useState } from 'react';
import { RotateCcw, Plus, Trash2, MapPin } from 'lucide-react';
import { Card, CheckBtn, Ring, SectionTitle, PageHeader } from '../ui.jsx';
import { Art } from '../ui.jsx';
import { SCENE_ART } from '../art.js';
import { api } from '../api.js';

const SECTIONS = ['Carnicería y huevos', 'Verdulería', 'Almacén', 'Congelados', 'Otros'];

export default function Shopping() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [section, setSection] = useState('Otros');
  const [editing, setEditing] = useState(false);

  const load = () => api.shopping().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const toggle = (it) => {
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)));
    api.toggleItem(it.id, !it.checked).catch(load);
  };
  const remove = (it) => { setItems((xs) => xs.filter((x) => x.id !== it.id)); api.deleteItem(it.id).catch(load); };
  const reset = () => { setItems((xs) => xs.map((x) => ({ ...x, checked: false }))); api.resetShopping().catch(load); };
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.addItem({ name, qty, section });
    setName(''); setQty(''); load();
  };

  if (!items) return <PageHeader title="Súper" sub="Cargando…" />;
  const done = items.filter((i) => i.checked).length;
  const groups = SECTIONS.map((s) => [s, items.filter((i) => i.section === s)]).filter(([, xs]) => xs.length);
  const extra = items.filter((i) => !SECTIONS.includes(i.section));
  if (extra.length) groups.push(['Otros', extra]);

  return (
    <div>
      <PageHeader
        sub={<span className="flex items-center gap-1 normal-case"><MapPin size={14} />Lista de la semana</span>}
        title="Súper"
        right={
          <Ring value={items.length ? done / items.length : 0} size={64} stroke={7} color="var(--accent-fg)">
            <span className="text-[15px] font-bold">{done}<span className="text-mute font-medium">/{items.length}</span></span>
          </Ring>
        }
      />
      <Art src={SCENE_ART.super} className="mt-4" ratio="16 / 9" />
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={reset} className="h-10 px-4 rounded-full bg-well text-[14px] font-semibold flex items-center gap-1.5"><RotateCcw size={15} />Nueva compra</button>
        <button type="button" onClick={() => setEditing((v) => !v)} className={`h-10 px-4 rounded-full text-[14px] font-semibold ${editing ? 'bg-primary text-on-primary' : 'bg-well'}`}>{editing ? 'Listo' : 'Editar'}</button>
      </div>

      {groups.map(([s, xs]) => (
        <div key={s}>
          <SectionTitle right={<span className="text-[13px] text-mute">{xs.filter((x) => x.checked).length}/{xs.length}</span>}>{s}</SectionTitle>
          <Card className="divide-y divide-line">
            {xs.map((it) => (
              <div key={it.id} className="flex items-center gap-3 px-4 min-h-[56px]">
                <CheckBtn done={it.checked} color="var(--accent-fg)" label={`Marcar ${it.name}`} onClick={() => toggle(it)} />
                <button type="button" onClick={() => toggle(it)} className="flex-1 min-w-0 text-left py-3">
                  <span className={`font-medium text-[16px] ${it.checked ? 'line-through text-mute decoration-1' : ''}`}>{it.name}</span>
                </button>
                <span className="text-[14px] text-mute shrink-0">{it.qty}</span>
                {editing && (
                  <button type="button" onClick={() => remove(it)} aria-label={`Borrar ${it.name}`} className="w-9 h-9 grid place-items-center rounded-full text-red-500"><Trash2 size={17} /></button>
                )}
              </div>
            ))}
          </Card>
        </div>
      ))}

      <SectionTitle>Agregar</SectionTitle>
      <Card className="p-3">
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Producto" aria-label="Producto"
              className="flex-1 min-w-0 h-11 rounded-xl bg-well border border-line px-3 outline-none " />
            <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cant." aria-label="Cantidad"
              className="w-24 h-11 rounded-xl bg-well border border-line px-3 outline-none " />
          </div>
          <div className="flex gap-2">
            <select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Sección"
              className="flex-1 h-11 rounded-xl bg-well border border-line px-3 outline-none">
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button disabled={!name.trim()} className="h-11 px-4 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-1 disabled:opacity-40"><Plus size={18} />Agregar</button>
          </div>
        </form>
      </Card>
      <p className="text-[12px] text-mute mt-3 px-1">Cantidades para 7 días. El pollo es peso crudo.</p>
    </div>
  );
}
