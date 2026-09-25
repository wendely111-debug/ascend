// Testes antifraude do servidor: roda o supabase/schema.sql num Postgres embutido (PGlite),
// simulando auth/storage do Supabase, e tenta burlar as regras com 3 usuários.
// Uso:  npm install  &&  npm test
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
await db.exec(`
create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid(), created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema public, auth, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
`);
await db.exec(schema);
await db.exec(`grant all on all tables in schema public to authenticated; grant select, insert on storage.objects to authenticated;`);
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222', C = '33333333-3333-3333-3333-333333333333';
await db.exec(`insert into auth.users values ('${A}'),('${B}'),('${C}')`);

let ok = 0, fail = 0;
const as = async (u, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${u}', false); set role authenticated;`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
};
const su = async (sql, params) => (await db.query(sql, params)).rows;
const expect = (name, cond, extra = '') => { cond ? ok++ : fail++; console.log(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`); };
const expectErr = async (name, fn, re) => {
  try { await fn(); expect(name, false, '(sem erro)'); } catch (e) { expect(name, re.test(e.message), `-> ${e.message}`); }
};
const upload = (u, proofId) => as(u, `insert into storage.objects(bucket_id, name) values ('evidence', $1)`, [`${u}/${proofId}.jpg`]);

// ---- perfis e amizade
await as(A, `insert into profiles(id, username, hero_class) values ($1,'alice','guerreiro')`, [A]);
await as(B, `insert into profiles(id, username) values ($1,'bruno')`, [B]);
await as(C, `insert into profiles(id, username) values ($1,'carla')`, [C]);
const codeA = (await as(A, `select friend_code from profiles where id=$1`, [A]))[0].friend_code;
expect('B não vê perfil de A antes da amizade', (await as(B, `select * from profiles where id=$1`, [A])).length === 0);
await as(B, `select send_friend_request($1)`, [codeA]);
await as(A, `update friendships set status='accepted' where requester=$1 and addressee=$2`, [B, A]);
const codeC = (await as(C, `select friend_code from profiles where id=$1`, [C]))[0].friend_code;
await as(A, `select send_friend_request($1)`, [codeC]);
expect('Aceite automático quando o outro já pediu', (await as(C, `select send_friend_request($1) r`, [codeA]))[0].r === 'accepted');

// ---- missões e provas
const [q1] = await as(A, `insert into quests(title, attr, xp, require_proof) values ('Flexões','STR',40,true) returning id`);
const [q2] = await as(A, `insert into quests(title, attr, xp) values ('Água','VIT',20) returning id`);
await expectErr('Cliente NÃO insere XP direto na tabela', () => as(A, `insert into activities(user_id,kind,title,attr,xp,day) values ($1,'quest','hack','STR',500,current_date)`, [A]), /row-level security|permission/i);
await expectErr('Missão com prova exige foto', () => as(A, `select complete_quest($1)`, [q1.id]), /proof_required/);
const [p1] = await as(A, `select * from request_proof('quest', $1)`, [q1.id]);
await expectErr('Recusa prova sem arquivo no Storage', () => as(A, `select submit_proof($1, $2)`, [p1.id, `${A}/${p1.id}.jpg`]), /proof_invalid/);
await expectErr('Recusa upload na pasta de outro usuário', () => as(A, `insert into storage.objects(bucket_id,name) values ('evidence',$1)`, [`${B}/x.jpg`]), /row-level security/i);
await upload(A, p1.id);
await as(A, `select submit_proof($1, $2)`, [p1.id, `${A}/${p1.id}.jpg`]);
const r1 = (await as(A, `select complete_quest($1, $2) r`, [q1.id, p1.id]))[0].r;
expect('Missão com prova -> pending + bônus de classe (40*1,1)', r1.activity.status === 'pending' && r1.activity.xp === 44, JSON.stringify({ st: r1.activity.status, xp: r1.activity.xp }));
await expectErr('Prova não pode ser reutilizada', () => as(A, `select complete_quest($1, $2)`, [q1.id, p1.id]), /already_done|proof_invalid/);
const r2 = (await as(A, `select complete_quest($1) r`, [q2.id]))[0].r;
expect('Missão sem prova -> autodeclarada', r2.activity.status === 'self');
expect('Dia perfeito criado pelo servidor', r2.bonus?.kind === 'bonus' && r2.bonus.xp === 50);

const [pe] = await as(A, `select * from request_proof('meal', 'almoco')`);
await su(`update proofs set expires_at = now() - interval '5 minutes', issued_at = now() - interval '8 minutes' where id=$1`, [pe.id]);
await upload(A, pe.id);
{ const r = (await as(A, `select * from submit_proof($1,$2)`, [pe.id, `${A}/${pe.id}.jpg`]))[0]; expect('Prova enviada fora da janela NÃO é aceita', !r.submitted_at && r.meta.expired === true); }
const [po] = await as(A, `select * from request_proof('meal', 'jantar')`);
await upload(A, po.id);
await su(`update storage.objects set created_at = now() - interval '1 hour' where name=$1`, [`${A}/${po.id}.jpg`]);
await expectErr('Foto criada antes do desafio é recusada', () => as(A, `select submit_proof($1,$2)`, [po.id, `${A}/${po.id}.jpg`]), /proof_invalid/);

// ---- treinos
const items = JSON.stringify([{ ex: 'Leg_Press', sets: 4 }, { ex: 'Leg_Extensions', sets: 3 }]);
const [s1] = await as(A, `select * from start_session('Ficha C','STR',$1::jsonb)`, [items]);
const a1 = (await as(A, `select * from finish_session($1,'intensa',7,'{"supported":true,"active_ratio":0.02}'::jsonb)`, [s1.id]))[0];
expect('Treino instantâneo: séries rápidas + sem prova + celular parado', ['series_rapidas', 'sem_prova', 'celular_parado'].every((f) => a1.flags.includes(f)) && a1.status === 'self', `flags=${a1.flags} xp=${a1.xp}`);
const [s2] = await as(A, `select * from start_session('Ficha A','STR',$1::jsonb)`, [items]);
await su(`update workout_sessions set started_at = now() - interval '50 minutes' where id=$1`, [s2.id]);
for (let i = 0; i < 2; i++) {
  const [p] = await as(A, `select * from request_proof('workout', $1)`, [s2.id]);
  await upload(A, p.id);
  await as(A, `select submit_proof($1,$2)`, [p.id, `${A}/${p.id}.jpg`]);
}
const logs = JSON.stringify([{ ex: 'Leg_Press', sets: [{ kg: 120, reps: 10 }, { kg: 120, reps: 9 }] }, { ex: 'Hack_invasor', sets: [{ kg: 999, reps: 1 }] }]);
const a2 = (await as(A, `select * from finish_session($1,'intensa',7,'{"supported":true,"active_ratio":0.7}'::jsonb,null,$2::jsonb)`, [s2.id, logs]))[0];
const lg = await as(A, `select exercise_id, sets from exercise_logs`);
expect('Cargas gravadas só de exercícios da sessão', lg.length === 1 && lg[0].exercise_id === 'Leg_Press' && lg[0].sets.length === 2, JSON.stringify(lg.map((l) => l.exercise_id)));
expect('Treino real: duração pelo relógio do servidor, 2 provas, pending', a2.status === 'pending' && a2.meta.minutes === 50 && a2.flags.length === 0 && a2.proof_ids.length === 2, `min=${a2.meta.minutes} xp=${a2.xp} flags=${a2.flags}`);
const upd = await as(A, `update activities set xp = 500 where id=$1 returning id`, [a2.id]).catch((e) => e);
expect('Cliente NÃO altera XP de atividade', upd instanceof Error || upd.length === 0);
const del = await as(A, `delete from audit_log where user_id=$1 returning id`, [A]).catch((e) => e);
expect('Cliente NÃO apaga a trilha de auditoria', del instanceof Error || del.length === 0);

// ---- auditoria entre aliados
const queue = (await as(B, `select review_queue() q`))[0].q;
expect('Aliado vê a fila com as provas de A', queue.some((x) => x.id === a2.id && x.proofs.length === 2), `itens=${queue.length}`);
await expectErr('Ninguém audita a si mesmo', () => as(A, `select review_activity($1,'approve')`, [a2.id]), /not_allowed/);
await as(B, `select review_activity($1,'reject','Não mostra o gesto')`, [a2.id]);
let st = (await su(`select status, xp from activities where id=$1`, [a2.id]))[0];
expect('1 reprovação não zera', st.status === 'pending' && st.xp > 0);
await as(C, `select review_activity($1,'reject','Foto repetida')`, [a2.id]);
st = (await su(`select status, xp from activities where id=$1`, [a2.id]))[0];
expect('2 reprovações -> rejected e XP zerado', st.status === 'rejected' && st.xp === 0, JSON.stringify(st));
await as(B, `select review_activity($1,'approve')`, [r1.activity.id]);
expect('1 aprovação -> verified', (await su(`select status from activities where id=$1`, [r1.activity.id]))[0].status === 'verified');

// ---- saúde e avaliação
await expectErr('Sem consentimento não salva dados de saúde', () => as(A, `select save_health('{"sex":"M"}'::jsonb)`), /consent_required/);
await as(A, `select save_health('{"sex":"M","consent":true}'::jsonb)`);
const ev1 = (await as(A, `select add_assessment('{"weight_kg":92,"height_cm":178,"waist_cm":98,"neck_cm":40,"bf_method":"fita"}'::jsonb) r`))[0].r;
expect('%G recalculado no servidor (US Navy) = cliente', Math.abs(ev1.assessment.bf_pct - 24.2) < 0.2 && ev1.activity?.xp === 30, `bf=${ev1.assessment.bf_pct}`);
const ev2 = (await as(A, `select add_assessment('{"weight_kg":86,"height_cm":182,"waist_cm":95,"neck_cm":40,"bf_method":"fita"}'::jsonb) r`))[0].r;
expect('Flags: variação implausível, reavaliação frequente, altura alterada; sem XP repetido', ['variacao_implausivel', 'reavaliacao_frequente', 'altura_alterada'].every((f) => ev2.assessment.flags.includes(f)) && !ev2.activity, `${ev2.assessment.flags}`);
await as(C, `select save_health('{"sex":"F","consent":true}'::jsonb)`);
const est = (await as(C, `select add_assessment('{"weight_kg":57,"height_cm":161,"bf_method":"nenhum","estimates":["peso_estimado","altura_estimada","sem_medidas","hack_xp"]}'::jsonb) r`))[0].r;
expect('Cadastro pulado: estimativas marcadas, flag desconhecida ignorada, sem XP', ['peso_estimado', 'altura_estimada', 'sem_medidas'].every((f) => est.assessment.flags.includes(f)) && !est.assessment.flags.includes('hack_xp') && !est.activity, `${est.assessment.flags}`);
const real = (await as(C, `select add_assessment('{"weight_kg":78,"height_cm":165,"waist_cm":80,"neck_cm":33,"hip_cm":102,"bf_method":"fita"}'::jsonb) r`))[0].r;
expect('Dado real depois da estimativa não gera falso alerta de fraude', !real.assessment.flags.includes('variacao_implausivel') && !real.assessment.flags.includes('altura_alterada') && real.activity?.xp === 30, `${real.assessment.flags}`);
// perda de 2%/semana: implausível sem caneta, esperada com caneta (GLP-1/GIP)
for (const [who, glp] of [[B, false], [C, true]]) {
  await as(who, `select save_health($1::jsonb)`, [JSON.stringify({ sex: 'M', consent: true, ...(glp ? { glp1: { med: 'mounjaro' } } : {}) })]);
  await su(`delete from body_assessments where user_id=$1`, [who]);
  await as(who, `select add_assessment('{"weight_kg":100,"height_cm":175,"bf_method":"nenhum"}'::jsonb)`);
  await su(`update body_assessments set created_at = now() - interval '7 days' where user_id=$1`, [who]);
  const r = (await as(who, `select add_assessment('{"weight_kg":98,"height_cm":175,"bf_method":"nenhum"}'::jsonb) r`))[0].r;
  expect(glp ? 'Com caneta: −2%/semana é aceito' : 'Sem caneta: −2%/semana é sinalizado', r.assessment.flags.includes('variacao_implausivel') === !glp, `${r.assessment.flags}`);
}
expect('Aliado NÃO vê dados de saúde de outros', (await as(B, `select * from health_profiles where user_id <> $1`, [B])).length === 0 && (await as(B, `select * from body_assessments where user_id <> $1`, [B])).length === 0);

// ---- imutabilidade do passado
await su(`update activities set day = day - 1 where id=$1`, [r2.activity.id]);
await expectErr('Não desfaz registro de dia anterior', () => as(A, `select delete_activity($1)`, [r2.activity.id]), /locked_activity/);

// ---- totais, confiança, ranking, trilha
const tot = (await as(A, `select my_totals() t`))[0].t;
const board = await as(B, `select * from friend_leaderboard(current_date - 7)`);
console.log('     totais A:', JSON.stringify({ total: tot.total, trust: tot.trust }), '| ranking visto por B:', board.map((r) => `${r.username}:${r.total_xp}xp/confiança ${r.trust}`).join(' · '));
expect('Confiança de A caiu (reprovação + alertas)', tot.trust < 70);
const log = await as(A, `select event from audit_log where user_id=$1 order by id`, [A]);
expect('Trilha registrou os eventos', ['proof_requested', 'proof_submitted', 'proof_expired', 'quest_complete', 'session_finished', 'review_received', 'assessment'].every((e) => log.some((l) => l.event === e)), `${log.length} eventos; faltando: ${['proof_requested', 'proof_submitted', 'proof_expired', 'quest_complete', 'session_finished', 'review_received', 'assessment'].filter((e) => !log.some((l) => l.event === e))}`);
await expectErr('Função interna audit_event bloqueada para o cliente', () => as(A, `select audit_event($1,'fake','x','{}')`, [A]), /permission/i);
await as(A, `insert into daily_checkins(user_id, day, data) values ($1, current_date, '{"sleep_h":5}')`, [A]);
await as(A, `insert into lab_results(taken_on, values) values (current_date, '{"vitd":{"v":18}}')`);
expect('Aliado NÃO vê check-in, exames nem cargas', (await as(B, `select * from daily_checkins`)).length === 0 && (await as(B, `select * from lab_results`)).length === 0 && (await as(B, `select * from exercise_logs`)).length === 0);
await as(A, `insert into weigh_ins(weight_kg) values (91.4)`);
await expectErr('Pesagem absurda recusada', () => as(A, `insert into weigh_ins(weight_kg) values (900)`), /check constraint/i);
expect('Aliado NÃO vê pesagens', (await as(B, `select * from weigh_ins where user_id=$1`, [A])).length === 0 && (await as(A, `select * from weigh_ins`)).length === 1);
await expectErr('Não grava check-in em nome de outro', () => as(B, `insert into daily_checkins(user_id, day, data) values ($1, current_date, '{}')`, [A]), /row-level security/i);

// ---- guilds (convite, aliança automática, liderança)
const D = '44444444-4444-4444-4444-444444444444', E = '55555555-5555-5555-5555-555555555555', F = '66666666-6666-6666-6666-666666666666';
await su(`insert into auth.users values ('${D}'),('${E}'),('${F}')`);
for (const [u, n] of [[D, 'dani'], [E, 'enzo'], [F, 'fabi']]) await as(u, `insert into profiles(id, username) values ($1, $2)`, [u, n]);
const gd = (await as(D, `select * from create_guild('Lobos de CG', 'cgpb', 'wolf')`))[0];
expect('Criar guild: TAG em maiúsculas e líder', gd.tag === 'CGPB' && (await su(`select role from guild_members where user_id=$1`, [D]))[0].role === 'lider');
await expectErr('Uma guild por pessoa', () => as(D, `select create_guild('Outra', 'XX')`), /already_in_guild/);
await expectErr('TAG inválida recusada', () => as(F, `select create_guild('Guild F', 'a!')`), /check constraint|violates/i);
expect('Quem não é membro não vê a guild nem os membros', (await as(E, `select * from guilds`)).length === 0 && (await as(E, `select * from guild_members`)).length === 0);
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
const prev = (await db.query(`select guild_preview($1) p`, [gd.invite_code])).rows[0].p; await db.exec('reset role');
expect('Prévia do convite funciona sem login', prev?.name === 'Lobos de CG' && prev.members === 1 && prev.leader === 'dani', JSON.stringify(prev));
await expectErr('Código de convite errado', () => as(E, `select join_guild('XXXXXXXXXX')`), /invite_invalid/);
await as(E, `select join_guild($1)`, [gd.invite_code.toLowerCase()]);
await as(E, `select join_guild($1)`, [gd.invite_code]);
expect('Entrar pelo convite (idempotente)', (await su(`select count(*)::int n from guild_members where guild_id=$1`, [gd.id]))[0].n === 2);
await expectErr('Cliente NÃO se insere direto em guild', () => as(F, `insert into guild_members(guild_id, user_id) values ($1, $2)`, [gd.id, F]), /row-level security/i);
const [qd] = await as(D, `insert into quests(title, attr, xp) values ('Água','VIT',20) returning id`);
await as(D, `select complete_quest($1)`, [qd.id]);
expect('Membro da guild vira aliado: vê perfil e atividades', (await as(E, `select * from profiles where id=$1`, [D])).length === 1 && (await as(E, `select * from activities where user_id=$1`, [D])).length === 2); // missão + bônus Dia Perfeito
expect('Membro aparece no ranking de aliados', (await as(D, `select * from friend_leaderboard(current_date - 7)`)).some((r) => r.user_id === E));
const mg = (await as(E, `select my_guild(current_date - 7) g`))[0].g;
expect('my_guild: membros, XP e papel', mg.members.length === 2 && mg.my_role === 'membro' && mg.members[0].username === 'dani' && Number(mg.members[0].period_xp) === 70, JSON.stringify(mg.members.map((m) => m.username + ':' + m.period_xp)));
await expectErr('Membro comum não expulsa', () => as(E, `select kick_member($1)`, [D]), /not_leader/);
await as(D, `select kick_member($1)`, [E]);
expect('Expulso perde a aliança', (await as(E, `select * from activities where user_id=$1`, [D])).length === 0);
const code2 = (await as(D, `select regenerate_invite() c`))[0].c;
await expectErr('Link antigo para de valer após trocar', () => as(F, `select join_guild($1)`, [gd.invite_code]), /invite_invalid/);
await as(E, `select join_guild($1)`, [code2]);
await as(D, `select leave_guild()`);
expect('Líder sai → liderança passa ao membro mais antigo', (await su(`select owner_id from guilds where id=$1`, [gd.id]))[0].owner_id === E && (await su(`select role from guild_members where user_id=$1`, [E]))[0].role === 'lider');
await su(`update guilds set max_members = 2 where id=$1`, [gd.id]);
await as(D, `select join_guild($1)`, [code2]);
await expectErr('Guild cheia recusa novos membros', () => as(F, `select join_guild($1)`, [code2]), /guild_full/);
await as(D, `select leave_guild()`); await as(E, `select leave_guild()`);
expect('Último a sair apaga a guild', (await su(`select count(*)::int n from guilds where id=$1`, [gd.id]))[0].n === 0);
await db.exec(schema);
expect('schema.sql pode ser reaplicado em produção (idempotente)', true);
await as(A, `select delete_health_data()`);
expect('Revogação LGPD apaga saúde, avaliações, exames e check-ins', (await su(`select (select count(*) from body_assessments where user_id=$1) + (select count(*) from lab_results where user_id=$1) + (select count(*) from daily_checkins where user_id=$1) + (select count(*) from weigh_ins where user_id=$1) n`, [A]))[0].n == 0);

console.log(`\n${ok} OK · ${fail} FALHAS`);
process.exit(fail ? 1 : 0);
