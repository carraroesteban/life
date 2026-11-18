// Todo el plan vive acá. Se adapta al perfil de cada usuario (peso, meta, horarios y suplementos).

export const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WATER_BOTTLES = 6;
export const SUPPS = { ripped: 'Ripped X', carnitina: 'Carnitina', proteina: 'Proteína en polvo', creatina: 'Creatina', magnesio: 'Magnesio' };
export const LOCATIONS = { gym: 'Gimnasio', dumbbells: 'Casa con mancuernas', bodyweight: 'Casa sin equipo' };
export const OBJECTIVES = { cut_fast: 'Bajar grasa rápido', cut: 'Bajar grasa', maintain: 'Mantener', gain: 'Ganar músculo' };

export const DEFAULT_PROFILE = {
  sex: 'm', age: 30, height: 175, weight: 80, goalWeight: 75, objective: 'cut', location: 'dumbbells',
  wake: '08:00', lunch: '13:00', train: '19:00', dinner: '21:00', sleep: '00:00',
  supps: { ripped: false, carnitina: false, proteina: true, creatina: true, magnesio: false },
};
export const withDefaults = (p) => ({ ...DEFAULT_PROFILE, ...(p || {}), supps: { ...DEFAULT_PROFILE.supps, ...(p?.supps || {}) } });

// Calorías (Mifflin-St Jeor) y proteína. El plan base está pensado para 1.875 kcal y 180 g de proteína.
export function targets(profile) {
  const p = withDefaults(profile);
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  const tdee = bmr * 1.45;
  const delta = { cut_fast: -1000, cut: -500, maintain: 0, gain: 300 }[p.objective] ?? -500;
  const floor = p.sex === 'f' ? 1300 : 1600;
  const kcal = Math.max(floor, Math.round((tdee + delta) / 50) * 50);
  const protein = Math.round(Math.min(2 * p.goalWeight, 2.2 * p.weight) / 5) * 5;
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein,
    carbScale: Math.round(Math.min(1.8, Math.max(0.5, kcal / 1875)) * 10) / 10,
    proteinScale: Math.round(Math.min(1.6, Math.max(0.5, protein / 180)) * 10) / 10,
  };
}

// Partes de cada comida: [cantidad, unidad, nombre, tipo]. Tipo: p = proteína, c = carbohidrato, f = fijo.
const M = {
  1: [[[200, 'g', 'pollo', 'p'], [150, 'g', 'arroz', 'c'], [150, 'g', 'tomate y verdura', 'f'], [1, 'cdita', 'aceite', 'f']],
      [[4, 'u', 'huevos', 'p'], [100, 'g', 'pollo', 'p'], [200, 'g', 'papa', 'c'], [150, 'g', 'verdura', 'f']]],
  2: [[[200, 'g', 'pollo', 'p'], [150, 'g', 'fideos', 'c'], [150, 'g', 'zanahoria rallada', 'f'], [1, 'cdita', 'aceite', 'f']],
      [[4, 'u', 'huevos en tortilla con verduras', 'p'], [100, 'g', 'pollo o atún', 'p'], [200, 'g', 'papa', 'c']]],
  3: [[[200, 'g', 'pollo', 'p'], [150, 'g', 'arroz', 'c'], [150, 'g', 'ensalada', 'f']],
      [[200, 'g', 'pollo', 'p'], [200, 'g', 'papa', 'c'], [150, 'g', 'verdura', 'f']]],
  4: [[[200, 'g', 'pollo', 'p'], [150, 'g', 'arroz', 'c'], [150, 'g', 'tomate y verdura', 'f'], [1, 'cdita', 'aceite', 'f']],
      [[4, 'u', 'huevos', 'p'], [100, 'g', 'pollo', 'p'], [120, 'g', 'fideos', 'c'], [150, 'g', 'verdura', 'f']]],
  5: [[[1, 'lata', 'de atún', 'f'], [3, 'u', 'huevos duros', 'p'], [200, 'g', 'papa', 'c'], [150, 'g', 'tomate', 'f']],
      [[200, 'g', 'pollo', 'p'], [200, 'g', 'papa', 'c'], [150, 'g', 'zanahoria', 'f']]],
  6: [[[200, 'g', 'pollo', 'p'], [150, 'g', 'arroz', 'c'], [150, 'g', 'tomate y verdura', 'f'], [1, 'cdita', 'aceite', 'f']],
      [[4, 'u', 'huevos en tortilla', 'p'], [100, 'g', 'pollo', 'p'], [200, 'g', 'papa', 'c'], [150, 'g', 'ensalada', 'f']]],
  0: [[[200, 'g', 'pollo', 'p'], [120, 'g', 'fideos', 'c'], [150, 'g', 'verdura', 'f']],
      [[200, 'g', 'pollo', 'p'], [150, 'g', 'arroz', 'c'], [150, 'g', 'verdura', 'f']]],
};

