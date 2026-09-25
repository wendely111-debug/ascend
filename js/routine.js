// Rotina diária com horários de trabalho: refeições, água, café, pausas ativas, treino e sono.
// Bases: hidratação distribuída (35 ml/kg), cafeína ≤ 400 mg/dia e corte 8 h antes de dormir (sono),
// pausas a cada ~55 min de trabalho sentado (NR-17 / regra 20-20-20 para os olhos),
// café da manhã até 1 h após acordar, jantar ≥ 2–3 h antes de dormir, ceia leve 30–60 min antes.
import { SLOTS, mealsPerDay } from './nutrition.js';

export const DEFAULT_ROUTINE = {
  wake: '06:30', sleep: '22:30', workStart: '08:00', workEnd: '18:00', workDays: [1, 2, 3, 4, 5],
  train: '18:30', trainDur: 60, coffee: true,
  alarms: { meal: true, water: true, coffee: true, pause: true, sleep: true, train: true },
};

export const KINDS = {
  wake: { label: 'Despertar', icon: 'star', group: 'sleep' },
  meal: { label: 'Refeição', icon: 'food', group: 'meal' },
  water: { label: 'Água', icon: 'drop', group: 'water' },
  coffee: { label: 'Café', icon: 'coffee', group: 'coffee' },
  pause: { label: 'Pausa ativa', icon: 'refresh', group: 'pause' },
  train: { label: 'Treino', icon: 'dumbbell', group: 'train' },
  sleep: { label: 'Sono', icon: 'moon', group: 'sleep' },
  work: { label: 'Trabalho', icon: 'user', group: null },
};

const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const r15 = (m) => Math.round(m / 15) * 15;
const r5 = (m) => Math.round(m / 5) * 5;

/**
 * Monta os eventos do dia.
 * cfg: horários; h: perfil de saúde; an: análise (água, peso); plan: planDay() para nomear as refeições.
 */
