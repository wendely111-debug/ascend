// Ajuste diário: prontidão (sono/energia/estresse/dor) + gasto real do dia → metas de hoje.
// Gasto de exercício por METs (Compendium of Physical Activities, Ainsworth 2011): kcal = MET × kg × horas.
import { JOBS } from './nutrition.js';
import { WORKOUT_TYPES } from './game.js';
import { daysSinceInjection } from './medications.js';

const MET = {
  musculacao: [3.5, 5, 6], calistenia: [3.8, 5, 8], hiit: [6, 8, 10], corrida: [7, 9.8, 11.5], bike: [5.5, 7, 10],
  natacao: [6, 8, 10], luta: [5, 7.5, 10.3], esporte: [5, 7, 9], caminhada: [3, 3.5, 4.3], mobilidade: [2.5, 3, 4],
  estudo: [1.3, 1.3, 1.3], meditacao: [1.3, 1.3, 1.3],
};
const IDX = { leve: 0, moderada: 1, intensa: 2 };

/** kcal gastas numa atividade registrada (treinos). */
export function activityKcal(a, weight) {
  if (a.kind !== 'workout' || !a.meta?.minutes) return 0;
  const type = WORKOUT_TYPES.find((t) => t.name === a.title)?.id ?? (a.attr === 'AGI' ? 'corrida' : 'musculacao');
  const met = (MET[type] ?? MET.musculacao)[IDX[a.meta.intensity] ?? 1];
  // MET inclui o repouso (1 MET); desconta para não contar duas vezes o basal.
  return Math.round((met - 1) * weight * (a.meta.minutes / 60));
}

/** Prontidão 0–100. */
export function readiness(c) {
  if (!c) return null;
  const sleep = Math.min(40, (Math.min(Number(c.sleep_h) || 0, 9) / 8) * 40) - (c.sleep_h > 10 ? 5 : 0);
  const q = ((Number(c.sleep_q) || 3) - 1) / 4;
  const e = ((Number(c.energy) || 3) - 1) / 4;
  const st = (5 - (Number(c.stress) || 3)) / 4;
  const so = (5 - (Number(c.soreness) || 3)) / 4;
  return Math.max(0, Math.min(100, Math.round(sleep + 15 * q + 15 * e + 15 * st + 15 * so)));
}

export const readinessTier = (r) => r == null ? null
  : r >= 75 ? { label: 'Pronto para treinar pesado', cls: 'lvl-good', rpe: 'RPE 8–9 liberado' }
  : r >= 50 ? { label: 'Treino moderado', cls: 'lvl-warn', rpe: 'RPE até 7–8, sem ir à falha' }
  : { label: 'Priorize recuperação', cls: 'lvl-bad', rpe: 'Mobilidade, caminhada ou treino leve (RPE ≤ 6)' };

/**
 * Metas ajustadas para HOJE.
 * an = analyze(); c = check-in de hoje (pode ser null); acts = atividades de hoje; h = perfil de saúde.
 */
export function dailyTargets(an, c, acts, h) {
  const weight = an.weight;
  const restTdee = Math.round(an.bmr * (JOBS[h.job]?.base ?? 1.2));
  const exercise = acts.reduce((s, a) => s + activityKcal(a, weight), 0);
  const steps = Number(c?.steps) || 0;
  const stepsKcal = Math.round(Math.max(0, steps - 5000) * 0.0005 * weight); // passos acima da rotina
  // Conta 75% do gasto estimado: relógios e fórmulas superestimam.
  const dayTdee = Math.round(restTdee + 0.75 * (exercise + stepsKcal));
  let delta = an.kcal / an.tdee - 1;
  const notes = [];
  const r = readiness(c);
  let protein = an.protein;
  if (c && Number(c.sleep_h) < 6) {
    if (delta < 0) { delta /= 2; notes.push('Você dormiu menos de 6 h: o déficit de hoje foi reduzido pela metade — privação de sono aumenta a perda de massa magra e a fome.'); }
    protein = Math.round(protein * 1.1);
    notes.push('Sono curto: +10% de proteína, cafeína só até 6 h antes de dormir, e treine sem ir à falha.');
  }
  const dInj = daysSinceInjection(h.glp1);
  if (dInj != null && dInj <= 2) notes.push(dInj === 0
    ? 'Dia da aplicação da caneta: prefira refeições pequenas, frias ou mornas e com pouca gordura; beba água em goles ao longo do dia.'
    : `${dInj}º dia após a aplicação: fase de mais náusea. Porções menores, proteína primeiro e evite frituras — mas não pule refeições.`);
  if (r != null && r < 50) notes.push('Prontidão baixa: considere trocar o treino pesado por mobilidade, caminhada ou zona 2 leve.');
  if (exercise > 0) notes.push(`Treinos de hoje gastaram ≈ ${exercise} kcal; 75% disso foi somado às suas metas (margem de erro das estimativas).`);
  if (stepsKcal > 0) notes.push(`${steps.toLocaleString('pt-BR')} passos: +${stepsKcal} kcal acima da sua rotina.`);
  const floor = Math.max(an.bmr, an.sex === 'M' ? 1500 : 1200);
  const kcal = Math.round(Math.max(floor, dayTdee * (1 + delta)) / 10) * 10;
  const fat = an.fat;
  const carbs = Math.max(100, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { restTdee, exercise, stepsKcal, dayTdee, kcal, protein, carbs, fat, readiness: r, tier: readinessTier(r), notes, trainingDay: exercise > 150 };
}
