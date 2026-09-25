import { esc, fmt, timeAgo } from '../util.js';
import { ATTRS, levelInfo } from '../game.js';
import { avatar, rankBadge } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { trustBadge } from './audit.js';
import { statusBadge } from './diet.js';

const TABS = [['ranking', 'Ranking'], ['feed', 'Feed'], ['allies', 'Aliados']];

export function renderGuild({ state }) {
  if (state.store.mode === 'local') return offlinePanel();
  const g = state.guild;
  const incoming = g.fr?.incoming.length || 0;

  const tabs = `<nav class="tabs" role="tablist">${TABS.map(([id, label]) =>
    `<button role="tab" class="tab ${g.tab === id ? 'active' : ''}" data-act="guild-tab" data-tab="${id}" aria-selected="${g.tab === id}">
      ${label}${id === 'allies' && incoming ? `<span class="dot">${incoming}</span>` : ''}</button>`).join('')}
    <button class="icon-btn" data-act="guild-refresh" aria-label="Atualizar">${icon('refresh', g.loading ? 'spin' : '')}</button></nav>`;

  let body;
  if (g.error) body = `<p class="panel error-box">${esc(g.error)}</p>`;
  else if (!g.loaded) body = `<div class="panel skeleton"></div><div class="panel skeleton"></div>`;
  else body = g.tab === 'ranking' ? ranking(state) : g.tab === 'feed' ? feed(g.feed) : allies(state);

  return `<section class="view-guild">
    <header class="view-head"><div class="kicker">[ GUILDA ]</div><h1 class="view-title">Você e seus aliados</h1>
      <button class="btn btn-sm btn-ghost audit-link" data-act="go" data-view="audit">${icon('shield')} Auditar aliados${state.audit.queue.length ? ` <span class="dot">${state.audit.queue.length}</span>` : ''}</button></header>
    ${tabs}${body}</section>`;
}

function ranking(state) {
  const g = state.guild;
  const key = g.period === 'week' ? 'period_xp' : 'total_xp';
  const rows = [...g.board].sort((a, b) => b[key] - a[key] || b.total_xp - a.total_xp);
  const medal = ['gold', 'silver', 'bronze'];
  return `<div class="panel">
    <div class="seg seg-inline">
      <button class="seg-btn ${g.period === 'week' ? 'on' : ''}" data-act="board-period" data-period="week">Esta semana</button>
      <button class="seg-btn ${g.period === 'all' ? 'on' : ''}" data-act="board-period" data-period="all">Geral</button>
    </div>
    <ol class="board">${rows.map((r, i) => {
      const lv = levelInfo(Number(r.total_xp)).level;
      const me = r.user_id === state.profile.id;
      return `<li class="board-row ${me ? 'me' : ''} ${medal[i] || ''}">
        <span class="board-pos">${i + 1}</span>${avatar(r, 'sm')}
        <span class="board-name">${esc(r.username)}${me ? ' <small class="muted">(você)</small>' : ''}</span>
        <span class="board-lv">${rankBadge(lv)} <span class="mono">LV ${lv}</span></span>
        <span class="board-xp mono">${fmt(r[key])}<small>XP</small></span>
        <span class="board-trust">${trustBadge(r.trust)}</span></li>`;
    }).join('')}</ol>
    ${rows.length < 2 ? '<p class="muted small center">Adicione aliados na aba <b>Aliados</b> para competir.</p>' : ''}
  </div>`;
}

function feed(items) {
  if (!items.length) return '<p class="panel muted empty">Nada por aqui ainda. Quando você e seus aliados treinarem, aparece aqui.</p>';
  const verb = { quest: 'concluiu', workout: 'treinou', bonus: 'conquistou' };
  return `<ul class="feed">${items.map((a) => `<li class="panel feed-item" style="--c:${ATTRS[a.attr].color}">
      ${avatar(a.profile, 'sm')}
      <div class="feed-text"><b>${esc(a.profile?.username)}</b> ${verb[a.kind]} <span class="feed-what">${esc(a.title)}</span>
        ${a.meta?.minutes ? `<span class="muted"> · ${a.meta.minutes} min</span>` : ''}
        ${a.meta?.note ? `<div class="feed-note">“${esc(a.meta.note)}”</div>` : ''}
        <div class="feed-meta muted small"><span class="chip chip-attr">${ATTRS[a.attr].short}</span> +${fmt(a.xp)} XP · ${timeAgo(a.created_at)}</div>
        <div class="feed-audit">${statusBadge(a)}${a.proof_ids?.length ? `<button class="btn btn-sm btn-ghost" data-act="proof-view" data-ids="${a.proof_ids.join(',')}" data-title="${esc(a.title)}">${icon('camera')} Ver prova</button>` : ''}</div></div>
      <button class="hype ${a.kudosMine ? 'on' : ''}" data-act="kudos" data-id="${a.id}" ${a.isMe ? 'disabled title="Sua atividade"' : 'title="Dar hype"'}>
        ${icon('flame')}<span>${a.kudosCount || ''}</span></button>
    </li>`).join('')}</ul>`;
}

