-- =====================================================================
--  ASCEND — schema Supabase (Postgres)
--  Cole TUDO no Supabase > SQL Editor > New query > Run (projeto novo).
--
--  PRINCÍPIO ANTIFRAUDE: o cliente NUNCA grava XP diretamente.
--  Toda pontuação passa por funções (RPC) SECURITY DEFINER que:
--    • usam o RELÓGIO DO SERVIDOR (duração de treino, janela de prova, "dia");
--    • calculam o XP no servidor (regras espelhadas em js/rules.js);
--    • exigem prova fotográfica ao vivo, enviada dentro da janela sorteada;
--    • aplicam limites diários e checagens de plausibilidade;
--    • registram tudo em audit_log (somente inserção — ninguém edita/apaga).
-- =====================================================================

-- ---------- Tabelas ---------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text not null unique check (char_length(username) between 3 and 20),
  hero_class  text not null default 'guerreiro'
              check (hero_class in ('guerreiro','assassino','tita','arcano','monge')),
  avatar      text not null default 'bolt' check (char_length(avatar) <= 20),
  friend_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  tz          text not null default 'America/Sao_Paulo',
  created_at  timestamptz not null default now()
);

create table if not exists public.quests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles on delete cascade,
  title         text not null check (char_length(title) between 1 and 60),
  attr          text not null check (attr in ('STR','AGI','VIT','INT','DIS')),
  target        int  not null default 1 check (target between 1 and 100000),
  unit          text not null default '' check (char_length(unit) <= 20),
  xp            int  not null check (xp between 5 and 200),
  exercise_id   text check (char_length(exercise_id) <= 120),
  require_proof boolean not null default false,
  sort          int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists quests_user_idx on public.quests(user_id);

-- Fichas de treino personalizadas. items = [{ex, name, sets, reps, rest}]
create table if not exists public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  attr       text not null default 'STR' check (attr in ('STR','AGI','VIT','INT','DIS')),
  items      jsonb not null default '[]'::jsonb
             check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 40),
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists routines_user_idx on public.routines(user_id);

-- status: auto (sistema) · self (autodeclarado, sem prova) · pending (prova enviada, aguardando auditoria)
--         verified (aprovado por aliado) · rejected (reprovado por aliados → XP zerado)
create table if not exists public.activities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  kind       text not null check (kind in ('quest','workout','bonus','meal','assessment')),
  title      text not null check (char_length(title) between 1 and 80),
  attr       text not null check (attr in ('STR','AGI','VIT','INT','DIS')),
  xp         int  not null check (xp between 0 and 500),
  base_xp    int  not null default 0,
  quest_id   uuid references public.quests on delete set null,
  day        date not null,
  status     text not null default 'self' check (status in ('auto','self','pending','verified','rejected')),
  flags      text[] not null default '{}',
  proof_ids  uuid[] not null default '{}',
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activities_user_day_idx on public.activities(user_id, day desc);
create index if not exists activities_created_idx on public.activities(created_at desc);
create unique index if not exists activities_quest_day_uq
  on public.activities(user_id, quest_id, day) where quest_id is not null;
create unique index if not exists activities_bonus_day_uq
  on public.activities(user_id, day) where kind = 'bonus';

create table if not exists public.friendships (
  requester  uuid not null references public.profiles on delete cascade,
  addressee  uuid not null references public.profiles on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee_idx on public.friendships(addressee);

-- Guilds: grupos com link de convite. Membros da mesma guild são aliados entre si
-- (veem atividades, disputam ranking e auditam provas uns dos outros).
create table if not exists public.guilds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 3 and 30),
  tag         text not null check (tag ~ '^[A-Z0-9]{2,5}$'),
  emblem      text not null default 'shield' check (char_length(emblem) <= 20),
  owner_id    uuid not null references public.profiles on delete cascade,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  max_members int  not null default 30 check (max_members between 2 and 30),
  created_at  timestamptz not null default now()
);

create table if not exists public.guild_members (
  guild_id  uuid not null references public.guilds on delete cascade,
  user_id   uuid not null unique references public.profiles on delete cascade, -- 1 guild por pessoa
  role      text not null default 'membro' check (role in ('lider','membro')),
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);
create index if not exists guild_members_guild_idx on public.guild_members(guild_id);

create table if not exists public.kudos (
  activity_id uuid not null references public.activities on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- Sessões de treino: início marcado pelo relógio do servidor.
create table if not exists public.workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  attr        text not null check (attr in ('STR','AGI','VIT','INT','DIS')),
  items       jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  total_sets  int  not null check (total_sets between 1 and 400),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'active' check (status in ('active','finished','cancelled','abandoned')),
  sensor      jsonb not null default '{}'::jsonb,
  activity_id uuid references public.activities on delete set null
);
create index if not exists sessions_user_idx on public.workout_sessions(user_id, started_at desc);

-- Provas fotográficas: desafio sorteado pelo servidor + janela curta para envio.
create table if not exists public.proofs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  kind         text not null check (kind in ('workout','quest','meal','weigh_in')),
  ref_id       text not null,
  challenge    text not null,
  code         text not null,
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  submitted_at timestamptz,
  path         text,
  used         boolean not null default false,
  meta         jsonb not null default '{}'::jsonb
);
create index if not exists proofs_user_idx on public.proofs(user_id, issued_at desc);
create index if not exists proofs_ref_idx on public.proofs(ref_id);

-- Auditoria entre aliados.
create table if not exists public.verifications (
  activity_id uuid not null references public.activities on delete cascade,
  verifier_id uuid not null references public.profiles on delete cascade,
  verdict     text not null check (verdict in ('approve','reject')),
  reason      text check (char_length(reason) <= 120),
  created_at  timestamptz not null default now(),
  primary key (activity_id, verifier_id)
);

-- Trilha de auditoria: SOMENTE INSERÇÃO, e só pelas funções do servidor.
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  event      text not null,
  entity     text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_user_idx on public.audit_log(user_id, created_at desc);

