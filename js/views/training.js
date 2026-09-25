import { esc } from '../util.js';
import { ATTRS, ATTR_KEYS, INTENSITY } from '../game.js';
import {
  PT, EQUIPMENT, MUSCLES, LEVELS, CATEGORIES, GROUPS, EQ_FILTERS,
  exImg, exName, exMachine, getExercise, searchExercises, exercisesLoaded,
} from '../exercises.js';
import { PRESET_ROUTINES } from '../routines.js';
import { icon } from '../ui/icons.js';
import { renderTimer } from './timer.js';
import { fmtKg, e1rm } from '../progression.js';

// ---- Fotos ----------------------------------------------------------------
/** Foto do exercício. animate=true alterna início/fim para mostrar o movimento. */
export function exPhoto(id, { animate = false, size = '' } = {}) {
  const alt = esc(exName(id));
  return `<div class="ex-photo ${size} ${animate ? 'anim' : ''}">
    <img src="${exImg(id, 0)}" alt="${alt} — posição inicial" loading="lazy" decoding="async">
    ${animate ? `<img class="ex-photo-b" src="${exImg(id, 1)}" alt="${alt} — posição final" loading="lazy" decoding="async">
      <span class="ex-photo-tag">${icon('refresh')} execução</span>` : ''}
  </div>`;
}

const eqChip = (id) => {
  const m = exMachine(id);
  return m ? `<span class="eq-chip">${icon('dumbbell')} ${esc(m)}</span>` : '';
};

// ---- Aba Treinos ----------------------------------------------------------
export function renderTraining({ state }) {
  const t = state.training;
  const tabs = [['fichas', 'Fichas'], ['biblioteca', 'Exercícios'], ['timer', 'Timer'], ['progresso', 'Progresso']];
  return `<section class="view-training">
    <header class="view-head"><div class="kicker">[ ARSENAL ]</div><h1 class="view-title">Treinos e exercícios</h1></header>
    ${state.session ? sessionBanner(state.session) : ''}
    <nav class="tabs" role="tablist">${tabs.map(([id, label]) =>
      `<button role="tab" class="tab ${t.tab === id ? 'active' : ''}" data-act="training-tab" data-tab="${id}" aria-selected="${t.tab === id}">${label}</button>`).join('')}</nav>
    ${t.tab === 'fichas' ? fichas(state) : t.tab === 'timer' ? renderTimer(state.timer, state.alarms) : t.tab === 'progresso' ? progress(state) : library(state)}
  </section>`;
}

function sessionBanner(s) {
  return `<button class="panel session-banner" data-act="go" data-view="session">
    ${icon('flame')}<span><b>Treino em andamento</b><small>${esc(s.name)}</small></span><span class="mono" data-elapsed></span>${icon('bolt')}</button>`;
}

function routineCard(r, preset) {
  const sets = r.items.reduce((s, i) => s + Number(i.sets || 0), 0);
  return `<article class="panel routine-card" style="--c:${ATTRS[r.attr]?.color ?? '#00e5ff'}">
    <button class="routine-strip" data-act="routine-open" data-id="${r.id}" aria-label="Ver ${esc(r.name)}">
      ${r.items.slice(0, 4).map((i) => exPhoto(i.ex, { size: 'thumb' })).join('')}
      ${r.items.length > 4 ? `<span class="strip-more">+${r.items.length - 4}</span>` : ''}
    </button>
    <div class="routine-body">
      <h3 class="routine-name">${esc(r.name)}</h3>
      <p class="muted small">${esc(r.desc || `${r.items.length} exercícios`)}</p>
      <div class="routine-meta small"><span>${r.items.length} exercícios</span><span>${sets} séries</span>${r.level ? `<span>${esc(r.level)}</span>` : ''}${preset ? '' : '<span class="good">minha</span>'}</div>
      <div class="btn-row">
        <button class="btn btn-sm" data-act="routine-start" data-id="${r.id}" ${r.items.length ? '' : 'disabled'}>${icon('bolt')} Iniciar</button>
        <button class="btn btn-sm btn-ghost" data-act="routine-open" data-id="${r.id}">Ver exercícios</button>
      </div>
    </div>
  </article>`;
}

