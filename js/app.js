import { $, esc, dayKey, addDays, weekStart } from './util.js';
import {
  ACHIEVEMENTS, DEFAULT_QUESTS, WORKOUT_TYPES, levelInfo, rankFor, currentStreak, bestStreak, unlockedSet,
} from './game.js';
import { RULES, FLAGS, STATUS, quickOutcome, trustScore } from './rules.js';
import { createStore } from './store/index.js';
import { icon } from './ui/icons.js';
import { avatar, toast, toastError, openModal, updateModal, closeModal, confirmDialog, levelUpOverlay } from './ui/components.js';
import { captureProof } from './ui/camera.js';
import { createMotionTracker } from './motion.js';
import { analyze, planDay } from './nutrition.js';
import { renderStatus } from './views/status.js';
import { renderQuests, questForm, workoutForm } from './views/quests.js';
import { renderGuild } from './views/guild.js';
import { renderAchievements } from './views/achievements.js';
import { renderAuth, renderOnboarding, profileFields } from './views/auth.js';
import {
  renderTraining, renderSession, libraryGrid, pickerModal, exerciseDetail, chooseRoutineModal,
  routineDetail, routineEditor, finishForm,
} from './views/training.js';
import { renderDiet, recipeModal, nextSwap } from './views/diet.js';
import { renderAudit, proofsModal } from './views/audit.js';
import { renderWizard, readWizardStep, measuresForAnalysis, skipWizardStep, WIZ_STEPS } from './views/assessment.js';
import { loadExercises, exName } from './exercises.js';
import { renderHealth } from './views/health.js';
import { interpretAll } from './labs.js';
import { dailyTargets } from './readiness.js';
import { suggestLoad, mesocycle, periodizeSets, parseReps } from './progression.js';
import * as T from './timer.js';
import { buildRoutine, routineToAlarms, DEFAULT_ROUTINE } from './routine.js';
import { buildCheckup, checkupText } from './checkup.js';
import { clock, timerPill } from './views/timer.js';
import { findPreset } from './routines.js';

const HISTORY_DAYS = 190; // cobre o heatmap de 26 semanas
const REASSESS_DAYS = 14;
const VIEWS = {
  status: { label: 'Status', icon: 'status', render: renderStatus },
  quests: { label: 'Missões', icon: 'quests', render: renderQuests },
  training: { label: 'Treinos', icon: 'dumbbell', render: renderTraining },
  diet: { label: 'Dieta', icon: 'food', render: renderDiet },
  health: { label: 'Saúde', icon: 'heart', render: renderHealth },
  guild: { label: 'Guilda', icon: 'guild', render: renderGuild },
  achievements: { label: 'Troféus', icon: 'trophy', render: renderAchievements, hidden: true },
  session: { label: 'Treino', icon: 'flame', render: renderSession, hidden: true, parent: 'training' },
  audit: { label: 'Auditoria', icon: 'shield', render: renderAudit, hidden: true, parent: 'guild' },
  assessment: { label: 'Avaliação', icon: 'scale', render: ({ state }) => renderWizard(state.wiz, { full: false }), hidden: true, parent: 'diet' },
};
const libDefaults = () => ({ q: '', group: '', eqf: '', limit: 24, error: '' });

const state = {
  store: null,
  phase: 'boot', // boot | auth | onboarding | assessment | app
  authTab: 'in',
  profile: null,
  quests: [],
  activities: [], // minhas, últimos HISTORY_DAYS dias (mais recente primeiro)
  totals: { total: 0, by_attr: {}, by_kind: {}, days: [], trust: 70 },
  allyCount: 0,
  view: 'status',
  pending: new Set(),
  guild: { tab: 'ranking', period: 'week', loaded: false, loading: false, error: '', board: [], feed: [], fr: null },
  routines: [],
  training: { tab: 'fichas', ...libDefaults() },
  picker: null,
  draft: null,
  questDraft: null,
  session: null, // treino em andamento (espelho local da sessão do servidor)
  rest: null,
  health: null, // { data, consent_at } — dados de saúde (sensíveis)
  assessments: [], // avaliações físicas (mais recente primeiro)
  diet: { tab: 'hoje', swaps: {}, got: {} },
  audit: { log: [], queue: [], loading: false },
  wiz: null, // assistente de avaliação
  healthTab: 'hoje',
  checkins: {}, // { 'YYYY-MM-DD': {day, data} }
  labs: [], // exames (mais recente primeiro)
  exlogs: [], // cargas registradas
  guide: loadLocal('ascend:guide', {}),
  timer: T.loadTimer() ?? T.newTimer(),
  alarms: T.loadAlarms(),
};

function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

const app = $('#app');
let motion = null; // sensor de movimento da sessão
let wakeLock = null;

// ---- Derivados -----------------------------------------------------------
function derive() {
  const today = dayKey();
  const t = state.totals;
  const todayActs = state.activities.filter((a) => a.day === today);
  const stats = {
    total: t.total,
    level: levelInfo(t.total).level,
    streak: currentStreak(new Set(t.days), today),
    best: bestStreak(t.days),
    byAttr: t.by_attr,
    workouts: t.by_kind.workout || 0,
    quests: t.by_kind.quest || 0,
    perfect: t.by_kind.bonus || 0,
    friends: state.allyCount,
  };
  const last = state.assessments[0];
  let analysis = null, plan = null, reassessDue = 0, daily = null, target = null;
  if (state.health && last) {
    const h = state.health.data;
    const labResults = interpretAll(state.labs[0]?.values, h.sex);
    analysis = analyze(h, {
      weight_kg: Number(last.weight_kg), height_cm: Number(last.height_cm), waist_cm: last.waist_cm, neck_cm: last.neck_cm,
      hip_cm: last.hip_cm, bf_method: last.bf_method, bf_pct: last.bf_pct,
    }, labResults);
    daily = dailyTargets(analysis, state.checkins[today]?.data, todayActs, h);
    target = { ...analysis, kcal: daily.kcal, protein: daily.protein, carbs: daily.carbs, fat: daily.fat };
    plan = planDay(h, target, today, state.profile.id, state.diet.swaps[today]);
    const days = Math.floor((Date.now() - new Date(last.created_at)) / 86400000);
    if (days >= REASSESS_DAYS) reassessDue = days;
  }
  return {
    today,
    todayActs,
    todayXp: todayActs.reduce((s, a) => s + a.xp, 0),
    doneIds: new Set(todayActs.filter((a) => a.quest_id).map((a) => a.quest_id)),
    level: levelInfo(t.total),
    stats,
    unlocked: unlockedSet(stats),
    trust: state.store.mode === 'local' ? trustScore(state.activities) : t.trust ?? 70,
    analysis,
    plan,
    reassessDue,
    daily,
    target,
  };
}

function bumpTotals(a, sign) {
  const t = state.totals;
  t.total += sign * a.xp;
  t.by_attr[a.attr] = (t.by_attr[a.attr] || 0) + sign * a.xp;
  t.by_kind[a.kind] = (t.by_kind[a.kind] || 0) + sign;
  if (sign > 0 && !t.days.includes(a.day)) t.days = [a.day, ...t.days].sort().reverse();
  if (sign < 0 && !state.activities.some((x) => x.day === a.day)) t.days = t.days.filter((d) => d !== a.day);
}

function addActivities(...acts) {
  for (const a of acts) {
    if (!a) continue;
    state.activities.unshift(a);
    bumpTotals(a, 1);
  }
}

function removeActivities(ids) {
  for (const id of ids) {
    const a = state.activities.find((x) => x.id === id);
    if (!a) continue;
    state.activities = state.activities.filter((x) => x.id !== id);
    bumpTotals(a, -1);
  }
}

/** Executa uma mutação e celebra o que mudou (level up, rank, conquistas). */
async function withProgress(fn) {
  const before = derive();
  await fn();
  const after = derive();
  const newAch = ACHIEVEMENTS.filter((a) => after.unlocked.has(a.id) && !before.unlocked.has(a.id));
  render();
  if (after.level.level > before.level.level) {
    levelUpOverlay(after.level.level, rankFor(after.level.level).rank !== rankFor(before.level.level).rank);
  }
  newAch.forEach((a, i) => setTimeout(() =>
    toast(`Conquista desbloqueada: <b>${esc(a.name)}</b>`, { type: 'gold', title: 'CONQUISTA' }), 400 + i * 700));
}