function fmtPart([q, unit, name, kind], t) {
  const k = kind === 'p' ? t.proteinScale : kind === 'c' ? t.carbScale : 1;
  if (unit === 'g') return `${Math.max(10, Math.round((q * k) / 10) * 10)} g ${name}`;
  if (unit === 'u') return `${Math.max(1, Math.round(q * k))} ${name}`;
  return `${q} ${unit} ${name}`;
}
export function meals(dow, profile) {
  const t = targets(profile);
  return M[dow].map((parts) => parts.map((x) => fmtPart(x, t)).join(' + '));
}

// Rutinas por lugar de entrenamiento: dumbbells (casa con mancuernas), gym y bodyweight (casa sin equipo).
export const WORKOUTS = {
  dumbbells: {
    1: { title: 'Empuje', sub: 'Pecho, hombros y tríceps', ex: [
      ['pressInclinado', '4 x 10-15'], ['pressPlano', '3 x 12-15'], ['aperturas', '3 x 15'],
      ['pressHombro', '3 x 12-15'], ['lateralLeanIn', '4 x 15-20 por brazo'], ['extTricepsArriba', '3 x 12-15 por brazo'],
      ['skullcrusher', '3 x 15']] },
    2: { title: 'Piernas A', sub: 'Cuádriceps y glúteos', ex: [
      ['bulgara', '4 x 10-15 por pierna'], ['gobletTalon', '3 x 15-20'], ['estocadas', '3 x 12 por pierna'],
      ['pesoMuertoRumano', '3 x 15'], ['pantorrilla', '4 x 15 por pierna'], ['deadBug', '3 x 8 por lado']] },
    3: { title: 'Tirón', sub: 'Espalda y bíceps', ex: [
      ['remoPechoApoyado', '4 x 12-15'], ['remoUnBrazo', '3 x 12-15 por brazo'], ['pullover', '3 x 15'],
      ['pajaros', '3 x 15-20'], ['curlInclinado', '3 x 12-15'], ['curlPredicador', '3 x 12-15 por brazo'], ['curlMartillo', '2 x 15']] },
    4: { title: 'Piernas B', sub: 'Glúteos, isquios y core', ex: [
      ['pesoMuertoRumano', '4 x 12-15'], ['hipThrust', '4 x 12-15 por pierna'], ['bulgara', '3 x 12 por pierna'],
      ['stepUp', '3 x 12 por pierna'], ['pantorrilla', '4 x 15 por pierna'], ['deadBug', '3 x 8 por lado']] },
    5: { title: 'Torso completo', sub: 'Más volumen', ex: [
      ['flexionesDeficit', '3 x al fallo'], ['krocRow', '3 x 15-25 por brazo'], ['pressInclinado', '3 x 12-15'],
      ['lateralAcostado', '3 x 15-20 por brazo'], ['curlAcostado', '3 x 12-15'], ['extTricepsArriba', '3 x 15 por brazo']] },
    6: { title: 'Brazos y hombros', sub: 'Opcional', optional: true, ex: [
      ['lateralLeanIn', '4 x 15-20 por brazo'], ['lateralAcostado', '3 x 15 por brazo'], ['pajaros', '3 x 20'],
      ['curlInclinado', '3 x 12-15'], ['curlMartillo', '3 x 15'], ['skullcrusher', '3 x 15']] },
    0: { title: 'Descanso activo', sub: 'Opcional', optional: true, ex: [['caminata', '45-60 min'], ['movilidad', '10 min']] },
  },
  gym: {
    1: { title: 'Empuje', sub: 'Pecho, hombros y tríceps', ex: [
      ['maquinaPecho', '3 x 8-12'], ['pressInclinado', '3 x 8-12'], ['cruceSentado', '3 x 12-15'],
      ['pressHombroMaquina', '3 x 8-12'], ['lateralPolea', '4 x 12-15 por brazo'], ['extTricepsPolea', '3 x 10-15'],
      ['pressdown', '2 x 12-15']] },
    2: { title: 'Piernas A', sub: 'Cuádriceps y glúteos', ex: [
      ['hackSquat', '4 x 8-12'], ['prensa45', '3 x 10-15'], ['extensionCuadriceps', '3 x 12-15'],
      ['curlFemoralSentado', '3 x 10-15'], ['gemelosMaquina', '4 x 10-15'], ['crunchPolea', '3 x 12-15']] },
    3: { title: 'Tirón', sub: 'Espalda y bíceps', ex: [
      ['jalonAncho', '3 x 8-12'], ['remoMaquinaApoyado', '3 x 8-12'], ['remoPolea', '3 x 10-12'],
      ['pecDeckInverso', '3 x 12-20'], ['curlBayesiano', '3 x 10-15'], ['curlPredicadorMaquina', '3 x 10-15'], ['curlMartillo', '2 x 12-15']] },
    4: { title: 'Piernas B', sub: 'Glúteos, isquios y core', ex: [
      ['pesoMuertoRumano', '3 x 8-12'], ['hipThrustMaquina', '3 x 8-12'], ['estocadas', '3 x 10 por pierna'],
      ['abduccionMaquina', '3 x 15-20'], ['hiperextension45', '3 x 12-15'], ['curlFemoralSentado', '3 x 10-15']] },
    5: { title: 'Torso completo', sub: 'Más volumen', ex: [
      ['pressInclinadoSmith', '3 x 8-12'], ['jalonUnBrazo', '3 x 10-12 por brazo'], ['pecDeck', '3 x 12-15'],
      ['yRaisePolea', '3 x 12-15'], ['curlPolea', '3 x 10-15'], ['rompecraneosBarra', '3 x 10-12']] },
    6: { title: 'Brazos y hombros', sub: 'Opcional', optional: true, ex: [
      ['lateralPolea', '3 x 15 por brazo'], ['cruceInversoPolea', '3 x 15'], ['facePull', '3 x 15-20'],
      ['curlBayesiano', '3 x 12'], ['extTricepsPolea', '3 x 12'], ['curlMartillo', '2 x 15']] },
    0: { title: 'Descanso activo', sub: 'Opcional', optional: true, ex: [['caminata', '45-60 min'], ['movilidad', '10 min']] },
  },
  bodyweight: {
    1: { title: 'Empuje', sub: 'Pecho, hombros y tríceps', ex: [
      ['flexionesDeficitSillas', '4 x al fallo'], ['fondosSillas', '3 x 8-15'], ['flexionesPike', '3 x 8-15'],
      ['flexionesDiamante', '3 x al fallo'], ['plancha', '3 x 40 s']] },
    2: { title: 'Piernas A', sub: 'Cuádriceps y glúteos', ex: [
      ['bulgaraSilla', '4 x 12-20 por pierna'], ['nordicoInverso', '3 x 8-12'], ['sissySquat', '3 x 10-15'],
      ['pantorrilla', '4 x 15-20 por pierna'], ['deadBug', '3 x 8 por lado']] },
    3: { title: 'Tirón', sub: 'Espalda y bíceps', ex: [
      ['remoMochila', '4 x 12-20 por brazo'], ['remoInvertidoMesa', '3 x al fallo'], ['angelesInversos', '3 x 12-15'],
      ['curlMochila', '3 x 12-20'], ['plancha', '3 x 40 s']] },
    4: { title: 'Piernas B', sub: 'Glúteos, isquios y core', ex: [
      ['estocadas', '3 x 12-20 por pierna'], ['hipThrustSillon', '4 x 12-20 por pierna'], ['pesoMuertoUnaPierna', '3 x 10-15 por pierna'],
      ['subidasSilla', '3 x 12 por pierna'], ['puenteGluteo', '2 x 20']] },
    5: { title: 'Torso completo', sub: 'Más volumen', ex: [
      ['flexionesDeficitSillas', '3 x al fallo'], ['remoMochila', '3 x 15 por brazo'], ['flexionesPike', '3 x 10-15'],
      ['remoInvertidoMesa', '3 x al fallo'], ['curlMochila', '2 x 15-20'], ['flexionesDiamante', '2 x al fallo']] },
    6: { title: 'Brazos y hombros', sub: 'Opcional', optional: true, ex: [
      ['flexionesDiamante', '3 x al fallo'], ['curlMochila', '3 x 15-20'], ['angelesInversos', '3 x 15'],
      ['flexionesPike', '3 x 10'], ['plancha', '3 x 45 s']] },
    0: { title: 'Descanso activo', sub: 'Opcional', optional: true, ex: [['caminata', '45-60 min'], ['movilidad', '10 min']] },
  },
};
export const workoutFor = (dow, profile) => WORKOUTS[withDefaults(profile).location]?.[dow] ?? WORKOUTS.dumbbells[dow];