-- Dados de saúde (LGPD art. 11 — sensíveis): visíveis SOMENTE ao titular.
create table if not exists public.health_profiles (
  user_id       uuid primary key references public.profiles on delete cascade,
  data          jsonb not null,           -- sexo, nascimento, altura, rotina, objetivo, PAR-Q, dieta…
  consent_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

-- Avaliações físicas: histórico imutável (não se reescreve o passado).
create table if not exists public.body_assessments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  weight_kg  numeric(5,2) not null check (weight_kg between 25 and 350),
  height_cm  numeric(5,1) not null check (height_cm between 100 and 240),
  waist_cm   numeric(5,1) check (waist_cm between 35 and 250),
  neck_cm    numeric(4,1) check (neck_cm between 15 and 80),
  hip_cm     numeric(5,1) check (hip_cm between 40 and 250),
  bf_method  text not null check (bf_method in ('fita','bioimpedancia','dexa','nenhum')),
  bf_pct     numeric(4,1) check (bf_pct between 2 and 70),
  bmi        numeric(4,1) not null,
  proof_id   uuid references public.proofs on delete set null,
  flags      text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists assessments_user_idx on public.body_assessments(user_id, created_at desc);

-- Cargas por exercício (progressão). sets = [{kg, reps}]. Gravado pelo finish_session.
create table if not exists public.exercise_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  session_id  uuid references public.workout_sessions on delete set null,
  exercise_id text not null check (char_length(exercise_id) <= 120),
  day         date not null,
  sets        jsonb not null check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) <= 20),
  created_at  timestamptz not null default now()
);
create index if not exists exercise_logs_idx on public.exercise_logs(user_id, exercise_id, day desc);

-- Check-in diário (sono e prontidão) — dado de saúde, só o titular.
create table if not exists public.daily_checkins (
  user_id    uuid not null references public.profiles on delete cascade,
  day        date not null,
  data       jsonb not null,   -- {sleep_h, sleep_q, energy, stress, soreness, steps}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Pesagens rápidas do dia a dia (manual ou balança Bluetooth) — só o titular. Não pontuam.
create table if not exists public.weigh_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles on delete cascade,
  weight_kg   numeric(5,2) not null check (weight_kg between 25 and 350),
  source      text not null default 'manual' check (source in ('manual','bluetooth')),
  measured_at timestamptz not null default now()
);
create index if not exists weigh_ins_user_idx on public.weigh_ins(user_id, measured_at desc);

-- Exames laboratoriais — dado de saúde sensível, só o titular.
create table if not exists public.lab_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  taken_on   date not null,
  lab        text check (char_length(lab) <= 80),
  values     jsonb not null,   -- {marcador: {v, min?, max?}}
  created_at timestamptz not null default now()
);
create index if not exists lab_results_idx on public.lab_results(user_id, taken_on desc);

-- Bucket privado das provas (fotos JPEG até 1 MB; sem update/delete = imutáveis).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- ---------- Funções auxiliares ----------------------------------------

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    exists (
      select 1 from friendships
      where status = 'accepted'
        and ((requester = a and addressee = b) or (requester = b and addressee = a)))
    or exists (
      select 1 from guild_members ga join guild_members gb on gb.guild_id = ga.guild_id
      where ga.user_id = a and gb.user_id = b)
  );
$$;

-- "Hoje" no fuso do jogador, pelo relógio do servidor.
create or replace function public.user_today(u uuid default auth.uid())
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select tz from profiles where id = u), 'America/Sao_Paulo'))::date;
$$;

create or replace function public.profiles_tz_guard()
returns trigger language plpgsql set search_path = public, pg_catalog as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.tz) then
    new.tz := 'America/Sao_Paulo';
  end if;
  return new;
end $$;
drop trigger if exists profiles_tz_guard on public.profiles;
create trigger profiles_tz_guard before insert or update of tz on public.profiles
  for each row execute function public.profiles_tz_guard();

-- Bônus de classe (+10% no atributo da classe). Espelha applyClassBonus() em js/game.js.
create or replace function public.class_xp(p_xp int, p_attr text, u uuid)
returns int language sql stable security definer set search_path = public as $$
  select case (select hero_class from profiles where id = u)
    when 'guerreiro' then case when p_attr = 'STR' then round(p_xp * 1.1)::int else p_xp end
    when 'assassino' then case when p_attr = 'AGI' then round(p_xp * 1.1)::int else p_xp end
    when 'tita'      then case when p_attr = 'VIT' then round(p_xp * 1.1)::int else p_xp end
    when 'arcano'    then case when p_attr = 'INT' then round(p_xp * 1.1)::int else p_xp end
    when 'monge'     then case when p_attr = 'DIS' then round(p_xp * 1.1)::int else p_xp end
    else p_xp end;
$$;

create or replace function public.intensity_mult(p text)
returns numeric language sql immutable set search_path = public, pg_catalog as $$
  select case p when 'leve' then 1.0 when 'moderada' then 1.5 when 'intensa' then 2.2 end;
$$;