const describeResult = (a) => {
  const st = STATUS[a.status]?.label ?? '';
  const flags = (a.flags || []).filter((f) => f !== 'peso_com_foto').map((f) => FLAGS[f] ?? f);
  return `<span class="good">+${a.xp} XP</span> · ${esc(st)}${flags.length ? `<br><small>${flags.map(esc).join(' · ')}</small>` : ''}`;
};

// ---- Carga de dados ---------------------------------------------------------
const dietKey = () => `ascend:diet:${state.profile?.id}`;

async function loadGame() {
  const s = state.store;
  const since = addDays(dayKey(), -HISTORY_DAYS);
  let quests;
  let checkins;
  [quests, state.activities, state.totals, state.routines, state.health, state.assessments, checkins, state.labs, state.exlogs] = await Promise.all([
    s.listQuests(), s.listActivities(since), s.totals(), s.listRoutines(), s.getHealth(), s.listAssessments(),
    s.listCheckins(addDays(dayKey(), -30)), s.listLabs(), s.listExerciseLogs(since),
  ]);
  state.checkins = Object.fromEntries(checkins.map((c) => [c.day, c]));
  if (!quests.length && !localStorage.getItem(`ascend:seeded:${state.profile.id}`)) {
    quests = await s.saveQuests(DEFAULT_QUESTS.map((q, i) => ({ ...q, sort: i })));
    localStorage.setItem(`ascend:seeded:${state.profile.id}`, '1');
  }
  state.quests = quests;
  try { Object.assign(state.diet, JSON.parse(localStorage.getItem(dietKey())) ?? {}); } catch { /* sem preferências salvas */ }
  resumeSession();
  if (s.mode === 'online') {
    s.friendships().then((fr) => { state.guild.fr = fr; state.allyCount = fr.allies.length; render(); }).catch(() => {});
    s.reviewQueue().then((q) => { state.audit.queue = q; render(); }).catch(() => {});
  }
}

const saveDiet = () => localStorage.setItem(dietKey(), JSON.stringify({ swaps: state.diet.swaps, got: state.diet.got, days: state.diet.days, prices: state.diet.prices }));
const saveGuide = () => localStorage.setItem('ascend:guide', JSON.stringify(state.guide));

async function loadGuild() {
  const g = state.guild;
  if (state.store.mode !== 'online' || g.loading) return;
  g.loading = true; g.error = ''; render();
  try {
    const [board, feed, fr] = await Promise.all([
      state.store.leaderboard(weekStart()), state.store.feed(), state.store.friendships(),
    ]);
    Object.assign(g, { board, feed, fr, loaded: true });
    state.allyCount = fr.allies.length;
  } catch (e) {
    g.error = e.message;
  } finally {
    g.loading = false;
    render();
  }
}

async function loadAudit() {
  const a = state.audit;
  a.loading = true;
  render();
  try {
    [a.log, a.queue] = await Promise.all([state.store.auditLog(80), state.store.reviewQueue()]);
  } catch (e) {
    toastError(e);
  } finally {
    a.loading = false;
    render();
  }
}

// ---- Render ------------------------------------------------------------------
let lastView = null;
function render() {
  if (state.phase === 'boot') {
    app.innerHTML = `<div class="boot"><div class="boot-logo">${icon('bolt')}</div><div class="boot-text">INICIALIZANDO SISTEMA<span class="dots"></span></div></div>`;
    return;
  }
  if (state.phase === 'auth') { app.innerHTML = renderAuth({ tab: state.authTab, msg: state.authMsg }); return; }
  if (state.phase === 'onboarding') { app.innerHTML = renderOnboarding({ msg: state.authMsg }); return; }
  if (state.phase === 'assessment') { app.innerHTML = renderWizard(state.wiz, { full: true }); return; }

  const d = derive();
  const view = VIEWS[state.view];
  const scrollY = window.scrollY;
  const entering = lastView !== state.view;
  lastView = state.view;

  app.innerHTML = `<div class="shell">
    <header class="topbar">
      <div class="logo logo-sm"><span class="logo-mark">${icon('bolt')}</span><span class="logo-text">ASCEND</span></div>
      <span class="mode-chip ${state.store.mode}">${state.store.mode === 'online' ? 'ONLINE' : 'MODO SOLO'}</span>
      <div class="topbar-right">
        <span class="top-lv mono">LV ${d.level.level}</span>
        <button class="avatar-btn" data-act="profile" aria-label="Perfil">${avatar(state.profile, 'sm')}</button>
      </div>
    </header>
    <nav class="nav">${Object.entries(VIEWS).filter(([, v]) => !v.hidden).map(([id, v]) =>
      `<button class="nav-btn ${state.view === id || VIEWS[state.view]?.parent === id ? 'active' : ''}" data-act="go" data-view="${id}">
        ${icon(v.icon)}<span>${v.label}</span>
        ${id === 'guild' && (state.guild.fr?.incoming.length || state.audit.queue.length) ? '<span class="dot"></span>' : ''}</button>`).join('')}</nav>
    <main class="content ${entering ? 'enter' : ''}">${view.render({ state, d })}</main>
    ${state.session && state.view !== 'session'
      ? `<button class="session-pill" data-act="go" data-view="session">${icon('flame')} Treino em andamento <span class="mono" data-elapsed></span></button>` : ''}
    ${state.view === 'training' && state.training.tab === 'timer' ? '' : timerPill(state.timer)}
  </div>`;
  if (!entering) window.scrollTo(0, scrollY);
  tickCountdown();
  tickSession();
  tickTimer(true);
}

// ---- Provas fotográficas ---------------------------------------------------------
/** Pede um desafio ao servidor, abre a câmera ao vivo e envia a foto. Retorna a prova ou null. */
async function runProof(kind, ref, title, existing) {
  const proof = existing ?? await state.store.requestProof(kind, ref);
  const shot = await captureProof({ proof, username: state.profile.username, title });
  if (!shot) { toast('Prova não enviada.', { type: 'error', title: 'PROVA' }); return null; }
  const saved = await state.store.submitProof(proof, shot.blob, shot.meta);
  toast(state.store.mode === 'online' ? 'Prova registrada. Seus aliados vão auditar.' : 'Prova registrada no aparelho.', { title: 'PROVA' });
  return saved;
}

// ---- Biblioteca de exercícios ----------------------------------------------------
async function ensureExercises(t) {
  try {
    await loadExercises();
    t.error = '';
  } catch (e) {
    t.error = e.message;
  }
}

function refreshLib(scope) {
  const t = scope === 'picker' ? state.picker?.t : state.training;
  const root = scope === 'picker' ? $('#modal-root') : app;
  const grid = root?.querySelector(`[data-lib-grid="${scope}"]`);
  if (!t || !grid) return;
  grid.innerHTML = libraryGrid(t, { pick: scope === 'picker' });
  root.querySelectorAll('[data-act="lib-group"]').forEach((b) => b.classList.toggle('on', b.dataset.v === t.group));
  root.querySelectorAll('[data-act="lib-eq"]').forEach((b) => b.classList.toggle('on', b.dataset.v === t.eqf));
}

const libScope = (el) => (el.closest('#modal-root') ? 'picker' : 'training');
const libState = (scope) => (scope === 'picker' ? state.picker.t : state.training);

async function openPicker(target) {
  state.picker = { target, t: libDefaults() };
  const title = target === 'quest' ? 'Escolher exercício da missão' : 'Adicionar exercício à ficha';
  updateModal(pickerModal(state.picker.t, title), { wide: true });
  await ensureExercises(state.picker.t);
  refreshLib('picker');
}

function readQuestForm(form) {
  const f = new FormData(form);
  return {
    id: f.get('id') || undefined,
    title: String(f.get('title') || ''),
    attr: f.get('attr') || 'STR',
    target: Number(f.get('target')) || 1,
    unit: String(f.get('unit') || ''),
    xp: Number(f.get('xp')) || 30,
    exercise_id: f.get('exercise_id') || '',
    require_proof: f.get('require_proof') === '1',
  };
}

// ---- Fichas ---------------------------------------------------------------------------
const findRoutine = (id) => findPreset(id) ?? state.routines.find((r) => r.id === id);

function syncDraft(form) {
  if (!form || !state.draft) return;
  const f = new FormData(form);
  state.draft.name = String(f.get('name') || '');
  state.draft.attr = f.get('attr') || 'STR';
  state.draft.items.forEach((it, n) => {
    it.sets = Math.max(1, Math.min(20, Number(f.get(`sets-${n}`)) || it.sets));
    it.reps = String(f.get(`reps-${n}`) || it.reps).trim();
    it.rest = Math.max(0, Math.min(600, Number(f.get(`rest-${n}`)) || 0));
  });
}