export const TECHNIQUE = {
  dumbbells: 'Con mancuernas de hasta 15 kg, la dificultad la ponés con la técnica: bajá en 3 segundos, buscá el máximo estiramiento abajo y llevá cada serie a 1-2 repeticiones del fallo. Entre 10 y 30 repeticiones da el mismo crecimiento si llegás cerca del fallo. Descansá 60-90 s. Cuando hagas el tope de repeticiones en todas las series, sumá peso o pasá a la versión a un brazo o una pierna.',
  gym: 'Elegí un peso con el que llegues al rango de reps dejando 1 o 2 en reserva. Bajá en 2-3 segundos y buscá el máximo estiramiento. Descansá 2-3 min en los compuestos (press, sentadilla hack, remos) y 60-90 s en los aislados. Cuando llegues al tope del rango en todas las series, subí el peso.',
  bodyweight: 'Sin peso extra, la dificultad la ponés con el tempo y la palanca: bajá en 3-4 segundos, pausá abajo y llevá cada serie cerca del fallo. Si una serie pasa de 25 reps, usá la versión más difícil (una pierna, pies elevados, mochila con libros).',
};


export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
// Minutos del "día del usuario": lo que pasa después de medianoche y antes de levantarse cuenta como el final del día.
export const dayMin = (hhmm, profile) => { const m = toMin(hhmm); return m < toMin(withDefaults(profile).wake) - 60 ? m + 1440 : m; };

