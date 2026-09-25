import { esc, fmt, timeAgo } from '../util.js';
import { ATTRS, ATTR_KEYS, CLASSES, attrLevel, rankFor } from '../game.js';
import { avatar, rankBadge, radar, heatmap, progressRing } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { STATUS, FLAGS, SUSPICIOUS } from '../rules.js';
import { ACHIEVEMENTS } from '../game.js';
import { trustBadge } from './audit.js';
import { PENDING_LABELS } from './assessment.js';

const KIND_ICON = { workout: 'dumbbell', bonus: 'star', meal: 'food', assessment: 'scale', quest: 'check' };

export function activityRow(a) {
  const at = ATTRS[a.attr];
  const st = STATUS[a.status] ?? STATUS.self;
  const hasProof = a.proof_ids?.length;
  return `<li class="log-row ${a.status === 'rejected' ? 'rejected' : ''}" style="--c:${at.color}">
    <span class="log-ico">${icon(KIND_ICON[a.kind] ?? 'check')}</span>
    <span class="log-title">${esc(a.title)}${a.meta?.minutes ? ` <small class="muted">· ${a.meta.minutes} min</small>` : ''}</span>
    <span class="chip chip-attr">${at.short}</span>
    <span class="log-xp">+${fmt(a.xp)}</span>
    <span class="log-time muted">${timeAgo(a.created_at)}
      <button class="st ${st.cls}" ${hasProof ? `data-act="proof-view" data-ids="${a.proof_ids.join(',')}" data-title="${esc(a.title)}"` : 'disabled'} title="${esc(st.label)}">${icon(st.icon)}<span>${esc(st.label)}</span></button>
      ${(a.flags || []).filter((f) => SUSPICIOUS.includes(f) || f === 'sem_prova').map((f) => `<span class="flag" title="${esc(FLAGS[f])}">${esc(FLAGS[f])}</span>`).join('')}
    </span></li>`;
}

export function renderStatus({ state, d }) {
  const p = state.profile;
  const cls = CLASSES[p.hero_class];
  const r = rankFor(d.level.level);
  const doneCount = d.doneIds.size;
  const qTotal = state.quests.length;

  const attrBars = ATTR_KEYS.map((k) => {
    const xp = d.stats.byAttr[k] || 0;
    const lv = attrLevel(xp);
    const base = 25 * (lv - 1) ** 2, next = 25 * lv ** 2;
    const pct = ((xp - base) / (next - base)) * 100;
    return `<div class="attr-row" style="--c:${ATTRS[k].color}">
      <span class="attr-name">${ATTRS[k].name}${cls.attr === k ? ` <small class="class-tag">CLASSE</small>` : ''}</span>
      <span class="attr-lv">LV ${lv}</span>
      <div class="bar bar-thin"><i style="width:${pct}%"></i></div></div>`;
  }).join('');

  return `<section class="view-status grid">
    <article class="panel player-card span-2" style="--rc:${r.color}">
      <div class="player-top">
        ${avatar(p, 'lg')}
        <div class="player-id">
          <div class="kicker">CAÇADOR · ${esc(cls.name.toUpperCase())}</div>
          <h1 class="player-name">${esc(p.username)}</h1>
          <div class="player-title">${rankBadge(d.level.level)} <span>${r.title}</span></div>
        </div>
        <div class="player-level"><span class="lv-label">NÍVEL</span><span class="lv-num">${d.level.level}</span></div>
      </div>
      <div class="xp-block">
        <div class="xp-head"><span>XP</span><span class="mono">${fmt(d.level.into)} / ${fmt(d.level.need)}</span></div>
        <div class="bar bar-xp"><i style="width:${d.level.pct * 100}%"></i></div>
        <div class="xp-foot muted mono">TOTAL ${fmt(d.stats.total)} XP</div>
      </div>
      <div class="stat-chips">
        <div class="stat-chip ${d.stats.streak ? 'hot' : ''}">${icon('flame')}<b>${d.stats.streak}</b><span>sequência</span></div>
        <div class="stat-chip">${icon('trophy')}<b>${d.stats.best}</b><span>recorde</span></div>
        <div class="stat-chip">${icon('bolt')}<b>${fmt(d.todayXp)}</b><span>XP hoje</span></div>
        <div class="stat-chip">${icon('dumbbell')}<b>${d.stats.workouts}</b><span>treinos</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-sm btn-ghost" data-act="go" data-view="audit">${trustBadge(d.trust)} Auditoria</button>
        <button class="btn btn-sm btn-ghost" data-act="go" data-view="achievements">${icon('trophy')} Conquistas ${d.unlocked.size}/${ACHIEVEMENTS.length}</button>
      </div>
    </article>

    ${state.health?.data?.pending?.length ? `<article class="panel span-3 reassess pending-card">${icon('eye')}<div><b>Avaliação incompleta — resultados imprecisos</b>
      <p class="muted small">Faltam: ${state.health.data.pending.map((k) => esc(PENDING_LABELS[k] ?? k)).join(', ')}. Suas metas e seu cardápio são estimativas até você completar.</p></div>
      <button class="btn btn-sm" data-act="assess-complete">Completar agora</button></article>` : ''}
    ${d.reassessDue ? `<article class="panel span-3 reassess">${icon('scale')}<div><b>Hora da reavaliação</b>
      <p class="muted small">Sua última avaliação foi há ${d.reassessDue} dias. Reavalie para ajustar metas e cardápio (+30 XP).</p></div>
      <button class="btn btn-sm" data-act="assess-new">Reavaliar</button></article>` : ''}
    <article class="panel today-card">
      <h2 class="panel-title">${icon('quests')} Hoje</h2>
      <div class="today-body">
        ${progressRing(qTotal ? doneCount / qTotal : 0, `<b>${doneCount}</b>/${qTotal}`)}
        <div class="today-info">
          <p>${doneCount === qTotal && qTotal ? '<span class="good">Dia perfeito conquistado.</span>' : `Faltam <b>${qTotal - doneCount}</b> missões.`}</p>
          <p class="muted small">Renova em <span class="mono" data-countdown></span></p>
          <div class="btn-row">
            <button class="btn btn-sm" data-act="go" data-view="quests">Missões</button>
            <button class="btn btn-sm btn-ghost" data-act="workout">${icon('plus')} Treino</button>
          </div>
        </div>
      </div>
    </article>

    <article class="panel attrs-card span-2">
      <h2 class="panel-title">${icon('status')} Atributos</h2>
      <div class="attrs-body">${radar(d.stats.byAttr)}<div class="attr-list">${attrBars}</div></div>
    </article>

    <article class="panel">
      <h2 class="panel-title">${icon('bolt')} Registro recente</h2>
      ${state.activities.length
        ? `<ul class="log">${state.activities.slice(0, 7).map(activityRow).join('')}</ul>`
        : '<p class="muted empty">Nenhuma atividade ainda. Conclua uma missão para despertar.</p>'}
    </article>

    <article class="panel span-3">
      <h2 class="panel-title">${icon('flame')} Atividade · 26 semanas</h2>
      ${heatmap(state.activities, 26)}
      <div class="hm-legend muted small">menos <i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> mais</div>
    </article>
  </section>`;
}
