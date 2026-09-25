// Regras do jogo — funções puras, sem DOM nem rede.
import { addDays } from './util.js';

export const ATTRS = {
  STR: { name: 'Força',      short: 'FOR', color: '#ff3d71', desc: 'Musculação, calistenia, carga' },
  AGI: { name: 'Agilidade',  short: 'AGI', color: '#00e5ff', desc: 'Cardio, corrida, esportes' },
  VIT: { name: 'Vitalidade', short: 'VIT', color: '#3dff9a', desc: 'Sono, hidratação, alimentação' },
  INT: { name: 'Intelecto',  short: 'INT', color: '#a66bff', desc: 'Leitura, estudo, foco' },
  DIS: { name: 'Disciplina', short: 'DIS', color: '#ffc53d', desc: 'Rotina, meditação, autocontrole' },
};
export const ATTR_KEYS = Object.keys(ATTRS);

export const CLASSES = {
  guerreiro: { name: 'Guerreiro', attr: 'STR', desc: 'Domina o peso. +10% XP em Força.' },
  assassino: { name: 'Assassino', attr: 'AGI', desc: 'Velocidade letal. +10% XP em Agilidade.' },
  tita:      { name: 'Titã',      attr: 'VIT', desc: 'Corpo inquebrável. +10% XP em Vitalidade.' },
  arcano:    { name: 'Arcano',    attr: 'INT', desc: 'Mente afiada. +10% XP em Intelecto.' },
  monge:     { name: 'Monge',     attr: 'DIS', desc: 'Vontade de aço. +10% XP em Disciplina.' },
};
export const CLASS_BONUS = 0.1;

export const applyClassBonus = (xp, attr, heroClass) =>
  CLASSES[heroClass]?.attr === attr ? Math.round(xp * (1 + CLASS_BONUS)) : xp;

// ---- Níveis ------------------------------------------------------------
// Custo do nível L -> L+1 = 100 + 25·(L-1). Nível 70 (rank S) ≈ 65 mil XP.
export const xpToReach = (L) => 100 * (L - 1) + (25 * (L - 1) * (L - 2)) / 2;

export function levelInfo(total) {
  let level = 1;
  while (xpToReach(level + 1) <= total) level++;
  const base = xpToReach(level);
  const need = xpToReach(level + 1) - base;
  return { level, into: total - base, need, pct: (total - base) / need };
}

export const RANKS = [
  { min: 70, rank: 'S', title: 'Monarca',    color: '#ff2bd6' },
  { min: 50, rank: 'A', title: 'Lenda',      color: '#ffc53d' },
  { min: 35, rank: 'B', title: 'Elite',      color: '#a66bff' },
  { min: 20, rank: 'C', title: 'Veterano',   color: '#3dff9a' },
  { min: 10, rank: 'D', title: 'Caçador',    color: '#00e5ff' },
  { min: 1,  rank: 'E', title: 'Despertado', color: '#8fa3c7' },
];
export const rankFor = (level) => RANKS.find((r) => level >= r.min);

/** "Nível" de um atributo, a partir do XP acumulado nele. */
export const attrLevel = (xp) => 1 + Math.floor(Math.sqrt((xp || 0) / 25));

// ---- Treinos -------------------------------------------------------------
export const INTENSITY = {
  leve:     { label: 'Leve',     mult: 1 },
  moderada: { label: 'Moderada', mult: 1.5 },
  intensa:  { label: 'Intensa',  mult: 2.2 },
};

export const WORKOUT_TYPES = [
  { id: 'musculacao', name: 'Musculação',     attr: 'STR' },
  { id: 'calistenia', name: 'Calistenia',     attr: 'STR' },
  { id: 'hiit',       name: 'HIIT / Funcional', attr: 'STR' },
  { id: 'corrida',    name: 'Corrida',        attr: 'AGI' },
  { id: 'bike',       name: 'Bike',           attr: 'AGI' },
  { id: 'natacao',    name: 'Natação',        attr: 'AGI' },
  { id: 'luta',       name: 'Luta',           attr: 'AGI' },
  { id: 'esporte',    name: 'Esporte',        attr: 'AGI' },
  { id: 'caminhada',  name: 'Caminhada',      attr: 'VIT' },
  { id: 'mobilidade', name: 'Yoga / Mobilidade', attr: 'VIT' },
  { id: 'estudo',     name: 'Estudo focado',  attr: 'INT' },
  { id: 'meditacao',  name: 'Meditação',      attr: 'DIS' },
];

export const MAX_WORKOUT_XP = 300;
export const workoutXp = (minutes, intensity) =>
  Math.max(5, Math.min(MAX_WORKOUT_XP, Math.round((minutes || 0) * (INTENSITY[intensity]?.mult ?? 1))));