function allies(state) {
  const { fr } = state.guild;
  const code = state.profile.friend_code;
  const person = (p, actions) => `<li class="ally">${avatar(p, 'sm')}<span class="ally-name">${esc(p.username)}</span>${actions}</li>`;
  return `<div class="grid grid-2">
    <article class="panel">
      <h2 class="panel-title">${icon('user')} Seu código de aliado</h2>
      <div class="code-box"><span class="code mono">${esc(code)}</span>
        <button class="btn btn-sm" data-act="copy-code">${icon('copy')} Copiar</button></div>
      <p class="muted small">Mande esse código para seus amigos. Quando um pedido é aceito, vocês veem as atividades um do outro e disputam o ranking.</p>
      <form class="form form-inline" data-form="add-friend">
        <input name="code" required maxlength="8" minlength="8" placeholder="CÓDIGO DO AMIGO" autocomplete="off" class="mono upper">
        <button class="btn" type="submit">${icon('plus')} Adicionar</button>
      </form>
    </article>
    <article class="panel">
      ${fr.incoming.length ? `<h2 class="panel-title">Pedidos recebidos</h2><ul class="ally-list">${fr.incoming.map((p) => person(p,
        `<button class="btn btn-sm" data-act="accept-friend" data-id="${p.id}">${icon('check')} Aceitar</button>
         <button class="icon-btn" data-act="remove-friend" data-id="${p.id}" aria-label="Recusar">${icon('x')}</button>`)).join('')}</ul>` : ''}
      <h2 class="panel-title">Aliados (${fr.allies.length})</h2>
      ${fr.allies.length ? `<ul class="ally-list">${fr.allies.map((p) => person(p,
        `<button class="icon-btn" data-act="remove-friend" data-id="${p.id}" data-name="${esc(p.username)}" aria-label="Remover aliado">${icon('trash')}</button>`)).join('')}</ul>`
        : '<p class="muted empty">Nenhum aliado ainda.</p>'}
      ${fr.outgoing.length ? `<h2 class="panel-title">Aguardando resposta</h2><ul class="ally-list">${fr.outgoing.map((p) => person(p,
        `<span class="muted small">pendente</span><button class="icon-btn" data-act="remove-friend" data-id="${p.id}" aria-label="Cancelar">${icon('x')}</button>`)).join('')}</ul>` : ''}
    </article>
  </div>`;
}

function offlinePanel() {
  return `<section class="view-guild">
    <header class="view-head"><div class="kicker">[ GUILDA ]</div><h1 class="view-title">Modo solo ativo</h1></header>
    <article class="panel offline-panel">
      ${icon('lock', 'big')}
      <p>O app está rodando <b>offline</b>: seus dados ficam só neste aparelho. Para jogar com amigos (ranking, feed e hype),
      conecte o servidor gratuito <b>Supabase</b>. Leva uns 5 minutos:</p>
      <ol class="steps">
        <li><span>Crie um projeto grátis em <b>supabase.com</b>.</span></li>
        <li><span>No <b>SQL Editor</b>, cole e rode o arquivo <code>supabase/schema.sql</code>.</span></li>
        <li><span>Copie a <b>Project URL</b> e a <b>anon key</b> (Settings → API) para <code>js/config.js</code>.</span></li>
        <li><span>Publique a pasta de graça (GitHub Pages ou Netlify) e mande o link para os amigos.</span></li>
      </ol>
      <p class="muted small">O passo a passo completo está no <code>README.md</code>. Dica: antes de trocar para online, use Perfil → Exportar para salvar um backup.</p>
    </article></section>`;
}