-- Grava evento de auditoria. NÃO é exposto aos clientes (só chamado pelas RPCs).
create or replace function public.audit_event(u uuid, p_event text, p_entity text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log(user_id, event, entity, data) values (u, p_event, p_entity, coalesce(p_data, '{}'::jsonb));
$$;

-- Valida e consome uma prova (uso único).
create or replace function public.consume_proof(p_id uuid, p_kind text, p_ref text)
returns proofs language plpgsql security definer set search_path = public as $$
declare pr proofs;
begin
  select * into pr from proofs where id = p_id and user_id = auth.uid() for update;
  if not found or pr.kind <> p_kind or (p_ref is not null and pr.ref_id <> p_ref)
     or pr.submitted_at is null or pr.used then
    raise exception 'proof_invalid';
  end if;
  update proofs set used = true where id = p_id;
  return pr;
end $$;

-- ---------- RPC: provas -------------------------------------------------

create or replace function public.request_proof(p_kind text, p_ref text)
returns proofs language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  gestures text[] := array[
    'Mostre 2 dedos (✌️) para a câmera', 'Faça joinha (👍) com a mão', 'Mostre a mão aberta (5 dedos)',
    'Mostre o punho fechado', 'Aponte o indicador para cima', 'Faça "ok" (👌) com a mão',
    'Mostre 3 dedos', 'Coloque uma mão na cabeça', 'Mostre 4 dedos', 'Faça sinal de "hang loose" (🤙)'];
  pr proofs;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('workout','quest','meal','weigh_in') then raise exception 'invalid_kind'; end if;
  if (select count(*) from proofs where user_id = me and issued_at > now() - interval '1 hour') >= 40 then
    raise exception 'rate_limited';
  end if;
  insert into proofs(user_id, kind, ref_id, challenge, code, expires_at)
  values (me, p_kind, left(p_ref, 120), gestures[1 + floor(random() * array_length(gestures, 1))::int],
          upper(substr(md5(gen_random_uuid()::text), 1, 4)), now() + interval '3 minutes')
  returning * into pr;
  perform audit_event(me, 'proof_requested', pr.id::text, jsonb_build_object('kind', p_kind, 'ref', p_ref, 'challenge', pr.challenge));
  return pr;
end $$;

-- A foto precisa já estar no Storage: o servidor confere que o arquivo foi CRIADO
-- dentro da janela (created_at do próprio Storage), então não dá para usar foto antiga.
create or replace function public.submit_proof(p_id uuid, p_path text, p_meta jsonb default '{}')
returns proofs language plpgsql security definer set search_path = public, storage as $$
declare me uuid := auth.uid(); pr proofs; obj_created timestamptz;
begin
  select * into pr from proofs where id = p_id and user_id = me for update;
  if not found then raise exception 'proof_invalid'; end if;
  if pr.submitted_at is not null then raise exception 'proof_already_sent'; end if;
  if now() > pr.expires_at + interval '30 seconds' then
    -- Sem RAISE: um erro desfaria a transação e apagaria o registro da tentativa na auditoria.
    -- Devolve a prova NÃO enviada (submitted_at nulo) e o cliente trata como expirada.
    update proofs set meta = meta || '{"expired": true}'::jsonb where id = p_id returning * into pr;
    perform audit_event(me, 'proof_expired', pr.id::text, jsonb_build_object('kind', pr.kind));
    return pr;
  end if;
  if p_path <> me::text || '/' || p_id::text || '.jpg' then raise exception 'proof_invalid'; end if;
  select created_at into obj_created from storage.objects where bucket_id = 'evidence' and name = p_path;
  if obj_created is null or obj_created < pr.issued_at then raise exception 'proof_invalid'; end if;
  update proofs set submitted_at = now(), path = p_path, meta = coalesce(p_meta, '{}'::jsonb)
  where id = p_id returning * into pr;
  perform audit_event(me, 'proof_submitted', pr.id::text,
    jsonb_build_object('kind', pr.kind, 'seconds', round(extract(epoch from pr.submitted_at - pr.issued_at))));
  return pr;
end $$;

-- ---------- RPC: missões -----------------------------------------------

create or replace function public.complete_quest(p_quest uuid, p_proof uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); today date := public.user_today(); q quests; act activities; bon activities;
  v_xp int; v_status text := 'self'; v_flags text[] := '{}'; v_used int;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into q from quests where id = p_quest and user_id = me;
  if not found then raise exception 'quest_not_found'; end if;
  if exists (select 1 from activities where user_id = me and quest_id = q.id and day = today) then
    raise exception 'already_done';
  end if;
  if p_proof is not null then
    perform consume_proof(p_proof, 'quest', q.id::text);
    v_status := 'pending';
  elsif q.require_proof then
    raise exception 'proof_required';
  end if;

  v_xp := class_xp(q.xp, q.attr, me);
  select coalesce(sum(xp), 0) into v_used from activities where user_id = me and day = today and kind = 'quest';
  if v_used + v_xp > 400 then v_xp := greatest(0, 400 - v_used); v_flags := array_append(v_flags, 'limite_diario'); end if;

  insert into activities(user_id, kind, title, attr, xp, base_xp, quest_id, day, status, flags, proof_ids)
  values (me, 'quest', q.title, q.attr, v_xp, v_xp, q.id, today, v_status, v_flags,
          case when p_proof is null then '{}'::uuid[] else array[p_proof] end)
  returning * into act;
  perform audit_event(me, 'quest_complete', act.id::text,
    jsonb_build_object('quest', q.title, 'xp', v_xp, 'status', v_status, 'flags', v_flags));

  if not exists (
       select 1 from quests q2 where q2.user_id = me
       and not exists (select 1 from activities a where a.user_id = me and a.quest_id = q2.id and a.day = today))
     and not exists (select 1 from activities where user_id = me and kind = 'bonus' and day = today) then
    insert into activities(user_id, kind, title, attr, xp, base_xp, day, status)
    values (me, 'bonus', 'Dia Perfeito', 'DIS', 50, 50, today, 'auto') returning * into bon;
    perform audit_event(me, 'perfect_day', bon.id::text, '{}');
  end if;

  return json_build_object('activity', row_to_json(act),
                           'bonus', case when bon.id is null then null else row_to_json(bon) end);
end $$;

-- Desfaz atividade de HOJE (missão, treino ou refeição). O passado é imutável.
create or replace function public.delete_activity(p_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a activities; removed uuid[] := '{}'; b uuid;
begin
  select * into a from activities where id = p_id and user_id = me;
  if not found then raise exception 'not_found'; end if;
  if a.day <> public.user_today() or a.kind not in ('quest','workout','meal') then
    raise exception 'locked_activity';
  end if;
  delete from activities where id = a.id;
  removed := array[a.id];
  if a.kind = 'quest' then
    delete from activities where user_id = me and kind = 'bonus' and day = a.day returning id into b;
    if b is not null then removed := removed || b; end if;
  end if;
  perform audit_event(me, 'activity_deleted', a.id::text,
    jsonb_build_object('kind', a.kind, 'title', a.title, 'xp', a.xp, 'status', a.status));
  return removed;
end $$;

-- ---------- RPC: treinos --------------------------------------------------

create or replace function public.start_session(p_name text, p_attr text, p_items jsonb)
returns workout_sessions language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s workout_sessions; v_total int;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select coalesce(sum(least(greatest((i->>'sets')::int, 1), 20)), 0) into v_total from jsonb_array_elements(p_items) i;
  update workout_sessions set status = 'abandoned', finished_at = now()
  where user_id = me and status = 'active';
  insert into workout_sessions(user_id, name, attr, items, total_sets)
  values (me, left(p_name, 80), p_attr, p_items, v_total) returning * into s;
  perform audit_event(me, 'session_started', s.id::text, jsonb_build_object('name', s.name, 'sets', v_total));
  return s;
end $$;

create or replace function public.cancel_session(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update workout_sessions set status = 'cancelled', finished_at = now()
  where id = p_id and user_id = auth.uid() and status = 'active';
  perform audit_event(auth.uid(), 'session_cancelled', p_id::text, '{}');
end $$;

drop function if exists public.finish_session(uuid, text, int, jsonb, text);
create or replace function public.finish_session(p_id uuid, p_intensity text, p_sets int, p_sensor jsonb, p_note text default null,
                                                 p_logs jsonb default '[]')
returns activities language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); today date := public.user_today(); s workout_sessions; act activities;
  elapsed_s numeric; v_min int; v_sets int; v_xp int; factor numeric := 1; v_flags text[] := '{}';
  v_status text := 'pending'; pids uuid[]; v_used int;
begin
  select * into s from workout_sessions where id = p_id and user_id = me and status = 'active' for update;
  if not found then raise exception 'session_not_found'; end if;
  if intensity_mult(p_intensity) is null then raise exception 'invalid_intensity'; end if;

  elapsed_s := extract(epoch from now() - s.started_at);
  v_min := least(180, greatest(1, round(elapsed_s / 60)))::int;
  v_sets := least(greatest(coalesce(p_sets, 0), 0), s.total_sets);
  if v_sets = 0 then raise exception 'no_sets'; end if;
  if elapsed_s > 180 * 60 then v_flags := array_append(v_flags, 'duracao_limitada'); end if;

  -- Plausibilidade: menos de 30 s por série (execução + descanso) é humanamente improvável.
  if elapsed_s < v_sets * 30 then v_flags := array_append(v_flags, 'series_rapidas'); factor := factor * 0.5; end if;

  select coalesce(array_agg(id), '{}') into pids from proofs
  where user_id = me and kind = 'workout' and ref_id = p_id::text and submitted_at is not null and not used;
  if coalesce(array_length(pids, 1), 0) = 0 then
    v_flags := array_append(v_flags, 'sem_prova'); factor := factor * 0.5; v_status := 'self';
  elsif array_length(pids, 1) < 2 then
    v_flags := array_append(v_flags, 'prova_parcial');
  end if;
  if coalesce((p_sensor->>'supported')::boolean, false) and coalesce((p_sensor->>'active_ratio')::numeric, 1) < 0.1 then
    v_flags := array_append(v_flags, 'celular_parado');
  end if;

  v_xp := least(300, greatest(5, round(v_min * intensity_mult(p_intensity))))::int;
  v_xp := class_xp(v_xp, s.attr, me);
  v_xp := round(v_xp * factor * (0.5 + 0.5 * v_sets::numeric / s.total_sets))::int;

  select coalesce(sum(xp), 0) into v_used from activities where user_id = me and day = today and kind = 'workout';
  if v_used + v_xp > 450 then v_xp := greatest(0, 450 - v_used); v_flags := array_append(v_flags, 'limite_diario'); end if;

  insert into activities(user_id, kind, title, attr, xp, base_xp, day, status, flags, proof_ids, meta)
  values (me, 'workout', s.name, s.attr, v_xp, v_xp, today, v_status, v_flags, pids,
          jsonb_build_object('minutes', v_min, 'intensity', p_intensity, 'routine', s.name, 'sets', v_sets,
                             'total_sets', s.total_sets, 'elapsed_s', round(elapsed_s), 'session', s.id,
                             'note', left(coalesce(p_note, ''), 40)))
  returning * into act;
  update proofs set used = true where id = any(pids);
  update workout_sessions set status = 'finished', finished_at = now(), sensor = coalesce(p_sensor, '{}'::jsonb),
         activity_id = act.id where id = s.id;
  -- cargas por exercício (só de exercícios que existem na sessão; no máx. 20 séries cada)
  insert into exercise_logs(user_id, session_id, exercise_id, day, sets)
  select me, s.id, l->>'ex', today, l->'sets'
  from jsonb_array_elements(coalesce(p_logs, '[]'::jsonb)) l
  where jsonb_typeof(l->'sets') = 'array' and jsonb_array_length(l->'sets') between 1 and 20
    and exists (select 1 from jsonb_array_elements(s.items) i where i->>'ex' = l->>'ex');
  perform audit_event(me, 'session_finished', act.id::text,
    jsonb_build_object('elapsed_s', round(elapsed_s), 'sets', v_sets, 'proofs', coalesce(array_length(pids, 1), 0),
                       'sensor', p_sensor, 'xp', v_xp, 'flags', v_flags));
  return act;
end $$;

-- Registro rápido (sem sessão): duração declarada, limitada e com XP menor sem prova.
create or replace function public.log_quick_workout(p_title text, p_attr text, p_minutes int, p_intensity text,
                                                    p_note text default null, p_proof uuid default null)
returns activities language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); today date := public.user_today(); act activities;
  v_min int := least(greatest(coalesce(p_minutes, 0), 1), 90); v_xp int; v_flags text[] := '{}';
  v_status text := 'pending'; factor numeric := 1; v_used int;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if intensity_mult(p_intensity) is null then raise exception 'invalid_intensity'; end if;
  if p_minutes > 90 then v_flags := array_append(v_flags, 'duracao_limitada'); end if;
  if p_proof is null then
    v_status := 'self'; factor := 0.5; v_flags := array_append(v_flags, 'sem_prova');
  else
    perform consume_proof(p_proof, 'workout', 'quick');
  end if;
  v_xp := least(300, greatest(5, round(v_min * intensity_mult(p_intensity))))::int;
  v_xp := round(class_xp(v_xp, p_attr, me) * factor)::int;
  select coalesce(sum(xp), 0) into v_used from activities where user_id = me and day = today and kind = 'workout';
  if v_used + v_xp > 450 then v_xp := greatest(0, 450 - v_used); v_flags := array_append(v_flags, 'limite_diario'); end if;
  insert into activities(user_id, kind, title, attr, xp, base_xp, day, status, flags, proof_ids, meta)
  values (me, 'workout', left(p_title, 80), p_attr, v_xp, v_xp, today, v_status, v_flags,
          case when p_proof is null then '{}'::uuid[] else array[p_proof] end,
          jsonb_build_object('minutes', v_min, 'intensity', p_intensity, 'note', left(coalesce(p_note, ''), 40), 'quick', true))
  returning * into act;
  perform audit_event(me, 'quick_workout', act.id::text,
    jsonb_build_object('minutes_declared', p_minutes, 'xp', v_xp, 'status', v_status, 'flags', v_flags));
  return act;
end $$;

-- ---------- RPC: nutrição e avaliação ----------------------------------------

create or replace function public.meal_checkin(p_slot text, p_title text, p_proof uuid)
returns activities language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := public.user_today(); act activities;
begin
  if p_proof is null then raise exception 'proof_required'; end if;
  if exists (select 1 from activities where user_id = me and day = today and kind = 'meal' and meta->>'slot' = p_slot) then
    raise exception 'already_done';
  end if;
  if (select count(*) from activities where user_id = me and day = today and kind = 'meal') >= 6 then
    raise exception 'meal_limit';
  end if;
  perform consume_proof(p_proof, 'meal', p_slot);
  insert into activities(user_id, kind, title, attr, xp, base_xp, day, status, proof_ids, meta)
  values (me, 'meal', left(p_title, 80), 'DIS', 10, 10, today, 'pending', array[p_proof], jsonb_build_object('slot', p_slot))
  returning * into act;
  perform audit_event(me, 'meal_checkin', act.id::text, jsonb_build_object('slot', p_slot));
  return act;
end $$;

create or replace function public.save_health(p_data jsonb)
returns health_profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h health_profiles;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if coalesce((p_data->>'consent')::boolean, false) is not true then raise exception 'consent_required'; end if;
  insert into health_profiles(user_id, data, consent_at) values (me, p_data, now())
  on conflict (user_id) do update set data = excluded.data, updated_at = now()
  returning * into h;
  perform audit_event(me, 'health_updated', me::text, '{}');
  return h;
end $$;

-- Revogação do consentimento (LGPD art. 18, VI): apaga perfil de saúde e avaliações do titular.
create or replace function public.delete_health_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from body_assessments where user_id = auth.uid();
  delete from health_profiles where user_id = auth.uid();
  delete from lab_results where user_id = auth.uid();
  delete from daily_checkins where user_id = auth.uid();
  delete from weigh_ins where user_id = auth.uid();
  perform audit_event(auth.uid(), 'health_deleted', auth.uid()::text, '{}');
end $$;

-- Avaliação: IMC e %G (fita, protocolo US Navy) recalculados no servidor + checagens.
create or replace function public.add_assessment(p jsonb, p_proof uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); today date := public.user_today(); last body_assessments; first body_assessments;
  r body_assessments; act activities; hp jsonb;
  w numeric := (p->>'weight_kg')::numeric; h numeric := (p->>'height_cm')::numeric;
  waist numeric := nullif(p->>'waist_cm', '')::numeric; neck numeric := nullif(p->>'neck_cm', '')::numeric;
  hip numeric := nullif(p->>'hip_cm', '')::numeric; method text := coalesce(p->>'bf_method', 'nenhum');
  bf numeric := nullif(p->>'bf_pct', '')::numeric; sex text; v_flags text[] := '{}'; days numeric; weekly numeric;
  v_status text := 'self';
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select data into hp from health_profiles where user_id = me;
  sex := coalesce(hp->>'sex', 'M');

  if method = 'fita' then
    if sex = 'M' and waist > neck then
      bf := 495 / (1.0324 - 0.19077 * log(waist - neck) + 0.15456 * log(h)) - 450;
    elsif sex = 'F' and hip is not null and waist + hip > neck then
      bf := 495 / (1.29579 - 0.35004 * log(waist + hip - neck) + 0.22100 * log(h)) - 450;
    else
      bf := null; v_flags := array_append(v_flags, 'medidas_inconsistentes');
    end if;
    if bf is not null and (bf < 3 or bf > 65) then bf := null; v_flags := array_append(v_flags, 'medidas_inconsistentes'); end if;
  end if;

  select * into last from body_assessments where user_id = me order by created_at desc limit 1;
  select * into first from body_assessments where user_id = me order by created_at asc limit 1;
  -- estimativas declaradas pelo cliente (só valores conhecidos entram)
  if jsonb_typeof(p->'estimates') = 'array' then
    v_flags := v_flags || array(select e from jsonb_array_elements_text(p->'estimates') e
                                where e in ('peso_estimado', 'altura_estimada', 'sem_medidas'));
  end if;
  -- comparação de plausibilidade só contra valores REAIS (estimativa anterior não gera falso alerta)
  if last.id is not null and not ('peso_estimado' = any(last.flags)) and not ('peso_estimado' = any(v_flags)) then
    days := greatest(extract(epoch from now() - last.created_at) / 86400, 0.5);
    weekly := abs(w - last.weight_kg) / days * 7;
    if days < 3 then v_flags := array_append(v_flags, 'reavaliacao_frequente'); end if;
    -- com caneta (GLP-1/GIP) a perda semanal esperada é maior: tolera até 2,5%/semana
    if weekly > greatest(last.weight_kg * case when hp->'glp1'->>'med' is not null then 0.025 else 0.015 end, 1.5)
       and abs(w - last.weight_kg) > 1.5 then
      v_flags := array_append(v_flags, 'variacao_implausivel');
    end if;
  end if;
  if first.id is not null and abs(h - first.height_cm) > 2
     and not ('altura_estimada' = any(first.flags)) and not ('altura_estimada' = any(v_flags)) then v_flags := array_append(v_flags, 'altura_alterada'); end if;

  if p_proof is not null then
    perform consume_proof(p_proof, 'weigh_in', 'assessment');
    v_status := 'pending'; v_flags := array_append(v_flags, 'peso_com_foto');
  else
    v_flags := array_append(v_flags, 'peso_autodeclarado');
  end if;

  insert into body_assessments(user_id, weight_kg, height_cm, waist_cm, neck_cm, hip_cm, bf_method, bf_pct, bmi, proof_id, flags)
  values (me, w, h, waist, neck, hip, method, round(bf, 1), round(w / ((h / 100) ^ 2), 1), p_proof, v_flags)
  returning * into r;

  -- XP de avaliação: no máximo 1 por semana.
  if not ('peso_estimado' = any(v_flags))
     and not exists (select 1 from activities where user_id = me and kind = 'assessment' and created_at > now() - interval '7 days') then
    insert into activities(user_id, kind, title, attr, xp, base_xp, day, status, proof_ids)
    values (me, 'assessment', 'Avaliação física', 'VIT', 30, 30, today, v_status,
            case when p_proof is null then '{}'::uuid[] else array[p_proof] end)
    returning * into act;
  end if;
  perform audit_event(me, 'assessment', r.id::text, jsonb_build_object('flags', v_flags, 'method', method));
  return json_build_object('assessment', row_to_json(r),
                           'activity', case when act.id is null then null else row_to_json(act) end);
end $$;

-- ---------- RPC: auditoria entre aliados ------------------------------------

create or replace function public.review_queue()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(q order by q.created_at desc), '[]'::json) from (
    select a.id, a.user_id, a.kind, a.title, a.attr, a.xp, a.status, a.flags, a.meta, a.created_at,
           p.username, p.hero_class, p.avatar,
           (select json_agg(json_build_object('id', pr.id, 'challenge', pr.challenge, 'code', pr.code,
                   'kind', pr.kind, 'path', pr.path, 'issued_at', pr.issued_at, 'submitted_at', pr.submitted_at))
              from proofs pr where pr.id = any(a.proof_ids)) as proofs,
           (select count(*) from verifications v where v.activity_id = a.id and v.verdict = 'approve') as approvals,
           (select count(*) from verifications v where v.activity_id = a.id and v.verdict = 'reject') as rejections
    from activities a join profiles p on p.id = a.user_id
    where a.user_id <> auth.uid() and are_friends(auth.uid(), a.user_id)
      and a.status = 'pending' and a.created_at > now() - interval '7 days'
      and not exists (select 1 from verifications v where v.activity_id = a.id and v.verifier_id = auth.uid())
    limit 50
  ) q;
