// Regras de pontuação e auditoria. FONTE DA VERDADE online = funções do supabase/schema.sql;
// este arquivo espelha as mesmas regras para o modo solo e para a interface. Mudou lá, mude aqui.
import { INTENSITY, applyClassBonus } from './game.js';

export const RULES = {
  QUEST_XP_DAY: 400,
  WORKOUT_XP_DAY: 450,
  WORKOUT_MAX_XP: 300,
  SESSION_MAX_MIN: 180,
  QUICK_MAX_MIN: 90,
  MIN_S_PER_SET: 30,
  NO_PROOF_FACTOR: 0.5,
  PROOF_WINDOW_S: 180,
  MEAL_XP: 10,
  MEALS_DAY: 6,
  ASSESS_XP: 30,
  PERFECT_DAY_XP: 50,
};

export const GESTURES = [
  'Mostre 2 dedos (✌️) para a câmera', 'Faça joinha (👍) com a mão', 'Mostre a mão aberta (5 dedos)',
  'Mostre o punho fechado', 'Aponte o indicador para cima', 'Faça "ok" (👌) com a mão',
  'Mostre 3 dedos', 'Coloque uma mão na cabeça', 'Mostre 4 dedos', 'Faça sinal de "hang loose" (🤙)',
];

/** O que enquadrar na foto, por tipo de prova. O gesto sorteado vem do servidor. */
export const PROOF_FRAME = {
  workout: 'Enquadre VOCÊ fazendo o exercício ou no aparelho',
  quest: 'Enquadre VOCÊ fazendo a missão',
  meal: 'Enquadre o PRATO inteiro, antes de comer, com sua mão',
  weigh_in: 'Enquadre o VISOR DA BALANÇA e seus pés sobre ela',
};

export const STATUS = {
  auto: { label: 'Sistema', icon: 'bolt', cls: 'st-auto' },
  self: { label: 'Autodeclarado', icon: 'user', cls: 'st-self' },
  pending: { label: 'Aguardando auditoria', icon: 'eye', cls: 'st-pending' },
  verified: { label: 'Verificado', icon: 'check', cls: 'st-verified' },
  rejected: { label: 'Reprovado', icon: 'x', cls: 'st-rejected' },
};

export const FLAGS = {
  sem_prova: 'Sem prova fotográfica (XP pela metade)',
  prova_parcial: 'Só 1 prova no treino',
  series_rapidas: 'Séries rápidas demais para o tempo (XP pela metade)',
  celular_parado: 'Celular sem movimento durante o treino',
  duracao_limitada: 'Duração acima do limite foi cortada',
  limite_diario: 'Limite diário de XP atingido',
  variacao_implausivel: 'Variação de peso implausível para o período',
  reavaliacao_frequente: 'Reavaliação em menos de 3 dias',
  altura_alterada: 'Altura diferente da primeira avaliação',
  medidas_inconsistentes: 'Medidas inconsistentes para cálculo de gordura',
  peso_autodeclarado: 'Peso sem foto da balança',
  peso_com_foto: 'Peso com foto da balança',
  peso_estimado: 'Peso estimado (não informado)',
  altura_estimada: 'Altura estimada (média IBGE)',
  sem_medidas: 'Sem medidas corporais',
};

/** Flags que indicam possível fraude (pesam na nota de confiança). */
export const SUSPICIOUS = ['series_rapidas', 'variacao_implausivel', 'celular_parado', 'altura_alterada', 'medidas_inconsistentes'];

const mult = (i) => INTENSITY[i]?.mult ?? 1;
const baseWorkoutXp = (min, intensity) => Math.min(RULES.WORKOUT_MAX_XP, Math.max(5, Math.round(min * mult(intensity))));

export function capDaily(xp, usedToday, cap, flags) {
  if (usedToday + xp <= cap) return xp;
  flags.push('limite_diario');
  return Math.max(0, cap - usedToday);
}

/** Resultado de um treino com sessão. Espelha finish_session(). */
export function sessionOutcome({ elapsedS, sets, totalSets, intensity, proofCount, sensor, attr, heroClass, usedToday }) {
  const flags = [];
  let factor = 1;
  let status = 'pending';
  const minutes = Math.min(RULES.SESSION_MAX_MIN, Math.max(1, Math.round(elapsedS / 60)));
  const s = Math.min(Math.max(sets, 0), totalSets);
  if (elapsedS > RULES.SESSION_MAX_MIN * 60) flags.push('duracao_limitada');
  if (elapsedS < s * RULES.MIN_S_PER_SET) { flags.push('series_rapidas'); factor *= 0.5; }
  if (!proofCount) { flags.push('sem_prova'); factor *= RULES.NO_PROOF_FACTOR; status = 'self'; }
  else if (proofCount < 2) flags.push('prova_parcial');
  if (sensor?.supported && (sensor.active_ratio ?? 1) < 0.1) flags.push('celular_parado');
  let xp = applyClassBonus(baseWorkoutXp(minutes, intensity), attr, heroClass);
  xp = Math.round(xp * factor * (0.5 + (0.5 * s) / totalSets));
  xp = capDaily(xp, usedToday, RULES.WORKOUT_XP_DAY, flags);
  return { minutes, sets: s, xp, status, flags };
}

/** Registro rápido sem sessão. Espelha log_quick_workout(). */
export function quickOutcome({ minutes, intensity, hasProof, attr, heroClass, usedToday }) {
  const flags = [];
  const min = Math.min(Math.max(minutes || 1, 1), RULES.QUICK_MAX_MIN);
  if (minutes > RULES.QUICK_MAX_MIN) flags.push('duracao_limitada');
  if (!hasProof) flags.push('sem_prova');
  let xp = applyClassBonus(baseWorkoutXp(min, intensity), attr, heroClass);
  xp = Math.round(xp * (hasProof ? 1 : RULES.NO_PROOF_FACTOR));
  xp = capDaily(xp, usedToday, RULES.WORKOUT_XP_DAY, flags);
  return { minutes: min, xp, status: hasProof ? 'pending' : 'self', flags };
}

/** Nota de confiança 0–100 (últimos 60 dias). Espelha trust_score(). */
export function trustScore(activities) {
  const since = Date.now() - 60 * 86400000;
  const a = activities.filter((x) => x.kind !== 'bonus' && new Date(x.created_at).getTime() > since);
  if (!a.length) return 70;
  const c = (st) => a.filter((x) => x.status === st).length;
  const f = a.filter((x) => (x.flags || []).some((fl) => SUSPICIOUS.includes(fl))).length;
  const score = Math.round((100 * (c('verified') + 0.85 * c('pending') + 0.5 * c('self'))) / a.length) - 15 * c('rejected') - 3 * f;
  return Math.max(0, Math.min(100, score));
}

export const trustTier = (t) =>
  t >= 85 ? { label: 'Confiável', cls: 'trust-hi' } : t >= 60 ? { label: 'Regular', cls: 'trust-mid' } : { label: 'Sob suspeita', cls: 'trust-lo' };
