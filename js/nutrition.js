// Avaliação corporal e prescrição nutricional — funções puras.
// Referências: IMC (OMS); % gordura por perimetria (US Navy — Hodgdon & Beckett, 1984);
// TMB Mifflin-St Jeor (1990) e Katch-McArdle; relação cintura/estatura (Ashwell, 2012);
// circunferência de cintura (OMS); proteína 1,6–2,2 g/kg (ISSN, 2017); PAR-Q+ (2023).
import { FOODS } from './foods.js';
import { RECIPES } from './recipes.js';
import { addDays } from './util.js';
import { labEffects } from './labs.js';
import { medEffects } from './medications.js';

/** Refeições por dia (quem usa caneta: no mínimo 5, menores). */
export const mealsPerDay = (h) => (h.glp1?.med ? Math.max(5, Number(h.meals_per_day) || 5) : Number(h.meals_per_day) || 4);

export const JOBS = {
  sentado: { label: 'Trabalho/estudo sentado', base: 1.2 },
  em_pe: { label: 'Fico em pé e ando bastante', base: 1.3 },
  bracal: { label: 'Trabalho braçal / muito ativo', base: 1.45 },
};

export const GOALS = {
  emagrecer: { label: 'Perder gordura', desc: 'Déficit calórico preservando massa magra' },
  recomposicao: { label: 'Recomposição corporal', desc: 'Perder gordura e ganhar músculo devagar' },
  hipertrofia: { label: 'Ganhar massa muscular', desc: 'Leve superávit com treino de força' },
  manter: { label: 'Manter e ter saúde', desc: 'Manutenção do peso e hábitos' },
  performance: { label: 'Performance esportiva', desc: 'Energia para treinar pesado' },
};

export const PARQ = [
  'Algum médico já disse que você tem problema no coração OU pressão alta?',
  'Você sente dor no peito em repouso, no dia a dia ou quando faz atividade física?',
  'Você perde o equilíbrio por tontura ou perdeu a consciência nos últimos 12 meses?',
  'Você tem diagnóstico de outra doença crônica (além de coração ou pressão)?',
  'Você toma remédios prescritos para alguma doença crônica?',
  'Você tem problema em ossos, articulações ou músculos que pode piorar com exercício?',
  'Algum médico já disse que você só deve fazer atividade física com supervisão médica?',
];

export const CONDITIONS = {
  gestante: 'Gestante',
  lactante: 'Amamentando',
  diabetes: 'Diabetes',
  hipertensao: 'Hipertensão',
  renal: 'Doença renal',
  cardiaca: 'Doença cardíaca',
  tireoide: 'Doença da tireoide',
  transtorno: 'Histórico de transtorno alimentar',
};

export const DIETS = { onivoro: 'Como de tudo', vegetariano: 'Vegetariano', vegano: 'Vegano' };
export const RESTRICTIONS = { lactose: 'Sem lactose', gluten: 'Sem glúten' };
export const ALLERGIES = { ovo: 'Ovo', leite: 'Leite (proteína)', amendoim: 'Amendoim', castanha: 'Castanhas', peixe: 'Peixe', soja: 'Soja' };

