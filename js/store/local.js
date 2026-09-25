// Store offline (modo solo): mesma interface do store online, persistido no localStorage (+ fotos no IndexedDB).
// ATENÇÃO: no modo solo tudo roda no aparelho — a auditoria é local e não impede quem edita os dados do navegador.
// A auditoria forte (relógio do servidor, XP calculado no servidor, revisão por aliados) exige o modo online.
import { uuid, dayKey } from '../util.js';
import { applyClassBonus } from '../game.js';
import { RULES, GESTURES, sessionOutcome, quickOutcome, capDaily, trustScore } from '../rules.js';
import { navyBodyFat } from '../nutrition.js';
import { idbPut, idbGet, idbClear } from '../idb.js';

const KEY = 'ascend:v1';
const OFFLINE = 'Recurso social disponível apenas no modo online.';
const EMPTY = () => ({ profile: null, quests: [], activities: [], routines: [], proofs: [], sessions: [], audit: [], health: null, assessments: [], exlogs: [], checkins: {}, labs: [], weighins: [] });

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

const fail = (msg) => { throw new Error(msg); };
const now = () => new Date().toISOString();

export function createLocalStore() {
  let db = { ...EMPTY(), ...load() };
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const audit = (event, entity, data = {}) => {
    db.audit.unshift({ id: db.audit.length + 1, user_id: 'local', event, entity, data, created_at: now() });
    db.audit = db.audit.slice(0, 500);
  };
  const heroClass = () => db.profile?.hero_class;
  const usedToday = (kind) => db.activities.filter((a) => a.day === dayKey() && a.kind === kind).reduce((s, a) => s + a.xp, 0);
  const insertActivity = (a) => {
    const row = { meta: {}, flags: [], proof_ids: [], quest_id: null, ...a, base_xp: a.xp, id: uuid(), user_id: 'local', day: dayKey(), created_at: now() };
    db.activities.push(row);
    return row;
  };
  function consumeProof(id, kind, ref) {
    const p = db.proofs.find((x) => x.id === id);
    if (!p || p.kind !== kind || (ref != null && p.ref_id !== ref) || !p.submitted_at || p.used) fail('Prova inválida ou já utilizada.');
    p.used = true;
    return p;
  }

  return {
    mode: 'local',

    async session() { return { user: { id: 'local' } }; },
    onAuthChange() {},
    async signOut() {},

    async getProfile() { return db.profile; },
    async createProfile(p) {
      db.profile = { id: 'local', friend_code: '—', created_at: now(), ...p };
      save();
      return db.profile;
    },
    async updateProfile(patch) {
      db.profile = { ...db.profile, ...patch };
      save();
      return db.profile;
    },

    // ---- missões e fichas (configuração, não pontuam)
    async listQuests() { return [...db.quests].sort((a, b) => a.sort - b.sort); },
    async saveQuest(q) {
      const row = { require_proof: false, ...q, id: q.id ?? uuid() };
      const i = db.quests.findIndex((x) => x.id === row.id);
      i >= 0 ? (db.quests[i] = row) : db.quests.push(row);
      save();
      return row;
    },
    async saveQuests(list) {
      const out = [];
      for (const q of list) out.push(await this.saveQuest(q));
      return out;
    },
    async deleteQuest(id) {
      db.quests = db.quests.filter((q) => q.id !== id);
      db.activities.forEach((a) => { if (a.quest_id === id) a.quest_id = null; });
      save();
    },
    async listRoutines() { return [...db.routines]; },
    async saveRoutine(r) {
      const row = { ...r, id: r.id ?? uuid() };
      const i = db.routines.findIndex((x) => x.id === row.id);
      i >= 0 ? (db.routines[i] = row) : db.routines.push(row);
      save();
      return row;
    },
    async deleteRoutine(id) {
      db.routines = db.routines.filter((r) => r.id !== id);
      save();
    },

    // ---- leitura
    async listActivities(sinceDay) {
      return db.activities.filter((a) => a.day >= sinceDay).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async totals() {
      const t = { total: 0, by_attr: {}, by_kind: {}, days: [] };
      const days = new Set();
      for (const a of db.activities) {
        t.total += a.xp;
        t.by_attr[a.attr] = (t.by_attr[a.attr] || 0) + a.xp;
        if (a.status === 'rejected') continue;
        t.by_kind[a.kind] = (t.by_kind[a.kind] || 0) + 1;
        days.add(a.day);
      }
      t.days = [...days].sort().reverse();
      t.trust = trustScore(db.activities);
      return t;
    },

    // ---- provas
    async requestProof(kind, ref) {
      const p = {
        id: uuid(), user_id: 'local', kind, ref_id: String(ref), used: false,
        challenge: GESTURES[Math.floor(Math.random() * GESTURES.length)],
        code: Math.random().toString(36).slice(2, 6).toUpperCase(),
        issued_at: now(), expires_at: new Date(Date.now() + RULES.PROOF_WINDOW_S * 1000).toISOString(),
      };
      db.proofs.unshift(p);
      db.proofs = db.proofs.slice(0, 300);
      audit('proof_requested', p.id, { kind, ref, challenge: p.challenge });
      save();
      return p;
    },
    async submitProof(proof, blob, meta = {}) {
      const p = db.proofs.find((x) => x.id === proof.id);
      if (!p || p.submitted_at) fail('Prova inválida.');
      if (Date.now() > new Date(p.expires_at).getTime() + 30000) { audit('proof_expired', p.id, { kind: p.kind }); save(); fail('A prova expirou. Peça uma nova.'); }
      await idbPut(p.id, blob);
      Object.assign(p, { submitted_at: now(), path: `idb:${p.id}`, meta });
      audit('proof_submitted', p.id, { kind: p.kind, seconds: Math.round((Date.now() - new Date(p.issued_at)) / 1000) });
      save();
      return p;
    },
    async proofsFor(ids) {
      const out = [];
      for (const id of ids || []) {
        const p = db.proofs.find((x) => x.id === id);
        if (!p) continue;
        const blob = await idbGet(id).catch(() => null);
        out.push({ ...p, url: blob ? URL.createObjectURL(blob) : null });
      }
      return out;
    },
    async sessionProofs(sessionId) {
      return db.proofs.filter((p) => p.kind === 'workout' && p.ref_id === sessionId);
    },

    // ---- missões
    async completeQuest(q, proofId) {
      const today = dayKey();
      if (db.activities.some((a) => a.quest_id === q.id && a.day === today)) fail('Missão já concluída hoje.');
      let status = 'self';
      if (proofId) { consumeProof(proofId, 'quest', q.id); status = 'pending'; }
      else if (q.require_proof) fail('Esta missão exige prova com foto.');
      const flags = [];
      const xp = capDaily(applyClassBonus(q.xp, q.attr, heroClass()), usedToday('quest'), RULES.QUEST_XP_DAY, flags);
      const activity = insertActivity({ kind: 'quest', title: q.title, attr: q.attr, xp, quest_id: q.id, status, flags, proof_ids: proofId ? [proofId] : [] });
      audit('quest_complete', activity.id, { quest: q.title, xp, status, flags });
      let bonus = null;
      const done = new Set(db.activities.filter((a) => a.day === today && a.quest_id).map((a) => a.quest_id));
      if (db.quests.every((x) => done.has(x.id)) && !db.activities.some((a) => a.kind === 'bonus' && a.day === today)) {
        bonus = insertActivity({ kind: 'bonus', title: 'Dia Perfeito', attr: 'DIS', xp: RULES.PERFECT_DAY_XP, status: 'auto' });
        audit('perfect_day', bonus.id);
      }
      save();
      return { activity, bonus };
    },
    async deleteActivity(id) {
      const a = db.activities.find((x) => x.id === id);
      if (!a) fail('Atividade não encontrada.');
      if (a.day !== dayKey() || !['quest', 'workout', 'meal'].includes(a.kind)) fail('Registros de dias anteriores não podem ser alterados.');
      const removed = [a.id];
      db.activities = db.activities.filter((x) => x.id !== id);
      if (a.kind === 'quest') {
        const b = db.activities.find((x) => x.kind === 'bonus' && x.day === a.day);
        if (b) { removed.push(b.id); db.activities = db.activities.filter((x) => x.id !== b.id); }
      }
      audit('activity_deleted', a.id, { kind: a.kind, title: a.title, xp: a.xp, status: a.status });
      save();
      return removed;
    },

    // ---- treinos
    async startSession({ name, attr, items }) {
      db.sessions.forEach((s) => { if (s.status === 'active') { s.status = 'abandoned'; s.finished_at = now(); } });
      const s = {
        id: uuid(), name, attr, items, status: 'active', started_at: now(),
        total_sets: items.reduce((a, i) => a + Math.min(20, Math.max(1, Number(i.sets))), 0),
      };
      db.sessions.unshift(s);
      db.sessions = db.sessions.slice(0, 100);
      audit('session_started', s.id, { name, sets: s.total_sets });
      save();
      return s;
    },
    async cancelSession(id) {
      const s = db.sessions.find((x) => x.id === id && x.status === 'active');
      if (s) { s.status = 'cancelled'; s.finished_at = now(); }
      audit('session_cancelled', id);
      save();
    },
    async finishSession(id, { intensity, sets, sensor, note, logs = [] }) {
      const s = db.sessions.find((x) => x.id === id && x.status === 'active');
      if (!s) fail('Sessão de treino não encontrada.');
      if (!sets) fail('Marque ao menos uma série.');
      const proofs = db.proofs.filter((p) => p.kind === 'workout' && p.ref_id === id && p.submitted_at && !p.used);
      const elapsedS = (Date.now() - new Date(s.started_at).getTime()) / 1000;
      const out = sessionOutcome({ elapsedS, sets, totalSets: s.total_sets, intensity, proofCount: proofs.length, sensor, attr: s.attr, heroClass: heroClass(), usedToday: usedToday('workout') });
      const activity = insertActivity({
        kind: 'workout', title: s.name.slice(0, 80), attr: s.attr, xp: out.xp, status: out.status, flags: out.flags,
        proof_ids: proofs.map((p) => p.id),
        meta: { minutes: out.minutes, intensity, routine: s.name, sets: out.sets, total_sets: s.total_sets, elapsed_s: Math.round(elapsedS), session: s.id, note: (note || '').slice(0, 40) },
      });
      proofs.forEach((p) => { p.used = true; });
      Object.assign(s, { status: 'finished', finished_at: now(), sensor, activity_id: activity.id });
      const exIds = new Set(s.items.map((i) => i.ex));
      for (const l of logs) if (exIds.has(l.ex) && l.sets?.length) db.exlogs.unshift({ exercise_id: l.ex, day: dayKey(), sets: l.sets.slice(0, 20), created_at: now() });
      db.exlogs = db.exlogs.slice(0, 2000);
      audit('session_finished', activity.id, { elapsed_s: Math.round(elapsedS), sets: out.sets, proofs: proofs.length, sensor, xp: out.xp, flags: out.flags });
      save();
      return activity;
    },
    async logQuickWorkout({ title, attr, minutes, intensity, note, proofId }) {
      if (proofId) consumeProof(proofId, 'workout', 'quick');
      const out = quickOutcome({ minutes, intensity, hasProof: Boolean(proofId), attr, heroClass: heroClass(), usedToday: usedToday('workout') });
      const activity = insertActivity({
        kind: 'workout', title, attr, xp: out.xp, status: out.status, flags: out.flags, proof_ids: proofId ? [proofId] : [],
        meta: { minutes: out.minutes, intensity, note: (note || '').slice(0, 40), quick: true },
      });
      audit('quick_workout', activity.id, { minutes_declared: minutes, xp: out.xp, status: out.status, flags: out.flags });
      save();
      return activity;
    },

    async listExerciseLogs(sinceDay) { return db.exlogs.filter((l) => l.day >= sinceDay); },

    // ---- check-in diário e exames
    async listCheckins(sinceDay) {
      return Object.entries(db.checkins).filter(([d]) => d >= sinceDay).map(([day, data]) => ({ day, data })).sort((a, b) => b.day.localeCompare(a.day));
    },
    async saveCheckin(day, data) { db.checkins[day] = data; save(); return { day, data }; },
    async listLabs() { return [...db.labs].sort((a, b) => b.taken_on.localeCompare(a.taken_on)); },
    async addLab(row) { const r = { ...row, id: uuid(), created_at: now() }; db.labs.push(r); audit('lab_added', r.id); save(); return r; },
    async deleteLab(id) { db.labs = db.labs.filter((l) => l.id !== id); save(); },
    async listWeighIns(sinceIso) { return (db.weighins ?? []).filter((w) => w.measured_at >= sinceIso).sort((a, b) => b.measured_at.localeCompare(a.measured_at)); },
    async addWeighIn(kg, source = 'manual') {
      if (!(kg >= 25 && kg <= 350)) fail('Peso fora da faixa (25 a 350 kg).');
      const row = { id: uuid(), weight_kg: kg, source, measured_at: now() };
      (db.weighins ??= []).push(row);
      save();
      return row;
    },

    // ---- nutrição e avaliação
    async mealCheckin(slot, title, proofId) {
      if (!proofId) fail('O check-in de refeição exige foto do prato.');
      const today = dayKey();
      const meals = db.activities.filter((a) => a.day === today && a.kind === 'meal');
      if (meals.some((a) => a.meta?.slot === slot)) fail('Refeição já registrada hoje.');
      if (meals.length >= RULES.MEALS_DAY) fail('Limite de refeições do dia atingido.');
      consumeProof(proofId, 'meal', slot);
      const activity = insertActivity({ kind: 'meal', title, attr: 'DIS', xp: RULES.MEAL_XP, status: 'pending', proof_ids: [proofId], meta: { slot } });
      audit('meal_checkin', activity.id, { slot });
      save();
      return activity;
    },
    async getHealth() { return db.health; },
    async saveHealth(data) {
      if (!data.consent) fail('É preciso consentir com o tratamento dos dados de saúde.');
      db.health = { user_id: 'local', data, consent_at: db.health?.consent_at ?? now(), updated_at: now() };
      audit('health_updated', 'local');
      save();
      return db.health;
    },
    async deleteHealthData() {
      db.health = null;
      db.assessments = [];
      db.labs = [];
      db.checkins = {};
      db.weighins = [];
      audit('health_deleted', 'local');
      save();
    },
    async listAssessments() { return [...db.assessments].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async addAssessment(m, proofId) {
      const sex = db.health?.data?.sex ?? 'M';
      const flags = [];
      let bf = m.bf_method === 'fita' ? null : Number(m.bf_pct) || null;
      if (m.bf_method === 'fita') {
        bf = navyBodyFat({ sex, height: m.height_cm, waist: m.waist_cm, neck: m.neck_cm, hip: m.hip_cm });
        if (bf == null) flags.push('medidas_inconsistentes');
      }
      const est = (m.estimates ?? []).filter((e) => ['peso_estimado', 'altura_estimada', 'sem_medidas'].includes(e));
      flags.push(...est);
      const sorted = [...db.assessments].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = sorted.at(-1), first = sorted[0];
      if (last && !last.flags?.includes('peso_estimado') && !est.includes('peso_estimado')) {
        const days = Math.max((Date.now() - new Date(last.created_at)) / 86400000, 0.5);
        const diff = Math.abs(m.weight_kg - last.weight_kg);
        if (days < 3) flags.push('reavaliacao_frequente');
        const tol = db.health?.data?.glp1?.med ? 0.025 : 0.015; // caneta: perda maior é esperada
        if ((diff / days) * 7 > Math.max(last.weight_kg * tol, 1.5) && diff > 1.5) flags.push('variacao_implausivel');
      }
      if (first && Math.abs(m.height_cm - first.height_cm) > 2 && !first.flags?.includes('altura_estimada') && !est.includes('altura_estimada')) flags.push('altura_alterada');
      let status = 'self';
      if (proofId) { consumeProof(proofId, 'weigh_in', 'assessment'); status = 'pending'; flags.push('peso_com_foto'); }
      else flags.push('peso_autodeclarado');
      const hm = m.height_cm / 100;
      const assessment = {
        id: uuid(), user_id: 'local', weight_kg: m.weight_kg, height_cm: m.height_cm, waist_cm: m.waist_cm || null,
        neck_cm: m.neck_cm || null, hip_cm: m.hip_cm || null, bf_method: m.bf_method, bf_pct: bf,
        bmi: Math.round((m.weight_kg / (hm * hm)) * 10) / 10, proof_id: proofId || null, flags, created_at: now(),
      };
      db.assessments.push(assessment);
      let activity = null;
      const weekAgo = Date.now() - 7 * 86400000;
      if (!est.includes('peso_estimado') && !db.activities.some((a) => a.kind === 'assessment' && new Date(a.created_at).getTime() > weekAgo)) {
        activity = insertActivity({ kind: 'assessment', title: 'Avaliação física', attr: 'VIT', xp: RULES.ASSESS_XP, status, proof_ids: proofId ? [proofId] : [] });
      }
      audit('assessment', assessment.id, { flags, method: m.bf_method });
      save();
      return { assessment, activity };
    },

    // ---- auditoria
    async auditLog(limit = 100) { return db.audit.slice(0, limit); },
    async reviewQueue() { return []; },
    async reviewActivity() { fail(OFFLINE); },

    // ---- social
    async friendships() { return { allies: [], incoming: [], outgoing: [] }; },
    async sendFriendRequest() { fail(OFFLINE); },
    async myGuild() { return null; },
    async guildPreview() { return null; },
    async createGuild() { fail(OFFLINE); },
    async joinGuild() { fail(OFFLINE); },
    async leaveGuild() { fail(OFFLINE); },
    async kickMember() { fail(OFFLINE); },
    async regenerateInvite() { fail(OFFLINE); },
    async updateGuild() { fail(OFFLINE); },
    async acceptFriend() { fail(OFFLINE); },
    async removeFriend() { fail(OFFLINE); },
    async leaderboard() { fail(OFFLINE); },
    async feed() { fail(OFFLINE); },
    async toggleKudos() { fail(OFFLINE); },

    // ---- extras do modo solo
    exportData() { return JSON.stringify(db, null, 2); },
    importData(json) {
      const data = JSON.parse(json);
      if (!data || !Array.isArray(data.activities) || !Array.isArray(data.quests)) fail('Arquivo inválido.');
      db = { ...EMPTY(), ...data };
      audit('backup_imported', 'local');
      save();
    },
    reset() { localStorage.removeItem(KEY); idbClear().catch(() => {}); db = EMPTY(); },
  };
}