$$;

create or replace function public.review_activity(p_activity uuid, p_verdict text, p_reason text default null)
returns activities language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a activities; ok int; ko int;
begin
  select * into a from activities where id = p_activity for update;
  if not found or a.user_id = me or not are_friends(me, a.user_id) then raise exception 'not_allowed'; end if;
  if a.status not in ('pending','verified') or a.created_at < now() - interval '7 days' then raise exception 'review_closed'; end if;
  if p_verdict not in ('approve','reject') then raise exception 'invalid_verdict'; end if;

  insert into verifications(activity_id, verifier_id, verdict, reason) values (a.id, me, p_verdict, left(p_reason, 120))
  on conflict (activity_id, verifier_id) do update set verdict = excluded.verdict, reason = excluded.reason, created_at = now();

  select count(*) filter (where verdict = 'approve'), count(*) filter (where verdict = 'reject')
    into ok, ko from verifications where activity_id = a.id;
  if ko >= 2 and ko > ok then
    update activities set status = 'rejected', xp = 0 where id = a.id returning * into a;
  elsif ok >= 1 and ko < 2 then
    update activities set status = 'verified', xp = base_xp where id = a.id returning * into a;
  end if;

  perform audit_event(me, 'review_given', a.id::text, jsonb_build_object('verdict', p_verdict, 'owner', a.user_id));
  perform audit_event(a.user_id, 'review_received', a.id::text,
    jsonb_build_object('verdict', p_verdict, 'reason', p_reason, 'status', a.status, 'by', me));
  return a;
