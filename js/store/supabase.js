// Store online: Supabase (Auth + Postgres com RLS). Mesma interface do store local.
// Toda pontuação passa por RPCs do servidor (ver supabase/schema.sql) — o cliente não grava XP.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const PAGE = 1000;
const BUCKET = 'evidence';

const ERRORS = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos e depois entre.'],
  [/user already registered/i, 'Este e-mail já tem conta. Use "Entrar".'],
  [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/profiles_username_key|duplicate key.*username/i, 'Esse nome de caçador já está em uso.'],
  [/code_not_found/i, 'Código de aliado não encontrado.'],
  [/self_request/i, 'Esse é o seu próprio código.'],
  [/already_done|activities_quest_day_uq/i, 'Já registrado hoje.'],
  [/proof_required/i, 'Esta ação exige prova com foto.'],
  [/proof_expired/i, 'A prova expirou (o prazo é de 3 minutos). Peça uma nova.'],
  [/proof_invalid|proof_already_sent/i, 'Prova inválida ou já utilizada.'],
  [/locked_activity/i, 'Registros de dias anteriores não podem ser alterados.'],
  [/session_not_found/i, 'Sessão de treino não encontrada (talvez iniciada em outro aparelho).'],
  [/no_sets/i, 'Marque ao menos uma série.'],
  [/meal_limit/i, 'Limite de refeições do dia atingido.'],
  [/consent_required/i, 'É preciso consentir com o tratamento dos dados de saúde.'],
  [/not_allowed/i, 'Você só pode auditar atividades de aliados.'],
  [/review_closed/i, 'Esta atividade não está mais aberta para auditoria.'],
  [/already_in_guild/i, 'Você já está em uma guild. Saia dela para criar ou entrar em outra.'],
  [/invite_invalid/i, 'Convite inválido ou expirado. Peça um link novo ao líder.'],
  [/guild_full/i, 'Essa guild está cheia (limite de membros).'],
  [/not_leader/i, 'Só o líder da guild pode fazer isso.'],
  [/not_in_guild/i, 'Você não está em nenhuma guild.'],
  [/guilds_name_key/i, 'Já existe uma guild com esse nome.'],
  [/guilds_tag_check/i, 'A TAG deve ter de 2 a 5 letras ou números.'],
  [/guilds_name_check/i, 'O nome da guild deve ter de 3 a 30 caracteres.'],
  [/rate_limited|rate limit/i, 'Muitas tentativas. Aguarde um pouco.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor.'],
];

function humanize(err) {
  const msg = err?.message || String(err);
  const hit = ERRORS.find(([re]) => re.test(msg));
  return new Error(hit ? hit[1] : msg);
}

function unwrap({ data, error }) {
  if (error) throw humanize(error);
  return data;
}

const PROFILE_COLS = 'id,username,hero_class,avatar';

/** Linha de missão com todas as colunas — lotes do PostgREST exigem as mesmas chaves em todos os objetos. */
export const questRow = (q) => ({
  title: q.title, attr: q.attr, target: q.target ?? 1, unit: q.unit ?? '', xp: q.xp, sort: q.sort ?? 0,
  exercise_id: q.exercise_id || null, require_proof: Boolean(q.require_proof),
});

