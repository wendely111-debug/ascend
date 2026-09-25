// Testes unitários dos motores (funções puras). Uso: npm test
import assert from 'node:assert/strict';
import { levelInfo, xpToReach, applyClassBonus, currentStreak, bestStreak, workoutXp } from '../js/game.js';
import { sessionOutcome, quickOutcome, trustScore } from '../js/rules.js';
import { analyze, planDay, navyBodyFat, household, mealsPerDay } from '../js/nutrition.js';
import { marketList } from '../js/market.js';
import { buildRoutine, routineToAlarms, DEFAULT_ROUTINE } from '../js/routine.js';
import { suggestLoad, parseReps, mesocycle, periodizeSets, e1rm } from '../js/progression.js';
import { interpret, interpretAll } from '../js/labs.js';
import { buildPhases, intervalStatus, PRESETS, dueAlarms, alarmsToIcs, nativeAlarmUrl } from '../js/timer.js';
import { readiness, dailyTargets } from '../js/readiness.js';
import { buildCheckup } from '../js/checkup.js';
import { hrZones, cooper, wheyCost } from '../js/guide.js';
import { medEffects } from '../js/medications.js';
import { questRow } from '../js/store/supabase.js';
import { DEFAULT_QUESTS } from '../js/game.js';

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; console.log(`OK   ${name}`); } catch (e) { fail++; console.log(`FAIL ${name}\n     ${e.message}`); }
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} esperado ~${b}, veio ${a}`);

const H = { sex: 'M', birth_date: '1992-05-10', height_cm: 178, job: 'sentado', training_days: 4, goal: 'emagrecer', diet_type: 'onivoro', restrictions: [], allergies: [], meals_per_day: 5, conditions: [], parq: [], experience: 'intermediario' };
const M = { weight_kg: 92, height_cm: 178, waist_cm: 98, neck_cm: 40, bf_method: 'fita' };

// ---- jogo
t('Níveis: custo e nível a partir do XP', () => {
  assert.equal(xpToReach(2), 100); assert.equal(xpToReach(70), 65550);
  assert.deepEqual([levelInfo(0).level, levelInfo(99).level, levelInfo(100).level], [1, 1, 2]);
});
t('Bônus de classe só no atributo da classe', () => {
  assert.equal(applyClassBonus(40, 'STR', 'guerreiro'), 44); assert.equal(applyClassBonus(40, 'AGI', 'guerreiro'), 40);
});
t('Sequência: hoje vazio não quebra; recorde', () => {
  assert.equal(currentStreak(new Set(['2026-09-23', '2026-09-22']), '2026-09-24'), 2);
  assert.equal(bestStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']), 3);
});
t('XP de treino limitado a 300', () => { assert.equal(workoutXp(500, 'intensa'), 300); assert.equal(workoutXp(45, 'moderada'), 68); });

// ---- antifraude (espelho do servidor)
t('Treino instantâneo e sem prova perde XP e é sinalizado', () => {
  const o = sessionOutcome({ elapsedS: 20, sets: 10, totalSets: 10, intensity: 'intensa', proofCount: 0, sensor: { supported: true, active_ratio: 0 }, attr: 'STR', heroClass: 'guerreiro', usedToday: 0 });
  assert.ok(['series_rapidas', 'sem_prova', 'celular_parado'].every((f) => o.flags.includes(f))); assert.equal(o.status, 'self');
});
t('Treino real com 2 provas fica pendente de auditoria, sem flags', () => {
  const o = sessionOutcome({ elapsedS: 3000, sets: 7, totalSets: 7, intensity: 'intensa', proofCount: 2, sensor: { supported: true, active_ratio: 0.7 }, attr: 'STR', heroClass: 'guerreiro', usedToday: 0 });
  assert.equal(o.status, 'pending'); assert.equal(o.flags.length, 0); assert.equal(o.xp, 121);
});
t('Limite diário de XP de treino', () => {
  const o = quickOutcome({ minutes: 90, intensity: 'intensa', hasProof: true, attr: 'STR', heroClass: 'x', usedToday: 400 });
  assert.equal(o.xp, 50); assert.ok(o.flags.includes('limite_diario'));
});
t('Nota de confiança cai com reprovação', () => {
  const now = new Date().toISOString();
  assert.equal(trustScore([]), 70);
  assert.ok(trustScore([{ kind: 'quest', status: 'rejected', created_at: now }, { kind: 'quest', status: 'verified', created_at: now }]) < 60);
});

// ---- avaliação e nutrição
t('% gordura US Navy (homem e mulher)', () => {
  near(navyBodyFat({ sex: 'M', height: 178, waist: 98, neck: 40 }), 24.2, 0.2);
  near(navyBodyFat({ sex: 'F', height: 165, waist: 78, neck: 32, hip: 100 }), 31.4, 0.2);
  assert.equal(navyBodyFat({ sex: 'M', height: 178, waist: 35, neck: 40 }), null);
});
t('Análise: TMB Katch, meta, macros coerentes', () => {
  const a = analyze(H, M);
  near(a.bmr, 1876, 5); near(a.kcal, 2130, 20);
  near(a.protein * 4 + a.carbs * 4 + a.fat * 9, a.kcal, 15, 'macros fecham as calorias');
});
t('Travas: gestante sem déficit; IMC baixo não emagrece', () => {
  assert.equal(analyze({ ...H, sex: 'F', conditions: ['gestante'] }, { ...M, weight_kg: 64, height_cm: 165, hip_cm: 100, neck_cm: 32, waist_cm: 78 }).goal, 'manter');
  assert.equal(analyze(H, { ...M, weight_kg: 52 }).goal, 'manter');
});
t('Doença renal limita proteína a 0,8 g/kg', () => {
  const a = analyze({ ...H, conditions: ['renal'] }, M);
  assert.ok(a.protein <= Math.ceil(0.8 * 92));
});
t('Cardápio de 28 dias bate as metas (onívoro)', () => {
  const a = analyze(H, M);
  let p = 0, c = 0, f = 0;
  for (let d = 1; d <= 28; d++) {
    const x = planDay(H, a, `2026-10-${String(d).padStart(2, '0')}`, 'u');
    p += (x.totals.p + (x.complement?.protein || 0)) / 28; c += x.totals.c / 28; f += x.totals.f / 28;
  }
  near(p, a.protein, a.protein * 0.08, 'proteína'); near(c, a.carbs, a.carbs * 0.1, 'carbo'); near(f, a.fat, a.fat * 0.12, 'gordura');
});
t('Restrições e alergias respeitadas', () => {
  const h = { ...H, diet_type: 'vegano', allergies: ['soja', 'amendoim'] };
  const a = analyze(h, M);
  for (let d = 1; d <= 10; d++) {
    for (const m of planDay(h, a, `2026-10-${String(d).padStart(2, '0')}`, 'u').meals) {
      for (const it of m.items) assert.ok(!['frango', 'frango_desf', 'patinho', 'acem', 'tilapia', 'atum', 'sardinha', 'ovo', 'tofu', 'pasta_amend', 'iogurte', 'leite', 'whey', 'mel', 'queijo_minas', 'mucarela', 'cottage', 'ricota'].includes(it.food), `${it.food} em ${m.recipe.n}`);
    }
  }
});
t('Medida caseira no plural', () => { assert.equal(household('arroz', 120), '≈ 2,5 colheres de servir'); });

// ---- caneta GLP-1
t('Caneta: déficit ≤ 20%, ≥ 5 refeições, alerta de produto proibido', () => {
  const h = { ...H, meals_per_day: 3, glp1: { med: 'tg', prescribed: false } };
  const a = analyze(h, { ...M, weight_kg: 120, waist_cm: 118 });
  assert.ok(a.kcal >= a.tdee * 0.8 - 10); assert.equal(mealsPerDay(h), 5);
  assert.ok(a.alerts.some((x) => x.text.includes('Anvisa')));
  assert.equal(medEffects({}, 70, 'M'), null);
});

// ---- exames
t('Exames: faixas, direção, crítico e referência do laudo', () => {
  assert.equal(interpret('vitd', 17, 'M').dir, 'low');
  assert.equal(interpret('glicemia', 112, 'M').label, 'Pré-diabetes');
  assert.ok(interpret('potassio', 6.4, 'M').critical);
  assert.equal(interpret('b12', 450, 'M', { min: 500 }).dir, 'low');
  assert.equal(interpret('hb', 12.5, 'F').level, 'good'); assert.equal(interpret('hb', 12.5, 'M').level, 'bad');
});
t('Exames ajustam o plano (glicose → carbo ≤ 40%)', () => {
  const a = analyze(H, M, interpretAll({ hba1c: { v: 6.0 } }, 'M'));
  assert.ok(a.carbs * 4 <= a.kcal * 0.4 + 4);
});

// ---- feira, rotina, check-up
t('Feira 30 dias: carnes por peso exato, preço ajustado entra no total', () => {
  const a = analyze(H, M);
  const base = marketList(H, a, '2026-10-01', 'u', 30);
  const frango = base.items.find((i) => i.food === 'frango');
  assert.ok(frango.byWeight && !Number.isInteger(frango.packs * 1) || frango.qty.endsWith('kg'));
  const alt = marketList(H, a, '2026-10-01', 'u', 30, {}, { frango: 30 });
  near(alt.total - base.total, (30 - 21) * frango.packs, 0.05);
});
t('Rotina: água fecha a meta, pausas no trabalho, café antes do corte', () => {
  const ev = buildRoutine(DEFAULT_ROUTINE, { meals_per_day: 5 }, { water: 3200 }, null);
  const water = ev.filter((e) => e.kind === 'water').reduce((s, e) => s + parseInt(e.detail, 10), 0);
  near(water + 1000, 3200, 250);
  assert.ok(ev.filter((e) => e.kind === 'pause').length >= 6);
  const cut = ev.find((e) => e.label.startsWith('Último horário'));
  assert.ok(ev.filter((e) => e.kind === 'coffee' && !e.info).every((e) => e.m <= cut.m));
  assert.ok(routineToAlarms(ev, DEFAULT_ROUTINE).length > 20);
});
t('Check-up: caneta → endocrinologista prioritário + amilase/lipase a cada 3 meses', () => {
  const c = buildCheckup({ h: { ...H, glp1: { med: 'mounjaro' } }, an: analyze(H, M), labs: [], age: 34 });
  assert.ok(c.doctors.some((d) => d.esp === 'Endocrinologista' && d.prio === 'prioritario'));
  assert.equal(c.exams.find((e) => e.key === 'lipase').months, 3);
});

// ---- treino
t('Reps: faixa, número e tempo', () => {
  assert.deepEqual(parseReps('8-10'), { lo: 8, hi: 10 }); assert.deepEqual(parseReps('12 cada lado'), { lo: 12, hi: 12 });
  assert.equal(parseReps('40s'), null); assert.equal(parseReps('15 min'), null);
});
t('Dupla progressão: bateu o teto → sobe; falhou 2× → reduz', () => {
  const up = suggestLoad({ exId: 'Leg_Press', reps: '10', history: [{ sets: [{ kg: 150, reps: 10 }, { kg: 150, reps: 10 }] }] });
  assert.equal(up.kg, 152.5);
  const down = suggestLoad({ exId: 'Leg_Press', reps: '8-10', history: [{ sets: [{ kg: 150, reps: 6 }, { kg: 150, reps: 5 }] }] });
  assert.equal(down.kg, 135);
});
t('Mesociclo: deload na 5ª semana', () => {
  const start = new Date(Date.now() - 4.2 * 7 * 86400000).toISOString();
  const m = mesocycle(start);
  assert.equal(m.week, 5); assert.ok(m.deload); assert.equal(periodizeSets(4, 0, m), 3);
  near(e1rm(100, 10), 133.3, 0.1);
});

// ---- timer, alarmes, prontidão, guia
t('Tabata: 8 rodadas, 4 min, fases corretas', () => {
  const tb = PRESETS.find((p) => p.id === 'tabata');
  const ph = buildPhases(tb);
  assert.equal(ph.filter((p) => p.type === 'work').length, 8);
  assert.equal(ph.reduce((s, p) => s + p.s, 0), 10 + 8 * 20 + 7 * 10);
  assert.equal(intervalStatus(tb, 12).phase.type, 'work');
  assert.equal(intervalStatus(tb, 31).phase.type, 'rest');
  assert.ok(intervalStatus(tb, 9999).done);
});
t('Alarmes: disparo no horário e .ics válido', () => {
  const d = new Date(2026, 8, 24, 18, 0);
  assert.equal(dueAlarms([{ time: '18:00', on: true, days: [4] }], d).length, 1);
  assert.equal(dueAlarms([{ time: '18:00', on: true, days: [1] }], d).length, 0);
  const ics = alarmsToIcs([{ id: 'a', time: '07:30', label: 'Treino', on: true, days: [1, 3] }]);
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE') && ics.includes('BEGIN:VALARM'));
  assert.ok(nativeAlarmUrl({ time: '07:30', label: 'x' }, 'android').startsWith('intent:'));
  assert.ok(nativeAlarmUrl({ time: '07:30', label: 'x' }, 'ios').startsWith('shortcuts://'));
});
t('Prontidão e ajuste diário pelo sono', () => {
  assert.ok(readiness({ sleep_h: 8, sleep_q: 5, energy: 5, stress: 1, soreness: 1 }) >= 95);
  const a = analyze(H, M);
  const bad = dailyTargets(a, { sleep_h: 5 }, [], H), good = dailyTargets(a, { sleep_h: 8 }, [], H);
  assert.ok(bad.kcal > good.kcal && bad.protein > good.protein);
});
t('Guia: zonas de FC, Cooper e custo do whey', () => {
  assert.equal(hrZones(34).max, 184);
  near(cooper(2800, 34, 'M').vo2, 51.3, 0.1);
  const w = wheyCost({ price: 120, packG: 900, doseG: 30, protPerDose: 24 });
  assert.equal(w.purity, 80); near(w.per100, 16.67, 0.01);
});

t('Missões padrão: lote com as MESMAS colunas (PostgREST PGRST102)', () => {
  const keys = DEFAULT_QUESTS.map((q, i) => Object.keys(questRow({ ...q, sort: i })).sort().join(','));
  assert.equal(new Set(keys).size, 1, keys.join(' | '));
  assert.equal(questRow(DEFAULT_QUESTS[4]).exercise_id, null);
});

console.log(`\n${ok} OK · ${fail} FALHAS (unitários)`);
process.exit(fail ? 1 : 0);