end $$;

-- Nota de confiança (0–100) nos últimos 60 dias. Espelha trustScore() em js/rules.js.
create or replace function public.trust_score(u uuid)
returns int language sql stable security definer set search_path = public as $$
  with a as (
    select status, flags from activities
    where user_id = u and kind <> 'bonus' and created_at > now() - interval '60 days'
  ), t as (
    select count(*) n,
           count(*) filter (where status = 'verified') v,
           count(*) filter (where status = 'pending') p,
           count(*) filter (where status = 'self') s,
           count(*) filter (where status = 'rejected') r,
           count(*) filter (where flags && array['series_rapidas','variacao_implausivel','celular_parado','altura_alterada','medidas_inconsistentes']) f
    from a
  )
  select case when n = 0 then 70
    else greatest(0, least(100, round(100.0 * (v + 0.85 * p + 0.5 * s) / n) - 15 * r - 3 * f))::int end
  from t;
$$;

-- Totais do jogador.
create or replace function public.my_totals()
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'total',   coalesce((select sum(xp) from activities where user_id = auth.uid()), 0),
    'by_attr', coalesce((select json_object_agg(attr, s) from
                 (select attr, sum(xp) s from activities where user_id = auth.uid() group by attr) t), '{}'::json),
    'by_kind', coalesce((select json_object_agg(kind, c) from
                 (select kind, count(*) c from activities where user_id = auth.uid() and status <> 'rejected' group by kind) t), '{}'::json),
    'days',    coalesce((select json_agg(day order by day desc) from
                 (select distinct day from activities where user_id = auth.uid() and status <> 'rejected'
                  order by day desc limit 400) t), '[]'::json),
    'trust',   public.trust_score(auth.uid())
  );
