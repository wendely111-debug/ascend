import { esc, fmt, dayKey } from '../util.js';
import { icon } from '../ui/icons.js';
import { STATUS, FLAGS } from '../rules.js';
import { FOODS } from '../foods.js';
import { RECIPES } from '../recipes.js';
import { allowedRecipes, recipeMacros, scaleRecipe, household, GOALS } from '../nutrition.js';
import { renderReport } from './assessment.js';
import { marketList, CATEGORIES, ifoodUrl, fmtGrams, brl } from '../market.js';

const TABS = [['hoje', 'Hoje'], ['receitas', 'Receitas'], ['compras', 'Feira'], ['avaliacao', 'Avaliação']];
const g1 = (n) => Math.round(n);

export function statusBadge(a) {
  const s = STATUS[a.status] ?? STATUS.self;
  return `<span class="st ${s.cls}" title="${esc(s.label)}">${icon(s.icon)}<span>${esc(s.label)}</span></span>`;
}

export function renderDiet({ state, d }) {
  const t = state.diet;
  if (!d.analysis) {
    return `<section><header class="view-head"><div class="kicker">[ NUTRIÇÃO ]</div><h1 class="view-title">Plano alimentar</h1></header>
      <article class="panel offline-panel">${icon('scale', 'big')}<p>Faça sua avaliação física para gerar metas e cardápio personalizados.</p>
      <button class="btn" data-act="assess-new">${icon('scale')} Fazer avaliação</button></article></section>`;
  }
  const body = t.tab === 'hoje' ? today(state, d) : t.tab === 'receitas' ? recipes(state) : t.tab === 'compras' ? shopping(state, d) : assessmentTab(state, d);
  return `<section class="view-diet">
    <header class="view-head"><div class="kicker">[ NUTRIÇÃO ] · ${esc(GOALS[d.analysis.goal]?.label ?? '')}</div><h1 class="view-title">Plano alimentar</h1></header>
    ${state.health.data.pending?.length ? `<div class="alert alert-bad">${icon('eye')}<p><b>Plano estimado:</b> sua avaliação está incompleta, então calorias e porções podem estar imprecisas.
      <button class="link-btn" data-act="assess-complete">Completar avaliação</button></p></div>` : ''}
    <nav class="tabs" role="tablist">${TABS.map(([id, label]) =>
      `<button role="tab" class="tab ${t.tab === id ? 'active' : ''}" data-act="diet-tab" data-tab="${id}" aria-selected="${t.tab === id}">${label}</button>`).join('')}</nav>
    ${body}
    <p class="muted small disclaimer">Cardápio gerado por regras nutricionais a partir da sua avaliação. Não substitui acompanhamento individual com nutricionista.</p>
  </section>`;
}

function macroBar(label, have, goal, color, unit = 'g') {
  const pct = goal ? Math.min(130, (have / goal) * 100) : 0;
  return `<div class="mbar" style="--c:${color}"><div class="mbar-head"><span>${label}</span><span class="mono">${g1(have)} / ${g1(goal)} ${unit}</span></div>
    <div class="bar bar-thin"><i style="width:${Math.min(100, pct)}%"></i></div></div>`;
}

