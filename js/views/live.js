import { esc, fmt, dayKey } from '../util.js';
import { icon } from '../ui/icons.js';
import { hrZones } from '../guide.js';
import { buildRoutine, DEFAULT_ROUTINE, KINDS } from '../routine.js';
import { bluetoothSupport } from '../bluetooth.js';

const n1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const pctBar = (v, max, color) => `<div class="bar bar-thin" style="--c:${color}"><i style="width:${Math.min(100, max ? (v / max) * 100 : 0)}%"></i></div>`;

/** Série de peso: pesagens rápidas + avaliações, em ordem cronológica. */
export function weightSeries(state) {
  return [
    ...state.weighins.map((w) => ({ t: new Date(w.measured_at).getTime(), kg: Number(w.weight_kg), src: w.source })),
    ...state.assessments.filter((a) => !(a.flags || []).includes('peso_estimado')).map((a) => ({ t: new Date(a.created_at).getTime(), kg: Number(a.weight_kg), src: 'avaliacao' })),
  ].sort((a, b) => a.t - b.t);
}

function spark(points) {
  if (points.length < 2) return '<p class="muted small">Registre pesagens para ver a curva.</p>';
  const W = 600, H = 90, P = 8;
  const ys = points.map((p) => p.kg);
  const min = Math.min(...ys) - 0.3, max = Math.max(...ys) + 0.3;
  const t0 = points[0].t, t1 = points.at(-1).t || t0 + 1;
  const x = (t) => P + ((t - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Peso nos últimos 30 dias">
    <path d="${points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--cyan)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    ${points.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.kg)}" r="3.5" fill="${p.src === 'bluetooth' ? 'var(--good)' : p.src === 'avaliacao' ? 'var(--gold)' : 'var(--cyan)'}"/>`).join('')}</svg>`;
}

export function renderLive({ state, d }) {
  const an = d.analysis;
  if (!an) return '<p class="panel muted empty">Faça a avaliação física para ativar o painel ao vivo.</p>';
  const h = state.health.data;
  const today = dayKey();
  const series = weightSeries(state);
  const last = series.at(-1);
  const month = series.filter((p) => p.t > Date.now() - 30 * 86400000);
  const weekAgo = [...series].reverse().find((p) => p.t < Date.now() - 6.5 * 86400000);
  const weight = last?.kg ?? an.weight;
  const hm = an.height / 100;
  const bmi = weight / (hm * hm);
  // Massa magra considerada estável desde a última avaliação → %G atual estimado pelo peso novo.
  const lbm = an.lbm;
  const bfNow = lbm != null ? Math.max(3, ((weight - lbm) / weight) * 100) : null;
  const lastAssess = state.assessments[0];
  const assessDays = lastAssess ? Math.floor((Date.now() - new Date(lastAssess.created_at)) / 86400000) : null;

  // Energia do dia
  const tg = d.target;
  const checked = new Set(d.todayActs.filter((a) => a.kind === 'meal').map((a) => a.meta?.slot));
  const eaten = d.plan.meals.filter((m) => checked.has(m.id));
  const cons = eaten.reduce((s, m) => ({ k: s.k + m.macros.k, p: s.p + m.macros.p, c: s.c + m.macros.c, f: s.f + m.macros.f }), { k: 0, p: 0, c: 0, f: 0 });
  const burned = (d.daily?.exercise ?? 0) + (d.daily?.stepsKcal ?? 0);
  const water = Number(state.checkins[today]?.data?.water_ml) || 0;
  const hide = an.hideNumbers;

  // Rotina: próximo evento
  const cfg = { ...DEFAULT_ROUTINE, ...(h.routine ?? {}) };
  const ev = buildRoutine(cfg, h, an, d.plan).filter((e) => e.kind !== 'work');
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const next = ev.find((e) => e.m % 1440 > nowMin) ?? ev[0];
  const lastMeal = d.todayActs.filter((a) => a.kind === 'meal').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const live = state.live;
  const bt = bluetoothSupport();
  const z = hrZones(an.age, state.guide.restHr);
  const hr = live.hr;
  const zone = hr?.bpm ? z.zones.find((x) => hr.bpm >= x.lo && hr.bpm <= x.hi) ?? (hr.bpm > z.max * 0.9 ? z.zones[4] : null) : null;

  return `<div class="live">
    <div class="live-top"><span class="live-dot"></span><b>AO VIVO</b><span class="mono muted" data-live-clock></span>
      <span class="muted small">atualiza sozinho · dados deste aparelho e da sua conta</span></div>

    <div class="grid grid-2">
      <article class="panel live-card">
        <h2 class="panel-title">${icon('scale')} Corpo agora</h2>
        <div class="live-weight"><b class="mono">${n1(weight)}</b><span>kg</span>
          ${weekAgo ? `<span class="delta ${weight - weekAgo.kg <= 0 ? 'down' : 'up'}">${weight - weekAgo.kg > 0 ? '▲' : '▼'} ${n1(Math.abs(weight - weekAgo.kg))} kg em 7 dias</span>` : ''}</div>
        <p class="muted small">Última pesagem: ${last ? new Date(last.t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
          ${last?.src === 'bluetooth' ? '· balança Bluetooth' : last?.src === 'avaliacao' ? '· avaliação' : ''}</p>
        <div class="metrics">
          <div class="metric"><span>IMC</span><b>${n1(bmi)}</b></div>
          <div class="metric"><span>% gordura</span><b>${bfNow != null ? `${n1(bfNow)}%` : '—'}</b><small>${bfNow != null ? 'estimado pelo peso' : 'meça na avaliação'}</small></div>
          <div class="metric"><span>Massa magra</span><b>${lbm != null ? `${n1(lbm)} kg` : '—'}</b><small>última avaliação</small></div>
          <div class="metric"><span>Massa gorda</span><b>${bfNow != null ? `${n1(weight - lbm)} kg` : '—'}</b></div>
          <div class="metric"><span>Cintura</span><b>${an.waist ? `${n1(an.waist)} cm` : '—'}</b><small>${an.whtr ? `cintura/altura ${n1(an.whtr)}` : ''}</small></div>
          <div class="metric"><span>Avaliação</span><b>${assessDays != null ? `${assessDays} d` : '—'}</b><small>${assessDays >= 14 ? '<span class="bad-txt">reavalie</span>' : 'atrás'}</small></div>
        </div>
        ${spark(month)}
        <p class="muted small"><span style="color:var(--cyan)">●</span> manual · <span class="good">●</span> Bluetooth · <span style="color:var(--gold)">●</span> avaliação</p>
        <form class="form form-inline weigh-form" data-form="weigh-in">
          <span class="num-wrap"><input type="number" name="kg" step="0.1" min="25" max="350" inputmode="decimal" placeholder="Peso de hoje" required><em>kg</em></span>
          <button class="btn btn-sm" type="submit">${icon('check')} Registrar</button>
        </form>
        ${bt.ok ? `<button class="btn btn-sm btn-ghost" data-act="bt-scale">${icon('scale')} ${live.scale ? `Balança: ${esc(live.scale.name)} — suba nela` : 'Conectar balança Bluetooth'}</button>` : ''}
        <p class="muted small">Dica: pese-se sempre ao acordar, após o banheiro e antes de comer.</p>
      </article>

      <article class="panel live-card">
        <h2 class="panel-title">${icon('heart')} Coração ao vivo</h2>
        ${hr?.bpm ? `<div class="hr-live" style="--zc:${zone ? ['#7b8cae', '#3dff9a', '#ffc53d', '#ff8a3d', '#ff3d71'][zone.n - 1] : 'var(--cyan)'}">
            <span class="hr-heart">${icon('heart')}</span><b class="mono" data-live-bpm>${hr.bpm}</b><span>bpm</span></div>
          <p class="hr-zone" data-live-zone>${zone ? `Zona ${zone.n} · ${esc(zone.name)}` : 'Abaixo da zona 1 (repouso)'}</p>
          <div class="hr-chart" data-live-hrchart>${hrChart(hr.samples, z.max)}</div>
          <p class="muted small mono" data-live-hrstats>mín ${hr.min} · méd ${Math.round(hr.sum / hr.n)} · máx ${hr.max} · ${esc(hr.name)}</p>
          <button class="btn btn-sm btn-ghost" data-act="bt-hr-stop">${icon('x')} Desconectar</button>`
        : bt.ok ? `<p class="muted small">Conecte uma cinta ou relógio que transmita frequência cardíaca por Bluetooth (Polar, Garmin HRM, Wahoo, Coospo…). No relógio, ative o modo "transmitir FC".</p>
            <button class="btn" data-act="bt-hr">${icon('heart')} Conectar sensor cardíaco</button>`
        : `<div class="alert alert-info">${icon('eye')}<p>${bt.why === 'ios'
            ? 'O Safari do iPhone não permite Bluetooth em sites. Para FC e balança ao vivo, use o Chrome num Android ou no computador. No iPhone, lance o peso manualmente.'
            : 'Este navegador não suporta Bluetooth. Use o Chrome no Android ou no computador.'}</p></div>`}
        <p class="muted small">Sua FC máx. estimada: ${z.max} bpm · zonas ${esc(z.method)}.</p>
      </article>

      ${hide ? '' : `<article class="panel live-card">
        <h2 class="panel-title">${icon('food')} Energia de hoje</h2>
        <div class="energy">
          <div><span>Consumido</span><b class="mono">${fmt(cons.k)}</b></div>
          <div><span>Meta de hoje</span><b class="mono">${fmt(tg.kcal)}</b></div>
          <div><span>Restam</span><b class="mono ${tg.kcal - cons.k < 0 ? 'bad-txt' : 'good'}">${fmt(tg.kcal - cons.k)}</b></div>
          <div><span>Gasto em exercício</span><b class="mono">${fmt(burned)}</b></div>
        </div>
        ${pctBar(cons.k, tg.kcal, '#ffc53d')}
        <div class="mini-macros">
          <span>P <b>${Math.round(cons.p)}</b>/${tg.protein} g</span>${pctBar(cons.p, tg.protein, '#ff3d71')}
          <span>C <b>${Math.round(cons.c)}</b>/${tg.carbs} g</span>${pctBar(cons.c, tg.carbs, '#00e5ff')}
          <span>G <b>${Math.round(cons.f)}</b>/${tg.fat} g</span>${pctBar(cons.f, tg.fat, '#ffc53d')}
        </div>
        <p class="muted small">Consumo = refeições do cardápio com check-in por foto (${eaten.length}/${d.plan.meals.length}). ${lastMeal ? `Última refeição há <b data-live-since="${lastMeal.created_at}"></b>.` : ''}</p>
      </article>`}

      <article class="panel live-card">
        <h2 class="panel-title">${icon('drop')} Hidratação</h2>
        <div class="water"><b class="mono">${(water / 1000).toFixed(2).replace('.', ',')}</b><span>de ${(an.water / 1000).toFixed(1).replace('.', ',')} L</span></div>
        ${pctBar(water, an.water, '#00e5ff')}
        <div class="btn-row">${[200, 300, 500].map((ml) => `<button class="btn btn-sm btn-ghost" data-act="water-add" data-ml="${ml}">+${ml} ml</button>`).join('')}
          ${water ? `<button class="icon-btn" data-act="water-add" data-ml="-200" aria-label="Desfazer 200 ml">−</button>` : ''}</div>
      </article>

      <article class="panel live-card">
        <h2 class="panel-title">${icon('moon')} Recuperação e rotina</h2>
        <div class="metrics">
          <div class="metric"><span>Prontidão</span><b>${d.daily?.readiness ?? '—'}</b><small>${d.daily?.tier ? esc(d.daily.tier.label) : 'faça o check-in'}</small></div>
          <div class="metric"><span>Sono</span><b>${state.checkins[today]?.data?.sleep_h != null ? `${n1(state.checkins[today].data.sleep_h)} h` : '—'}</b></div>
          <div class="metric"><span>Sequência</span><b>${d.stats.streak} d</b></div>
          <div class="metric"><span>XP hoje</span><b>${fmt(d.todayXp)}</b></div>
        </div>
        ${next ? `<div class="next-ev">${icon(KINDS[next.kind].icon)}<div><span class="muted small">Próximo na rotina</span><b>${esc(next.label)} · ${next.time}</b></div>
          <b class="mono" data-live-countdown="${next.m % 1440}"></b></div>` : ''}
      </article>

      <article class="panel live-card">
        <h2 class="panel-title">${icon('refresh')} Movimento ao vivo</h2>
        ${live.motion?.on ? `<div class="motion-gauge"><i data-live-motion style="width:0%"></i></div>
          <div class="metrics"><div class="metric"><span>Passos (app aberto)</span><b class="mono" data-live-steps>${live.motion.steps}</b></div>
          <div class="metric"><span>Intensidade</span><b data-live-intensity>—</b></div></div>
          <button class="btn btn-sm btn-ghost" data-act="motion-stop">${icon('x')} Parar</button>
          <p class="muted small">Estimativa pelo acelerômetro com o celular no bolso. Para passos do dia inteiro, informe no check-in.</p>`
        : `<p class="muted small">Usa o acelerômetro do celular para medir sua atividade agora e contar passos enquanto o app estiver aberto.</p>
          <button class="btn btn-sm" data-act="motion-start">${icon('bolt')} Ativar sensor de movimento</button>`}
      </article>
    </div>
  </div>`;
}

export function hrChart(samples, max) {
  if (!samples?.length) return '';
  const W = 600, H = 70;
  const lo = 50, hi = Math.max(max, 120);
  const pts = samples.map((s, i) => `${((i / Math.max(1, samples.length - 1)) * W).toFixed(1)},${(H - ((s - lo) / (hi - lo)) * H).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="spark"><polyline points="${pts}" fill="none" stroke="var(--bad)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}