$$;

-- Ranking: eu + aliados, XP total/período e nota de confiança.
create or replace function public.friend_leaderboard(p_since date)
returns table(user_id uuid, username text, hero_class text, avatar text, total_xp bigint, period_xp bigint, trust int)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.hero_class, p.avatar,
         coalesce(sum(a.xp), 0)::bigint,
         coalesce(sum(a.xp) filter (where a.day >= p_since), 0)::bigint,
         public.trust_score(p.id)
  from profiles p
  left join activities a on a.user_id = p.id
  where p.id = auth.uid() or are_friends(auth.uid(), p.id)
  group by p.id;
$$;

-- ---------- RPC: guilds ------------------------------------------------------

-- Guild do usuário logado (usada nas políticas RLS sem recursão).
create or replace function public.my_guild_id()
returns uuid language sql stable security definer set search_path = public as $$
  select guild_id from guild_members where user_id = auth.uid();
$$;

create or replace function public.create_guild(p_name text, p_tag text, p_emblem text default 'shield')
returns guilds language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g guilds;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from guild_members where user_id = me) then raise exception 'already_in_guild'; end if;
  insert into guilds(name, tag, emblem, owner_id)
  values (trim(p_name), upper(trim(p_tag)), coalesce(nullif(p_emblem, ''), 'shield'), me) returning * into g;
  insert into guild_members(guild_id, user_id, role) values (g.id, me, 'lider');
  perform audit_event(me, 'guild_created', g.id::text, jsonb_build_object('name', g.name, 'tag', g.tag));
  return g;