function fichas(state) {
  return `<h2 class="section-title">Minhas fichas</h2>
    ${state.routines.length ? `<div class="routine-grid">${state.routines.map((r) => routineCard(r, false)).join('')}</div>`
      : '<p class="muted small">Monte sua própria ficha ou copie uma pronta para ajustar séries e cargas.</p>'}
    <div class="btn-row"><button class="btn btn-ghost" data-act="routine-new">${icon('plus')} Nova ficha</button></div>
    <h2 class="section-title">Fichas prontas</h2>
    <div class="routine-grid">${PRESET_ROUTINES.map((r) => routineCard(r, true)).join('')}</div>`;
}

// ---- Biblioteca -------------------------------------------------------------
export function libraryFilters(t, scope) {
  return `<div class="lib-filters" data-scope="${scope}">
    <label class="search">${icon('quests')}<input type="search" data-lib-q placeholder="Buscar: leg press, supino, costas…" value="${esc(t.q)}" autocomplete="off"></label>
    <div class="chip-row">
      <button class="fchip ${!t.group ? 'on' : ''}" data-act="lib-group" data-v="">Todos</button>
      ${Object.entries(GROUPS).map(([k, g]) => `<button class="fchip ${t.group === k ? 'on' : ''}" data-act="lib-group" data-v="${k}">${g.name}</button>`).join('')}
    </div>
    <div class="chip-row">
      <button class="fchip alt ${!t.eqf ? 'on' : ''}" data-act="lib-eq" data-v="">Qualquer equipamento</button>
      ${Object.entries(EQ_FILTERS).map(([k, f]) => `<button class="fchip alt ${t.eqf === k ? 'on' : ''}" data-act="lib-eq" data-v="${k}">${f.name}</button>`).join('')}
    </div>
  </div>`;
}

export function libraryGrid(t, { pick = false } = {}) {
  if (t.error) return `<p class="panel error-box">${esc(t.error)}</p>`;
  if (!exercisesLoaded()) return `<div class="lib-grid">${'<div class="panel skeleton"></div>'.repeat(6)}</div>`;
  const all = searchExercises(t);
  if (!all.length) return '<p class="muted empty">Nenhum exercício encontrado com esses filtros.</p>';
  const list = all.slice(0, t.limit);
  return `<p class="muted small">${all.length} exercícios</p>
    <div class="lib-grid">${list.map((e) => `<button class="ex-card" data-act="${pick ? 'ex-pick' : 'ex-detail'}" data-id="${esc(e.id)}">
      ${exPhoto(e.id, { size: 'card' })}
      <span class="ex-card-body"><span class="ex-card-name">${esc(exName(e.id))}</span>
        <span class="ex-card-meta">${esc(PT[e.id]?.m ?? EQUIPMENT[e.eq])} · ${esc(e.pm.map((m) => MUSCLES[m]).join(', '))}</span></span>
      ${pick ? `<span class="ex-card-pick">${icon('plus')}</span>` : ''}
    </button>`).join('')}</div>
    ${all.length > list.length ? `<div class="btn-row center"><button class="btn btn-ghost" data-act="lib-more">Carregar mais (${all.length - list.length})</button></div>` : ''}`;
}

function library(state) {
  return `${libraryFilters(state.training, 'training')}<div data-lib-grid="training">${libraryGrid(state.training)}</div>
    <p class="credit muted small">Fotos e dados: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (domínio público).</p>`;
}

export function pickerModal(t, title) {
  return `<h3 class="modal-title">${esc(title)}</h3>
    ${libraryFilters(t, 'picker')}
    <div data-lib-grid="picker">${libraryGrid(t, { pick: true })}</div>
    <div class="modal-actions"><button class="btn btn-ghost" data-act="picker-cancel">Voltar</button></div>`;
}