export function ageFrom(birth, now = new Date()) {
  const b = new Date(`${birth}T12:00:00`);
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

/** % de gordura pelo protocolo US Navy (medidas em cm). Retorna null se inconsistente. */
export function navyBodyFat({ sex, height, waist, neck, hip }) {
  if (!height || !waist || !neck) return null;
  let bf;
  if (sex === 'M') {
    if (waist <= neck) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  } else {
    if (!hip || waist + hip <= neck) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
  }
  return bf >= 3 && bf <= 65 ? Math.round(bf * 10) / 10 : null;
}

const band = (v, rows) => rows.find(([max]) => v < max)?.[1] ?? rows.at(-1)[1];

export const bmiClass = (b) => band(b, [
  [18.5, { label: 'Abaixo do peso', level: 'warn' }], [25, { label: 'Eutrofia (normal)', level: 'good' }],
  [30, { label: 'Sobrepeso', level: 'warn' }], [35, { label: 'Obesidade grau I', level: 'bad' }],
  [40, { label: 'Obesidade grau II', level: 'bad' }], [Infinity, { label: 'Obesidade grau III', level: 'bad' }],
]);

export const bfClass = (bf, sex) => band(bf, sex === 'M'
  ? [[6, { label: 'Essencial', level: 'warn' }], [14, { label: 'Atleta', level: 'good' }], [18, { label: 'Boa forma', level: 'good' }],
     [25, { label: 'Aceitável', level: 'warn' }], [Infinity, { label: 'Elevado', level: 'bad' }]]
  : [[14, { label: 'Essencial', level: 'warn' }], [21, { label: 'Atleta', level: 'good' }], [25, { label: 'Boa forma', level: 'good' }],
     [32, { label: 'Aceitável', level: 'warn' }], [Infinity, { label: 'Elevado', level: 'bad' }]]);

export const whtrClass = (r) => band(r, [
  [0.5, { label: 'Risco baixo', level: 'good' }], [0.6, { label: 'Risco aumentado', level: 'warn' }],
  [Infinity, { label: 'Risco alto', level: 'bad' }],
]);

export const waistRisk = (w, sex) => {
  const [a, b] = sex === 'M' ? [94, 102] : [80, 88];
  return w >= b ? { label: 'Risco muito aumentado', level: 'bad' } : w >= a ? { label: 'Risco aumentado', level: 'warn' } : { label: 'Adequada', level: 'good' };
};

/**
 * Análise completa + prescrição. h = perfil de saúde, m = medidas da avaliação.
 * Retorna tudo que o relatório e o planejador precisam, incluindo alertas de segurança.
 */
export function analyze(h, m, labResults = []) {
  const age = ageFrom(h.birth_date);
  const sex = h.sex;
  const height = Number(m.height_cm ?? h.height_cm);
  const weight = Number(m.weight_kg);
  const hm = height / 100;
  const bmi = weight / (hm * hm);
  const alerts = [];
  const care = new Set(); // modos de cuidado que travam condutas agressivas

  // --- Composição corporal
  let bf = null, bfSource = null;
  if (m.bf_method === 'fita') {
    bf = navyBodyFat({ sex, height, waist: Number(m.waist_cm), neck: Number(m.neck_cm), hip: Number(m.hip_cm) });
    bfSource = 'Perimetria (US Navy)';
    if (bf === null) alerts.push({ level: 'warn', text: 'As medidas de cintura/pescoço/quadril ficaram inconsistentes. Refaça a medição seguindo o protocolo — o % de gordura não foi calculado.' });
  } else if (m.bf_method === 'bioimpedancia' || m.bf_method === 'dexa') {
    bf = Number(m.bf_pct) || null;
    bfSource = m.bf_method === 'dexa' ? 'DEXA (padrão-ouro)' : 'Bioimpedância';
  }
  const lbm = bf != null ? weight * (1 - bf / 100) : null;
  const whtr = m.waist_cm ? Number(m.waist_cm) / height : null;

  // --- Gasto energético
  const mifflin = 10 * weight + 6.25 * height - 5 * age + (sex === 'M' ? 5 : -161);
  const katch = lbm != null ? 370 + 21.6 * lbm : null;
  const bmr = Math.round(katch ?? mifflin);
  const factor = Math.min(1.9, (JOBS[h.job]?.base ?? 1.2) + 0.055 * Number(h.training_days || 0));
  const tdee = Math.round(bmr * factor);

  // --- Segurança: situações em que NÃO se prescreve déficit
  const cond = new Set(h.conditions || []);
  if (age < 18) { care.add('menor'); alerts.push({ level: 'bad', text: 'Menor de 18 anos: plano de MANUTENÇÃO apenas. Dietas restritivas na adolescência exigem acompanhamento de nutricionista/pediatra.' }); }
  if (cond.has('gestante') || cond.has('lactante')) { care.add('gestacao'); alerts.push({ level: 'bad', text: 'Gestação/amamentação: sem déficit calórico. As necessidades mudam por trimestre — siga orientação do obstetra e de nutricionista.' }); }
  if (cond.has('transtorno')) { care.add('transtorno'); alerts.push({ level: 'bad', text: 'Histórico de transtorno alimentar: o app NÃO mostra contagem de calorias nem propõe déficit. Recomendamos acompanhamento com nutricionista e psicólogo.' }); }
  if (cond.has('renal')) { care.add('renal'); alerts.push({ level: 'bad', text: 'Doença renal: proteína limitada a 0,8 g/kg e necessidade de liberação do nefrologista antes de mudar a dieta.' }); }
  if (cond.has('diabetes')) alerts.push({ level: 'warn', text: 'Diabetes: distribua os carboidratos ao longo do dia e ajuste medicação com seu médico antes de reduzir calorias — risco de hipoglicemia.' });
  if (cond.has('hipertensao')) alerts.push({ level: 'warn', text: 'Hipertensão: limite o sódio a ~2 g/dia (≈5 g de sal) e prefira temperos naturais.' });
  if (cond.has('cardiaca')) alerts.push({ level: 'bad', text: 'Doença cardíaca: faça avaliação cardiológica (com teste ergométrico) antes de treinos intensos.' });
  if (cond.has('tireoide')) alerts.push({ level: 'warn', text: 'Tireoide: o gasto calórico pode variar com a doença/medicação; reavalie o peso a cada 2 semanas.' });
  if (h.diet_type === 'vegano' || h.diet_type === 'vegetariano') alerts.push({ level: 'info', text: 'Em dietas à base de plantas, a proteína das leguminosas vem acompanhada de carboidrato: é esperado o carboidrato passar um pouco da meta. Priorize tofu, lentilha, grão-de-bico e proteína isolada de ervilha, e monitore B12 e ferritina nos exames.' });
  const pend = h.pending ?? [];
  if (pend.length) {
    const L = { altura: 'altura', peso: 'peso', medidas: 'medidas corporais', rotina: 'rotina e objetivo', saude: 'triagem de saúde', alimentacao: 'restrições e alergias' };
    alerts.unshift({ level: 'bad', text: `AVALIAÇÃO INCOMPLETA — faltam: ${pend.map((k) => L[k] ?? k).join(', ')}. Os números abaixo são estimativas e podem estar longe do real. Complete assim que possível.` });
  }
  if (pend.includes('peso')) alerts.push({ level: 'warn', text: 'Peso estimado pela altura (IMC 23,5): calorias e proteína podem estar muito erradas.' });
  if (pend.includes('saude')) alerts.push({ level: 'bad', text: 'Triagem de saúde não respondida: até responder, evite treinos de alta intensidade e, havendo qualquer doença, procure liberação médica.' });
  if (pend.includes('alimentacao')) alerts.push({ level: 'warn', text: 'Alergias e restrições não informadas: confira os ingredientes de cada receita antes de consumir.' });
  const parqYes = (h.parq || []).filter(Boolean).length;
  if (parqYes) alerts.push({ level: 'bad', text: `PAR-Q+: ${parqYes} resposta(s) "sim". Procure liberação médica antes de treinos de alta intensidade.` });

  // --- Objetivo efetivo
  let goal = h.goal;
  if (bmi < 18.5 && ['emagrecer', 'recomposicao'].includes(goal)) {
    goal = 'manter';
    alerts.push({ level: 'warn', text: 'IMC abaixo de 18,5: não é indicado perder peso. O plano foi ajustado para manutenção/ganho.' });
  }
  const highFat = bf != null ? bf > (sex === 'M' ? 20 : 30) : bmi >= 27;
  if (goal === 'hipertrofia' && highFat) alerts.push({ level: 'info', text: 'Com o % de gordura atual, a recomposição tende a render mais que o superávit. Usamos um superávit mínimo.' });

  // --- Calorias
  let delta = { emagrecer: -0.2, recomposicao: -0.1, hipertrofia: highFat ? 0.05 : 0.1, manter: 0, performance: 0.05 }[goal] ?? 0;
  if (goal === 'emagrecer' && (bf != null ? bf > (sex === 'M' ? 25 : 32) : bmi >= 30)) delta = -0.25;
  if (cond.has('diabetes')) delta = Math.max(delta, -0.15);
  const med = medEffects(h, Math.min(weight, 27 * hm * hm), sex);
  if (med) delta = Math.max(delta, med.maxDeficit);
  if (care.size && delta < 0) { delta = 0; goal = 'manter'; }
  let kcal = tdee * (1 + delta);
  if (delta < 0) kcal = Math.max(kcal, tdee - 750);
  const floor = Math.max(bmr, sex === 'M' ? 1500 : 1200);
  if (kcal < floor) { kcal = floor; if (delta < 0) alerts.push({ level: 'info', text: 'A meta foi limitada ao seu metabolismo basal: abaixo disso há perda de massa magra e queda de desempenho.' }); }
  kcal = Math.round(kcal / 10) * 10;

  // --- Macronutrientes
  const refWeight = Math.min(weight, 27 * hm * hm); // em sobrepeso, calcula sobre o peso de referência
  let protPerKg = { emagrecer: 2.0, recomposicao: 2.0, hipertrofia: 1.8, manter: 1.6, performance: 1.7 }[goal] ?? 1.6;
  if (age >= 60) protPerKg = Math.max(protPerKg, 1.2);
  if (care.has('menor')) protPerKg = Math.min(protPerKg, 1.5);
  if (care.has('renal')) protPerKg = 0.8;
  if (med && !care.has('renal')) protPerKg = Math.max(protPerKg, med.minProteinPerKg);
  const lab = labEffects(labResults);
  if (lab.proteinCapPerKg) protPerKg = Math.min(protPerKg, lab.proteinCapPerKg);
  if (med) alerts.push(...med.alerts);
  alerts.push(...lab.alerts);
  const protein = Math.round(protPerKg * refWeight);
  let fat = Math.round(Math.max((kcal * (med?.fatShare ?? 0.27)) / 9, 0.6 * refWeight));
  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  if (carbs < 100) { fat = Math.round(Math.max(0.5 * refWeight, (kcal - protein * 4 - 100 * 4) / 9)); carbs = Math.round((kcal - protein * 4 - fat * 9) / 4); }
  if (lab.carbCap && carbs * 4 > kcal * lab.carbCap) { // exames de glicose: desloca o excedente para gordura boa
    carbs = Math.round((kcal * lab.carbCap) / 4);
    fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
  }

  const water = Math.round((35 * weight) / 100) * 100;
  const fiber = Math.round((14 * kcal) / 1000);

  // --- Recomendações práticas
  const tips = [
    `Distribua a proteína: ${Math.round(protein / mealsPerDay(h))} g em cada refeição (ovos, carnes, laticínios ou leguminosas).`,
    `Beba ~${(water / 1000).toFixed(1).replace('.', ',')} L de água por dia (+500 ml nos dias de treino). Urina clara = hidratação adequada.`,
    'Metade do prato no almoço e jantar com vegetais; frutas 2–3 vezes ao dia.',
    `Meta de fibras: ${fiber} g/dia (feijão, aveia, frutas com casca, vegetais).`,
    'Durma 7–9 h: sono curto aumenta a fome e reduz a recuperação muscular.',
    'Álcool atrapalha recuperação e composição corporal — se consumir, com moderação e longe do treino.',
  ];
  if (['emagrecer', 'recomposicao'].includes(goal)) tips.push('Ritmo seguro de perda: 0,5–1% do peso por semana. Mais que isso costuma levar massa magra junto.');
  tips.unshift(...lab.tips);
  if (med) tips.unshift(...med.tips);
  if (goal === 'hipertrofia') tips.push('Ganho esperado: 0,25–0,5% do peso por semana. Se passar disso, reduza 100–150 kcal.');

  return {
    age, sex, height, weight, bmi: Math.round(bmi * 10) / 10, bmiClass: bmiClass(bmi),
    bf, bfSource, bfClass: bf != null ? bfClass(bf, sex) : null,
    lbm: lbm != null ? Math.round(lbm * 10) / 10 : null, fatMass: lbm != null ? Math.round((weight - lbm) * 10) / 10 : null,
    whtr: whtr ? Math.round(whtr * 100) / 100 : null, whtrClass: whtr ? whtrClass(whtr) : null,
    waist: m.waist_cm ? Number(m.waist_cm) : null, waistRisk: m.waist_cm ? waistRisk(Number(m.waist_cm), sex) : null,
    bmr, bmrMethod: katch != null ? 'Katch-McArdle (usa massa magra)' : 'Mifflin-St Jeor', factor: Math.round(factor * 100) / 100, tdee,
    goal, goalChanged: goal !== h.goal, kcal, protein, carbs, fat, water, fiber,
    hideNumbers: care.has('transtorno'), care: [...care], alerts, tips, pending: pend,
  };
}

// ---------------------------------------------------------------------------
// Planejador de refeições
// ---------------------------------------------------------------------------
export const SLOTS = {
  3: [['cafe', 'Café da manhã', '07:00', 0.3], ['almoco', 'Almoço', '12:30', 0.4], ['jantar', 'Jantar', '19:30', 0.3]],
  4: [['cafe', 'Café da manhã', '07:00', 0.25], ['almoco', 'Almoço', '12:30', 0.35], ['lanche', 'Lanche da tarde', '16:00', 0.15], ['jantar', 'Jantar', '19:30', 0.25]],
  5: [['cafe', 'Café da manhã', '07:00', 0.2], ['lanche1', 'Lanche da manhã', '10:00', 0.1], ['almoco', 'Almoço', '12:30', 0.3], ['lanche', 'Lanche da tarde', '16:00', 0.15], ['jantar', 'Jantar', '19:30', 0.25]],
  6: [['cafe', 'Café da manhã', '07:00', 0.2], ['lanche1', 'Lanche da manhã', '10:00', 0.1], ['almoco', 'Almoço', '12:30', 0.28], ['lanche', 'Lanche da tarde', '16:00', 0.14], ['jantar', 'Jantar', '19:30', 0.2], ['ceia', 'Ceia', '22:00', 0.08]],
};
const slotType = (id) => (id === 'cafe' ? 'cafe' : id === 'almoco' || id === 'jantar' ? 'refeicao' : 'lanche');

export function recipeMacros(r, factor = 1) {
  const t = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
  for (const [food, g] of r.ing) {
    const x = FOODS[food];
    for (const key of Object.keys(t)) t[key] += (x[key] * g * factor) / 100;
  }
  return t;
}

/** Marcadores que a pessoa NÃO pode/quer comer. */
export function blockedTags(h) {
  const b = new Set();
  if (h.diet_type === 'vegetariano' || h.diet_type === 'vegano') { b.add('carne'); b.add('peixe'); }
  if (h.diet_type === 'vegano') { b.add('ovo'); b.add('leite'); b.add('mel'); }
  if ((h.restrictions || []).includes('lactose')) b.add('leite');
  if ((h.restrictions || []).includes('gluten')) b.add('gluten');
  for (const a of h.allergies || []) b.add(a);
  return b;
}

export function allowedRecipes(h, type) {
  const b = blockedTags(h);
  return RECIPES.filter((r) => (!type || r.slot === type) && r.ing.every(([f]) => !(FOODS[f].t || []).some((t) => b.has(t))));
}

function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return x >>> 0;
}