// type: supp | food | train | habit
export function timeline(dow, trains, profile) {
  const p = withDefaults(profile);
  const s = p.supps;
  const weekend = isWeekend(dow);
  const [lunch, dinner] = meals(dow, p);
  const w = workoutFor(dow, p);
  const L = toMin(p.lunch), T = toMin(p.train), D = toMin(p.dinner), S = toMin(p.sleep);
  const items = [
    { key: 'desayuno', time: p.wake, type: 'food', title: 'Despertar y desayuno', detail: '5-10 min de luz natural + 3 huevos + un vaso grande de agua' },
    { key: 'almuerzo', time: p.lunch, type: 'food', title: 'Almuerzo · tupper 1', detail: lunch },
    { key: 'caminata', time: fromMin(L + 40), type: 'habit', title: 'Caminata', detail: '15-20 min después de comer' },
    { key: 'merienda', time: fromMin(L + 240), type: s.proteina ? 'supp' : 'food', title: 'Merienda', detail: s.proteina ? '1 medida de proteína + 1 fruta · 5-10 min parado' : '1 yogur o 2 huevos + 1 fruta · 5-10 min parado' },
  ];
  const restCarni = s.carnitina && !trains;
  if (s.ripped) items.push({ key: 'ripped', time: fromMin(L - 30), type: 'supp', title: 'Ripped X', detail: restCarni ? '2 cápsulas de Ripped X + 2 de carnitina con 200 cc de agua' : '2 cápsulas con 200 cc de agua' });
  else if (restCarni) items.push({ key: 'carnitina', time: fromMin(L - 30), type: 'supp', title: 'Carnitina', detail: '2 cápsulas con agua' });
  const post = [s.proteina && '1 medida de proteína', s.creatina && '5 g de creatina'].filter(Boolean).join(' + ');
  if (trains) {
    if (s.carnitina) items.push({ key: 'carnitina', time: fromMin(T - 60), type: 'supp', title: 'Carnitina', detail: '3 cápsulas, 30-60 min antes de entrenar' });
    items.push({ key: 'entreno', time: p.train, type: 'train', title: `Entreno · ${w.title}`, detail: `${w.sub} · unos 60 min`, link: 'entreno' });
    if (post) items.push({ key: 'post', time: fromMin(T + 75), type: 'supp', title: 'Después de entrenar', detail: post });
  } else if (s.creatina) {
    items.push({ key: 'post', time: p.train, type: 'supp', title: 'Creatina', detail: '5 g con agua (también los días sin entreno)' });
  }
  if (dow === 0) items.push({ key: 'prep', time: '17:00', type: 'food', title: 'Meal prep', detail: 'Cocinar tuppers de lunes a miércoles', link: 'comidas' });
  if (dow === 3) items.push({ key: 'prep', time: fromMin(D + 40), type: 'food', title: 'Meal prep', detail: 'Cocinar jueves a domingo · congelar sábado y domingo', link: 'comidas' });
  if (dow === 6) items.push({ key: 'super', time: '10:30', type: 'habit', title: 'Súper', detail: 'Compra semanal', link: 'super' });
  items.push(
    { key: 'cena', time: p.dinner, type: 'food', title: 'Cena · tupper 2', detail: dinner },
    s.magnesio
      ? { key: 'magnesio', time: fromMin(S - 60), type: 'supp', title: 'Magnesio', detail: 'Dosis del envase · pantallas apagadas y luz baja' }
      : { key: 'magnesio', time: fromMin(S - 60), type: 'habit', title: 'Desconectar', detail: 'Pantallas apagadas y luz baja' },
    { key: 'dormir', time: fromMin(S - 15), type: 'habit', title: 'A dormir', detail: `Dormido a las ${p.sleep} como máximo` },
  );
  return items.sort((a, b) => dayMin(a.time, p) - dayMin(b.time, p));
}

export const isWeekend = (dow) => dow === 0 || dow === 6;

export const STORAGE = [
  ['Pollo, tortilla', '3-4 días', '2-3 meses'],
  ['Arroz, fideos', '3-4 días', '1-2 meses'],
  ['Verduras cocidas', '3-4 días', 'Sí'],
  ['Papa cocida', '3-4 días', 'Pierde textura'],
  ['Huevos duros (con cáscara)', '1 semana', 'No'],
  ['Atún abierto', '3-4 días', 'No hace falta'],
];