function today(state, d) {
  const an = d.analysis;
  const tg = d.target; // metas de HOJE (ajustadas por sono e gasto real)
  const plan = d.plan;
  const checkins = Object.fromEntries(d.todayActs.filter((a) => a.kind === 'meal').map((a) => [a.meta?.slot, a]));
  const hide = an.hideNumbers;
  return `
    ${hide ? '' : `<article class="panel targets">
      <h2 class="panel-title">${icon('bolt')} Metas de hoje <span class="muted small">· plano ≈ ${fmt(plan.totals.k)} de ${fmt(tg.kcal)} kcal</span></h2>
      ${tg.kcal !== an.kcal ? `<p class="small muted">${icon('moon')} Ajustado hoje: ${tg.kcal > an.kcal ? '+' : ''}${fmt(tg.kcal - an.kcal)} kcal pelo sono e pelo gasto do dia (aba Saúde).</p>` : ''}
      ${macroBar('Proteína', plan.totals.p + (plan.complement?.protein || 0), tg.protein, '#ff3d71')}
      ${macroBar('Carboidrato', plan.totals.c, tg.carbs, '#00e5ff')}
      ${macroBar('Gordura', plan.totals.f, tg.fat, '#ffc53d')}
      ${macroBar('Fibras', plan.totals.fb, an.fiber, '#a66bff')}
      <p class="muted small">${icon('bolt')} Água: <b>${(an.water / 1000).toFixed(1).replace('.', ',')} L</b> ao longo do dia.</p>
    </article>`}
    <ol class="meal-list">${plan.meals.map((m) => {
      const c = checkins[m.id];
      return `<li class="panel meal ${c ? 'checked' : ''}">
        <div class="meal-head">
          <span class="meal-time mono">${m.time}</span>
          <div><div class="kicker">${esc(m.label)}</div>
            <button class="meal-name" data-act="recipe-open" data-id="${m.recipe?.id}" data-slot="${m.id}">${esc(m.recipe?.n ?? 'Sem receita compatível')}</button></div>
          ${hide ? '' : `<span class="meal-kcal mono">${fmt(m.macros.k)} kcal</span>`}
        </div>
        <ul class="ing">${m.items.map((it) => `<li><b class="mono">${it.g} g</b> ${esc(it.name)} <small class="muted">${esc(household(it.food, it.g))}</small></li>`).join('')}</ul>
        ${hide ? '' : `<div class="meal-macros small"><span>P ${g1(m.macros.p)} g</span><span>C ${g1(m.macros.c)} g</span><span>G ${g1(m.macros.f)} g</span></div>`}
        <div class="btn-row">
          ${c ? statusBadge(c) : `<button class="btn btn-sm" data-act="meal-checkin" data-slot="${m.id}" data-title="${esc(m.recipe?.n ?? m.label)}">${icon('camera')} Check-in com foto (+10 XP)</button>`}
          ${c ? '' : `<button class="btn btn-sm btn-ghost" data-act="meal-swap" data-slot="${m.id}">${icon('refresh')} Trocar</button>`}
        </div>
      </li>`;
    }).join('')}</ol>
    ${plan.complement ? `<div class="alert alert-info">${icon('bolt')}<p><b>Complemento de proteína:</b> o cardápio de hoje ficou ${g1(tg.protein - plan.totals.p)} g abaixo da meta.
      Adicione <b>${plan.complement.g} g de ${esc(plan.complement.name)}</b> (+${plan.complement.protein} g de proteína) em alguma refeição.</p></div>` : ''}
    <article class="panel"><h2 class="panel-title">${icon('eye')} Orientações do plano</h2><ul class="tips">${an.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></article>`;
}

function recipes(state) {
  const h = state.health.data;
  const groups = [['cafe', 'Café da manhã'], ['lanche', 'Lanches e ceia'], ['refeicao', 'Almoço e jantar']];
  return groups.map(([slot, label]) => {
    const list = allowedRecipes(h, slot);
    return `<h2 class="section-title">${label} <small class="muted">(${list.length})</small></h2>
      <div class="recipe-grid">${list.map((r) => {
        const mc = recipeMacros(r);
        return `<button class="panel recipe-card" data-act="recipe-open" data-id="${r.id}">
          <span class="recipe-ico">${icon('food')}</span>
          <span><b>${esc(r.n)}</b><small class="muted">${r.min} min · ${fmt(mc.k)} kcal · P ${g1(mc.p)} g</small></span></button>`;
      }).join('')}</div>`;
  }).join('');
}