const cloneRoutine = (r) => ({
  id: r.id, name: r.name, attr: r.attr ?? 'STR', sort: r.sort,
  items: r.items.map((i) => ({ ex: i.ex, name: exName(i.ex, i.name), sets: i.sets, reps: i.reps, rest: i.rest })),
});

// ---- Modo treino (sessão auditada) ---------------------------------------------------
const sessionKey = () => `ascend:session:${state.profile?.id}`;
function saveSession() {
  if (state.session) {
    if (motion) state.session.motion = motion.state();
    localStorage.setItem(sessionKey(), JSON.stringify(state.session));
  } else localStorage.removeItem(sessionKey());
}

function resumeSession() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(sessionKey())); } catch { /* corrompido */ }
  if (!s?.id) { localStorage.removeItem(sessionKey()); return; } // sessões antigas, sem servidor
  state.session = s;
  motion = createMotionTracker(s.motion);
  motion.start().then((ok) => { state.session && (state.session.motionOn = ok); }); // iOS pode exigir novo toque
  requestWakeLock();
}

async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* sem suporte */ }
}
document.addEventListener('visibilitychange', () => { if (state.session && document.visibilityState === 'visible') requestWakeLock(); });

function endSession() {
  motion?.stop();
  motion = null;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  state.session = null;
  state.rest = null;
  saveSession();
}

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

let tickCount = 0;
function tickSession() {
  const s = state.session;
  if (!s) return;
  const now = Date.now();
  document.querySelectorAll('[data-elapsed]').forEach((el) => { el.textContent = mmss(now - s.startedAt); });
  const sp = s.surprise;
  if (sp?.status === 'pending') {
    const left = new Date(sp.proof.expires_at).getTime() - now;
    document.querySelectorAll('[data-surprise-left]').forEach((el) => { el.textContent = mmss(left); });
    if (left <= -30000) {
      sp.status = 'expired';
      saveSession();
      toast('A prova surpresa expirou. O treino terá menos confiabilidade.', { type: 'error', title: 'AUDITORIA' });
      if (state.view === 'session') render();
    }
  }
  if (++tickCount % 10 === 0) saveSession(); // persiste o sensor
  if (!state.rest) return;
  const left = state.rest.until - now;
  if (left <= 0) {
    state.rest = null;
    navigator.vibrate?.([200, 100, 200]);
    toast('Descanso concluído. <b>Próxima série!</b>', { title: 'TREINO', type: 'gold' });
    if (state.view === 'session') render();
    return;
  }
  document.querySelectorAll('[data-rest]').forEach((el) => { el.textContent = mmss(left); });
}
setInterval(tickSession, 1000);

async function startRoutine(id) {
  const r = findRoutine(id);
  if (!r?.items.length) return;
  // O pedido de permissão do sensor precisa acontecer dentro do toque (iOS), antes de qualquer await.
  const tracker = createMotionTracker();
  const motionStart = tracker.start();
  if (state.session && !(await confirmDialog(`Já existe um treino em andamento (<b>${esc(state.session.name)}</b>). Substituir?`, { ok: 'Substituir', danger: true }))) {
    tracker.stop();
    return;
  }
  motion?.stop();
  motion = tracker;
  await loadExercises().catch(() => {}); // equipamento de cada exercício (incremento de carga)
  const meso = mesocycle(state.profile.created_at);
  const d0 = derive();
  const hp = state.health?.data ?? {};
  const items = r.items.map((i, idx) => ({ ex: i.ex, name: exName(i.ex, i.name), sets: periodizeSets(Number(i.sets), idx, meso), reps: String(i.reps), rest: Number(i.rest) }));
  const srv = await state.store.startSession({ name: r.name, attr: r.attr ?? 'STR', items });
  const total = items.reduce((a, i) => a + i.sets, 0);
  const lo = Math.max(1, Math.ceil(total * 0.35)), hi = Math.max(lo, Math.floor(total * 0.75));
  state.session = {
    id: srv.id, routineId: r.id, name: r.name, attr: r.attr ?? 'STR', startedAt: new Date(srv.started_at).getTime(),
    meso,
    items: items.map((i) => {
      const history = state.exlogs.filter((l) => l.exercise_id === i.ex).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const sug = suggestLoad({ exId: i.ex, reps: i.reps, history, bodyweight: d0.analysis?.weight, sex: hp.sex, experience: hp.experience, readiness: d0.daily?.readiness });
      if (meso.deload && sug.kg) { sug.kg = Math.round(sug.kg * 0.9 * 2) / 2; sug.text += ' Semana de deload: -10% de carga.'; }
      const range = parseReps(i.reps);
      return { ...i, done: 0, log: [], sug, timed: !range, kg: sug.kg ?? history[0]?.sets?.[0]?.kg ?? '', repsNow: sug.reps ?? range?.hi ?? '' };
    }),
    surpriseAt: lo + Math.floor(Math.random() * (hi - lo + 1)),
    surprise: null, proofs: [], motionOn: await motionStart,
  };
  state.rest = null;
  saveSession();
  requestWakeLock();
  closeModal();
  state.view = 'session';
  window.scrollTo(0, 0);
  render();
  loadExercises().catch(() => {});
  await sessionStartProof();
}

async function sessionStartProof() {
  const s = state.session;
  const pr = await runProof('workout', s.id, `Início · ${s.name}`);
  if (pr && state.session?.id === s.id) {
    s.proofs.push({ id: pr.id, label: 'Início' });
    saveSession();
  }
  render();
}

async function issueSurprise() {
  const s = state.session;
  s.surprise = { status: 'requesting' };
  const proof = await state.store.requestProof('workout', s.id);
  s.surprise = { proof, status: 'pending' };
  saveSession();
  navigator.vibrate?.([300, 120, 300]);
  toast(`<b>PROVA SURPRESA!</b> ${esc(proof.challenge)} — você tem 3 minutos.`, { title: 'AUDITORIA', type: 'gold', ms: 6000 });
  render();
}

function tickCountdown() {
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const m = Math.floor((mid - now) / 60000);
  const txt = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = txt; });
}

let currentDay = dayKey();
setInterval(() => {
  tickCountdown();
  if (dayKey() !== currentDay && state.phase === 'app') { currentDay = dayKey(); render(); }
}, 30000);

// ---- Timer, alarmes ----------------------------------------------------------------------
const timerMem = {};
function tickTimer(fromRender = false) {
  const t = state.timer;
  if (!t) return;
  const st = T.tick(t, timerMem);
  const q = (sel) => document.querySelectorAll(sel);
  let main = '', label = '';
  if (t.mode === 'stopwatch') { main = clock(T.elapsedMs(t), true); label = 'Cronômetro'; }
  else if (t.mode === 'countdown') {
    main = clock(st.left); label = 'Temporizador';
    q('[data-timer-bar]').forEach((el) => { el.style.width = `${(1 - st.left / (t.countdown * 1000)) * 100}%`; });
  } else if (t.mode === 'interval') {
    main = clock((st.left ?? 0) * 1000);
    label = st.done ? 'Concluído' : `${st.phase.label}${st.phase.round ? ` ${st.phase.round}/${t.interval.rounds}` : ''}`;
    q('[data-timer-rep]').forEach((el) => { el.textContent = st.rep != null ? `Rep ${st.rep} · ${st.repPart}` : ''; });
    q('[data-timer-meta]').forEach((el) => { el.textContent = st.done ? '' : `Rodada ${st.phase.round || '—'}/${t.interval.rounds}${t.interval.sets > 1 ? ` · Série ${st.phase.set}/${t.interval.sets}` : ''} · falta ${clock(st.totalLeft * 1000)}`; });
  }
  q('[data-timer-main]').forEach((el) => { el.innerHTML = main; });
  q('[data-pill-time]').forEach((el) => { el.innerHTML = main.replace(/<small>.*<\/small>/, ''); });
  q('[data-pill-label]').forEach((el) => { el.textContent = label; });
  if (fromRender) return;
  const phaseKey = `${t.mode}|${st.i ?? ''}|${t.running}|${t.finished ?? ''}`;
  if (timerMem.key !== phaseKey) {
    const first = timerMem.key === undefined;
    timerMem.key = phaseKey;
    T.saveTimer(t);
    if (!first) render();
  }
}
setInterval(() => { if (state.phase === 'app') tickTimer(); }, 200);