end $$;

-- Prévia do convite (pode ser vista antes do login, só com o código).
create or replace function public.guild_preview(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', g.id, 'name', g.name, 'tag', g.tag, 'emblem', g.emblem,
           'members', (select count(*) from guild_members m where m.guild_id = g.id), 'max_members', g.max_members,
           'leader', (select p.username from profiles p where p.id = g.owner_id))
  from guilds g where g.invite_code = upper(trim(p_code));
$$;

create or replace function public.join_guild(p_code text)
returns guilds language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g guilds;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into g from guilds where invite_code = upper(trim(p_code)) for update;
  if not found then raise exception 'invite_invalid'; end if;
  if exists (select 1 from guild_members where user_id = me and guild_id = g.id) then return g; end if;
  if exists (select 1 from guild_members where user_id = me) then raise exception 'already_in_guild'; end if;
  if (select count(*) from guild_members where guild_id = g.id) >= g.max_members then raise exception 'guild_full'; end if;
  insert into guild_members(guild_id, user_id) values (g.id, me);
  perform audit_event(me, 'guild_joined', g.id::text, jsonb_build_object('name', g.name));
  return g;
end $$;

-- Sair: se o líder sai, a liderança passa ao membro mais antigo; o último a sair apaga a guild.
create or replace function public.leave_guild()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m guild_members; heir uuid;
begin
  select * into m from guild_members where user_id = me;
  if not found then raise exception 'not_in_guild'; end if;
  delete from guild_members where user_id = me;
  if m.role = 'lider' then
    select user_id into heir from guild_members where guild_id = m.guild_id order by joined_at limit 1;
    if heir is null then
      delete from guilds where id = m.guild_id;
    else
      update guild_members set role = 'lider' where guild_id = m.guild_id and user_id = heir;
      update guilds set owner_id = heir where id = m.guild_id;
    end if;
  end if;
  perform audit_event(me, 'guild_left', m.guild_id::text, '{}');
end $$;

create or replace function public.kick_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid uuid;
begin
  select guild_id into gid from guild_members where user_id = me and role = 'lider';
  if gid is null then raise exception 'not_leader'; end if;
  if p_user = me then raise exception 'not_allowed'; end if;
  delete from guild_members where guild_id = gid and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  perform audit_event(me, 'guild_kick', p_user::text, jsonb_build_object('guild', gid));
  perform audit_event(p_user, 'guild_kicked', gid::text, '{}');
end $$;

create or replace function public.regenerate_invite()
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); code text;
begin
  update guilds set invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 10))
  where id = (select guild_id from guild_members where user_id = me and role = 'lider')
  returning invite_code into code;
  if code is null then raise exception 'not_leader'; end if;
  perform audit_event(me, 'guild_invite_reset', me::text, '{}');
  return code;
end $$;

create or replace function public.update_guild(p_name text, p_tag text, p_emblem text)
returns guilds language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g guilds;
begin
  update guilds set name = trim(p_name), tag = upper(trim(p_tag)), emblem = coalesce(nullif(p_emblem, ''), emblem)
  where id = (select guild_id from guild_members where user_id = me and role = 'lider') returning * into g;
  if g.id is null then raise exception 'not_leader'; end if;
  return g;
end $$;

-- Minha guild + membros com XP da semana/total e confiança (só para membros).
create or replace function public.my_guild(p_since date)
returns json language sql stable security definer set search_path = public as $$
  select case when g.id is null then null else json_build_object(
    'id', g.id, 'name', g.name, 'tag', g.tag, 'emblem', g.emblem, 'max_members', g.max_members,
    'invite_code', g.invite_code, 'owner_id', g.owner_id, 'created_at', g.created_at,
    'my_role', me.role,
    'members', (select coalesce(json_agg(x order by x.period_xp desc, x.total_xp desc), '[]'::json) from (
       select p.id as user_id, p.username, p.hero_class, p.avatar, m.role, m.joined_at,
              coalesce((select sum(xp) from activities a where a.user_id = p.id), 0) as total_xp,
              coalesce((select sum(xp) from activities a where a.user_id = p.id and a.day >= p_since), 0) as period_xp,
              public.trust_score(p.id) as trust
       from guild_members m join profiles p on p.id = m.user_id where m.guild_id = g.id) x)
  ) end
  from guild_members me join guilds g on g.id = me.guild_id
  where me.user_id = auth.uid();