export async function createSupabaseStore({ url, key }) {
  const { createClient } = await import(SDK_URL);
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  let uid = null;
  const rpc = async (fn, args) => unwrap(await sb.rpc(fn, args));

  const setSession = (s) => { uid = s?.user?.id ?? null; return s; };

  async function signedUrls(proofs) {
    const paths = proofs.filter((p) => p.path).map((p) => p.path);
    if (!paths.length) return proofs;
    const signed = unwrap(await sb.storage.from(BUCKET).createSignedUrls(paths, 3600));
    const byPath = Object.fromEntries(signed.map((s) => [s.path, s.signedUrl]));
    return proofs.map((p) => ({ ...p, url: byPath[p.path] ?? null }));
  }

  return {
    mode: 'online',

    async session() { return setSession(unwrap(await sb.auth.getSession()).session); },
    onAuthChange(cb) { sb.auth.onAuthStateChange((_e, s) => { setSession(s); cb(s); }); },
    async signIn(email, password) {
      return setSession(unwrap(await sb.auth.signInWithPassword({ email, password })).session);
    },
    async signUp(email, password) {
      const data = unwrap(await sb.auth.signUp({
        email, password, options: { emailRedirectTo: location.origin + location.pathname },
      }));
      return setSession(data.session); // null = precisa confirmar e-mail
    },
    async signOut() { await sb.auth.signOut(); uid = null; },

    async getProfile() {
      return unwrap(await sb.from('profiles').select('*').eq('id', uid).maybeSingle());
    },
    async createProfile(p) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await sb.from('profiles').insert({ id: uid, tz, ...p }).select().single();
      if (res.error?.code === '23505' && /profiles_pkey/.test(res.error.message)) {
        return unwrap(await sb.from('profiles').select('*').eq('id', uid).single()); // já criado antes
      }
      return unwrap(res);
    },
    async updateProfile(patch) {
      return unwrap(await sb.from('profiles').update(patch).eq('id', uid).select().single());
    },

    // ---- configuração (não pontua)
    async listQuests() {
      return unwrap(await sb.from('quests').select('*').eq('user_id', uid).order('sort'));
    },
    async saveQuest(q) {
      const row = questRow(q);
      return q.id
        ? unwrap(await sb.from('quests').update(row).eq('id', q.id).select().single())
        : unwrap(await sb.from('quests').insert(row).select().single());
    },
    async saveQuests(list) {
      return unwrap(await sb.from('quests').insert(list.map(questRow)).select());
    },
    async deleteQuest(id) { unwrap(await sb.from('quests').delete().eq('id', id)); },
    async listRoutines() {
      return unwrap(await sb.from('routines').select('*').eq('user_id', uid).order('sort').order('created_at'));
    },
    async saveRoutine(r) {
      const row = { name: r.name, attr: r.attr, items: r.items, sort: r.sort ?? 0 };
      return r.id
        ? unwrap(await sb.from('routines').update(row).eq('id', r.id).select().single())
        : unwrap(await sb.from('routines').insert(row).select().single());
    },
    async deleteRoutine(id) { unwrap(await sb.from('routines').delete().eq('id', id)); },

    // ---- leitura
    async listActivities(sinceDay) {
      const out = [];
      for (let from = 0; ; from += PAGE) {
        const rows = unwrap(await sb.from('activities').select('*')
          .eq('user_id', uid).gte('day', sinceDay)
          .order('created_at', { ascending: false }).range(from, from + PAGE - 1));
        out.push(...rows);
        if (rows.length < PAGE) return out;
      }
    },
    async totals() { return rpc('my_totals'); },

    // ---- provas
    requestProof: (kind, ref) => rpc('request_proof', { p_kind: kind, p_ref: String(ref) }),
    async submitProof(proof, blob, meta = {}) {
      const path = `${uid}/${proof.id}.jpg`;
      unwrap(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
      const row = await rpc('submit_proof', { p_id: proof.id, p_path: path, p_meta: meta });
      if (!row.submitted_at) throw humanize({ message: 'proof_expired' });
      return row;
    },
    async proofsFor(ids) {
      if (!ids?.length) return [];
      const rows = unwrap(await sb.from('proofs').select('*').in('id', ids));
      return signedUrls(rows);
    },
    async sessionProofs(sessionId) {
      return unwrap(await sb.from('proofs').select('*').eq('user_id', uid).eq('kind', 'workout').eq('ref_id', sessionId));
    },

    // ---- pontuação (tudo no servidor)
    completeQuest: (q, proofId) => rpc('complete_quest', { p_quest: q.id, p_proof: proofId ?? null }),
    deleteActivity: (id) => rpc('delete_activity', { p_id: id }),
    startSession: ({ name, attr, items }) => rpc('start_session', { p_name: name, p_attr: attr, p_items: items }),
    cancelSession: (id) => rpc('cancel_session', { p_id: id }),
    finishSession: (id, { intensity, sets, sensor, note, logs }) =>
      rpc('finish_session', { p_id: id, p_intensity: intensity, p_sets: sets, p_sensor: sensor, p_note: note ?? null, p_logs: logs ?? [] }),
    async listExerciseLogs(sinceDay) {
      return unwrap(await sb.from('exercise_logs').select('exercise_id,day,sets,created_at').eq('user_id', uid)
        .gte('day', sinceDay).order('created_at', { ascending: false }).limit(1000));
    },

    // ---- check-in diário e exames (dados de saúde, só o titular)
    async listCheckins(sinceDay) {
      return unwrap(await sb.from('daily_checkins').select('day,data').eq('user_id', uid).gte('day', sinceDay).order('day', { ascending: false }));
    },
    async saveCheckin(day, data) {
      return unwrap(await sb.from('daily_checkins').upsert({ user_id: uid, day, data, updated_at: new Date().toISOString() }).select('day,data').single());
    },
    async listLabs() {
      return unwrap(await sb.from('lab_results').select('*').eq('user_id', uid).order('taken_on', { ascending: false }));
    },
    async addLab(row) { return unwrap(await sb.from('lab_results').insert(row).select().single()); },
    async deleteLab(id) { unwrap(await sb.from('lab_results').delete().eq('id', id)); },
    logQuickWorkout: ({ title, attr, minutes, intensity, note, proofId }) =>
      rpc('log_quick_workout', { p_title: title, p_attr: attr, p_minutes: minutes, p_intensity: intensity, p_note: note ?? null, p_proof: proofId ?? null }),
    mealCheckin: (slot, title, proofId) => rpc('meal_checkin', { p_slot: slot, p_title: title, p_proof: proofId }),

    // ---- saúde (somente o titular lê)
    async getHealth() { return unwrap(await sb.from('health_profiles').select('*').eq('user_id', uid).maybeSingle()); },
    saveHealth: (data) => rpc('save_health', { p_data: data }),
    deleteHealthData: () => rpc('delete_health_data'),
    async listAssessments() {
      return unwrap(await sb.from('body_assessments').select('*').eq('user_id', uid).order('created_at', { ascending: false }));
    },
    addAssessment: (m, proofId) => rpc('add_assessment', { p: m, p_proof: proofId ?? null }),

    // ---- auditoria
    async auditLog(limit = 100) {
      return unwrap(await sb.from('audit_log').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(limit));
    },
    async reviewQueue() {
      const rows = await rpc('review_queue');
      return Promise.all(rows.map(async (r) => ({ ...r, proofs: await signedUrls(r.proofs || []) })));
    },
    reviewActivity: (id, verdict, reason) => rpc('review_activity', { p_activity: id, p_verdict: verdict, p_reason: reason ?? null }),

    // ---- social
    async friendships() {
      const rows = unwrap(await sb.from('friendships').select(
        `requester,addressee,status,created_at,
         req:profiles!friendships_requester_fkey(${PROFILE_COLS}),
         adr:profiles!friendships_addressee_fkey(${PROFILE_COLS})`));
      const res = { allies: [], incoming: [], outgoing: [] };
      for (const f of rows) {
        const mine = f.requester === uid;
        const other = mine ? f.adr : f.req;
        if (!other) continue;
        if (f.status === 'accepted') res.allies.push(other);
        else (mine ? res.outgoing : res.incoming).push(other);
      }
      return res;
    },
    sendFriendRequest: (code) => rpc('send_friend_request', { p_code: code }),

    // ---- guilds
    myGuild: (since) => rpc('my_guild', { p_since: since }),
    guildPreview: (code) => rpc('guild_preview', { p_code: code }),
    createGuild: (name, tag, emblem) => rpc('create_guild', { p_name: name, p_tag: tag, p_emblem: emblem }),
    joinGuild: (code) => rpc('join_guild', { p_code: code }),
    leaveGuild: () => rpc('leave_guild'),
    kickMember: (userId) => rpc('kick_member', { p_user: userId }),
    regenerateInvite: () => rpc('regenerate_invite'),
    updateGuild: (name, tag, emblem) => rpc('update_guild', { p_name: name, p_tag: tag, p_emblem: emblem }),
    async acceptFriend(otherId) {
      unwrap(await sb.from('friendships').update({ status: 'accepted' }).eq('requester', otherId).eq('addressee', uid));
    },
    async removeFriend(otherId) {
      unwrap(await sb.from('friendships').delete()
        .or(`and(requester.eq.${uid},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${uid})`));
    },
    leaderboard: (sinceDay) => rpc('friend_leaderboard', { p_since: sinceDay }),
    async feed(limit = 40) {
      const rows = unwrap(await sb.from('activities')
        .select(`id,user_id,kind,title,attr,xp,day,created_at,meta,status,flags,proof_ids,
                 profile:profiles!activities_user_id_fkey(${PROFILE_COLS}), kudos(user_id)`)
        .neq('kind', 'assessment')
        .order('created_at', { ascending: false }).limit(limit));
      return rows.map((r) => ({
        ...r,
        kudosCount: r.kudos.length,
        kudosMine: r.kudos.some((k) => k.user_id === uid),
        isMe: r.user_id === uid,
      }));
    },
    async toggleKudos(activityId, on) {
      if (on) unwrap(await sb.from('kudos').insert({ activity_id: activityId }));
      else unwrap(await sb.from('kudos').delete().eq('activity_id', activityId).eq('user_id', uid));
    },
  };
}
