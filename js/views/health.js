import { esc, fmt, dayKey, addDays } from '../util.js';
import { icon } from '../ui/icons.js';
import { MARKERS, GROUPS, interpretAll } from '../labs.js';
import { hrZones, cooper, CONDITIONING, SUPPLEMENTS, WHEY_TYPES, WHEY_CHECKLIST, wheyCost } from '../guide.js';
import { weeklyPlan, mesocycle } from '../progression.js';
import { buildRoutine, DEFAULT_ROUTINE, KINDS } from '../routine.js';
import { buildCheckup } from '../checkup.js';
import { renderLive } from './live.js';
import { sleepCard } from './sleep.js';
import { MEDS } from '../medications.js';

const TABS = [['vivo', 'Ao vivo'], ['hoje', 'Hoje'], ['rotina', 'Rotina'], ['checkup', 'Médicos e exames'], ['exames', 'Exames'], ['guia', 'Condicionamento'], ['suple', 'Suplementos']];
const n1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

export function renderHealth({ state, d }) {
  const t = state.healthTab;
  const body = t === 'vivo' ? sleepCard(state) + renderLive({ state, d }) : t === 'hoje' ? today(state, d) : t === 'rotina' ? routine(state, d) : t === 'checkup' ? checkup(state, d) : t === 'exames' ? exams(state) : t === 'guia' ? guide(state, d) : supplements(state);
  return `<section class="view-health">
    <header class="view-head"><div class="kicker">[ SAÚDE E PERFORMANCE ]</div><h1 class="view-title">Corpo em dia</h1></header>
    <nav class="tabs" role="tablist">${TABS.map(([id, l]) => `<button role="tab" class="tab ${t === id ? 'active' : ''}" data-act="health-tab" data-tab="${id}">${l}</button>`).join('')}</nav>
    ${body}
    <p class="muted small disclaimer">Conteúdo educativo baseado em diretrizes (OMS, ACSM, ISSN, SBD, SBC, SBEM). Não substitui consulta médica ou nutricional.</p>
  </section>`;
}

// ---------------- Hoje: check-in + ajuste diário ----------------
const scale = (name, label, value, lo, hi) => `<fieldset><legend>${label}</legend><div class="scale5">
  ${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${name}" value="${v}" ${Number(value) === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}
  </div><div class="scale5-ends muted small"><span>${lo}</span><span>${hi}</span></div></fieldset>`;

