import { esc, fmt } from '../util.js';
import { ATTRS, ATTR_KEYS, INTENSITY, WORKOUT_TYPES, PERFECT_DAY_XP, applyClassBonus, workoutXp } from '../game.js';
import { icon } from '../ui/icons.js';
import { activityRow } from './status.js';
import { exPhoto } from './training.js';
import { exName, exMachine } from '../exercises.js';
import { RULES } from '../rules.js';

export function renderQuests({ state, d }) {
  const cls = state.profile.hero_class;
  const total = state.quests.length;
  const done = d.doneIds.size;
  const perfect = total > 0 && done === total;

  const cards = state.quests.map((q) => {
    const isDone = d.doneIds.has(q.id);
    const xp = applyClassBonus(q.xp, q.attr, cls);
    const at = ATTRS[q.attr];
    return `<li class="quest ${isDone ? 'done' : ''} ${state.pending.has(q.id) ? 'busy' : ''}" style="--c:${at.color}">
      ${q.exercise_id ? `<button class="quest-thumb" data-act="ex-detail" data-id="${esc(q.exercise_id)}" aria-label="Ver como fazer ${esc(q.title)}">
        ${exPhoto(q.exercise_id, { size: 'thumb' })}<span class="quest-thumb-tag">${icon('eye')}</span></button>` : ''}
      <button class="quest-main" data-act="toggle-quest" data-id="${q.id}" aria-pressed="${isDone}">
        <span class="quest-check">${icon('check')}</span>
        <span class="quest-text">
          <span class="quest-title">${esc(q.title)}</span>
          <span class="quest-meta"><span class="chip chip-attr">${at.short}</span> ${fmt(q.target)} ${esc(q.unit)}
            ${q.require_proof ? `<span class="proof-tag" title="Exige prova com foto">${icon('camera')} prova</span>` : ''}</span>
        </span>
        <span class="quest-xp">+${xp}<small>XP</small></span>
      </button>
      <button class="icon-btn quest-edit" data-act="edit-quest" data-id="${q.id}" aria-label="Editar missão">${icon('edit')}</button>
    </li>`;
  }).join('');

  const workouts = d.todayActs.filter((a) => a.kind === 'workout');

  return `<section class="view-quests">
    <header class="panel quest-header">
      <div>
        <div class="kicker">[ MISSÃO DIÁRIA ] · renova em <span class="mono" data-countdown></span></div>
        <h1 class="view-title">Treino para se tornar mais forte</h1>
      </div>
      <div class="quest-progress">
        <div class="bar bar-xp"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
        <span class="mono">${done}/${total}</span>
      </div>
      ${perfect
        ? `<div class="perfect-banner">${icon('star')} DIA PERFEITO · +${PERFECT_DAY_XP} XP de bônus</div>`
        : `<p class="muted small">Complete todas para ganhar <b class="good">+${PERFECT_DAY_XP} XP</b> de bônus. Aviso: a sequência só sobrevive com ao menos 1 atividade por dia.</p>`}
    </header>

    ${total ? `<ul class="quest-list">${cards}</ul>` : '<p class="panel muted empty">Sem missões. Crie a primeira.</p>'}
    <p class="muted small center">${icon('camera')} Missões com <b>prova</b> abrem a câmera ao vivo com um gesto sorteado — seus aliados auditam a foto.</p>
    <div class="btn-row center">
      <button class="btn btn-ghost" data-act="new-quest">${icon('plus')} Nova missão</button>
      <button class="btn btn-ghost" data-act="go" data-view="training">${icon('flame')} Treinar com ficha</button>
      <button class="btn" data-act="workout">${icon('dumbbell')} Registro rápido</button>
    </div>

    <article class="panel">
      <h2 class="panel-title">${icon('dumbbell')} Treinos de hoje</h2>
      ${workouts.length
        ? `<ul class="log">${workouts.map((a) => activityRow(a).replace('</li>',
            `<button class="icon-btn" data-act="del-activity" data-id="${a.id}" aria-label="Remover">${icon('trash')}</button></li>`)).join('')}</ul>`
        : '<p class="muted empty">Nenhum treino registrado hoje.</p>'}
    </article>
  </section>`;
}

