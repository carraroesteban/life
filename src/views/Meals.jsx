import { ChefHat, Snowflake, Sun, Moon } from 'lucide-react';
import { Card, SectionTitle, PageHeader } from '../ui.jsx';
import { Art } from '../ui.jsx';
import { SCENE_ART } from '../art.js';
import { meals, targets, WEEK_ORDER, DAY_NAMES, STORAGE, withDefaults } from '../plan.js';

export default function Meals({ now, profile }) {
  const todayDow = now.getDay();
  const t = targets(profile);
  const p = withDefaults(profile);
  return (
    <div>
      <PageHeader sub="2 tuppers por día" title="Comidas" />
      <Art src={SCENE_ART.comidas} className="mt-4" ratio="16 / 9" />

      <div className="grid grid-cols-3 gap-2.5 mt-3">
        {[[t.kcal.toLocaleString('es-AR'), 'kcal / día'], [`${t.protein} g`, 'proteína'], ['2', 'tuppers']].map(([v, l]) => (
          <Card key={l} className="p-3.5">
            <p className="text-[19px] font-bold leading-tight">{v}</p>
            <p className="text-[12px] text-mute mt-0.5">{l}</p>
          </Card>
        ))}
      </div>

      <SectionTitle>Semana</SectionTitle>
      <div className="space-y-2.5">
        {WEEK_ORDER.map((d) => {
          const [lunch, dinner] = meals(d, profile);
          const isToday = d === todayDow;
          return (
            <Card key={d} className="p-4" style={isToday ? { borderColor: 'var(--accent-fg)' } : undefined}>
              <div className="flex items-center gap-2 mb-2.5">
                <p className="font-bold text-[17px]">{DAY_NAMES[d]}</p>
                {isToday && <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-fg)', color: 'var(--bg)' }}>Hoy</span>}
                {(d === 0 || d === 3) && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-well text-mute ml-auto flex items-center gap-1"><ChefHat size={13} />Meal prep</span>}
              </div>
              <div className="space-y-2">
                <Row icon={<Sun size={15} />} label={p.lunch} text={lunch} />
                <Row icon={<Moon size={15} />} label={p.dinner} text={dinner} />
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle>Cuándo cocinar</SectionTitle>
      <Card className="divide-y divide-line">
        <div className="p-4 flex gap-3">
          <ChefHat size={20} style={{ color: 'var(--accent-fg)' }} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold">Domingo</p><p className="text-[14px] text-mute">Tuppers de lunes a miércoles (6) a la heladera</p></div>
        </div>
        <div className="p-4 flex gap-3">
          <ChefHat size={20} style={{ color: 'var(--accent-fg)' }} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold">Miércoles</p><p className="text-[14px] text-mute">Jueves y viernes a la heladera, sábado y domingo al freezer</p></div>
        </div>
        <div className="p-4 flex gap-3">
          <Snowflake size={20} style={{ color: 'var(--accent-fg)' }} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold">Descongelar</p><p className="text-[14px] text-mute">Pasalo a la heladera la noche anterior. Calentá hasta que quede bien caliente. Tomate y zanahoria van crudos y aparte.</p></div>
        </div>
      </Card>

      <SectionTitle>Cuánto dura</SectionTitle>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] text-[12px] font-semibold text-mute px-4 py-2.5 bg-well">
          <span>Comida</span><span>Heladera</span><span>Freezer</span>
        </div>
        {STORAGE.map(([f, h, z]) => (
          <div key={f} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 px-4 py-3 border-t border-line text-[14px]">
            <span className="font-medium">{f}</span><span className="text-mute">{h}</span><span className="text-mute">{z}</span>
          </div>
        ))}
      </Card>
      <p className="text-[12px] text-mute mt-3 px-1">Pesos de comida ya cocida.</p>
    </div>
  );
}

function Row({ icon, label, text }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-mute w-16 shrink-0 pt-0.5">{icon}{label}</span>
      <p className="text-[15px] leading-snug">{text}</p>
    </div>
  );
}