// ---- Detalhe do exercício -------------------------------------------------------
export function exerciseDetail(id, { canAdd = true } = {}) {
  const e = getExercise(id);
  const pt = PT[id];
  const steps = pt?.d ?? e?.ins ?? [];
  const row = (label, value) => (value ? `<div class="info-row"><span>${label}</span><b>${value}</b></div>` : '');
  return `<div class="ex-detail">
    ${exPhoto(id, { animate: true, size: 'hero' })}
    <div class="ex-stills">
      <figure><img src="${exImg(id, 0)}" alt="Posição inicial" loading="lazy"><figcaption>1 · Posição inicial</figcaption></figure>
      <figure><img src="${exImg(id, 1)}" alt="Posição final" loading="lazy"><figcaption>2 · Posição final</figcaption></figure>
    </div>
    <h3 class="ex-title">${esc(exName(id))}</h3>
    ${pt && e ? `<p class="muted small ex-orig">${esc(e.name)}</p>` : ''}
    <div class="machine-box">${icon('dumbbell')}<div><span>Aparelho / equipamento</span><b>${esc(exMachine(id) || '—')}</b></div></div>
    <div class="info-grid">
      ${e ? row('Músculo principal', esc(e.pm.map((m) => MUSCLES[m]).join(', '))) : ''}
      ${e?.sm.length ? row('Secundários', esc(e.sm.map((m) => MUSCLES[m]).join(', '))) : ''}
      ${e ? row('Nível', LEVELS[e.lvl]) : ''}
      ${e ? row('Tipo', `${CATEGORIES[e.cat]}${e.mech ? ` · ${e.mech === 'compound' ? 'multiarticular' : 'isolado'}` : ''}`) : ''}
    </div>
    ${steps.length ? `<h4 class="sub-title">Como executar</h4>
      ${!pt ? '<p class="muted small">Tradução ainda não disponível. Instruções originais em inglês:</p>' : ''}
      <ol class="ex-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${canAdd ? `<div class="modal-actions"><button class="btn" data-act="ex-add-routine" data-id="${esc(id)}">${icon('plus')} Adicionar a uma ficha</button></div>` : ''}
  </div>`;
}

export function chooseRoutineModal(exId, routines) {
  return `<h3 class="modal-title">Adicionar "${esc(exName(exId))}"</h3>
    <div class="choose-list">
      ${routines.map((r) => `<button class="choose-item" data-act="ex-add-to" data-routine="${r.id}" data-id="${esc(exId)}">${icon('guild')}<span>${esc(r.name)}<small class="muted">${r.items.length} exercícios</small></span>${icon('plus')}</button>`).join('')}
      <button class="choose-item" data-act="ex-add-to" data-routine="" data-id="${esc(exId)}">${icon('plus')}<span>Criar nova ficha</span></button>
    </div>`;
}

// ---- Ficha (detalhe e editor) ---------------------------------------------------
export function routineDetail(r, preset) {
  return `<h3 class="modal-title">${esc(r.name)}</h3>
    ${r.desc ? `<p class="muted">${esc(r.desc)}</p>` : ''}
    <ol class="routine-list">${r.items.map((i, n) => `<li>
      <button class="routine-item" data-act="ex-detail" data-id="${esc(i.ex)}">
        <span class="routine-n">${n + 1}</span>${exPhoto(i.ex, { size: 'thumb' })}
        <span class="routine-item-body"><b>${esc(exName(i.ex, i.name))}</b>
          <small class="muted">${esc(exMachine(i.ex))}</small>
          <small><span class="mono">${i.sets}×${esc(i.reps)}</span> · descanso ${i.rest}s</small></span>
        ${icon('eye')}</button></li>`).join('')}</ol>
    <div class="modal-actions">
      ${preset ? `<button class="btn btn-ghost" data-act="routine-copy" data-id="${r.id}">${icon('copy')} Copiar e editar</button>`
        : `<button class="btn btn-ghost btn-danger" data-act="routine-delete" data-id="${r.id}">${icon('trash')} Excluir</button>
           <button class="btn btn-ghost" data-act="routine-edit" data-id="${r.id}">${icon('edit')} Editar</button>`}
      <button class="btn" data-act="routine-start" data-id="${r.id}" ${r.items.length ? '' : 'disabled'}>${icon('bolt')} Iniciar treino</button>
    </div>`;
}

export function routineEditor(d) {
  return `<h3 class="modal-title">${d.id ? 'Editar ficha' : 'Nova ficha'}</h3>
  <form class="form" data-form="routine">
    <label>Nome da ficha<input name="name" required maxlength="60" value="${esc(d.name)}" placeholder="Ex.: Treino A — Peito"></label>
    <fieldset><legend>Atributo que evolui</legend><div class="seg">
      ${ATTR_KEYS.map((k) => `<label class="seg-opt" style="--c:${ATTRS[k].color}"><input type="radio" name="attr" value="${k}" ${k === d.attr ? 'checked' : ''}><span>${ATTRS[k].short}</span></label>`).join('')}
    </div></fieldset>
    <fieldset><legend>Exercícios (${d.items.length})</legend>
      ${d.items.length ? `<ol class="edit-list">${d.items.map((i, n) => `<li class="edit-item">
        ${exPhoto(i.ex, { size: 'thumb' })}
        <div class="edit-body"><b>${esc(exName(i.ex, i.name))}</b>
          <div class="edit-fields">
            <label>Séries<input name="sets-${n}" type="number" min="1" max="20" value="${i.sets}" required></label>
            <label>Reps<input name="reps-${n}" maxlength="16" value="${esc(i.reps)}" required></label>
            <label>Descanso (s)<input name="rest-${n}" type="number" min="0" max="600" step="5" value="${i.rest}" required></label>
          </div></div>
        <div class="edit-actions">
          <button type="button" class="icon-btn" data-act="draft-move" data-i="${n}" data-dir="-1" ${n ? '' : 'disabled'} aria-label="Subir">▲</button>
          <button type="button" class="icon-btn" data-act="draft-move" data-i="${n}" data-dir="1" ${n < d.items.length - 1 ? '' : 'disabled'} aria-label="Descer">▼</button>
          <button type="button" class="icon-btn" data-act="draft-remove" data-i="${n}" aria-label="Remover">${icon('trash')}</button>
        </div></li>`).join('')}</ol>` : '<p class="muted small">Nenhum exercício ainda.</p>'}
      <button type="button" class="btn btn-ghost btn-sm" data-act="draft-add">${icon('plus')} Adicionar exercício</button>
    </fieldset>
    <div class="modal-actions"><button class="btn" type="submit" ${d.items.length ? '' : 'disabled'}>${icon('check')} Salvar ficha</button></div>
  </form>`;
}

// ---- Modo treino -----------------------------------------------------------------
export function renderSession({ state }) {
  const s = state.session;
  if (!s) return `<p class="panel muted empty">Nenhum treino em andamento.</p>`;
  const total = s.items.reduce((a, i) => a + i.sets, 0);
  const done = s.items.reduce((a, i) => a + i.done, 0);
  return `<section class="view-session">
    <header class="panel session-head">
      ${s.meso ? `<div class="meso-tag ${s.meso.deload ? 'deload' : ''}">${esc(s.meso.label)}</div>` : ''}
      <div class="kicker">[ TREINO EM ANDAMENTO ]</div>
      <h1 class="view-title">${esc(s.name)}</h1>
      <div class="session-stats"><span class="mono big-timer" data-elapsed>00:00</span>
        <span class="muted">${done}/${total} séries</span></div>
      <div class="bar bar-xp"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
      <div class="btn-row">
        <button class="btn" data-act="session-finish">${icon('check')} Finalizar</button>
        <button class="btn btn-ghost btn-danger" data-act="session-cancel">${icon('x')} Cancelar</button>
      </div>
    </header>
    ${proofPanel(s)}
    ${state.rest ? `<div class="rest-bar"><span>${icon('refresh', 'spin')} DESCANSO</span><b class="mono" data-rest></b>
      <button class="btn btn-sm btn-ghost" data-act="rest-skip">Pular</button></div>` : ''}
    <ol class="session-list">${s.items.map((i, n) => {
      const complete = i.done >= i.sets;
      const pt = PT[i.ex];
      const steps = pt?.d ?? getExercise(i.ex)?.ins ?? [];
      return `<li class="panel session-ex ${complete ? 'complete' : ''}">
        <button class="session-photo" data-act="ex-detail" data-id="${esc(i.ex)}" aria-label="Ver detalhes">${exPhoto(i.ex, { animate: true, size: 'session' })}</button>
        <div class="session-body">
          <div class="session-title"><span class="routine-n">${n + 1}</span><h3>${esc(exName(i.ex, i.name))}</h3></div>
          ${eqChip(i.ex)}
          <p class="session-target"><b class="mono">${i.sets} × ${esc(i.reps)}</b> <span class="muted">· descanso ${i.rest}s</span>
            <button class="btn btn-sm btn-ghost" data-act="ex-timer" data-i="${n}">${icon('refresh')} Timer</button></p>
          ${i.sug ? `<p class="load-sug ${i.sug.kind === 'load' ? 'has-load' : ''}">${i.sug.kind === 'load' ? `<b class="mono">${fmtKg(i.sug.kg)} ${esc(i.sug.unit)}</b> ` : ''}<span>${esc(i.sug.text)}</span></p>` : ''}
          ${i.timed ? '' : `<div class="set-inputs">
            <label>Carga<span class="num-wrap"><input type="number" inputmode="decimal" step="0.5" min="0" max="999" value="${i.kg ?? ''}" data-set-kg="${n}"><em>kg</em></span></label>
            <label>Reps<input type="number" inputmode="numeric" min="0" max="100" value="${i.repsNow ?? ''}" data-set-reps="${n}"></label>
            <small class="muted">ajuste antes de tocar na série</small></div>`}
          <div class="set-row">${Array.from({ length: i.sets }, (_, k) => {
            const lg = i.log?.[k];
            return `<button class="set-pill ${k < i.done ? 'on' : ''} ${lg ? 'logged' : ''}" data-act="set-toggle" data-i="${n}" data-k="${k}" aria-pressed="${k < i.done}">${k < i.done ? (lg && lg.kg ? `<small>${fmtKg(lg.kg)}×${lg.reps}</small>` : icon('check')) : k + 1}</button>`;
          }).join('')}</div>
          ${steps.length ? `<details class="how"><summary>Como fazer</summary><ol class="ex-steps">${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>` : ''}
        </div></li>`;
    }).join('')}</ol>
  </section>`;
}

function proofPanel(s) {
  const sp = s.surprise;
  const started = s.proofs?.some((p) => p.label === 'Início');
  const left = sp?.status === 'pending' ? Math.max(0, Math.round((new Date(sp.proof.expires_at) - Date.now()) / 1000)) : 0;
  return `<div class="panel proof-panel">
    <h2 class="panel-title">${icon('shield')} Provas do treino</h2>
    <div class="proof-steps">
      <span class="proof-step ${started ? 'ok' : 'miss'}">${icon(started ? 'check' : 'camera')} Início ${started ? 'enviada' : ''}</span>
      <span class="proof-step ${sp?.status === 'sent' ? 'ok' : sp?.status === 'expired' ? 'bad' : sp ? 'live' : ''}">${icon(sp?.status === 'sent' ? 'check' : sp?.status === 'expired' ? 'x' : 'eye')}
        Surpresa ${sp ? { sent: 'enviada', expired: 'perdida', pending: 'AGORA' }[sp.status] : '(em momento aleatório)'}</span>
      <span class="proof-step ${s.motionOn ? 'ok' : ''}">${icon('refresh')} Sensor ${s.motionOn ? 'ativo' : 'indisponível'}</span>
    </div>
    ${!started ? `<button class="btn btn-sm" data-act="session-proof-start">${icon('camera')} Enviar prova de início</button>` : ''}
    ${sp?.status === 'pending' ? `<div class="surprise">${icon('camera')}<div><b>PROVA SURPRESA</b>
        <span>${esc(sp.proof.challenge)} · <b class="mono" data-surprise-left>${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}</b></span></div>
        <button class="btn btn-sm" data-act="session-proof-surprise">Abrir câmera</button></div>` : ''}
    <p class="muted small">Sem provas o treino vale metade do XP e fica marcado como autodeclarado. Deixe o celular com você (no bolso ou braçadeira) para o sensor registrar o movimento.</p>
  </div>`;
}

export function finishForm(minutes) {
  return `<h3 class="modal-title">Finalizar treino</h3>
  <form class="form" data-form="session-finish">
    <div class="xp-preview">Duração medida: <b class="mono">${minutes} min</b><small class="muted">O servidor usa o próprio relógio (início → agora). Não é possível editar.</small></div>
    <label>Intensidade percebida<select name="intensity">${Object.entries(INTENSITY).map(([k, v]) => `<option value="${k}" ${k === 'moderada' ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <label>Anotação (opcional)<input name="note" maxlength="40" placeholder="Ex.: subi carga no leg press"></label>
    <div class="modal-actions"><button class="btn" type="submit">${icon('bolt')} Registrar e ganhar XP</button></div>
  </form>`;
}

// ---- Progresso de cargas -------------------------------------------------------------
export function progress(state) {
  const by = {};
  for (const l of state.exlogs) (by[l.exercise_id] ??= []).push(l);
  const rows = Object.entries(by).map(([ex, logs]) => {
    logs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const best = (l) => Math.max(...l.sets.map((x) => e1rm(Number(x.kg) || 0, Number(x.reps) || 0)));
    const first = best(logs[0]), last = best(logs.at(-1));
    return { ex, logs, first, last, gain: first ? ((last - first) / first) * 100 : 0 };
  }).sort((a, b) => b.logs.length - a.logs.length);
  if (!rows.length) return '<p class="panel muted empty">Registre carga e repetições no modo treino para acompanhar sua evolução aqui.</p>';
  return `<p class="muted small">1RM estimado (Epley) da melhor série de cada treino. Subir o 1RM ao longo das semanas = sobrecarga progressiva funcionando.</p>
    <div class="progress-list">${rows.map((r) => {
      const pts = r.logs.map((l) => Math.max(...l.sets.map((x) => e1rm(Number(x.kg) || 0, Number(x.reps) || 0))));
      const max = Math.max(...pts), min = Math.min(...pts);
      const W = 220, H = 50;
      const path = pts.map((v, i) => `${i ? 'L' : 'M'}${pts.length > 1 ? (i * W) / (pts.length - 1) : W / 2},${H - 4 - ((v - min) / (max - min || 1)) * (H - 8)}`).join(' ');
      const lastLog = r.logs.at(-1);
      return `<article class="panel prog-card">
        <div class="prog-head">${exPhoto(r.ex, { size: 'thumb' })}<div><b>${esc(exName(r.ex))}</b>
          <small class="muted">${r.logs.length} treino(s) · última: ${lastLog.sets.map((x) => `${fmtKg(x.kg)}×${x.reps}`).join(', ')}</small></div></div>
        <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="var(--cyan)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
        <div class="prog-foot"><span>1RM est.: <b class="mono">${fmtKg(r.last)} kg</b></span>
          <span class="${r.gain > 0 ? 'good' : r.gain < 0 ? 'bad-txt' : 'muted'}">${r.gain > 0 ? '▲' : r.gain < 0 ? '▼' : '='} ${Math.abs(Math.round(r.gain))}%</span></div>
      </article>`;
    }).join('')}</div>`;
}