function shopping(state, d) {
  const days = state.diet.days ?? 30;
  const city = state.health.data.city || 'Campina Grande - PB';
  const prices = state.diet.prices?.[city] ?? {};
  const list = marketList(state.health.data, d.analysis, dayKey(), state.profile.id, days, state.diet.swaps, prices);
  const got = state.diet.got || {};
  const byCat = Object.keys(CATEGORIES).map((c) => [c, list.items.filter((i) => i.cat === c)]).filter(([, l]) => l.length);
  return `<article class="panel feira-head">
      <h2 class="panel-title">${icon('food')} Feira do seu cardápio</h2>
      <div class="seg seg-inline">${[7, 15, 30].map((n) => `<button class="seg-btn ${days === n ? 'on' : ''}" data-act="feira-days" data-n="${n}">${n} dias</button>`).join('')}</div>
      <form class="form form-inline" data-form="city"><label>Cidade dos preços<input name="city" maxlength="60" value="${esc(city)}" required></label>
        <button class="btn btn-sm btn-ghost" type="submit">Salvar</button></form>
      <div class="metrics">
        <div class="metric"><span>Total estimado · ${days} dias</span><b>${brl(list.total)}</b><small>${brl(list.perDay)} por dia</small></div>
        <div class="metric"><span>Itens</span><b>${list.items.length}</b><small>${list.items.filter((i) => i.custom).length} com preço ajustado por você</small></div>
      </div>
      <div class="alert alert-info">${icon('eye')}<p>Quantidades já convertidas para <b>peso cru de compra</b> (arroz, feijão e massas rendem ~2,5×; carnes perdem ~30% no preparo; cascas descontadas).
        Os preços são <b>referências</b>: toque em <b>iFood</b> para ver o preço no Mercado da sua cidade (confirme o endereço no iFood) e depois toque no preço aqui para ajustar. O total recalcula na hora.</p></div>
      ${days > 7 ? `<p class="muted small">${icon('refresh')} Hortifruti e pão estragam: compre essa parte por semana (≈ ${brl(list.items.filter((i) => i.perishable).reduce((a, i) => a + i.cost, 0) / (days / 7))} por semana).</p>` : ''}
    </article>
    ${byCat.map(([c, items]) => `<article class="panel"><h2 class="panel-title">${esc(CATEGORIES[c])} <span class="muted small">· ${brl(items.reduce((a, i) => a + i.cost, 0))}</span></h2>
      <ul class="shop">${items.map((i) => `<li class="shop-item">
        <label class="chk"><input type="checkbox" data-act="shop-toggle" data-food="${i.food}" ${got[i.food] ? 'checked' : ''}>
          <span><b>${esc(i.name)}</b><small class="muted">${esc(i.qty)}${i.byWeight ? '' : ` · usa ${fmtGrams(i.raw)}`}${i.perishable && days > 7 ? ' · compra semanal' : ''}</small></span></label>
        <div class="shop-right">
          <button class="shop-price ${i.custom ? 'custom' : ''}" data-act="price-edit" data-food="${i.food}" data-name="${esc(i.name)}" data-pack="${esc(i.pack)}" data-price="${i.unitPrice}" title="Ajustar preço">${brl(i.cost)}<small>${brl(i.unitPrice)}/${i.byWeight ? 'kg' : 'un'}</small></button>
          <a class="btn btn-sm btn-ghost" href="${ifoodUrl(i.q)}" target="_blank" rel="noopener">iFood</a>
        </div></li>`).join('')}</ul></article>`).join('')}`;
}

function sparkline(points) {
  if (points.length < 2) return '';
  const W = 600, H = 120, P = 12;
  const ys = points.map((p) => p.v);
  const min = Math.min(...ys) - 0.5, max = Math.max(...ys) + 0.5;
  const x = (i) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v) => H - P - ((v - min) * (H - 2 * P)) / (max - min);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolução do peso">
    <path d="${path}" fill="none" stroke="var(--cyan)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="${p.ok ? 'var(--good)' : 'var(--gold)'}"><title>${p.label}: ${p.v} kg</title></circle>`).join('')}</svg>`;
}