function today(state, d) {
  const c = state.checkins[dayKey()]?.data ?? {};
  const dt = d.daily;
  const hide = d.analysis?.hideNumbers;
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(dayKey(), i - 6)).map((day) => ({ day, h: Number(state.checkins[day]?.data?.sleep_h) || 0 }));
  return `${sleepCard(state)}<div class="grid grid-2">
    <article class="panel">
      <h2 class="panel-title">${icon('moon')} Check-in de hoje</h2>
      <form class="form" data-form="checkin">
        <div class="form-row">
          <label>Horas dormidas<span class="num-wrap"><input type="number" name="sleep_h" min="0" max="16" step="0.25" value="${c.sleep_h ?? ''}" required><em>h</em></span></label>
          <label>Passos até agora <small class="muted">(opcional)</small><input type="number" name="steps" min="0" max="80000" step="100" value="${c.steps ?? ''}"></label>
        </div>
        ${scale('sleep_q', 'Qualidade do sono', c.sleep_q ?? 3, 'péssima', 'excelente')}
        ${scale('energy', 'Energia', c.energy ?? 3, 'esgotado', 'no gás')}
        ${scale('stress', 'Estresse', c.stress ?? 3, 'tranquilo', 'muito alto')}
        ${scale('soreness', 'Dor muscular', c.soreness ?? 3, 'nenhuma', 'muita')}
        <button class="btn" type="submit">${icon('check')} ${state.checkins[dayKey()] ? 'Atualizar' : 'Salvar'} check-in</button>
      </form>
    </article>
    <article class="panel">
      <h2 class="panel-title">${icon('bolt')} Ajuste do dia</h2>
      ${dt ? `
        ${dt.readiness != null ? `<div class="readiness"><b class="mono">${dt.readiness}</b><div><span class="lvl ${dt.tier.cls}">${esc(dt.tier.label)}</span><small class="muted">${esc(dt.tier.rpe)}</small></div></div>`
          : '<p class="muted small">Faça o check-in para calcular sua prontidão.</p>'}
        ${hide ? '' : `<div class="metrics">
          <div class="metric"><span>Meta de hoje</span><b>${fmt(dt.kcal)} kcal</b><small>padrão: ${fmt(d.analysis.kcal)} kcal</small></div>
          <div class="metric"><span>Gasto em repouso</span><b>${fmt(dt.restTdee)} kcal</b><small>basal × rotina</small></div>
          <div class="metric"><span>Exercício hoje</span><b>${fmt(dt.exercise)} kcal</b><small>${dt.stepsKcal ? `+ passos ${fmt(dt.stepsKcal)} kcal` : 'treinos registrados'}</small></div>
        </div>
        <div class="macros">
          <div class="macro" style="--c:#ff3d71"><b>${dt.protein} g</b><span>Proteína</span></div>
          <div class="macro" style="--c:#00e5ff"><b>${dt.carbs} g</b><span>Carboidrato</span></div>
          <div class="macro" style="--c:#ffc53d"><b>${dt.fat} g</b><span>Gordura</span></div>
        </div>`}
        ${dt.notes.map((x) => `<div class="alert alert-info">${icon('eye')}<p>${esc(x)}</p></div>`).join('')}
        <p class="muted small">O cardápio da aba Dieta já usa estas metas de hoje.</p>`
        : '<p class="muted">Faça a avaliação física para liberar o ajuste diário.</p>'}
    </article>
    <article class="panel span-2">
      <h2 class="panel-title">${icon('moon')} Sono · 7 dias</h2>
      <div class="sleep-bars">${last7.map((x) => `<div class="sleep-bar ${x.h && x.h < 6 ? 'low' : x.h >= 7 ? 'ok' : ''}"><i style="height:${Math.min(100, (x.h / 10) * 100)}%"></i>
        <b class="mono">${x.h ? n1(x.h) : '–'}</b><span>${new Date(`${x.day}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span></div>`).join('')}</div>
      <p class="muted small">Meta: 7–9 h. Abaixo de 6 h o app reduz o déficit e a carga sugerida do treino.</p>
    </article>
  </div>`;
}

// ---------------- Exames ----------------
function exams(state) {
  const sex = state.health?.data?.sex ?? 'M';
  const labs = state.labs;
  const latest = labs[0];
  const prev = labs[1];
  const res = latest ? interpretAll(latest.values, sex) : [];
  const order = { bad: 0, warn: 1, ok: 2, good: 3 };
  res.sort((a, b) => order[a.level] - order[b.level]);
  const trend = (r) => {
    const p = prev?.values?.[r.key];
    if (!p) return '';
    const pv = Number(p.v ?? p);
    return pv === r.v ? '' : `<small class="muted">${r.v > pv ? '▲' : '▼'} antes ${String(pv).replace('.', ',')}</small>`;
  };
  return `${latest ? `<article class="panel">
      <h2 class="panel-title">${icon('eye')} Exame de ${new Date(`${latest.taken_on}T12:00`).toLocaleDateString('pt-BR')}${latest.lab ? ` · ${esc(latest.lab)}` : ''}</h2>
      ${res.filter((r) => r.critical).map((r) => `<div class="alert alert-bad">${icon('x')}<p><b>${esc(r.name)}: valor crítico.</b> Procure seu médico o quanto antes.</p></div>`).join('')}
      <ul class="lab-list">${res.map((r) => `<li class="lab lab-${r.level}">
        <div class="lab-head"><b>${esc(r.name)}</b><span class="mono">${String(r.v).replace('.', ',')} ${esc(r.unit)}</span></div>
        <div class="lab-sub"><span class="lvl lvl-${r.level === 'ok' ? 'good' : r.level}">${esc(r.label)}</span>${trend(r)}</div>
        ${r.advice ? `<p class="small">${esc(r.advice)}</p>` : ''}</li>`).join('')}</ul>
      <p class="muted small">As metas do seu plano alimentar já foram ajustadas por estes resultados (glicose, rins e lípides).</p>
      <button class="btn btn-ghost btn-sm btn-danger" data-act="lab-del" data-id="${latest.id}">${icon('trash')} Excluir este exame</button>
    </article>` : ''}
    <article class="panel">
      <h2 class="panel-title">${icon('plus')} Lançar resultados de exame</h2>
      <p class="muted small">Preencha só os marcadores que você tem. Se o laudo tiver outra faixa de referência, abra "referência do laudo" e informe mín/máx.</p>
      <form class="form" data-form="lab">
        <div class="form-row"><label>Data da coleta<input type="date" name="taken_on" required max="${dayKey()}" value="${dayKey()}"></label>
          <label>Laboratório <small class="muted">(opcional)</small><input name="lab" maxlength="80"></label></div>
        ${Object.entries(GROUPS).map(([g, label], gi) => `<details class="lab-group" ${gi === 0 ? 'open' : ''}><summary>${esc(label)}</summary>
          ${Object.entries(MARKERS).filter(([, m]) => m.g === g).map(([k, m]) => `<div class="lab-input">
            <label>${esc(m.n)}<span class="num-wrap"><input type="number" name="v_${k}" step="any" min="0" inputmode="decimal"><em>${esc(m.u)}</em></span></label>
            <details class="lab-ref"><summary>referência do laudo</summary><div class="form-row">
              <input type="number" name="min_${k}" step="any" placeholder="mín"><input type="number" name="max_${k}" step="any" placeholder="máx"></div></details>
          </div>`).join('')}</details>`).join('')}
        <button class="btn" type="submit">${icon('check')} Salvar exame</button>
      </form>
    </article>
    ${labs.length > 1 ? `<article class="panel"><h2 class="panel-title">Histórico</h2><ul class="tips">${labs.map((l) => `<li>${new Date(`${l.taken_on}T12:00`).toLocaleDateString('pt-BR')} · ${Object.keys(l.values).length} marcadores ${l.lab ? `· ${esc(l.lab)}` : ''}</li>`).join('')}</ul></article>` : ''}`;
}

// ---------------- Guia de condicionamento ----------------
function guide(state, d) {
  const h = state.health?.data ?? {};
  const age = d.analysis?.age ?? 30;
  const z = hrZones(age, state.guide.restHr);
  const plan = weeklyPlan(h.experience, h.goal);
  const meso = mesocycle(state.profile.created_at);
  const coop = state.guide.cooper ? cooper(state.guide.cooper, age, h.sex) : null;
  return `<div class="grid grid-2">
    <article class="panel">
      <h2 class="panel-title">${icon('flame')} Suas zonas de frequência cardíaca</h2>
      <form class="form form-inline" data-form="resthr"><label>FC de repouso (ao acordar)<input type="number" name="rest" min="30" max="110" value="${state.guide.restHr ?? ''}" placeholder="ex.: 62"></label>
        <button class="btn btn-sm" type="submit">Calcular</button></form>
      <p class="muted small">FC máxima estimada: <b>${z.max} bpm</b> (Tanaka: 208 − 0,7 × idade) · método: ${esc(z.method)}</p>
      <table class="hist zones"><tbody>${z.zones.map((x) => `<tr class="z${x.n}"><td><b>Z${x.n}</b> ${esc(x.name)}</td><td class="mono">${x.lo}–${x.hi}</td><td class="small muted">${esc(x.use)}</td></tr>`).join('')}</tbody></table>
    </article>
    <article class="panel">
      <h2 class="panel-title">${icon('bolt')} Seu plano semanal</h2>
      <ul class="tips">
        <li><b>Força:</b> ${esc(plan.sessions)} · ${esc(plan.split)}</li>
        <li><b>Volume:</b> ${esc(plan.sets)}</li>
        <li><b>Cardio:</b> ${esc(plan.cardio)}</li>
        <li><b>Mesociclo:</b> ${esc(meso.label)} (ciclo ${meso.cycle})</li>
      </ul>
      <h4 class="sub-title">Teste de Cooper (12 min)</h4>
      <p class="muted small">Corra/caminhe o máximo possível em 12 min (pista ou esteira a 1% de inclinação) e informe a distância.</p>
      <form class="form form-inline" data-form="cooper"><label>Distância<span class="num-wrap"><input type="number" name="dist" min="500" max="5000" step="10" value="${state.guide.cooper ?? ''}"><em>m</em></span></label>
        <button class="btn btn-sm" type="submit">Calcular</button></form>
      ${coop ? `<div class="metric"><span>VO₂máx estimado</span><b>${n1(coop.vo2)} ml/kg/min</b><small>${esc(coop.label)} para sua idade e sexo · refaça a cada 8 semanas</small></div>` : ''}
    </article>
  </div>
  ${CONDITIONING.map((s) => `<article class="panel"><h2 class="panel-title">${esc(s.t)}</h2><ul class="tips">${s.items.map((i) => `<li>${i}</li>`).join('')}</ul></article>`).join('')}`;
}

// ---------------- Suplementos e whey ----------------
function supplements(state) {
  const w = state.guide.whey;
  const r = w ? wheyCost(w) : null;
  return `<article class="panel"><h2 class="panel-title">${icon('shield')} Suplementos: o que tem evidência</h2>
      <ul class="supp-list">${SUPPLEMENTS.map((s) => `<li><span class="ev ev-${s.ev}" title="Nível de evidência">${s.ev}</span><div><b>${esc(s.n)}</b><p class="small">${esc(s.txt)}</p></div></li>`).join('')}</ul>
      <p class="muted small">A = forte evidência · B = moderada · C = limitada · D = sem benefício ou com risco. Gestantes, menores e pessoas com doenças crônicas: só com orientação profissional.</p></article>
    <article class="panel"><h2 class="panel-title">${icon('food')} Tipos de whey e proteínas em pó</h2>
      <div class="table-wrap"><table class="hist"><thead><tr><th>Tipo</th><th>Proteína</th><th>Lactose</th><th>Absorção</th><th>Custo</th><th>Para quem</th></tr></thead>
      <tbody>${WHEY_TYPES.map((x) => `<tr><td><b>${esc(x.n)}</b></td><td class="mono">${esc(x.prot)}</td><td>${esc(x.lact)}</td><td>${esc(x.abs)}</td><td>${esc(x.custo)}</td><td class="small">${esc(x.para)}</td></tr>`).join('')}</tbody></table></div>
      <h4 class="sub-title">Como escolher sem cair em golpe</h4><ul class="tips">${WHEY_CHECKLIST.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></article>
    <article class="panel"><h2 class="panel-title">${icon('bolt')} Calculadora: quanto custa a proteína de verdade</h2>
      <form class="form" data-form="whey">
        <div class="form-row"><label>Preço (R$)<input type="number" name="price" step="0.01" min="1" required value="${w?.price ?? ''}"></label>
          <label>Peso do pote (g)<input type="number" name="packG" min="100" required value="${w?.packG ?? 900}"></label></div>
        <div class="form-row"><label>Dose (g)<input type="number" name="doseG" min="5" required value="${w?.doseG ?? 30}"></label>
          <label>Proteína por dose (g)<input type="number" name="protPerDose" min="1" step="0.1" required value="${w?.protPerDose ?? ''}"></label></div>
        <button class="btn btn-sm" type="submit">Calcular</button>
      </form>
      ${r ? `<div class="metrics">
        <div class="metric"><span>Pureza</span><b>${r.purity}%</b>${r.purity < 70 ? '<span class="lvl lvl-bad">Baixa — desconfie</span>' : r.purity >= 85 ? '<span class="lvl lvl-good">Isolado/alta</span>' : '<span class="lvl lvl-warn">Concentrado</span>'}</div>
        <div class="metric"><span>R$ por 100 g de proteína</span><b>${r.per100.toFixed(2).replace('.', ',')}</b><small>compare com frango: ≈ R$ 6–8</small></div>
        <div class="metric"><span>Por dose</span><b>R$ ${r.perDose.toFixed(2).replace('.', ',')}</b><small>${r.doses} doses no pote</small></div></div>` : ''}
    </article>`;
}

// ---------------- Rotina com trabalho, pausas, água, café e refeições ----------------
const DAY_L = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const GROUP_L = { meal: 'Refeições', water: 'Água', coffee: 'Café', pause: 'Pausas no trabalho', train: 'Treino', sleep: 'Sono' };

function routine(state, d) {
  if (!state.health || !d.analysis) return '<p class="panel muted empty">Faça a avaliação física para gerar sua rotina.</p>';
  const cfg = { ...DEFAULT_ROUTINE, ...(state.health.data.routine ?? {}) };
  const ev = buildRoutine(cfg, state.health.data, d.analysis, d.plan);
  const active = state.alarms.filter((a) => a.group === 'rotina' && a.on).length;
  const t = (name, label, v, req = true) => `<label>${label}<input type="time" name="${name}" value="${esc(v || '')}" ${req ? 'required' : ''}></label>`;
  return `<div class="grid grid-2">
    <article class="panel">
      <h2 class="panel-title">${icon('user')} Seu dia</h2>
      <form class="form" data-form="routine-cfg">
        <div class="form-row">${t('wake', 'Acordo às', cfg.wake)}${t('sleep', 'Durmo às', cfg.sleep)}</div>
        <div class="form-row">${t('workStart', 'Entro no trabalho', cfg.workStart, false)}${t('workEnd', 'Saio do trabalho', cfg.workEnd, false)}</div>
        <fieldset><legend>Dias de trabalho</legend><div class="day-pick">${DAY_L.map((x, i) => `<label><input type="checkbox" name="workDays" value="${i}" ${cfg.workDays.includes(i) ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></fieldset>
        <div class="form-row">${t('train', 'Horário do treino', cfg.train, false)}
          <label>Duração do treino<span class="num-wrap"><input type="number" name="trainDur" min="15" max="240" step="5" value="${cfg.trainDur}"><em>min</em></span></label></div>
        <label class="chk"><input type="checkbox" name="coffee" value="1" ${cfg.coffee ? 'checked' : ''}><span>Tomo café (a rotina respeita o limite de cafeína e o corte antes de dormir)</span></label>
        <fieldset><legend>Quero alarme para</legend><div class="chk-grid">${Object.entries(GROUP_L).map(([k, l]) => `<label class="chk"><input type="checkbox" name="al_${k}" value="1" ${cfg.alarms?.[k] !== false ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <button class="btn" type="submit">${icon('check')} Salvar e gerar rotina</button>
      </form>
    </article>
    <article class="panel">
      <h2 class="panel-title">${icon('bolt')} Alarmes da rotina</h2>
      <p class="small">${ev.length} momentos no dia · ${active ? `<b class="good">${active} alarmes ativos</b>` : 'alarmes ainda não ativados'}.</p>
      <div class="btn-row">
        <button class="btn" data-act="routine-alarms">${icon('bolt')} ${active ? 'Atualizar' : 'Ativar'} alarmes no app</button>
        <button class="btn btn-ghost" data-act="routine-ics">${icon('download')} Enviar para o calendário do celular</button>
        ${active ? `<button class="btn btn-ghost btn-danger btn-sm" data-act="routine-alarms-off">Desativar</button>` : ''}
      </div>
      <div class="alert alert-info">${icon('eye')}<p>Os alarmes do app tocam com ele aberto (ótimo no computador do trabalho). Para tocar com o celular bloqueado, use
        <b>Enviar para o calendário</b>: cada lembrete vira um evento recorrente com alerta no horário. Para um alarme sonoro do relógio, use Treinos → Timer → Alarmes → "Pôr no relógio do celular".</p></div>
      <p class="muted small">Água: ${(d.analysis.water / 1000).toFixed(1).replace('.', ',')} L/dia distribuídos em doses. Pausas: a cada ~55 min de trabalho sentado. Cafeína: corte 8 h antes de dormir.</p>
    </article>
    <article class="panel span-2">
      <h2 class="panel-title">${icon('refresh')} Linha do tempo</h2>
      <ol class="routine-tl">${ev.map((e) => `<li class="rt-${e.kind}"><span class="mono rt-time">${e.time}</span><span class="rt-ico">${icon(KINDS[e.kind].icon)}</span>
        <div><b>${esc(e.label)}</b>${e.workOnly ? ' <small class="chip">dias de trabalho</small>' : ''}${e.detail ? `<div class="muted small">${esc(e.detail)}</div>` : ''}</div></li>`).join('')}</ol>
    </article>
  </div>`;
}

// ---------------- Médicos e exames recomendados ----------------
const ST = { ok: ['lvl-good', 'Em dia'], vencido: ['lvl-warn', 'Refazer'], faltando: ['lvl-bad', 'Nunca feito'], manual: ['', 'Não controlado pelo app'] };

function checkup(state, d) {
  if (!state.health || !d.analysis) return '<p class="panel muted empty">Faça a avaliação física para gerar seu check-up.</p>';
  const h = state.health.data;
  const c = buildCheckup({ h, an: d.analysis, labs: state.labs, age: d.analysis.age });
  const med = h.glp1?.med ? MEDS[h.glp1.med] : null;
  const pend = c.exams.filter((e) => e.status === 'faltando' || e.status === 'vencido').length;
  return `${med ? `<div class="alert ${med.registered ? 'alert-info' : 'alert-bad'}">${icon('shield')}<p><b>Você marcou: ${esc(med.n)}</b> (${esc(med.sub)}).
      ${med.registered ? 'Os exames abaixo incluem o monitoramento de quem usa caneta, a cada 3 meses no primeiro ano.' : 'Produto proibido pela Anvisa (sem registro): consulte o endocrinologista com prioridade.'}</p></div>` : ''}
    <div class="grid grid-2">
      <article class="panel">
        <h2 class="panel-title">${icon('user')} Quais médicos procurar</h2>
        <ol class="doc-list">${c.doctors.map((x) => `<li class="doc-${x.prio}"><b>${esc(x.esp)}</b>${x.prio !== 'rotina' ? ` <span class="lvl ${x.prio === 'prioritario' ? 'lvl-bad' : 'lvl-good'}">${x.prio === 'prioritario' ? 'prioritário' : 'comece por aqui'}</span>` : ''}
          <p class="muted small">${esc(x.why)}</p></li>`).join('')}</ol>
      </article>
      <article class="panel">
        <h2 class="panel-title">${icon('eye')} Exames para levar à consulta</h2>
        <p class="small">${pend ? `<b class="bad-txt">${pend} exame(s)</b> nunca feitos ou vencidos.` : '<b class="good">Exames em dia.</b>'} Frequência: ${esc(c.freq)}</p>
        <ul class="exam-list">${c.exams.map((e) => `<li><div><b>${esc(e.name)}</b><div class="muted small">${esc(e.why)}</div></div>
          <span class="lvl ${ST[e.status][0]}">${e.status === 'ok' || e.status === 'vencido' ? `${ST[e.status][1]} · ${e.last.split('-').reverse().join('/')}` : ST[e.status][1]}</span></li>`).join('')}</ul>
        <div class="btn-row"><button class="btn btn-sm" data-act="checkup-copy">${icon('copy')} Copiar lista</button>
          <button class="btn btn-sm btn-ghost" data-act="checkup-download">${icon('download')} Baixar (.txt)</button>
          <button class="btn btn-sm btn-ghost" data-act="health-tab" data-tab="exames">Lançar resultados</button></div>
        <p class="muted small">Lista para discutir na consulta — quem solicita os exames é o médico. Ao lançar os resultados na aba Exames, o status aqui atualiza sozinho.</p>
      </article>
    </div>`;
}