function checkAlarms() {
  const due = T.dueAlarms(state.alarms);
  if (!due.length) return;
  const today = new Date().toISOString().slice(0, 10);
  for (const a of due) {
    a.firedOn = today;
    T.unlockAudio();
    for (let i = 0; i < 8; i++) setTimeout(() => T.beep(i % 2 ? 880 : 1320, 250, 0.3), i * 400);
    navigator.vibrate?.([600, 200, 600, 200, 600]);
    T.say(a.label || 'Hora do treino');
    toast(`<b>${esc(a.time)}</b> · ${esc(a.label || 'Hora do treino!')}${a.detail ? `<br><small>${esc(a.detail)}</small>` : ''}`, { title: 'ALARME', type: 'gold', ms: 15000 });
    try { if (Notification.permission === 'granted') new Notification(`ASCEND · ${a.label || 'Hora do treino'}`, { body: a.detail || a.time, icon: 'icons/icon-192.png' }); } catch { /* sem notificação */ }
  }
  T.saveAlarms(state.alarms);
}
setInterval(checkAlarms, 15000);

function readIntervalForm(form) {
  const f = new FormData(form);
  const n = (k, d) => (f.get(k) === '' || f.get(k) == null ? d : Math.max(0, Number(f.get(k))));
  const c = state.timer.interval;
  Object.assign(c, {
    prep: n('prep', c.prep), work: Math.max(5, n('work', c.work)), rest: n('rest', c.rest), rounds: Math.max(1, n('rounds', c.rounds)),
    sets: Math.max(1, n('sets', c.sets)), setRest: n('setRest', c.setRest),
    tempo: f.get('tempo_on') ? { down: n('t_down', 2), hold: n('t_hold', 0), up: n('t_up', 1) } : null,
  });
  if (T.tempoTotal(c.tempo) === 0) c.tempo = null;
}

function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Missões e registros ------------------------------------------------------------------
async function toggleQuest(id) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || state.pending.has(id)) return;
  const existing = state.activities.find((a) => a.quest_id === id && a.day === dayKey());
  if (existing && existing.proof_ids?.length &&
      !(await confirmDialog(`Desfazer <b>${esc(q.title)}</b>? A prova enviada fica registrada na auditoria.`, { ok: 'Desfazer', danger: true }))) return;
  state.pending.add(id);
  render();
  try {
    await withProgress(async () => {
      if (existing) {
        removeActivities(await state.store.deleteActivity(existing.id));
        return;
      }
      let proofId = null;
      if (q.require_proof) {
        const pr = await runProof('quest', q.id, q.title);
        if (!pr) return;
        proofId = pr.id;
      }
      const { activity, bonus } = await state.store.completeQuest(q, proofId);
      addActivities(activity, bonus);
      toast(`<b>${esc(q.title)}</b> ${describeResult(activity)}`, { title: 'MISSÃO' });
      navigator.vibrate?.(30);
      if (bonus) setTimeout(() => toast(`Todas as missões concluídas. <b class="good">+${bonus.xp} XP</b>`, { type: 'gold', title: 'DIA PERFEITO', ms: 4500 }), 250);
    });
  } catch (e) {
    toastError(e);
  } finally {
    state.pending.delete(id);
    render();
  }
}

async function logWorkout(form) {
  const f = new FormData(form);
  const type = WORKOUT_TYPES.find((t) => t.id === f.get('type'));
  const minutes = Math.round(Number(f.get('minutes')));
  const intensity = f.get('intensity');
  const note = String(f.get('note') || '').trim();
  let proofId = null;
  if (f.get('proof') === '1') {
    const pr = await runProof('workout', 'quick', type.name);
    if (!pr) return;
    proofId = pr.id;
  }
  let act;
  await withProgress(async () => {
    act = await state.store.logQuickWorkout({ title: type.name, attr: type.attr, minutes, intensity, note, proofId });
    addActivities(act);
  });
  closeModal();
  toast(`${esc(type.name)} · ${act.meta.minutes} min ${describeResult(act)}`, { title: 'TREINO REGISTRADO', ms: 4500 });
}

async function deleteActivity(id) {
  const a = state.activities.find((x) => x.id === id);
  if (!a || !(await confirmDialog(`Remover <b>${esc(a.title)}</b> (−${a.xp} XP)? A remoção fica registrada na auditoria.`, { ok: 'Remover', danger: true }))) return;
  removeActivities(await state.store.deleteActivity(id));
  render();
}

async function saveQuest(form) {
  const q0 = readQuestForm(form);
  const prev = state.quests.find((q) => q.id === q0.id);
  const q = {
    ...q0,
    title: q0.title.trim(),
    unit: q0.unit.trim(),
    exercise_id: q0.exercise_id || null,
    sort: prev?.sort ?? Math.max(-1, ...state.quests.map((x) => x.sort)) + 1,
  };
  const saved = await state.store.saveQuest(q);
  state.quests = prev ? state.quests.map((x) => (x.id === q.id ? saved : x)) : [...state.quests, saved];
  closeModal();
  render();
  toast(prev ? 'Missão atualizada.' : `Nova missão: <b>${esc(saved.title)}</b>`);
}

async function deleteQuest(id) {
  const q = state.quests.find((x) => x.id === id);
  if (!(await confirmDialog(`Excluir a missão <b>${esc(q.title)}</b>? O XP já ganho continua com você.`, { ok: 'Excluir', danger: true }))) return;
  await state.store.deleteQuest(id);
  state.quests = state.quests.filter((x) => x.id !== id);
  state.activities.forEach((a) => { if (a.quest_id === id) a.quest_id = null; });
  render();
}

// ---- Avaliação física ----------------------------------------------------------------------
function newWizard(mode) {
  const last = state.assessments[0];
  const m = { bf_method: last?.bf_method && last.bf_method !== 'nenhum' ? last.bf_method : 'fita' };
  if ((mode === 'edit' || mode === 'complete') && last) {
    const est = last.flags ?? [];
    Object.assign(m, {
      weight_kg: est.includes('peso_estimado') ? null : Number(last.weight_kg), bf_pct: last.bf_pct,
      waist_1: last.waist_cm, waist_2: last.waist_cm, neck_1: last.neck_cm, neck_2: last.neck_cm, hip_1: last.hip_cm, hip_2: last.hip_cm,
    });
  }
  return { mode, step: 0, h: { ...(state.health?.data ?? {}) }, m, proofId: null, msg: '' };
}

function renderWiz() {
  if (state.phase === 'assessment') render();
  else { state.view = 'assessment'; render(); }
  window.scrollTo(0, 0);
}

async function saveWizard() {
  const w = state.wiz;
  if (w.mode !== 'reassess') state.health = await state.store.saveHealth({ ...w.h });
  if (w.mode !== 'edit') {
    const res = await state.store.addAssessment(measuresForAnalysis(w), w.proofId);
    state.assessments.unshift(res.assessment);
    addActivities(res.activity);
  }
  state.wiz = null;
  const pend = state.health?.data?.pending ?? [];
  if (state.phase === 'assessment') {
    state.phase = 'app';
    toast(`Avaliação concluída, <b>${esc(state.profile.username)}</b>. Seu plano alimentar está pronto.`, { title: 'SISTEMA', ms: 5000 });
  } else toast(w.mode === 'edit' ? 'Dados de saúde atualizados.' : 'Avaliação registrada.', { title: 'AVALIAÇÃO' });
  if (pend.length) setTimeout(() => toast('Avaliação <b>incompleta</b>: o plano é uma estimativa. Complete os dados assim que possível.', { type: 'error', title: 'ATENÇÃO', ms: 7000 }), 600);
  state.view = 'diet';
  state.diet.tab = w.mode === 'initial' ? 'hoje' : 'avaliacao';
  window.scrollTo(0, 0);
  render();
}

function openProfile() {
  const p = state.profile;
  const local = state.store.mode === 'local';
  openModal(`<h3 class="modal-title">Perfil do caçador</h3>
    <form class="form" data-form="profile">${profileFields(p)}
      <div class="modal-actions"><button class="btn" type="submit">${icon('check')} Salvar</button></div>
    </form>
    <div class="profile-extra">
      ${local ? `<button class="btn btn-ghost btn-sm" data-act="export">${icon('download')} Exportar backup</button>
        <label class="btn btn-ghost btn-sm">${icon('upload')} Importar<input type="file" accept="application/json" data-import hidden></label>
        <button class="btn btn-ghost btn-danger btn-sm" data-act="reset">${icon('trash')} Zerar tudo</button>`
      : `<span class="muted small">Código de aliado: <b class="mono">${esc(p.friend_code)}</b></span>
        <button class="btn btn-ghost btn-sm" data-act="logout">${icon('logout')} Sair</button>`}
    </div>
    <div class="profile-extra">
      <span class="muted small">Dados de saúde consentidos em ${state.health ? new Date(state.health.consent_at).toLocaleDateString('pt-BR') : '—'} (LGPD, art. 11).</span>
      <button class="btn btn-ghost btn-danger btn-sm" data-act="health-delete">${icon('trash')} Revogar e excluir dados de saúde</button>
    </div>`, { wide: true });
}