function assessmentTab(state, d) {
  const list = state.assessments;
  const last = list[0];
  const days = last ? Math.floor((Date.now() - new Date(last.created_at)) / 86400000) : 0;
  const pts = [...list].reverse().map((a) => ({ v: Number(a.weight_kg), label: new Date(a.created_at).toLocaleDateString('pt-BR'), ok: (a.flags || []).includes('peso_com_foto') }));
  return `<div class="btn-row">
      <button class="btn" data-act="assess-new">${icon('scale')} Nova avaliação</button>
      <button class="btn btn-ghost" data-act="health-edit">${icon('edit')} Editar dados de saúde e dieta</button>
    </div>
    <p class="muted small">Última avaliação há ${days} dia(s). Recomendado: a cada 14 dias, sempre nas mesmas condições (manhã, em jejum).</p>
    <article class="panel"><h2 class="panel-title">${icon('scale')} Relatório atual</h2>${renderReport(d.analysis, { flags: last?.flags || [] })}</article>
    ${list.length > 1 ? `<article class="panel"><h2 class="panel-title">${icon('flame')} Evolução do peso</h2>${sparkline(pts)}
      <p class="muted small"><span class="good">●</span> com foto da balança · <span style="color:var(--gold)">●</span> autodeclarado</p></article>` : ''}
    <article class="panel"><h2 class="panel-title">${icon('eye')} Histórico (imutável)</h2>
      <div class="table-wrap"><table class="hist"><thead><tr><th>Data</th><th>Peso</th><th>% G</th><th>Cintura</th><th>IMC</th><th>Auditoria</th></tr></thead>
      <tbody>${list.map((a) => `<tr><td>${new Date(a.created_at).toLocaleDateString('pt-BR')}</td><td class="mono">${String(a.weight_kg).replace('.', ',')}</td>
        <td class="mono">${a.bf_pct != null ? String(a.bf_pct).replace('.', ',') : '—'}</td><td class="mono">${a.waist_cm != null ? String(a.waist_cm).replace('.', ',') : '—'}</td>
        <td class="mono">${String(a.bmi).replace('.', ',')}</td>
        <td>${(a.flags || []).map((f) => `<span class="flag ${f === 'peso_com_foto' ? 'ok' : ''}" title="${esc(FLAGS[f] ?? f)}">${esc(FLAGS[f] ?? f)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>
    </article>`;
}

/** Modal de receita. slotKcal opcional: escala para a refeição do plano. */
export function recipeModal(id, slotKcal, hideNumbers) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return '<p class="muted">Receita não encontrada.</p>';
  const s = slotKcal ? scaleRecipe(r, slotKcal) : { items: r.ing.map(([food, g]) => ({ food, name: FOODS[food].n, g })), macros: recipeMacros(r) };
  return `<div class="recipe">
    <span class="recipe-ico big">${icon('food')}</span>
    <h3 class="ex-title">${esc(r.n)}</h3>
    <p class="muted small">${r.min} min de preparo${slotKcal ? ' · porção ajustada para a sua refeição' : ' · porção base'}</p>
    ${hideNumbers ? '' : `<div class="meal-macros"><span>${fmt(s.macros.k)} kcal</span><span>P ${g1(s.macros.p)} g</span><span>C ${g1(s.macros.c)} g</span><span>G ${g1(s.macros.f)} g</span><span>Fibra ${g1(s.macros.fb)} g</span></div>`}
    <h4 class="sub-title">Ingredientes</h4>
    <ul class="ing">${s.items.map((it) => `<li><b class="mono">${it.g} g</b> ${esc(it.name)} <small class="muted">${esc(household(it.food, it.g))}</small></li>`).join('')}</ul>
    <p class="muted small">Sal, alho, cebola, ervas, limão e especiarias à vontade (sal com moderação).</p>
    <h4 class="sub-title">Modo de preparo</h4>
    <ol class="ex-steps">${r.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  </div>`;
}

export const nextSwap = (h, slotId, currentId) => {
  const type = slotId === 'cafe' ? 'cafe' : slotId === 'almoco' || slotId === 'jantar' ? 'refeicao' : 'lanche';
  const pool = allowedRecipes(h, type);
  const i = pool.findIndex((r) => r.id === currentId);
  return pool[(i + 1) % pool.length]?.id;
};