function roundGrams(food, g) {
  const f = FOODS[food];
  if (f.u) return Math.max(1, Math.round(g / f.u)) * f.u;
  return Math.max(5, Math.round(g / 5) * 5);
}

export function household(food, g) {
  const f = FOODS[food];
  if (f.u) { const n = Math.round(g / f.u); return `${n} ${n === 1 ? 'unidade' : 'unidades'}`; }
  if (!f.m) return '';
  const q = Math.round((g / f.m[1]) * 2) / 2;
  if (q <= 0) return '';
  const [first, ...rest] = f.m[0].split(' ');
  const plural = q > 1 ? first.replace(/(r|l)$/, '$1e').replace(/ão$/, 'õe') + 's' : first;
  return `≈ ${String(q).replace('.', ',')} ${[plural, ...rest].join(' ')}`;
}

/** Escala uma receita para a meta de kcal da refeição. */
export function scaleRecipe(r, targetKcal) {
  const base = recipeMacros(r).k;
  const factor = Math.min(2.5, Math.max(0.5, targetKcal / base));
  const items = r.ing.map(([food, g]) => ({ food, name: FOODS[food].n, g: roundGrams(food, g * factor) }));
  const macros = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
  for (const it of items) for (const k of Object.keys(macros)) macros[k] += (FOODS[it.food][k] * it.g) / 100;
  return { factor, items, macros };
}