async function saveProfile(form) {
  const f = new FormData(form);
  const patch = { username: String(f.get('username')).trim(), hero_class: f.get('hero_class'), avatar: f.get('avatar') };
  state.profile = await state.store.updateProfile(patch);
  closeModal();
  render();
  toast('Perfil atualizado.');
}

// ---- Delegação de eventos ---------------------------------------------------------
const actions = {
  go: (el) => {
    if (el.dataset.view === 'timer') { state.view = 'training'; state.training.tab = 'timer'; render(); return; }
    state.view = el.dataset.view;
    window.scrollTo(0, 0);
    render();
    if (state.view === 'guild' && !state.guild.loaded) loadGuild();
    if (state.view === 'audit') loadAudit();
    if (state.view === 'training' && state.training.tab === 'biblioteca') ensureExercises(state.training).then(() => refreshLib('training'));
  },

  // --- Treinos / biblioteca
  'training-tab': async (el) => {
    state.training.tab = el.dataset.tab;
    render();
    if (state.training.tab === 'biblioteca') { await ensureExercises(state.training); refreshLib('training'); }
  },
  'lib-group': (el) => { const s = libScope(el); const t = libState(s); t.group = el.dataset.v; t.limit = 24; refreshLib(s); },
  'lib-eq': (el) => { const s = libScope(el); const t = libState(s); t.eqf = el.dataset.v; t.limit = 24; refreshLib(s); },
  'lib-more': (el) => { const s = libScope(el); libState(s).limit += 24; refreshLib(s); },
  'ex-detail': async (el) => {
    await loadExercises().catch(() => {});
    const html = exerciseDetail(el.dataset.id);
    el.closest('#modal-root') ? updateModal(html, { wide: true }) : openModal(html, { wide: true });
  },
  'ex-add-routine': (el) => {
    if (!state.routines.length) return actions['ex-add-to']({ dataset: { id: el.dataset.id, routine: '' } });
    updateModal(chooseRoutineModal(el.dataset.id, state.routines));
  },
  'ex-add-to': async (el) => {
    const exId = el.dataset.id;
    const item = { ex: exId, name: exName(exId), sets: 3, reps: '10-12', rest: 60 };
    if (!el.dataset.routine) {
      state.draft = { name: '', attr: 'STR', items: [item] };
      updateModal(routineEditor(state.draft), { wide: true });
      return;
    }
    const r = state.routines.find((x) => x.id === el.dataset.routine);
    const saved = await state.store.saveRoutine({ ...cloneRoutine(r), items: [...cloneRoutine(r).items, item] });
    state.routines = state.routines.map((x) => (x.id === saved.id ? saved : x));
    closeModal();
    render();
    toast(`<b>${esc(item.name)}</b> adicionado a ${esc(saved.name)}.`, { title: 'FICHA' });
  },
  'ex-pick': (el) => {
    const id = el.dataset.id;
    if (state.picker?.target === 'quest') {
      const q = state.questDraft;
      q.exercise_id = id;
      if (!q.title.trim()) q.title = exName(id).slice(0, 60);
      updateModal(questForm(q), { wide: false });
    } else {
      state.draft.items.push({ ex: id, name: exName(id), sets: 3, reps: '10-12', rest: 60 });
      updateModal(routineEditor(state.draft), { wide: true });
      toast(`<b>${esc(exName(id))}</b> adicionado.`, { title: 'FICHA', ms: 1800 });
    }
    state.picker = null;
  },
  'picker-cancel': () => {
    const target = state.picker?.target;
    state.picker = null;
    if (target === 'quest') updateModal(questForm(state.questDraft), { wide: false });
    else updateModal(routineEditor(state.draft), { wide: true });
  },
  'quest-pick-ex': (el) => { state.questDraft = readQuestForm(el.closest('form')); openPicker('quest'); },
  'quest-clear-ex': (el) => {
    state.questDraft = { ...readQuestForm(el.closest('form')), exercise_id: '' };
    updateModal(questForm(state.questDraft));
  },

  // --- Fichas
  'routine-open': (el) => {
    const r = findRoutine(el.dataset.id);
    const html = routineDetail(r, Boolean(findPreset(r.id)));
    el.closest('#modal-root') ? updateModal(html, { wide: true }) : openModal(html, { wide: true });
  },
  'routine-start': (el) => startRoutine(el.dataset.id),
  'routine-new': () => { state.draft = { name: '', attr: 'STR', items: [] }; openModal(routineEditor(state.draft), { wide: true }); },
  'routine-edit': (el) => { state.draft = cloneRoutine(findRoutine(el.dataset.id)); updateModal(routineEditor(state.draft), { wide: true }); },
  'routine-copy': (el) => {
    const r = cloneRoutine(findRoutine(el.dataset.id));
    state.draft = { ...r, id: undefined };
    updateModal(routineEditor(state.draft), { wide: true });
  },
  'routine-delete': async (el) => {
    const r = findRoutine(el.dataset.id);
    if (!(await confirmDialog(`Excluir a ficha <b>${esc(r.name)}</b>?`, { ok: 'Excluir', danger: true }))) return;
    await state.store.deleteRoutine(r.id);
    state.routines = state.routines.filter((x) => x.id !== r.id);
    render();
  },
  'draft-move': (el) => {
    syncDraft(el.closest('form'));
    const i = Number(el.dataset.i), j = i + Number(el.dataset.dir);
    const items = state.draft.items;
    [items[i], items[j]] = [items[j], items[i]];
    updateModal(routineEditor(state.draft), { wide: true });
  },
  'draft-remove': (el) => {
    syncDraft(el.closest('form'));
    state.draft.items.splice(Number(el.dataset.i), 1);
    updateModal(routineEditor(state.draft), { wide: true });
  },
  'draft-add': (el) => { syncDraft(el.closest('form')); openPicker('routine'); },

  // --- Modo treino
  'set-toggle': async (el) => {
    const s = state.session;
    const it = s.items[Number(el.dataset.i)];
    const k = Number(el.dataset.k);
    const marking = k >= it.done;
    it.done = marking ? k + 1 : k;
    it.log ??= [];
    if (marking && !it.timed) for (let j = it.log.length; j <= k; j++) it.log[j] = { kg: Number(it.kg) || 0, reps: Number(it.repsNow) || 0 };
    if (!marking) it.log = it.log.slice(0, k);
    const done = s.items.reduce((a, x) => a + x.done, 0);
    const left = s.items.some((x) => x.done < x.sets);
    state.rest = marking && left && it.rest > 0 ? { until: Date.now() + it.rest * 1000 } : null;
    if (marking) navigator.vibrate?.(25);
    if (marking && it.done === it.sets) toast(`<b>${esc(it.name)}</b> concluído.`, { title: 'EXERCÍCIO', ms: 1800 });
    saveSession();
    render();
    if (marking && !s.surprise && done >= s.surpriseAt) await issueSurprise();
  },
  'rest-skip': () => { state.rest = null; render(); },
  'session-proof-start': () => sessionStartProof(),
  'session-proof-surprise': async () => {
    const s = state.session;
    const pr = await runProof('workout', s.id, `Surpresa · ${s.name}`, s.surprise.proof);
    if (pr) { s.surprise.status = 'sent'; s.proofs.push({ id: pr.id, label: 'Surpresa' }); saveSession(); }
    render();
  },
  'session-finish': () => {
    const done = state.session.items.reduce((a, i) => a + i.done, 0);
    if (!done) return toast('Marque ao menos uma série antes de finalizar.', { type: 'error', title: 'TREINO' });
    openModal(finishForm(Math.max(1, Math.round((Date.now() - state.session.startedAt) / 60000))));
  },
  'session-cancel': async () => {
    if (!(await confirmDialog('Cancelar o treino em andamento? Nenhum XP será registrado e o cancelamento fica na auditoria.', { ok: 'Cancelar treino', danger: true }))) return;
    await state.store.cancelSession(state.session.id).catch(() => {});
    endSession();
    state.view = 'training';
    render();
  },

  // --- Missões
  'toggle-quest': (el) => toggleQuest(el.dataset.id),
  'edit-quest': (el) => openModal(questForm(state.quests.find((q) => q.id === el.dataset.id))),
  'new-quest': () => openModal(questForm()),
  'delete-quest': async (el) => { closeModal(); await deleteQuest(el.dataset.id); },
  workout: () => openModal(workoutForm(state.profile.hero_class), { wide: true }),
  'del-activity': (el) => deleteActivity(el.dataset.id),

  // --- Dieta
  'diet-tab': (el) => { state.diet.tab = el.dataset.tab; render(); },
  'meal-swap': (el) => {
    const today = dayKey();
    const meal = derive().plan.meals.find((m) => m.id === el.dataset.slot);
    state.diet.swaps[today] = { ...(state.diet.swaps[today] ?? {}), [meal.id]: nextSwap(state.health.data, meal.id, meal.recipe?.id) };
    // guarda só os últimos 14 dias de trocas
    for (const k of Object.keys(state.diet.swaps)) if (k < addDays(today, -14)) delete state.diet.swaps[k];
    saveDiet();
    render();
  },
  'meal-checkin': async (el) => {
    const { slot, title } = el.dataset;
    const pr = await runProof('meal', slot, title);
    if (!pr) return;
    await withProgress(async () => { addActivities(await state.store.mealCheckin(slot, title, pr.id)); });
    toast(`Refeição registrada: <b>${esc(title)}</b> <span class="good">+${RULES.MEAL_XP} XP</span>`, { title: 'NUTRIÇÃO' });
  },
  'recipe-open': (el) => {
    const d = derive();
    const meal = el.dataset.slot ? d.plan?.meals.find((m) => m.id === el.dataset.slot) : null;
    openModal(recipeModal(el.dataset.id, meal?.kcal, d.analysis?.hideNumbers), { wide: true });
  },
  'shop-toggle': (el) => { state.diet.got[el.dataset.food] = el.checked; saveDiet(); },
  'assess-new': () => { state.wiz = newWizard(state.health ? 'reassess' : 'initial'); renderWiz(); },
  'health-edit': () => { state.wiz = newWizard('edit'); renderWiz(); },

  // --- Assistente de avaliação
  'wiz-back': (el) => {
    const w = state.wiz;
    readWizardStep(w, el.closest('form')); // guarda o que já foi digitado, sem validar
    w.step = Math.max(0, w.step - 1);
    w.msg = '';
    renderWiz();
  },
  'wiz-skip': (el) => { skipWizardStep(state.wiz, el.closest('form')); renderWiz(); },
  'assess-complete': () => { state.wiz = newWizard('complete'); renderWiz(); },
  'wiz-cancel': () => { state.wiz = null; state.view = 'diet'; render(); },
  'wiz-scale': async () => {
    const pr = await runProof('weigh_in', 'assessment', 'Balança');
    if (pr) { state.wiz.proofId = pr.id; state.wiz.msg = ''; }
    renderWiz();
  },

  // --- Auditoria
  'proof-view': async (el) => {
    const proofs = await state.store.proofsFor(el.dataset.ids.split(','));
    openModal(proofsModal(proofs, el.dataset.title), { wide: true });
  },
  review: async (el) => {
    const { id, verdict } = el.dataset;
    const reason = verdict === 'reject' ? document.querySelector(`[data-reason="${id}"]`)?.value : null;
    if (verdict === 'reject' && !(await confirmDialog(`Marcar como <b>suspeito</b>? Motivo: ${esc(reason)}. Com 2 reprovações o XP do aliado é zerado.`, { ok: 'Reprovar', danger: true }))) return;
    await state.store.reviewActivity(id, verdict, reason);
    state.audit.queue = state.audit.queue.filter((r) => r.id !== id);
    toast(verdict === 'approve' ? 'Prova aprovada.' : 'Prova reprovada.', { title: 'AUDITORIA' });
    render();
  },

  // --- Timer
  'timer-mode': (el) => { const t = state.timer; if (t.mode !== el.dataset.mode) { T.reset(t); t.finished = false; t.mode = el.dataset.mode; } T.saveTimer(t); render(); },
  'timer-toggle': () => {
    const t = state.timer;
    T.unlockAudio();
    if (t.running) T.pause(t);
    else { if (t.finished) { T.reset(t); t.finished = false; } T.start(t); requestWakeLock(); }
    T.saveTimer(t);
    render();
  },
  'timer-reset': () => { T.reset(state.timer); state.timer.finished = false; T.saveTimer(state.timer); render(); },
  'timer-lap': () => {
    const t = state.timer;
    const total = T.elapsedMs(t);
    const prev = t.laps[0]?.total ?? 0;
    t.laps.unshift({ total, split: total - prev });
    T.saveTimer(t);
    render();
  },
  'timer-preset': (el) => {
    const t = state.timer;
    T.reset(t); t.finished = false;
    t.interval = { ...T.PRESETS.find((x) => x.id === el.dataset.id) };
    T.saveTimer(t);
    render();
  },
  'timer-cd': (el) => { const t = state.timer; T.reset(t); t.finished = false; t.countdown = Number(el.dataset.s); T.saveTimer(t); render(); },
  'ex-timer': (el) => {
    const it = state.session.items[Number(el.dataset.i)];
    const t = state.timer;
    T.unlockAudio();
    T.reset(t); t.finished = false;
    t.mode = 'interval';
    t.interval = T.intervalForExercise(it);
    T.start(t);
    requestWakeLock();
    T.saveTimer(t);
    toast(`Timer: <b>${esc(it.name)}</b> · ${it.sets} séries com ${it.rest}s de descanso. Toque duas vezes na tela do Timer para pausar.`, { title: 'TIMER' });
    render();
  },
  'alarm-toggle': (el) => { const a = state.alarms.find((x) => x.id === el.dataset.id); a.on = el.checked; T.saveAlarms(state.alarms); render(); },
  'alarm-del': (el) => { state.alarms = state.alarms.filter((x) => x.id !== el.dataset.id); T.saveAlarms(state.alarms); render(); },
  'alarm-ics': () => downloadFile('ascend-alarmes.ics', T.alarmsToIcs(state.alarms), 'text/calendar'),
  'alarm-notify': async () => {
    if (!('Notification' in window)) return toast('Este navegador não suporta notificações.', { type: 'error' });
    const r = await Notification.requestPermission();
    toast(r === 'granted' ? 'Notificações liberadas.' : 'Notificações bloqueadas.', { title: 'ALARME' });
  },
  'alarm-native': (el) => {
    const a = state.alarms.find((x) => x.id === el.dataset.id);
    const url = T.nativeAlarmUrl(a);
    if (!url) return toast('Abra o ASCEND no celular para enviar o alarme ao relógio.', { title: 'ALARME' });
    window.location.href = url;
  },

  // --- Saúde
  'health-tab': (el) => { state.healthTab = el.dataset.tab; render(); },
  'lab-del': async (el) => {
    if (!(await confirmDialog('Excluir este exame?', { ok: 'Excluir', danger: true }))) return;
    await state.store.deleteLab(el.dataset.id);
    state.labs = state.labs.filter((l) => l.id !== el.dataset.id);
    render();
  },

  // --- Check-up
  'checkup-copy': async () => {
    const d = derive();
    const txt = checkupText(buildCheckup({ h: state.health.data, an: d.analysis, labs: state.labs, age: d.analysis.age }), state.profile.username);
    try { await navigator.clipboard.writeText(txt); toast('Lista copiada. Cole no WhatsApp ou nas notas para levar à consulta.', { title: 'CHECK-UP' }); }
    catch { downloadFile('ascend-checkup.txt', txt, 'text/plain'); }
  },
  'checkup-download': () => {
    const d = derive();
    downloadFile('ascend-checkup.txt', checkupText(buildCheckup({ h: state.health.data, an: d.analysis, labs: state.labs, age: d.analysis.age }), state.profile.username), 'text/plain');
  },

  // --- Rotina
  'routine-alarms': () => {
    const cfg = { ...DEFAULT_ROUTINE, ...(state.health.data.routine ?? {}) };
    const d = derive();
    const alarms = routineToAlarms(buildRoutine(cfg, state.health.data, d.analysis, d.plan), cfg);
    state.alarms = [...state.alarms.filter((a) => a.group !== 'rotina'), ...alarms].sort((a, b) => a.time.localeCompare(b.time));
    T.saveAlarms(state.alarms);
    T.unlockAudio();
    render();
    toast(`${alarms.length} alarmes da rotina ativados. Para tocar com o celular bloqueado, envie para o calendário.`, { title: 'ROTINA', type: 'gold', ms: 6000 });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  },
  'routine-alarms-off': () => {
    state.alarms = state.alarms.filter((a) => a.group !== 'rotina');
    T.saveAlarms(state.alarms);
    render();
  },
  'routine-ics': () => {
    const cfg = { ...DEFAULT_ROUTINE, ...(state.health.data.routine ?? {}) };
    const d = derive();
    const alarms = routineToAlarms(buildRoutine(cfg, state.health.data, d.analysis, d.plan), cfg);
    downloadFile('ascend-rotina.ics', T.alarmsToIcs(alarms), 'text/calendar');
    toast('Abra o arquivo baixado para adicionar os lembretes ao calendário do celular.', { title: 'ROTINA', ms: 6000 });
  },

  // --- Feira
  'feira-days': (el) => { state.diet.days = Number(el.dataset.n); saveDiet(); render(); },
  'price-edit': (el) => {
    const { food, name, pack, price } = el.dataset;
    openModal(`<h3 class="modal-title">Preço · ${esc(name)}</h3>
      <form class="form" data-form="price"><input type="hidden" name="food" value="${esc(food)}">
        <label>Preço por ${esc(pack)} (R$)<input type="number" name="price" step="0.01" min="0" required value="${esc(price)}"></label>
        <p class="muted small">Use o preço que você viu no iFood Mercados ou no mercado da sua cidade. Fica salvo só para esta cidade.</p>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="price-reset" data-food="${esc(food)}">Voltar à referência</button>
          <button class="btn" type="submit">${icon('check')} Salvar</button></div></form>`);
  },
  'price-reset': (el) => {
    const city = state.health.data.city || 'Campina Grande - PB';
    delete state.diet.prices?.[city]?.[el.dataset.food];
    saveDiet(); closeModal(); render();
  },

  // --- Perfil
  profile: openProfile,
  'health-delete': async () => {
    if (!(await confirmDialog('Revogar o consentimento e <b>excluir</b> perfil de saúde e todas as avaliações físicas? O plano alimentar depende desses dados: para continuar usando o app será preciso uma nova avaliação.', { ok: 'Excluir dados de saúde', danger: true }))) return;
    await state.store.deleteHealthData();
    state.health = null;
    state.assessments = [];
    state.wiz = newWizard('initial');
    state.phase = 'assessment';
    render();
    toast('Dados de saúde excluídos.', { title: 'LGPD' });
  },
  logout: async () => { closeModal(); await state.store.signOut(); location.reload(); },
  export: () => {
    const blob = new Blob([state.store.exportData()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ascend-backup-${dayKey()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  },
  reset: async () => {
    if (!(await confirmDialog('Apagar <b>todo</b> o progresso deste aparelho? Não dá para desfazer.', { ok: 'Zerar', danger: true }))) return;
    state.store.reset();
    localStorage.removeItem('ascend:seeded:local');
    localStorage.removeItem('ascend:session:local');
    localStorage.removeItem('ascend:diet:local');
    location.reload();
  },

  // --- Auth / Guilda
  'auth-tab': (el) => { state.authTab = el.dataset.tab; state.authMsg = ''; render(); },
  'guild-tab': (el) => { state.guild.tab = el.dataset.tab; render(); },
  'guild-refresh': loadGuild,
  'board-period': (el) => { state.guild.period = el.dataset.period; render(); },
  'copy-code': async () => {
    const code = state.profile.friend_code;
    const text = `Bora evoluir junto no ASCEND! Meu código de aliado: ${code}\n${location.origin}${location.pathname}`;
    try {
      if (navigator.share) await navigator.share({ title: 'ASCEND', text });
      else { await navigator.clipboard.writeText(code); toast('Código copiado.'); }
    } catch { /* compartilhamento cancelado */ }
  },
  'accept-friend': async (el) => { await state.store.acceptFriend(el.dataset.id); toast('Aliança formada.', { type: 'gold', title: 'GUILDA' }); await withProgress(loadGuild); },
  'remove-friend': async (el) => {
    if (el.dataset.name && !(await confirmDialog(`Remover <b>${esc(el.dataset.name)}</b> dos aliados?`, { ok: 'Remover', danger: true }))) return;
    await state.store.removeFriend(el.dataset.id);
    await loadGuild();
  },
  kudos: async (el) => {
    const item = state.guild.feed.find((a) => a.id === el.dataset.id);
    if (!item || item.isMe) return;
    const on = !item.kudosMine;
    Object.assign(item, { kudosMine: on, kudosCount: item.kudosCount + (on ? 1 : -1) });
    render();
    try { await state.store.toggleKudos(item.id, on); } catch (e) {
      Object.assign(item, { kudosMine: !on, kudosCount: item.kudosCount + (on ? -1 : 1) });
      render();
      throw e;
    }
  },
};

const forms = {
  auth: async (form) => {
    const f = new FormData(form);
    const email = String(f.get('email')).trim(), pw = String(f.get('password'));
    if (form.dataset.mode === 'in') {
      await state.store.signIn(email, pw);
      await afterLogin();
    } else {
      const session = await state.store.signUp(email, pw);
      if (session) await afterLogin();
      else { state.authTab = 'in'; state.authMsg = 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.'; render(); }
    }
  },
  onboarding: async (form) => {
    const f = new FormData(form);
    state.profile = await state.store.createProfile({
      username: String(f.get('username')).trim(), hero_class: f.get('hero_class'), avatar: f.get('avatar'),
    });
    await afterLogin();
  },
  wiz: async (form) => {
    const w = state.wiz;
    const err = readWizardStep(w, form);
    if (err) { w.msg = err; renderWiz(); return; }
    w.msg = '';
    if (w.step === WIZ_STEPS[w.mode].length - 1) await saveWizard();
    else { w.step += 1; renderWiz(); }
  },
  quest: saveQuest,
  workout: logWorkout,
  routine: async (form) => {
    syncDraft(form);
    const d = state.draft;
    if (!d.items.length) throw new Error('Adicione ao menos um exercício.');
    const saved = await state.store.saveRoutine({ ...d, name: d.name.trim(), sort: d.sort ?? state.routines.length });
    state.routines = d.id ? state.routines.map((r) => (r.id === saved.id ? saved : r)) : [...state.routines, saved];
    state.draft = null;
    closeModal();
    state.view = 'training';
    state.training.tab = 'fichas';
    render();
    toast(`Ficha <b>${esc(saved.name)}</b> salva.`, { title: 'FICHA' });
  },
  'session-finish': async (form) => {
    const f = new FormData(form);
    const s = state.session;
    const sets = s.items.reduce((a, i) => a + i.done, 0);
    const sensor = motion?.summary() ?? { supported: false };
    let act;
    await withProgress(async () => {
      const logs = s.items.filter((i) => i.log?.length).map((i) => ({ ex: i.ex, sets: i.log.filter(Boolean).slice(0, 20) }));
      act = await state.store.finishSession(s.id, { intensity: f.get('intensity'), sets, sensor, note: String(f.get('note') || '').trim(), logs });
      addActivities(act);
      const now = new Date().toISOString();
      state.exlogs.unshift(...logs.map((l) => ({ exercise_id: l.ex, day: dayKey(), sets: l.sets, created_at: now })));
      endSession();
      state.view = 'status';
    });
    closeModal();
    window.scrollTo(0, 0);
    toast(`${esc(s.name)} · ${sets} séries · ${act.meta.minutes} min ${describeResult(act)}`, { title: 'TREINO CONCLUÍDO', type: 'gold', ms: 6000 });
  },
  profile: saveProfile,
  checkin: async (form) => {
    const f = new FormData(form);
    const data = {
      sleep_h: Number(f.get('sleep_h')), sleep_q: Number(f.get('sleep_q')) || 3, energy: Number(f.get('energy')) || 3,
      stress: Number(f.get('stress')) || 3, soreness: Number(f.get('soreness')) || 3, steps: f.get('steps') ? Number(f.get('steps')) : null,
    };
    if (!(data.sleep_h >= 0 && data.sleep_h <= 16)) throw new Error('Informe as horas de sono (0 a 16).');
    const row = await state.store.saveCheckin(dayKey(), data);
    state.checkins[dayKey()] = row;
    render();
    const dt = derive().daily;
    toast(`Prontidão <b>${dt?.readiness ?? '—'}</b> · meta de hoje <b>${dt ? dt.kcal.toLocaleString('pt-BR') : '—'} kcal</b>`, { title: 'CHECK-IN' });
  },
  lab: async (form) => {
    const f = new FormData(form);
    const values = {};
    for (const [k, v] of f.entries()) {
      if (!k.startsWith('v_') || v === '') continue;
      const key = k.slice(2);
      const x = { v: Number(String(v).replace(',', '.')) };
      if (f.get(`min_${key}`)) x.min = Number(f.get(`min_${key}`));
      if (f.get(`max_${key}`)) x.max = Number(f.get(`max_${key}`));
      values[key] = x;
    }
    if (!Object.keys(values).length) throw new Error('Preencha ao menos um marcador.');
    const row = await state.store.addLab({ taken_on: f.get('taken_on'), lab: String(f.get('lab') || '').trim() || null, values });
    state.labs = [row, ...state.labs].sort((a, b) => b.taken_on.localeCompare(a.taken_on));
    window.scrollTo(0, 0);
    render();
    toast(`Exame salvo com ${Object.keys(values).length} marcador(es). Plano ajustado.`, { title: 'EXAMES' });
  },
  'routine-cfg': async (form) => {
    const f = new FormData(form);
    const routine = {
      wake: f.get('wake'), sleep: f.get('sleep'), workStart: f.get('workStart') || '', workEnd: f.get('workEnd') || '',
      workDays: f.getAll('workDays').map(Number), train: f.get('train') || '', trainDur: Number(f.get('trainDur')) || 60,
      coffee: f.get('coffee') === '1',
      alarms: Object.fromEntries(['meal', 'water', 'coffee', 'pause', 'train', 'sleep'].map((k) => [k, f.get(`al_${k}`) === '1'])),
    };
    state.health = await state.store.saveHealth({ ...state.health.data, routine });
    const hadAlarms = state.alarms.some((a) => a.group === 'rotina');
    if (hadAlarms) actions['routine-alarms']();
    else render();
    toast('Rotina salva.', { title: 'ROTINA' });
  },
  resthr: (form) => { state.guide.restHr = Number(new FormData(form).get('rest')) || null; saveGuide(); render(); },
  cooper: (form) => { state.guide.cooper = Number(new FormData(form).get('dist')) || null; saveGuide(); render(); },
  whey: (form) => {
    const f = new FormData(form);
    state.guide.whey = { price: Number(f.get('price')), packG: Number(f.get('packG')), doseG: Number(f.get('doseG')), protPerDose: Number(f.get('protPerDose')) };
    saveGuide();
    render();
  },
  city: async (form) => {
    const city = String(new FormData(form).get('city')).trim();
    state.health = await state.store.saveHealth({ ...state.health.data, city });
    render();
    toast(`Preços da feira agora para <b>${esc(city)}</b>.`, { title: 'FEIRA' });
  },
  price: (form) => {
    const f = new FormData(form);
    const city = state.health.data.city || 'Campina Grande - PB';
    state.diet.prices ??= {};
    (state.diet.prices[city] ??= {})[f.get('food')] = Number(f.get('price'));
    saveDiet();
    closeModal();
    render();
  },
  'alarm-add': (form) => {
    const f = new FormData(form);
    state.alarms.push({ id: Math.random().toString(36).slice(2, 10), time: f.get('time'), label: String(f.get('label') || '').trim(), days: f.getAll('days').map(Number), on: true });
    state.alarms.sort((a, b) => a.time.localeCompare(b.time));
    T.saveAlarms(state.alarms);
    render();
    toast('Alarme criado. Toque em "Pôr no relógio do celular" para tocar com o app fechado.', { title: 'ALARME', ms: 5000 });
  },
  'timer-interval': () => {},
  'timer-cd': (form) => {
    const f = new FormData(form);
    const t = state.timer;
    T.reset(t); t.finished = false;
    t.countdown = Math.max(1, (Number(f.get('min')) || 0) * 60 + (Number(f.get('sec')) || 0));
    T.saveTimer(t);
    render();
  },
  'add-friend': async (form) => {
    const code = String(new FormData(form).get('code')).trim().toUpperCase();
    const res = await state.store.sendFriendRequest(code);
    form.reset();
    toast(res === 'accepted' ? 'Vocês agora são aliados.' : 'Pedido enviado. Aguarde a aceitação.', { title: 'GUILDA' });
    await withProgress(loadGuild);
  },
};

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.type !== 'checkbox') e.preventDefault();
  try { await fn(el); } catch (err) { toastError(err); }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  try {
    await forms[form.dataset.form](form);
  } catch (err) {
    if (state.phase === 'auth' || state.phase === 'onboarding') { state.authMsg = esc(err.message); render(); }
    else if (state.wiz && form.dataset.form === 'wiz') { state.wiz.msg = err.message; renderWiz(); }
    else toastError(err);
  } finally {
    if (btn?.isConnected) btn.disabled = false;
  }
});

// Toque duplo (mouse ou dedo) na área do timer = iniciar/pausar. Ignora cliques em controles.
let lastTap = { t: 0, x: 0, y: 0 };
document.addEventListener('pointerup', (e) => {
  if (!e.target.closest('[data-dbltap="timer"]')) return;
  if (e.target.closest('button, a, input, select, textarea, label, summary, .seg, .chip-row')) { lastTap.t = 0; return; }
  const now = performance.now();
  const near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
  if (now - lastTap.t < 350 && near) {
    lastTap.t = 0;
    actions['timer-toggle']();
    navigator.vibrate?.(40);
    const flash = document.createElement('div');
    flash.className = 'dbltap-flash';
    flash.textContent = state.timer.running ? '▶' : '❚❚';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  } else lastTap = { t: now, x: e.clientX, y: e.clientY };
});

let searchTimer;
function updateWorkoutPreview(wf) {
  const f = new FormData(wf);
  const type = WORKOUT_TYPES.find((x) => x.id === f.get('type'));
  const out = quickOutcome({
    minutes: Number(f.get('minutes')), intensity: f.get('intensity'), hasProof: f.get('proof') === '1',
    attr: type.attr, heroClass: state.profile.hero_class, usedToday: 0,
  });
  wf.querySelector('[data-workout-xp]').textContent = out.xp;
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-lib-q]')) {
    const scope = libScope(t);
    const st = libState(scope);
    st.q = t.value;
    st.limit = 24;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => refreshLib(scope), 150);
    return;
  }
  if (t.matches('[data-set-kg], [data-set-reps]') && state.session) {
    const it = state.session.items[Number(t.dataset.setKg ?? t.dataset.setReps)];
    if (t.dataset.setKg != null) it.kg = t.value; else it.repsNow = t.value;
    saveSession();
    return;
  }
  if (t.matches('[data-xp-range]')) t.closest('form').querySelector('[data-xp-out]').textContent = t.value;
  const wf = t.closest('[data-form="workout"]');
  if (wf) updateWorkoutPreview(wf);
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  const wf = t.closest('[data-form="workout"]');
  if (wf) updateWorkoutPreview(wf);
  if (t.matches('[data-timer-field]')) {
    const form = t.closest('form');
    if (form.dataset.form === 'timer-interval') { T.reset(state.timer); state.timer.finished = false; readIntervalForm(form); T.saveTimer(state.timer); render(); }
    else if (form.dataset.form === 'timer-cd') forms['timer-cd'](form);
    return;
  }
  if (t.matches('[data-toggle-glp1]')) {
    const box = t.closest('form').querySelector('.glp1-fields');
    if (box) box.hidden = !t.checked;
    return;
  }
  if (t.name === 'bf_method') {
    const box = t.closest('form').querySelector('.bf-manual');
    if (box) box.hidden = t.value === 'fita';
  }
  if (!t.matches('[data-import]')) return;
  const file = t.files[0];
  if (!file) return;
  try {
    state.store.importData(await file.text());
    location.reload();
  } catch (err) { toastError(err); }
});

// ---- Boot ------------------------------------------------------------------------
async function afterLogin() {
  state.profile = await state.store.getProfile();
  if (!state.profile) { state.phase = 'onboarding'; state.authMsg = ''; render(); return; }
  await loadGame();
  // Avaliação física é obrigatória: sem ela não há metas nem plano.
  if (!state.health || !state.assessments.length) {
    state.wiz = newWizard('initial');
    state.phase = 'assessment';
  } else state.phase = 'app';
  render();
}

async function boot() {
  render();
  try {
    state.store = await createStore();
    const session = await state.store.session();
    if (!session) { state.phase = 'auth'; render(); return; }
    await afterLogin();
  } catch (err) {
    app.innerHTML = `<div class="boot"><div class="boot-text error">FALHA NO SISTEMA</div><p class="muted">${esc(err.message)}</p>
      <button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
  }
}

// Sem SW em localhost para não servir arquivos velhos durante o desenvolvimento.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

boot();
