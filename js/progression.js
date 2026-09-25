// Progressão de carga e periodização — funções puras.
// 1RM estimado: Epley (1985). Progressão: "dupla progressão" (reps no teto da faixa → sobe carga).
// Mesociclo de 5 semanas: 2 semanas base, 2 semanas +1 série, 1 semana de deload (−40% volume, −10% carga).
import { getExercise } from './exercises.js';

export const e1rm = (kg, reps) => kg * (1 + reps / 30);
export const loadForReps = (oneRm, reps) => oneRm / (1 + reps / 30);

/** "8-10" → {lo:8, hi:10}; "12 cada lado" → {12,12}; "40s", "15 min" → null (exercício por tempo). */
export function parseReps(txt) {
  const s = String(txt).toLowerCase();
  if (/\d\s*(s|seg|min)\b/.test(s)) return null;
  const m = s.match(/(\d+)\s*(?:-|a|–)\s*(\d+)/);
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  const n = s.match(/\d+/);
  return n ? { lo: Number(n[0]), hi: Number(n[0]) } : null;
}

const INCREMENT = { barbell: 2.5, dumbbell: 2, 'e-z curl bar': 2.5, machine: 2.5, cable: 2.5, kettlebells: 4, other: 2.5 };
const PER_HAND = new Set(['dumbbell', 'kettlebells']);

// Carga inicial estimada p/ ~10 reps (iniciante), em fração do peso corporal: [homem, mulher].
// Para halteres, a fração é POR HALTER. Referência prática de academia — serve de ponto de partida, não de meta.
const START = {
  'Barbell_Bench_Press_-_Medium_Grip': [0.5, 0.3], Incline_Dumbbell_Press: [0.16, 0.09], Machine_Bench_Press: [0.45, 0.28],
  Leverage_Chest_Press: [0.45, 0.28], Butterfly: [0.35, 0.22], Dumbbell_Flyes: [0.1, 0.06], Leverage_Shoulder_Press: [0.35, 0.2],
  Machine_Shoulder_Military_Press: [0.35, 0.2], Dumbbell_Shoulder_Press: [0.12, 0.07], Side_Lateral_Raise: [0.06, 0.04],
  Front_Dumbbell_Raise: [0.06, 0.04], Face_Pull: [0.2, 0.12], Reverse_Machine_Flyes: [0.25, 0.15],
  'Triceps_Pushdown_-_Rope_Attachment': [0.2, 0.12], Triceps_Pushdown: [0.25, 0.15], 'EZ-Bar_Skullcrusher': [0.2, 0.12],
  'Wide-Grip_Lat_Pulldown': [0.5, 0.35], 'V-Bar_Pulldown': [0.5, 0.35], Seated_Cable_Rows: [0.45, 0.3],
  'One-Arm_Dumbbell_Row': [0.2, 0.12], Bent_Over_Barbell_Row: [0.4, 0.25], Barbell_Deadlift: [0.8, 0.5],
  Barbell_Curl: [0.25, 0.15], Hammer_Curls: [0.1, 0.06], Dumbbell_Bicep_Curl: [0.1, 0.06], Machine_Preacher_Curls: [0.2, 0.12],
  Barbell_Squat: [0.6, 0.4], Leg_Press: [1.2, 0.9], Hack_Squat: [0.6, 0.45], Smith_Machine_Squat: [0.6, 0.4],
  Leg_Extensions: [0.35, 0.25], Lying_Leg_Curls: [0.25, 0.18], Seated_Leg_Curl: [0.25, 0.18], Romanian_Deadlift: [0.5, 0.35],
  Barbell_Hip_Thrust: [0.8, 0.7], Dumbbell_Lunges: [0.1, 0.07], Thigh_Adductor: [0.35, 0.3], Thigh_Abductor: [0.35, 0.3],
  Standing_Calf_Raises: [0.8, 0.6], Seated_Calf_Raise: [0.5, 0.35], Barbell_Shrug: [0.6, 0.35], Ab_Crunch_Machine: [0.25, 0.15],
  Cable_Crunch: [0.3, 0.2], Standing_Cable_Chest_Press: [0.2, 0.12], Smith_Machine_Incline_Bench_Press: [0.4, 0.25],
};
const EXP_MULT = { iniciante: 1, intermediario: 1.3, avancado: 1.6 };

const round = (kg, inc) => Math.max(inc, Math.round(kg / inc) * inc);

/**
 * Sugestão de carga para o próximo treino de um exercício.
 * history: registros anteriores deste exercício (mais recente primeiro): [{day, sets:[{kg,reps}]}]
 */