/**
 * Plano de um dia. swaps = { [slot]: recipeId } escolhidos pelo usuário.
 * A escolha padrão é determinística por (usuário, data, refeição) — muda todo dia, sem repetir almoço e jantar.
 */
export function planDay(h, a, dateKey, userId, swaps = {}) {
  const slots = SLOTS[mealsPerDay(h)] ?? SLOTS[4];
  const used = new Set();
  const acc = { k: 0, p: 0, c: 0, f: 0 };
  let kcalSoFar = 0;
  const meals = slots.map(([id, label, time, share]) => {
    const pool = allowedRecipes(h, slotType(id));
    const kcal = a.kcal * share;
    let r = pool.find((x) => x.id === swaps[id]);
    if (!r && pool.length) {
      // Escolha guiada por macros: o que falta para a meta, proporcional às calorias já planejadas.
      kcalSoFar += kcal;
      const frac = kcalSoFar / a.kcal;
      const score = (cand) => {
        const m = scaleRecipe(cand, kcal).macros;
        return Math.abs(acc.p + m.p - a.protein * frac) / a.protein
          + Math.abs(acc.c + m.c - a.carbs * frac) / a.carbs
          + Math.abs(acc.f + m.f - a.fat * frac) / a.fat;
      };
      const ranked = pool.filter((x) => !used.has(x.id)).map((x) => [x, score(x)]).sort((x, y) => x[1] - y[1]);
      const top = ranked.slice(0, 3);
      r = top.length ? top[hash(`${userId}|${dateKey}|${id}`) % top.length][0] : pool[0];
    } else kcalSoFar += kcal;
    if (r) used.add(r.id);
    const scaled = r ? scaleRecipe(r, kcal) : { items: [], macros: { k: 0, p: 0, c: 0, f: 0, fb: 0 } };
    for (const k of Object.keys(acc)) acc[k] += scaled.macros[k];
    return { id, label, time, kcal, recipe: r ?? null, ...scaled };
  });
  const totals = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
  for (const m of meals) for (const k of Object.keys(totals)) totals[k] += m.macros[k];

  // Complemento se a proteína do dia ficar abaixo de 90% da meta.
  let complement = null;
  const gap = a.protein - totals.p;
  if (gap > a.protein * 0.1) {
    const b = blockedTags(h);
    const opt = [['whey', 'leite'], ['cottage', 'leite'], ['ovo', 'ovo'], ['tofu', 'soja'], ['frango_desf', 'carne'], ['prot_ervilha', null]]
      .find(([, tag]) => !tag || !b.has(tag));
    if (opt) {
      const food = opt[0];
      const g = roundGrams(food, (gap / FOODS[food].p) * 100);
      complement = { food, name: FOODS[food].n, g, protein: Math.round((FOODS[food].p * g) / 100) };
    }
  }
  return { meals, totals, complement };
}