export const PERFECT_DAY_XP = 50;

// ---- Missões padrão (editáveis pelo jogador) -----------------------------
export const DEFAULT_QUESTS = [
  { title: 'Flexões',             attr: 'STR', target: 50,  unit: 'reps',    xp: 40, exercise_id: 'Pushups', require_proof: true },
  { title: 'Agachamentos',        attr: 'STR', target: 50,  unit: 'reps',    xp: 40, exercise_id: 'Bodyweight_Squat', require_proof: true },
  { title: 'Abdominais',          attr: 'STR', target: 50,  unit: 'reps',    xp: 30, exercise_id: 'Crunches', require_proof: true },
  { title: 'Cardio',              attr: 'AGI', target: 30,  unit: 'min',     xp: 50, exercise_id: 'Running_Treadmill', require_proof: true },
  { title: 'Beber água',          attr: 'VIT', target: 3,   unit: 'litros',  xp: 20 },
  { title: 'Dormir 7h+',          attr: 'VIT', target: 7,   unit: 'horas',   xp: 30 },
  { title: 'Leitura',             attr: 'INT', target: 20,  unit: 'páginas', xp: 30 },
  { title: 'Zero açúcar / junk',  attr: 'DIS', target: 1,   unit: 'dia',     xp: 30 },
];

// ---- Sequência (streak) ---------------------------------------------------
/** Dias seguidos com atividade. Hoje ainda vazio não quebra a sequência. */
export function currentStreak(daySet, today) {
  let d = daySet.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (daySet.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// ---- Conquistas ------------------------------------------------------------
// s = { total, level, streak, best, byAttr, workouts, quests, perfect, friends }
export const ACHIEVEMENTS = [
  { id: 'awaken',   name: 'O Despertar',       desc: 'Conclua sua primeira missão.',        test: (s) => s.quests >= 1 },
  { id: 'perfect1', name: 'Dia Perfeito',      desc: 'Complete todas as missões do dia.',   test: (s) => s.perfect >= 1 },
  { id: 'perfect10',name: 'Máquina',           desc: '10 dias perfeitos.',                  test: (s) => s.perfect >= 10 },
  { id: 'streak3',  name: 'Ignição',           desc: '3 dias seguidos ativo.',              test: (s) => s.best >= 3 },
  { id: 'streak7',  name: 'Chama Semanal',     desc: '7 dias seguidos ativo.',              test: (s) => s.best >= 7 },
  { id: 'streak30', name: 'Inabalável',        desc: '30 dias seguidos ativo.',             test: (s) => s.best >= 30 },
  { id: 'streak100',name: 'Lenda Viva',        desc: '100 dias seguidos ativo.',            test: (s) => s.best >= 100 },
  { id: 'lvl5',     name: 'Primeiros Passos',  desc: 'Alcance o nível 5.',                  test: (s) => s.level >= 5 },
  { id: 'rankD',    name: 'Caçador Rank D',    desc: 'Alcance o nível 10.',                 test: (s) => s.level >= 10 },
  { id: 'rankC',    name: 'Caçador Rank C',    desc: 'Alcance o nível 20.',                 test: (s) => s.level >= 20 },
  { id: 'rankB',    name: 'Caçador Rank B',    desc: 'Alcance o nível 35.',                 test: (s) => s.level >= 35 },
  { id: 'rankA',    name: 'Caçador Rank A',    desc: 'Alcance o nível 50.',                 test: (s) => s.level >= 50 },
  { id: 'rankS',    name: 'Monarca',           desc: 'Alcance o nível 70.',                 test: (s) => s.level >= 70 },
  { id: 'xp10k',    name: '10K de Poder',      desc: 'Acumule 10.000 XP.',                  test: (s) => s.total >= 10000 },
  { id: 'work10',   name: 'Rato de Academia',  desc: 'Registre 10 treinos.',                test: (s) => s.workouts >= 10 },
  { id: 'work50',   name: 'Forjado no Ferro',  desc: 'Registre 50 treinos.',                test: (s) => s.workouts >= 50 },
  { id: 'balance',  name: 'Equilíbrio',        desc: 'Todos os atributos no nível 5+.',     test: (s) => ATTR_KEYS.every((k) => attrLevel(s.byAttr[k]) >= 5) },
  { id: 'ally1',    name: 'Grupo Formado',     desc: 'Tenha 1 aliado.',                     test: (s) => s.friends >= 1 },
  { id: 'ally5',    name: 'Guilda',            desc: 'Tenha 5 aliados.',                    test: (s) => s.friends >= 5 },
];

export const unlockedSet = (s) => new Set(ACHIEVEMENTS.filter((a) => a.test(s)).map((a) => a.id));
