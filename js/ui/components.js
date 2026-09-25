import { $, esc, dayKey, addDays, parseDay, fmt } from '../util.js';
import { ATTRS, ATTR_KEYS, CLASSES, attrLevel, rankFor } from '../game.js';
import { icon } from './icons.js';

// ---- Avatar hexagonal ---------------------------------------------------
export function avatar(profile, size = 'md') {
  const cls = CLASSES[profile?.hero_class];
  const color = ATTRS[cls?.attr]?.color ?? '#00e5ff';
  return `<span class="avatar avatar-${size}" style="--c:${color}">${icon(profile?.avatar || 'bolt')}</span>`;
}

export function rankBadge(level) {
  const r = rankFor(level);
  return `<span class="rank-badge" style="--c:${r.color}" title="Rank ${r.rank} · ${r.title}"><span>${r.rank}</span></span>`;
}

// ---- Radar de atributos (pentágono) -------------------------------------
export function radar(byAttr) {
  const size = 240, c = size / 2, R = 88;
  const levels = ATTR_KEYS.map((k) => attrLevel(byAttr[k]));
  const max = Math.max(10, ...levels);
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ATTR_KEYS.length;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const poly = (r) => ATTR_KEYS.map((_, i) => pt(i, r).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${poly(R * f)}" class="radar-ring"/>`).join('');
  const axes = ATTR_KEYS.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" class="radar-axis"/>`; }).join('');
  const shape = ATTR_KEYS.map((_, i) => pt(i, Math.max(0.08, levels[i] / max) * R).join(',')).join(' ');
  const labels = ATTR_KEYS.map((k, i) => {
    const [x, y] = pt(i, R + 20);
    return `<text x="${x}" y="${y}" class="radar-label" fill="${ATTRS[k].color}">${ATTRS[k].short}<tspan x="${x}" dy="13" class="radar-val">${levels[i]}</tspan></text>`;
  }).join('');
  return `<svg class="radar" viewBox="-12 -8 ${size + 24} ${size + 22}" role="img" aria-label="Radar de atributos">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff" stop-opacity=".55"/><stop offset="1" stop-color="#ff2bd6" stop-opacity=".45"/></linearGradient></defs>
    ${rings}${axes}<polygon points="${shape}" class="radar-shape" fill="url(#rg)"/>${labels}</svg>`;
}

// ---- Heatmap de atividade (12 semanas) -----------------------------------
export function heatmap(activities, weeks = 12) {
  const perDay = {};
  for (const a of activities) perDay[a.day] = (perDay[a.day] || 0) + a.xp;
  const today = dayKey();
  const offset = (parseDay(today).getDay() + 6) % 7; // segunda = 0
  const start = addDays(today, -(weeks * 7 - 1) - (6 - offset));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const xp = perDay[d] || 0;
    const lvl = d > today ? -1 : xp === 0 ? 0 : xp < 80 ? 1 : xp < 180 ? 2 : xp < 320 ? 3 : 4;
    cells.push(`<i class="hm l${lvl}" title="${d.split('-').reverse().join('/')} · ${fmt(xp)} XP"></i>`);
  }
  return `<div class="heatmap" style="--weeks:${weeks}">${cells.join('')}</div>`;
}

// ---- Toasts estilo "SISTEMA" --------------------------------------------
export function toast(msg, { type = 'info', title = 'SISTEMA', ms = 3200 } = {}) {
  const root = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<div class="toast-title">[ ${esc(title)} ]</div><div class="toast-msg">${msg}</div>`;
  root.appendChild(el);
  while (root.childElementCount > 3) root.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, ms);
}
export const toastError = (err) => toast(esc(err?.message || err), { type: 'error', title: 'ERRO' });

// ---- Modal ----------------------------------------------------------------
let modalCleanup = null;
export function openModal(html, { onMount, wide = false } = {}) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal panel ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
    <button class="icon-btn modal-close" data-close aria-label="Fechar">${icon('x')}</button>${html}</div></div>`;
  const backdrop = root.firstElementChild;
  const onKey = (e) => e.key === 'Escape' && closeModal();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', onKey);
  modalCleanup = () => document.removeEventListener('keydown', onKey);
  onMount?.(backdrop.querySelector('.modal'));
  backdrop.querySelector('input,select,textarea')?.focus({ preventScroll: true });
}
/** Troca o conteúdo do modal aberto sem repetir a animação (navegação interna). */
export function updateModal(html, { wide } = {}) {
  const modal = $('#modal-root .modal');
  if (!modal) return openModal(html, { wide });
  if (wide !== undefined) modal.classList.toggle('modal-wide', wide);
  modal.innerHTML = `<button class="icon-btn modal-close" data-close aria-label="Fechar">${icon('x')}</button>${html}`;
  modal.scrollTop = 0;
}

export function closeModal() {
  modalCleanup?.();
  modalCleanup = null;
  $('#modal-root').innerHTML = '';
}

export function confirmDialog(text, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    openModal(`<h3 class="modal-title">Confirmação</h3><p class="muted">${text}</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : ''}" data-ok>${esc(ok)}</button></div>`, {
      onMount: (m) => m.querySelector('[data-ok]').addEventListener('click', () => { done = true; closeModal(); resolve(true); }),
    });
    const obs = new MutationObserver(() => { if (!$('#modal-root').childElementCount) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe($('#modal-root'), { childList: true });
  });
}

// ---- Overlay de LEVEL UP -------------------------------------------------
export function levelUpOverlay(level, rankChanged) {
  const r = rankFor(level);
  document.querySelectorAll('.levelup').forEach((x) => x.remove()); // vários níveis de uma vez: mostra só o último
  const el = document.createElement('div');
  el.className = 'levelup';
  el.style.setProperty('--c', r.color);
  const sparks = Array.from({ length: 24 }, (_, i) =>
    `<i style="--a:${(i * 360) / 24}deg;--d:${120 + Math.random() * 160}px;--t:${0.6 + Math.random() * 0.8}s"></i>`).join('');
  el.innerHTML = `<div class="levelup-inner">
      <div class="levelup-sparks">${sparks}</div>
      <div class="levelup-kicker">[ SISTEMA ]</div>
      <div class="levelup-title">LEVEL UP</div>
      <div class="levelup-num">${level}</div>
      ${rankChanged ? `<div class="levelup-rank">NOVO RANK: <b>${r.rank}</b> · ${r.title}</div>` : '<div class="levelup-rank">Seu poder aumentou.</div>'}
      <div class="levelup-hint">toque para continuar</div></div>`;
  el.addEventListener('click', () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); });
  document.body.appendChild(el);
  navigator.vibrate?.([60, 40, 120]);
}

export function progressRing(pct, label) {
  const r = 34, C = 2 * Math.PI * r;
  return `<div class="ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="ring-bg"/>
    <circle cx="40" cy="40" r="${r}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
    <div class="ring-label">${label}</div></div>`;
}
