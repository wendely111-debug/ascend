import { esc, dayKey } from '../util.js';
import { icon } from '../ui/icons.js';
import { DEFAULT_ROUTINE } from '../routine.js';
import { pendingSleep, bedtimeFor, fmtSleep, sleepVerdict } from '../sleep.js';

const hhmm = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Cartão "Estou indo dormir" / "Acordei" (Status e Saúde). */
export function sleepCard(state, { cls = '' } = {}) {
  const cfg = { ...DEFAULT_ROUTINE, ...(state.health?.data?.routine ?? {}) };
  const p = pendingSleep(state.checkins);
  if (p) {
    return `<article class="panel sleep-card sleeping ${cls}">
      <div class="sleep-head">${icon('moon')}<div><div class="kicker">[ MODO SONO ]</div>
        <b>Dormindo desde ${hhmm(p.bedAt)}</b>
        <small class="muted">há <span class="mono" data-live-since="${esc(p.bedAt)}"></span> · despertar previsto ${esc(cfg.wake)}</small></div></div>
      <div class="btn-row">
        <button class="btn btn-lg sleep-btn wake" data-act="sleep-wake">${icon('sun')} Acordei</button>
        <button class="btn btn-ghost btn-sm" data-act="sleep-cancel">Cancelar</button>
      </div>
    </article>`;
  }
  const c = state.checkins[dayKey()]?.data;
  const last = c?.sleep_from && c?.wake_at ? c : null;
  const v = last ? sleepVerdict(Number(last.sleep_h)) : null;
  return `<article class="panel sleep-card ${cls}">
    <div class="sleep-head">${icon('moon')}<div><div class="kicker">[ SONO ]</div>
      ${last ? `<b>Última noite: ${fmtSleep(Number(last.sleep_h))}</b>
        <small class="muted">${hhmm(last.sleep_from)} → ${hhmm(last.wake_at)} · <span class="${v.cls}">${v.txt}</span></small>`
        : `<b>Registre seu sono com 2 toques</b>
        <small class="muted">Para 8 h de sono e acordar às ${esc(cfg.wake)}, deite às ${bedtimeFor(cfg.wake, 8)}.</small>`}</div></div>
    <div class="btn-row">
      <button class="btn btn-lg sleep-btn" data-act="sleep-start">${icon('moon')} Estou indo dormir</button>
    </div>
  </article>`;
}