export function questForm(q = {}) {
  const attr = q.attr || 'STR';
  return `<h3 class="modal-title">${q.id ? 'Editar missão' : 'Nova missão'}</h3>
  <form class="form" data-form="quest">
    <input type="hidden" name="id" value="${esc(q.id || '')}">
    <label>Nome<input name="title" required maxlength="60" value="${esc(q.title || '')}" placeholder="Ex.: Barra fixa"></label>
    <div class="form-row">
      <label>Meta<input name="target" type="number" min="1" max="100000" required value="${q.target ?? 10}"></label>
      <label>Unidade<input name="unit" maxlength="20" value="${esc(q.unit ?? 'reps')}" placeholder="reps, min, km…"></label>
    </div>
    <fieldset><legend>Atributo</legend><div class="seg">
      ${ATTR_KEYS.map((k) => `<label class="seg-opt" style="--c:${ATTRS[k].color}"><input type="radio" name="attr" value="${k}" ${k === attr ? 'checked' : ''}><span>${ATTRS[k].short}</span></label>`).join('')}
    </div></fieldset>
    <fieldset><legend>Exercício com foto (opcional)</legend>
      <input type="hidden" name="exercise_id" value="${esc(q.exercise_id || '')}">
      ${q.exercise_id
        ? `<div class="picked-ex">${exPhoto(q.exercise_id, { size: 'thumb' })}
            <span><b>${esc(exName(q.exercise_id))}</b><small class="muted">${esc(exMachine(q.exercise_id))}</small></span>
            <button type="button" class="btn btn-sm btn-ghost" data-act="quest-pick-ex">Trocar</button>
            <button type="button" class="icon-btn" data-act="quest-clear-ex" aria-label="Remover exercício">${icon('x')}</button></div>`
        : `<button type="button" class="btn btn-ghost btn-sm" data-act="quest-pick-ex">${icon('plus')} Escolher exercício</button>`}
    </fieldset>
    <label>Recompensa: <b class="mono" data-xp-out>${q.xp ?? 30}</b> XP
      <input name="xp" type="range" min="5" max="200" step="5" value="${q.xp ?? 30}" data-xp-range></label>
    <label class="chk"><input type="checkbox" name="require_proof" value="1" ${(q.require_proof ?? !q.id) ? 'checked' : ''}>
      <span>Exigir <b>prova com foto ao vivo</b> para concluir (recomendado para exercícios)</span></label>
    <p class="muted small">Sem prova, a missão conta como <b>autodeclarada</b> para seus aliados. O servidor limita o XP de missões a 400 por dia.</p>
    <div class="modal-actions">
      ${q.id ? `<button type="button" class="btn btn-danger btn-ghost" data-act="delete-quest" data-id="${q.id}">${icon('trash')} Excluir</button>` : ''}
      <button class="btn" type="submit">${icon('check')} Salvar</button>
    </div>
  </form>`;
}

export function workoutForm(heroClass) {
  return `<h3 class="modal-title">Registrar treino</h3>
  <form class="form" data-form="workout">
    <fieldset><legend>Modalidade</legend><div class="type-grid">
      ${WORKOUT_TYPES.map((t, i) => `<label class="type-opt" style="--c:${ATTRS[t.attr].color}">
        <input type="radio" name="type" value="${t.id}" ${i === 0 ? 'checked' : ''}><span>${t.name}<small>${ATTRS[t.attr].short}</small></span></label>`).join('')}
    </div></fieldset>
    <div class="form-row">
      <label>Duração (min)<input name="minutes" type="number" min="1" max="600" value="45" required></label>
      <label>Intensidade<select name="intensity">
        ${Object.entries(INTENSITY).map(([k, v]) => `<option value="${k}" ${k === 'moderada' ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select></label>
    </div>
    <label>Anotação (opcional)<input name="note" maxlength="40" placeholder="Ex.: PR no supino 100kg"></label>
    <label class="chk chk-strong"><input type="checkbox" name="proof" value="1" checked>
      <span>${icon('camera')} Enviar <b>prova com foto ao vivo</b> agora (XP cheio). Sem prova: metade do XP, marcado como autodeclarado.</span></label>
    <div class="xp-preview">Recompensa estimada <b class="mono" data-workout-xp>${applyClassBonus(workoutXp(45, 'moderada'), 'STR', heroClass)}</b> XP
      <small class="muted">Registro rápido: máx. ${RULES.QUICK_MAX_MIN} min. Para treinos longos e XP máximo, use <b>Treinar com ficha</b> (tempo medido pelo servidor).</small></div>
    <div class="modal-actions"><button class="btn" type="submit">${icon('bolt')} Registrar</button></div>
  </form>`;
}