export function buildRoutine(cfg, h, an, plan) {
  const wake = toMin(cfg.wake);
  let sleep = toMin(cfg.sleep);
  if (sleep <= wake) sleep += 1440; // dorme depois da meia-noite
  const ws = toMin(cfg.workStart), we = toMin(cfg.workEnd);
  const hasWork = cfg.workStart && cfg.workEnd && we > ws;
  const train = cfg.train ? toMin(cfg.train) : null;
  const trainEnd = train != null ? train + (Number(cfg.trainDur) || 60) : null;
  const ev = [];
  const add = (m, kind, label, detail = '', workOnly = false, info = false) => ev.push({ m, time: fromMin(m), kind, label, detail, workOnly, info });

  // ---- Sono e despertar
  add(wake, 'wake', 'Acordar', 'Beba 300–500 ml de água e pegue luz natural por 10 min (regula o relógio biológico).');
  add(sleep - 60, 'sleep', 'Desligar telas', 'Luz baixa, sem celular. Prepare o ambiente: escuro, silencioso, 18–22 °C.');
  const sleepH = ((wake + 1440 - (sleep % 1440)) % 1440) / 60;
  add(sleep, 'sleep', 'Hora de dormir', `Você terá ${String(Math.round(sleepH * 10) / 10).replace('.', ',')} h de sono${sleepH < 7 ? ' — abaixo do ideal (7–9 h): tente deitar mais cedo' : ' (ideal: 7–9 h)'}.`);

  // ---- Trabalho
  if (hasWork) {
    add(ws, 'work', 'Início do trabalho', 'Garrafa de água na mesa.', true);
    add(we, 'work', 'Fim do trabalho', '', true);
  }

  // ---- Refeições (usa a estrutura de refeições do plano)
  const slots = (SLOTS[mealsPerDay(h)] ?? SLOTS[4]).map(([id, label]) => ({ id, label }));
  const t = {};
  t.cafe = wake + 30;
  t.ceia = sleep - 45;
  t.almoco = hasWork ? Math.min(Math.max(r15(ws + (we - ws) * 0.45), toMin('11:30')), toMin('13:30')) : toMin('12:30');
  if (train != null && train > t.almoco + 120) {
    t.jantar = Math.min(r15(trainEnd + 45), sleep - 120);
  } else t.jantar = Math.max(r15(sleep - 180), t.almoco + 300);
  t.lanche1 = r15((t.cafe + t.almoco) / 2);
  t.lanche = r15((t.almoco + t.jantar) / 2);
  if (train != null && train - 75 > t.almoco + 90 && train - 75 < t.jantar - 60) t.lanche = r5(train - 75); // vira pré-treino
  const mealName = Object.fromEntries((plan?.meals ?? []).map((m) => [m.id, m.recipe?.n]));
  for (const s of slots) {
    const m = t[s.id];
    if (m == null) continue;
    const pre = s.id === 'lanche' && train != null && Math.abs(m - (train - 75)) < 10;
    add(m, 'meal', pre ? 'Pré-treino' : s.label, [mealName[s.id], pre ? 'carboidrato + proteína, pouca gordura' : ''].filter(Boolean).join(' · '), false);
  }

  // ---- Treino
  if (train != null) {
    add(train, 'train', 'Treino', 'Leve 500–750 ml de água. Aqueça 5–10 min.');
    add(trainEnd, 'train', 'Fim do treino', 'Refeição com proteína e carboidrato nas próximas 2 h.');
  }

  // ---- Café (cafeína): manhã e início da tarde, com corte 8 h antes de dormir
  if (cfg.coffee) {
    const cutoff = sleep - 480;
    const cups = [wake + 90, t.almoco + 45].filter((m) => m <= cutoff);
    cups.forEach((m, i) => add(r5(m), 'coffee', i ? 'Café da tarde' : 'Café', '1 xícara (~80 mg de cafeína). Limite do dia: 400 mg (~4 xícaras).'));
    add(cutoff, 'coffee', 'Último horário para cafeína', 'Depois disso, cafeína prejudica o sono profundo.', false, true);
  }

  // ---- Água: a cada 60 min entre o despertar e 90 min antes de dormir
  const waterTimes = [];
  for (let m = wake + 60; m <= sleep - 90; m += 60) waterTimes.push(m);
  const inTraining = (m) => train != null && m >= train - 10 && m <= trainEnd + 10;
  const slotsW = waterTimes.filter((m) => !inTraining(m));
  // ~400 ml vêm do despertar e ~600 ml do treino/refeições; o resto é dividido nos lembretes
  const ml = Math.max(150, Math.round(((an?.water ?? 2500) - 1000) / Math.max(1, slotsW.length) / 50) * 50);
  for (const m of slotsW) {
    if (ev.some((e) => (e.kind === 'meal' || e.kind === 'coffee') && !e.info && Math.abs(e.m - m) < 10)) continue;
    add(m, 'water', 'Água', `${ml} ml`);
  }

  // ---- Pausas ativas durante o trabalho
  if (hasWork) {
    // a cada ~55 min; se cair perto de refeição/café/almoço, desloca em vez de pular
    for (let m = ws + 55; m <= we - 15;) {
      const lunch = m >= t.almoco - 10 && m < t.almoco + 60;
      const clash = ev.some((e) => !e.info && e.kind !== 'water' && e.kind !== 'work' && Math.abs(e.m - m) < 20);
      if (lunch || clash) { m += lunch ? t.almoco + 60 - m : 20; continue; }
      add(m, 'pause', 'Pausa ativa (5 min)', 'Levante, alongue pescoço, ombros e quadril; olhe algo a 6 m por 20 s (regra 20-20-20).', true);
      m += 55;
    }
  }

  return ev.sort((a, b) => a.m - b.m).map((e) => ({ ...e, time: fromMin(e.m) }));
}

/** Converte a rotina em alarmes (substitui os alarmes de rotina anteriores). */
export function routineToAlarms(events, cfg) {
  const allow = cfg.alarms ?? DEFAULT_ROUTINE.alarms;
  return events
    .filter((e) => e.kind !== 'work' && allow[KINDS[e.kind].group])
    .map((e, i) => ({
      id: `r${i}-${e.time.replace(':', '')}`, time: e.time, label: e.label, detail: e.detail, on: true,
      days: e.workOnly ? cfg.workDays : [], group: 'rotina',
    }));
}