export function suggestLoad({ exId, reps, history = [], bodyweight, sex, experience, readiness }) {
  const range = parseReps(reps);
  const eq = getExercise(exId)?.eq ?? (START[exId] ? 'machine' : 'other');
  if (!range) return { kind: 'time', text: 'Exercício por tempo: aumente 5–10 s por semana quando completar todas as séries.' };
  if (eq === 'body only') {
    const last = history[0]?.sets;
    const best = last?.length ? Math.max(...last.map((s) => s.reps)) : null;
    return { kind: 'bw', reps: best ? best + 1 : range.hi, text: best ? `Peso corporal: tente ${best + 1} reps na melhor série (última: ${best}).` : 'Peso corporal: faça o máximo com boa técnica, parando 1–2 reps antes da falha.' };
  }
  const inc = INCREMENT[eq] ?? 2.5;
  const unit = PER_HAND.has(eq) ? 'kg por halter' : 'kg';
  let kg, text, basis;
  const last = history[0];
  if (last?.sets?.length) {
    const sets = last.sets.filter((s) => s.kg > 0);
    const top = Math.max(...sets.map((s) => s.kg));
    const atTop = sets.filter((s) => s.kg === top);
    const allHit = atTop.every((s) => s.reps >= range.hi);
    const missed = atTop.filter((s) => s.reps < range.lo).length;
    if (allHit) { kg = top + inc; text = `Você bateu ${range.hi} reps em todas as séries: suba para ${fmtKg(top + inc)} ${unit}.`; basis = 'progressão'; }
    else if (missed >= 2) { kg = round(top * 0.9, inc); text = `Ficou abaixo de ${range.lo} reps em ${missed} séries: reduza para ${fmtKg(kg)} ${unit} e reconstrua.`; basis = 'regressão'; }
    else {
      const bestReps = Math.max(...atTop.map((s) => s.reps));
      kg = top; text = `Mantenha ${fmtKg(top)} ${unit} e busque ${Math.min(range.hi, bestReps + 1)} reps.`; basis = 'manter';
    }
  } else if (START[exId] && bodyweight) {
    const [m, f] = START[exId];
    const at10 = bodyweight * (sex === 'F' ? f : m) * (EXP_MULT[experience] ?? 1);
    kg = round(loadForReps(e1rm(at10, 10), (range.lo + range.hi) / 2), inc); // converte de 10 reps para a faixa-alvo
    text = `Estimativa inicial: ${fmtKg(kg)} ${unit}. Ajuste até sobrar 2–3 reps no fim de cada série.`;
    basis = 'estimativa';
  } else {
    return { kind: 'free', text: 'Primeira vez: escolha uma carga em que sobrem 2–3 reps no fim da série. O app aprende a partir daí.' };
  }
  if (readiness != null && readiness < 70 && kg) {
    const f = readiness < 50 ? 0.9 : 0.95;
    kg = round(kg * f, inc);
    text += ` Hoje use ${fmtKg(kg)} ${unit}: prontidão ${readiness}/100, carga −${Math.round((1 - f) * 100)}%.`;
  }
  return { kind: 'load', kg, unit, text, basis, range };
}

export const fmtKg = (kg) => String(Math.round(kg * 10) / 10).replace('.', ',');

/** Semana do mesociclo a partir da data de início do jogador. */
export function mesocycle(startIso, now = new Date()) {
  const weeks = Math.max(0, Math.floor((now - new Date(startIso)) / (7 * 86400000)));
  const week = (weeks % 5) + 1;
  if (week === 5) return { week, cycle: Math.floor(weeks / 5) + 1, deload: true, extraSets: 0, label: 'Semana 5 · DELOAD: −40% de séries e −10% de carga para recuperar e voltar mais forte.' };
  const extra = week >= 3 ? 1 : 0;
  return { week, cycle: Math.floor(weeks / 5) + 1, deload: false, extraSets: extra, label: `Semana ${week} de 5 · ${extra ? 'Acúmulo: +1 série nos exercícios principais.' : 'Base: volume padrão da ficha.'}` };
}

/** Aplica o mesociclo às séries da ficha (só nos 2 primeiros exercícios = principais). */
export function periodizeSets(sets, index, meso) {
  if (meso.deload) return Math.max(1, Math.ceil(sets * 0.6));
  return sets + (index < 2 ? meso.extraSets : 0);
}

/** Frequência semanal recomendada. */
export function weeklyPlan(experience, goal) {
  const base = {
    iniciante: { sessions: '3×/semana', split: 'Corpo inteiro (ex.: circuito de máquinas) em dias alternados', sets: '10–12 séries por músculo/semana' },
    intermediario: { sessions: '4×/semana', split: 'Superior/Inferior ou Fichas A-B-C rotativas', sets: '12–18 séries por músculo/semana' },
    avancado: { sessions: '5–6×/semana', split: 'A-B-C-D ou Push/Pull/Legs 2×', sets: '15–22 séries por músculo/semana' },
  }[experience] ?? { sessions: '3×/semana', split: 'Corpo inteiro', sets: '10–12 séries por músculo/semana' };
  const cardio = goal === 'emagrecer' || goal === 'recomposicao'
    ? '150–300 min/semana de cardio moderado (zona 2) + passos diários (8–10 mil)'
    : goal === 'performance' ? '2–3 sessões de zona 2 + 1–2 de intervalado (HIIT)' : '150 min/semana de cardio moderado (OMS)';
  return { ...base, cardio };
}
