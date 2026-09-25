import { esc, fmt, timeAgo } from '../util.js';
import { icon } from '../ui/icons.js';
import { avatar } from '../ui/components.js';
import { FLAGS, STATUS, trustTier } from '../rules.js';

const EVENTS = {
  proof_requested: ['camera', 'Prova solicitada'],
  proof_submitted: ['check', 'Prova enviada'],
  proof_expired: ['x', 'Prova expirada (não enviada a tempo)'],
  quest_complete: ['quests', 'Missão concluída'],
  perfect_day: ['star', 'Dia perfeito'],
  activity_deleted: ['trash', 'Registro desfeito'],
  session_started: ['flame', 'Treino iniciado'],
  session_cancelled: ['x', 'Treino cancelado'],
  session_finished: ['dumbbell', 'Treino finalizado'],
  quick_workout: ['dumbbell', 'Treino registrado (rápido)'],
  meal_checkin: ['food', 'Refeição registrada'],
  health_updated: ['user', 'Dados de saúde atualizados'],
  health_deleted: ['trash', 'Dados de saúde excluídos (LGPD)'],
  assessment: ['scale', 'Avaliação física'],
  review_given: ['eye', 'Você auditou um aliado'],
  review_received: ['guild', 'Auditoria recebida'],
  ally_accepted: ['guild', 'Aliança formada'],
  guild_created: ['shield', 'Guild criada'],
  guild_joined: ['guild', 'Entrou numa guild'],
  guild_left: ['logout', 'Saiu da guild'],
  guild_kick: ['x', 'Removeu um membro da guild'],
  guild_kicked: ['x', 'Foi removido da guild'],
  guild_invite_reset: ['refresh', 'Link de convite trocado'],
  backup_imported: ['upload', 'Backup importado'],
};

const secs = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
const hhmmss = (iso) => new Date(iso).toLocaleTimeString('pt-BR');

function eventDetail(e) {
  const d = e.data || {};
  const bits = [];
  if (d.quest) bits.push(esc(d.quest));
  if (d.name) bits.push(esc(d.name));
  if (d.title) bits.push(esc(d.title));
  if (d.challenge) bits.push(`desafio: ${esc(d.challenge)}`);
  if (d.seconds != null) bits.push(`enviada em ${d.seconds}s`);
  if (d.elapsed_s != null) bits.push(`${Math.round(d.elapsed_s / 60)} min · ${d.sets} séries · ${d.proofs} prova(s)`);
  if (d.sensor?.supported) bits.push(`movimento ${Math.round((d.sensor.active_ratio ?? 0) * 100)}%`);
  if (d.xp != null) bits.push(`${d.xp} XP`);
  if (d.status) bits.push(STATUS[d.status]?.label ?? d.status);
  if (d.verdict) bits.push(d.verdict === 'approve' ? 'aprovado' : 'reprovado');
  if (d.reason) bits.push(`“${esc(d.reason)}”`);
  if (d.minutes_declared != null) bits.push(`${d.minutes_declared} min declarados`);
  const flags = (d.flags || []).filter((f) => f !== 'peso_com_foto');
  return `${bits.join(' · ')}${flags.length ? `<div class="flag-row">${flags.map((f) => `<span class="flag">${esc(FLAGS[f] ?? f)}</span>`).join('')}</div>` : ''}`;
}

export function trustBadge(score, { big = false } = {}) {
  const t = trustTier(score ?? 70);
  return `<span class="trust ${t.cls} ${big ? 'trust-big' : ''}" title="Nota de confiança: ${score}">${icon('shield')}<b>${score ?? '—'}</b>${big ? `<span>${t.label}</span>` : ''}</span>`;
}

function reviewCard(r) {
  const flags = (r.flags || []).filter((f) => f !== 'peso_com_foto');
  return `<li class="panel review">
    <div class="review-head">${avatar(r, 'sm')}<div><b>${esc(r.username)}</b><div class="muted small">${esc(r.title)} · ${fmt(r.xp)} XP · ${timeAgo(r.created_at)}</div></div></div>
    ${(r.proofs || []).map((p) => `<figure class="proof-fig">
      ${p.url ? `<img src="${esc(p.url)}" alt="Prova" loading="lazy">` : '<div class="proof-missing">foto indisponível</div>'}
      <figcaption><span>Deveria mostrar: <b>${esc(p.challenge)}</b> · código <b class="mono">#${esc(p.code)}</b></span>
        <span class="muted">pedida ${hhmmss(p.issued_at)} · enviada ${p.submitted_at ? `${hhmmss(p.submitted_at)} (${secs(p.issued_at, p.submitted_at)}s)` : '—'}</span></figcaption></figure>`).join('')}
    ${r.meta?.elapsed_s ? `<p class="small muted">Duração medida pelo servidor: <b>${Math.round(r.meta.elapsed_s / 60)} min</b> · ${r.meta.sets}/${r.meta.total_sets} séries</p>` : ''}
    ${flags.length ? `<div class="flag-row">${flags.map((f) => `<span class="flag">${esc(FLAGS[f] ?? f)}</span>`).join('')}</div>` : ''}
    <p class="small muted">Aprovações: ${r.approvals} · Reprovações: ${r.rejections} (2 reprovações zeram o XP)</p>
    <div class="review-actions">
      <button class="btn btn-sm" data-act="review" data-id="${r.id}" data-verdict="approve">${icon('check')} Confere</button>
      <select data-reason="${r.id}" aria-label="Motivo da reprovação">
        <option value="Foto não mostra o gesto pedido">Não mostra o gesto pedido</option>
        <option value="Não mostra o exercício/prato/balança">Não mostra o exercício/prato/balança</option>
        <option value="Parece foto de outra pessoa">Parece outra pessoa</option>
        <option value="Foto repetida ou montada">Foto repetida ou montada</option>
      </select>
      <button class="btn btn-sm btn-ghost btn-danger" data-act="review" data-id="${r.id}" data-verdict="reject">${icon('x')} Suspeito</button>
    </div></li>`;
}

