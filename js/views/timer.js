import { esc } from '../util.js';
import { icon } from '../ui/icons.js';
import { PRESETS, buildPhases, totalSeconds, intervalStatus, elapsedMs, tempoTotal, platform, IOS_SHORTCUT } from '../timer.js';

const MODES = [['interval', 'Intervalos'], ['stopwatch', 'Cronômetro'], ['countdown', 'Temporizador'], ['alarm', 'Alarmes']];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const clock = (ms, withCs = false) => {
  const neg = ms < 0;
  const t = Math.abs(ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  const base = `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${neg ? '-' : ''}${base}${withCs ? `<small>.${String(cs).padStart(2, '0')}</small>` : ''}`;
};

const PHASE_COLOR = { prep: '#ffc53d', work: '#3dff9a', rest: '#00e5ff', setrest: '#a66bff' };

export function renderTimer(t, alarms) {
  return `<div class="timer-tool" data-dbltap="timer">
    <div class="seg seg-inline timer-modes">${MODES.map(([id, label]) =>
      `<button class="seg-btn ${t.mode === id ? 'on' : ''}" data-act="timer-mode" data-mode="${id}">${label}</button>`).join('')}</div>
    ${t.mode === 'alarm' ? alarmsPanel(alarms) : `<article class="panel timer-panel">${display(t)}${controls(t)}</article>${config(t)}`}
  </div>`;
}

function display(t) {
  const ms = elapsedMs(t);
  if (t.mode === 'stopwatch') {
    return `<div class="timer-face"><div class="timer-big mono" data-timer-main>${clock(ms, true)}</div>
      ${t.laps.length ? `<ol class="laps">${t.laps.map((l, i) => `<li><span>Volta ${t.laps.length - i}</span><b class="mono">${clock(l.split, true)}</b><span class="muted mono">${clock(l.total)}</span></li>`).join('')}</ol>` : ''}</div>`;
  }
  if (t.mode === 'countdown') {
    const left = Math.max(0, t.countdown * 1000 - ms);
    return `<div class="timer-face"><div class="timer-big mono ${t.finished ? 'done' : ''}" data-timer-main>${clock(left)}</div>
      <div class="bar bar-thin" style="--c:#00e5ff"><i data-timer-bar style="width:${t.countdown ? (1 - left / (t.countdown * 1000)) * 100 : 0}%"></i></div></div>`;
  }
  const st = intervalStatus(t.interval, ms / 1000);
  const c = t.interval;
  const color = st.done ? '#3dff9a' : PHASE_COLOR[st.phase.type];
  return `<div class="timer-face" style="--pc:${color}">
    ${c.name ? `<div class="kicker">${esc(c.name)}</div>` : ''}
    <div class="timer-phase" data-timer-phase>${st.done ? 'CONCLUÍDO' : esc(st.phase.label)}</div>
    <div class="timer-big mono" data-timer-main>${clock(st.left * 1000)}</div>
    <div class="timer-rep" data-timer-rep>${st.rep != null ? `Rep ${st.rep} · ${st.repPart}` : ''}</div>
    <div class="timer-meta mono" data-timer-meta>${st.done ? '' : `Rodada ${st.phase.round || '—'}/${c.rounds}${c.sets > 1 ? ` · Série ${st.phase.set}/${c.sets}` : ''} · falta ${clock(st.totalLeft * 1000)}`}</div>
    <div class="timer-next muted small" data-timer-next>${st.next ? `A seguir: ${esc(st.next.label)} ${st.next.s}s` : ''}</div>
  </div>`;
}

function controls(t) {
  return `<div class="timer-controls">
    <button class="btn btn-ghost" data-act="timer-reset">${icon('refresh')} Zerar</button>
    <button class="btn timer-go" data-act="timer-toggle">${t.running ? 'Pausar' : elapsedMs(t) ? 'Continuar' : 'Iniciar'}</button>
    ${t.mode === 'stopwatch' ? `<button class="btn btn-ghost" data-act="timer-lap" ${t.running ? '' : 'disabled'}>Volta</button>` : ''}
  </div>
  <p class="dbltap-hint muted small">${icon('refresh')}<span>Toque <b>duas vezes</b> em qualquer lugar da tela para ${t.running ? 'pausar' : 'iniciar'}</span></p>`;
}

const field = (name, label, value, min, max, step = 1, unit = 's') =>
  `<label>${label}<span class="num-wrap"><input type="number" name="${name}" value="${value}" min="${min}" max="${max}" step="${step}" data-timer-field><em>${unit}</em></span></label>`;

function config(t) {
  if (t.mode === 'stopwatch') return '';
  if (t.mode === 'countdown') {
    return `<article class="panel"><h2 class="panel-title">${icon('bolt')} Tempo</h2>
      <div class="chip-row">${[30, 45, 60, 90, 120, 180, 300, 600].map((s) => `<button class="fchip ${t.countdown === s ? 'on' : ''}" data-act="timer-cd" data-s="${s}">${s < 60 ? `${s}s` : `${s / 60} min`}</button>`).join('')}</div>
      <form class="form form-row" data-form="timer-cd">${field('min', 'Minutos', Math.floor(t.countdown / 60), 0, 180, 1, 'min')}${field('sec', 'Segundos', t.countdown % 60, 0, 59)}</form></article>`;
  }
  const c = t.interval;
  const total = totalSeconds(c);
  return `<article class="panel">
    <h2 class="panel-title">${icon('refresh')} Ciclos</h2>
    <div class="chip-row">${PRESETS.map((p) => `<button class="fchip" data-act="timer-preset" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div>
    <form class="form timer-form" data-form="timer-interval">
      <div class="form-row">${field('prep', 'Preparo', c.prep, 0, 600)}${field('work', 'Trabalho', c.work, 5, 3600)}</div>
      <div class="form-row">${field('rest', 'Descanso', c.rest, 0, 3600)}${field('rounds', 'Rodadas', c.rounds, 1, 99, 1, '×')}</div>
      <div class="form-row">${field('sets', 'Séries (blocos)', c.sets, 1, 20, 1, '×')}${field('setRest', 'Descanso entre séries', c.setRest, 0, 3600)}</div>
      <label class="chk"><input type="checkbox" name="tempo_on" ${c.tempo ? 'checked' : ''} data-timer-field>
        <span>Mostrar cadência por repetição na tela (descida · pausa · subida)</span></label>
      <div class="form-row form-row-3" ${c.tempo ? '' : 'hidden'} data-tempo-row>
        ${field('t_down', 'Descida', c.tempo?.down ?? 2, 0, 10)}${field('t_hold', 'Pausa', c.tempo?.hold ?? 0, 0, 10)}${field('t_up', 'Subida', c.tempo?.up ?? 1, 0, 10)}
      </div>
      ${c.tempo ? `<p class="muted small">≈ ${Math.floor(c.work / tempoTotal(c.tempo))} reps por fase de trabalho.</p>` : ''}
    </form>
    <p class="muted small">Duração total: <b class="mono">${clock(total * 1000)}</b> · ${buildPhases(c).length} fases</p>
  </article>`;
}

function alarmsPanel(alarms) {
  const os = platform();
  const rotina = alarms.filter((a) => a.group === 'rotina').length;
  alarms = alarms.filter((a) => a.group !== 'rotina');
  return `<article class="panel">
    ${rotina ? `<p class="small">${icon('refresh')} ${rotina} alarmes da rotina (água, pausas, refeições) — gerencie em <button class="link-btn" data-act="go" data-view="health">Saúde → Rotina</button>.</p>` : ''}
    <h2 class="panel-title">${icon('bolt')} Alarmes de treino</h2>
    <ul class="alarm-list">${alarms.map((a) => `<li class="alarm ${a.on ? '' : 'off'}">
      <b class="mono alarm-time">${a.time}</b>
      <div><div>${esc(a.label || 'Treino')}</div><div class="muted small">${a.days?.length ? a.days.map((d) => DAYS[d]).join(' ') : 'Todos os dias'}</div></div>
      <label class="switch"><input type="checkbox" data-act="alarm-toggle" data-id="${a.id}" ${a.on ? 'checked' : ''}><span></span></label>
      <button class="icon-btn" data-act="alarm-del" data-id="${a.id}" aria-label="Excluir">${icon('trash')}</button>
      ${os !== 'desktop' ? `<button class="btn btn-sm alarm-native" data-act="alarm-native" data-id="${a.id}">${icon('bolt')} Pôr no relógio do celular</button>` : ''}</li>`).join('') || '<li class="muted">Nenhum alarme.</li>'}</ul>
    <form class="form" data-form="alarm-add">
      <div class="form-row"><label>Horário<input type="time" name="time" required value="18:00"></label>
        <label>Nome<input name="label" maxlength="30" placeholder="Treino de pernas"></label></div>
      <fieldset><legend>Dias</legend><div class="day-pick">${DAYS.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${i >= 1 && i <= 5 ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></fieldset>
      <button class="btn" type="submit">${icon('plus')} Adicionar alarme</button>
    </form>
    <div class="alert alert-info">${icon('eye')}<p>Dentro do app o alarme só toca com ele <b>aberto</b>. Para tocar com o celular bloqueado, use <b>Pôr no relógio do celular</b>
      ${os === 'android' ? '(abre o app Relógio já preenchido — confirme e escolha os dias de repetição).' : os === 'ios' ? '(usa o Atalho da Apple configurado abaixo).' : '(abra o app no celular para ver essa opção).'}
      Também dá para exportar para o calendário.</p></div>
    ${os !== 'android' ? `<details class="guide"><summary>${icon('eye')} iPhone: configurar o atalho "${IOS_SHORTCUT}" (uma única vez)</summary><ol class="ex-steps">
      <li>Abra o app <b>Atalhos</b> → toque em <b>+</b> e dê o nome <b>${IOS_SHORTCUT}</b> (exatamente assim).</li>
      <li>Toque no ícone de informações (ⓘ) e ative <b>Aceitar entrada</b> com o tipo <b>Texto</b> (entrada do atalho).</li>
      <li>Adicione a ação <b>Dividir Texto</b>: dividir a <b>Entrada do Atalho</b> por <b>Personalizado</b> → <b>|</b></li>
      <li>Adicione <b>Obter Item da Lista</b> → <b>Primeiro item</b> e depois a ação <b>Criar Alarme</b>: Hora = esse item.</li>
      <li>Em <b>Criar Alarme</b>, toque em <b>Rótulo</b> → escolha o <b>Último item</b> da lista dividida. Salve.</li>
      <li>Volte ao ASCEND e toque em <b>Pôr no relógio do celular</b>: o iPhone pede permissão na 1ª vez e cria o alarme.</li>
    </ol></details>` : ''}
    <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="alarm-ics" ${alarms.some((a) => a.on) ? '' : 'disabled'}>${icon('download')} Exportar para o calendário (.ics)</button>
      <button class="btn btn-ghost btn-sm" data-act="alarm-notify">${icon('bolt')} Permitir notificações</button></div>
  </article>`;
}

/** Mini-timer flutuante (aparece em qualquer tela enquanto o timer roda). */
export function timerPill(t) {
  if (!t || (!t.running && !elapsedMs(t)) || t.mode === 'alarm' || t.finished) return '';
  return `<div class="timer-pill ${t.running ? '' : 'paused'}">
    <button class="timer-pill-main" data-act="go" data-view="timer">${icon('refresh', t.running ? 'spin' : '')}<span data-pill-label></span><b class="mono" data-pill-time></b></button>
    <button class="icon-btn" data-act="timer-toggle" aria-label="${t.running ? 'Pausar' : 'Continuar'}">${t.running ? '❚❚' : '▶'}</button>
  </div>`;
}