$$;

-- Envia pedido pelo código de amigo. Se a outra pessoa já tinha pedido, aceita direto.
create or replace function public.send_friend_request(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); target uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select id into target from profiles where friend_code = upper(trim(p_code));
  if target is null then raise exception 'code_not_found'; end if;
  if target = me then raise exception 'self_request'; end if;
  if exists (select 1 from friendships where requester = target and addressee = me) then
    update friendships set status = 'accepted' where requester = target and addressee = me;
    perform audit_event(me, 'ally_accepted', target::text, '{}');
    return 'accepted';
  end if;
  insert into friendships(requester, addressee) values (me, target) on conflict do nothing;
  return 'pending';
end $$;

-- ---------- Permissões das funções -----------------------------------------
do $$
declare f text;
begin
  -- internas: ninguém de fora executa
  foreach f in array array['audit_event(uuid,text,text,jsonb)', 'consume_proof(uuid,text,text)',
                           'class_xp(int,text,uuid)', 'profiles_tz_guard()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  -- expostas a usuários logados
  foreach f in array array['are_friends(uuid,uuid)', 'user_today(uuid)', 'request_proof(text,text)',
      'submit_proof(uuid,text,jsonb)', 'complete_quest(uuid,uuid)', 'delete_activity(uuid)',
      'start_session(text,text,jsonb)', 'cancel_session(uuid)', 'finish_session(uuid,text,int,jsonb,text,jsonb)',
      'log_quick_workout(text,text,int,text,text,uuid)', 'meal_checkin(text,text,uuid)', 'save_health(jsonb)', 'delete_health_data()',
      'add_assessment(jsonb,uuid)', 'review_queue()', 'review_activity(uuid,text,text)', 'trust_score(uuid)',
      'my_totals()', 'friend_leaderboard(date)', 'send_friend_request(text)',
      'create_guild(text,text,text)', 'join_guild(text)', 'leave_guild()', 'kick_member(uuid)',
      'regenerate_invite()', 'update_guild(text,text,text)', 'my_guild(date)', 'my_guild_id()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- prévia do convite também para quem ainda não entrou (tela de login mostra a guild)
  revoke execute on function public.guild_preview(text) from public;
  grant execute on function public.guild_preview(text) to anon, authenticated;
end $$;

-- ---------- Row Level Security --------------------------------------------

alter table public.profiles         enable row level security;
alter table public.quests           enable row level security;
alter table public.routines         enable row level security;
alter table public.activities       enable row level security;
alter table public.friendships      enable row level security;
alter table public.kudos            enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.proofs           enable row level security;
alter table public.verifications    enable row level security;
alter table public.audit_log        enable row level security;
alter table public.health_profiles  enable row level security;
alter table public.body_assessments enable row level security;
alter table public.exercise_logs    enable row level security;
alter table public.daily_checkins   enable row level security;
alter table public.lab_results      enable row level security;
alter table public.guilds           enable row level security;
alter table public.weigh_ins        enable row level security;
alter table public.guild_members    enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.are_friends(auth.uid(), id) or exists (
    select 1 from friendships f
    where (f.requester = auth.uid() and f.addressee = profiles.id)
       or (f.addressee = auth.uid() and f.requester = profiles.id))
);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- quests e routines: o dono gerencia (o XP ganho não passa por aqui)
drop policy if exists quests_all on public.quests;
create policy quests_all on public.quests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists routines_all on public.routines;
create policy routines_all on public.routines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- activities: SÓ LEITURA para clientes (escrita exclusiva das RPCs)
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

-- friendships
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));
drop policy if exists friendships_accept on public.friendships;
create policy friendships_accept on public.friendships for update to authenticated
  using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));

-- kudos
drop policy if exists kudos_select on public.kudos;
create policy kudos_select on public.kudos for select to authenticated
  using (exists (select 1 from activities a where a.id = kudos.activity_id));
drop policy if exists kudos_insert on public.kudos;
create policy kudos_insert on public.kudos for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from activities a where a.id = kudos.activity_id));
drop policy if exists kudos_delete on public.kudos;
create policy kudos_delete on public.kudos for delete to authenticated using (user_id = auth.uid());

-- sessões, provas, auditoria: leitura pelo dono e aliados; escrita só via RPC
drop policy if exists sessions_select on public.workout_sessions;
create policy sessions_select on public.workout_sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists proofs_select on public.proofs;
create policy proofs_select on public.proofs for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));
drop policy if exists verifications_select on public.verifications;
create policy verifications_select on public.verifications for select to authenticated
  using (verifier_id = auth.uid() or exists (select 1 from activities a where a.id = verifications.activity_id));
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

-- saúde: somente o titular (dados sensíveis)
drop policy if exists health_select on public.health_profiles;
create policy health_select on public.health_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists assessments_select on public.body_assessments;
create policy assessments_select on public.body_assessments for select to authenticated using (user_id = auth.uid());
drop policy if exists exercise_logs_select on public.exercise_logs;
create policy exercise_logs_select on public.exercise_logs for select to authenticated using (user_id = auth.uid());
-- check-in e exames: o titular grava e lê direto (não pontuam, não precisam de RPC)
drop policy if exists checkins_all on public.daily_checkins;
create policy checkins_all on public.daily_checkins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists labs_all on public.lab_results;
create policy labs_all on public.lab_results for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- pesagens: só o titular (dado de saúde)
drop policy if exists weigh_ins_all on public.weigh_ins;
create policy weigh_ins_all on public.weigh_ins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- guilds: só membros leem; escrita só pelas RPCs
drop policy if exists guilds_select on public.guilds;
create policy guilds_select on public.guilds for select to authenticated
  using (id = public.my_guild_id());
drop policy if exists guild_members_select on public.guild_members;
create policy guild_members_select on public.guild_members for select to authenticated
  using (guild_id = public.my_guild_id());

-- Storage: cada um envia só na própria pasta; dono e aliados veem; ninguém altera/apaga.
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated using (
  bucket_id = 'evidence' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)));