export function renderAudit({ state, d }) {
  const a = state.audit;
  const online = state.store.mode === 'online';
  return `<section class="view-audit">
    <header class="view-head"><div class="kicker">[ AUDITORIA ]</div><h1 class="view-title">Integridade do jogador</h1></header>
    <div class="grid grid-2">
      <article class="panel trust-card">
        ${trustBadge(d.trust, { big: true })}
        <p class="small">Sua nota (0–100) nos últimos 60 dias: registros <b>verificados</b> valem mais, <b>autodeclarados</b> valem metade,
        cada <b>reprovação</b> tira 15 pontos e cada <b>alerta de fraude</b> tira 3. Aliados veem essa nota no ranking.</p>
      </article>
      <article class="panel">
        <h2 class="panel-title">${icon('shield')} Como a auditoria funciona</h2>
        <ul class="tips small">
          <li><b>Relógio do servidor</b>: início e fim do treino, prazo das provas e o "dia" são marcados pelo servidor, não pelo celular.</li>
          <li><b>Prova ao vivo</b>: só câmera (sem galeria), gesto sorteado na hora, 3 min para enviar e marca d'água com data e código.</li>
          <li><b>Prova surpresa</b> no meio do treino, em momento aleatório.</li>
          <li><b>Sensor de movimento</b> registra se o celular se mexeu durante o treino.</li>
          <li><b>Plausibilidade</b>: séries rápidas demais, peso que varia além do possível, limites diários de XP.</li>
          <li><b>Aliados auditam</b> as fotos: 1 aprovação verifica; 2 reprovações zeram o XP.</li>
          <li><b>Trilha imutável</b>: nada pode ser apagado — nem desfazer um registro some da trilha.</li>
        </ul>
        ${online ? '' : '<p class="alert alert-warn small">Modo solo: auditoria apenas local. A auditoria completa (servidor + aliados) exige o modo online.</p>'}
      </article>
    </div>
    <h2 class="section-title">Fila para auditar ${a.queue.length ? `<span class="dot">${a.queue.length}</span>` : ''}</h2>
    ${!online ? '<p class="muted small">Disponível no modo online, com aliados.</p>'
      : a.loading ? '<div class="panel skeleton"></div>'
      : a.queue.length ? `<ul class="review-list">${a.queue.map(reviewCard).join('')}</ul>`
      : '<p class="muted small">Nenhuma prova de aliado esperando auditoria.</p>'}
    <h2 class="section-title">Minha trilha de auditoria</h2>
    <ol class="timeline">${a.log.map((e) => {
      const [ic, label] = EVENTS[e.event] ?? ['bolt', e.event];
      const bad = ['proof_expired', 'activity_deleted', 'session_cancelled'].includes(e.event) || (e.event === 'review_received' && e.data?.verdict === 'reject');
      return `<li class="${bad ? 'bad' : ''}"><span class="tl-ico">${icon(ic)}</span><div><b>${label}</b> <span class="muted small">${new Date(e.created_at).toLocaleString('pt-BR')}</span>
        <div class="small muted">${eventDetail(e)}</div></div></li>`;
    }).join('') || '<li class="muted">Sem eventos ainda.</li>'}</ol>
  </section>`;
}

export function proofsModal(proofs, title) {
  return `<h3 class="modal-title">Provas · ${esc(title)}</h3>
    ${proofs.length ? proofs.map((p) => `<figure class="proof-fig">${p.url ? `<img src="${esc(p.url)}" alt="Prova">` : '<div class="proof-missing">foto indisponível</div>'}
      <figcaption><span>Desafio: <b>${esc(p.challenge)}</b> · <b class="mono">#${esc(p.code)}</b></span>
      <span class="muted">pedida ${hhmmss(p.issued_at)} · enviada ${p.submitted_at ? `${hhmmss(p.submitted_at)} (${secs(p.issued_at, p.submitted_at)}s)` : '—'}</span></figcaption></figure>`).join('')
      : '<p class="muted">Sem provas fotográficas (registro autodeclarado).</p>'}`;
}
