import { esc, fmt, dayKey } from '../util.js';
import { icon } from '../ui/icons.js';
import { FLAGS } from '../rules.js';
import { MEDS, WEEKDAYS } from '../medications.js';
import {
  JOBS, GOALS, PARQ, CONDITIONS, DIETS, RESTRICTIONS, ALLERGIES, ageFrom, navyBodyFat, analyze,
} from '../nutrition.js';

export const WIZ_STEPS = {
  initial: ['consent', 'body', 'measures', 'scale', 'routine', 'health', 'food', 'report'],
  reassess: ['measures', 'scale', 'report'],
  edit: ['consent', 'body', 'routine', 'health', 'food', 'report'],
  complete: ['body', 'measures', 'scale', 'routine', 'health', 'food', 'report'],
};

// Etapas que podem ser puladas no cadastro (o resultado fica impreciso e o app cobra depois).
const SKIPPABLE = new Set(['measures', 'routine', 'health', 'food']);
export const PENDING_LABELS = {
  altura: 'altura', peso: 'peso', medidas: 'medidas de cintura/pescoço/quadril', rotina: 'rotina e objetivo',
  saude: 'triagem de saúde', alimentacao: 'restrições e alergias alimentares',
};
// Médias de adultos brasileiros (IBGE, POF 2008-2009) — só usadas quando a altura não é informada.
const AVG_HEIGHT = { M: 173, F: 161 };
const setPending = (w, key, on) => {
  const s = new Set(w.h.pending ?? []);
  on ? s.add(key) : s.delete(key);
  w.h.pending = [...s];
};
const isPending = (w, key) => (w.h.pending ?? []).includes(key);

const TITLES = {
  consent: 'Termo e consentimento', body: 'Dados básicos', measures: 'Peso e medidas', scale: 'Prova da balança',
  routine: 'Rotina e objetivo', health: 'Triagem de saúde (PAR-Q+)', food: 'Alimentação', report: 'Seu relatório',
};

const radio = (name, value, current, label, sub = '') =>
  `<label class="opt-card"><input type="radio" name="${name}" value="${value}" ${String(current) === String(value) ? 'checked' : ''} required>
    <span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;

const check = (name, value, list, label) =>
  `<label class="chk"><input type="checkbox" name="${name}" value="${value}" ${(list || []).includes(value) ? 'checked' : ''}><span>${esc(label)}</span></label>`;

const num = (name, label, value, { min, max, step = '0.1', unit = '', required = true, hint = '' } = {}) =>
  `<label>${label}${hint ? ` <small class="muted">${hint}</small>` : ''}
    <span class="num-wrap"><input name="${name}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${value ?? ''}" ${required ? 'required' : ''}><em>${unit}</em></span></label>`;

function guide(title, lines) {
  return `<details class="guide"><summary>${icon('eye')} Como medir: ${esc(title)}</summary><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>`;
}

function stepConsent(w) {
  return `<div class="legal">
      <p><b>O ASCEND não substitui consulta com médico, nutrólogo ou nutricionista.</b> As metas são estimativas por fórmulas
      validadas (Mifflin-St Jeor, Katch-McArdle, protocolo US Navy) e servem de ponto de partida para quem é saudável.</p>
      <p>Vamos tratar <b>dados pessoais sensíveis de saúde</b> (peso, medidas, condições de saúde) com base no seu
      <b>consentimento específico</b> (LGPD, art. 11, I), com a finalidade exclusiva de calcular suas metas e seu plano alimentar.
      Esses dados ficam visíveis <b>somente para você</b>. A exceção são as fotos de prova que você decidir enviar
      (balança, refeições, treino), que seus aliados podem ver para fazer a auditoria.</p>
      <p>Você pode revogar o consentimento e pedir a exclusão a qualquer momento em Perfil.</p>
    </div>
    <label class="chk chk-strong"><input type="checkbox" name="consent" value="1" ${w.h.consent ? 'checked' : ''} required>
      <span>Li e <b>consinto</b> com o tratamento dos meus dados de saúde para essa finalidade.</span></label>`;
}

function stepBody(w) {
  const h = w.h;
  return `<fieldset><legend>Sexo biológico <small class="muted">(as equações de gasto e gordura corporal dependem dele)</small></legend>
      <div class="opt-grid">${radio('sex', 'M', h.sex, 'Masculino')}${radio('sex', 'F', h.sex, 'Feminino')}</div></fieldset>
    <label>Data de nascimento<input name="birth_date" type="date" required max="${dayKey()}" value="${esc(h.birth_date || '')}"></label>
    ${num('height_cm', 'Altura', (h.pending ?? []).includes('altura') ? '' : h.height_cm, { min: 120, max: 230, step: '0.5', unit: 'cm', required: false, hint: 'não sabe? deixe em branco' })}
    <small class="muted">Sem a altura usamos a média brasileira (IBGE) — o resultado fica impreciso até você informar.</small>
    ${guide('altura', ['Descalço, de costas para uma parede lisa, calcanhares, glúteos e ombros encostados.',
      'Olhe para frente (não para cima). Encoste um livro no topo da cabeça, formando ângulo reto com a parede.',
      'Marque na parede e meça do chão até a marca com fita métrica.'])}`;
}

function stepMeasures(w) {
  const m = w.m;
  const female = w.h.sex === 'F';
  return `<div class="protocol">${icon('bolt')}<p><b>Protocolo para medidas confiáveis:</b> meça pela manhã, em jejum, depois de ir ao banheiro,
      antes de treinar, com roupa leve. Use sempre a mesma balança, em piso firme (nunca sobre tapete). Faça cada medida com fita
      <b>duas vezes</b>: se as duas diferirem mais de 1 cm, meça de novo.</p></div>
    ${num('weight_kg', 'Peso', m.weight_kg, { min: 30, max: 300, step: '0.1', unit: 'kg' })}
    ${guide('peso', ['Balança digital em piso duro e nivelado.', 'Suba descalço, parado, olhando para frente, peso distribuído nos dois pés.', 'Anote com uma casa decimal. Na próxima etapa você fotografa o visor.'])}
    <fieldset><legend>Como você quer estimar o % de gordura?</legend><div class="opt-grid opt-grid-3">
      ${radio('bf_method', 'fita', m.bf_method || 'fita', 'Fita métrica', 'Protocolo US Navy')}
      ${radio('bf_method', 'bioimpedancia', m.bf_method, 'Bioimpedância', 'Tenho o laudo')}
      ${radio('bf_method', 'dexa', m.bf_method, 'DEXA', 'Exame padrão-ouro')}</div></fieldset>
    <div class="form-row">
      ${num('waist_1', female ? 'Cintura — 1ª medida' : 'Abdômen (umbigo) — 1ª', m.waist_1, { min: 40, max: 220, step: '0.5', unit: 'cm' })}
      ${num('waist_2', '2ª medida', m.waist_2, { min: 40, max: 220, step: '0.5', unit: 'cm' })}
    </div>
    ${guide(female ? 'cintura' : 'abdômen', female
      ? ['Ponto mais estreito do tronco, entre as costelas e o umbigo.', 'Solte o ar normalmente e meça no fim da expiração, sem encolher a barriga.', 'Fita paralela ao chão, justa mas sem apertar a pele.']
      : ['Na altura do umbigo.', 'Solte o ar normalmente e meça no fim da expiração, sem encolher a barriga.', 'Fita paralela ao chão, justa mas sem apertar a pele.'])}
    <div class="form-row">
      ${num('neck_1', 'Pescoço — 1ª medida', m.neck_1, { min: 20, max: 70, step: '0.5', unit: 'cm' })}
      ${num('neck_2', '2ª medida', m.neck_2, { min: 20, max: 70, step: '0.5', unit: 'cm' })}
    </div>
    ${guide('pescoço', ['Logo abaixo do pomo de Adão (laringe).', 'Fita levemente inclinada para baixo na frente.', 'Ombros relaxados, sem inclinar a cabeça.'])}
    ${female ? `<div class="form-row">
      ${num('hip_1', 'Quadril — 1ª medida', m.hip_1, { min: 50, max: 220, step: '0.5', unit: 'cm' })}
      ${num('hip_2', '2ª medida', m.hip_2, { min: 50, max: 220, step: '0.5', unit: 'cm' })}</div>
      ${guide('quadril', ['Na parte mais saliente dos glúteos, de perfil no espelho.', 'Pés juntos, fita paralela ao chão.'])}` : ''}
    <div class="bf-manual" ${m.bf_method && m.bf_method !== 'fita' ? '' : 'hidden'}>
      ${num('bf_pct', '% de gordura do laudo', m.bf_pct, { min: 3, max: 65, step: '0.1', unit: '%', required: false })}
      <small class="muted">Bioimpedância varia com a hidratação: faça em jejum de 4 h, bexiga vazia, sem treinar ou beber álcool nas 24 h anteriores.</small>
    </div>`;
}

function stepScale(w) {
  return `<div class="scale-step">
    ${icon(w.proofId ? 'check' : 'eye', 'big')}
    ${w.proofId
      ? `<p class="good"><b>Foto da balança registrada.</b> Seu peso fica como <b>verificado por foto</b> e entra na fila de auditoria dos aliados.</p>`
      : `<p>Para o peso valer como <b>verificado</b>, fotografe agora o <b>visor da balança com seus pés sobre ela</b>, mostrando o gesto sorteado.
         A câmera abre ao vivo (não aceita foto da galeria) e você tem 3 minutos.</p>
         <button type="button" class="btn" data-act="wiz-scale">${icon('eye')} Abrir câmera</button>
         <p class="muted small">Sem a foto, o peso fica marcado como <b>autodeclarado</b> para você e seus aliados.</p>`}
  </div>`;
}

function stepRoutine(w) {
  const h = w.h;
  return `<fieldset><legend>No dia a dia, você…</legend><div class="opt-grid opt-grid-3">
      ${Object.entries(JOBS).map(([k, j]) => radio('job', k, h.job, j.label)).join('')}</div></fieldset>
    ${num('training_days', 'Dias de treino por semana', h.training_days ?? 3, { min: 0, max: 7, step: '1', unit: 'dias' })}
    <fieldset><legend>Experiência com treino</legend><div class="opt-grid opt-grid-3">
      ${radio('experience', 'iniciante', h.experience, 'Iniciante', '< 6 meses')}
      ${radio('experience', 'intermediario', h.experience, 'Intermediário', '6 meses a 2 anos')}
      ${radio('experience', 'avancado', h.experience, 'Avançado', '> 2 anos')}</div></fieldset>
    <fieldset><legend>Objetivo principal</legend><div class="opt-grid">
      ${Object.entries(GOALS).map(([k, g]) => radio('goal', k, h.goal, g.label, g.desc)).join('')}</div></fieldset>`;
}

function stepHealth(w) {
  const h = w.h;
  const parq = h.parq || [];
  return `<p class="muted small">Responda com sinceridade: essas respostas definem as travas de segurança do seu plano.</p>
    <ol class="parq">${PARQ.map((q, i) => `<li><span>${esc(q)}</span>
      <div class="yn"><label><input type="radio" name="parq_${i}" value="0" ${parq[i] === false ? 'checked' : ''} required><span>Não</span></label>
      <label><input type="radio" name="parq_${i}" value="1" ${parq[i] === true ? 'checked' : ''}><span>Sim</span></label></div></li>`).join('')}</ol>
    <fieldset><legend>Condições atuais</legend><div class="chk-grid">
      ${Object.entries(CONDITIONS).map(([k, l]) => check('conditions', k, h.conditions, l)).join('')}</div></fieldset>
    <fieldset class="glp1-box"><legend>Caneta para emagrecer / diabetes</legend>
      <label class="chk chk-strong"><input type="checkbox" name="glp1_use" value="1" data-toggle-glp1 ${h.glp1?.med ? 'checked' : ''}>
        <span>Estou usando uma dessas injeções (Mounjaro, Tirzec, TG ou outra caneta)</span></label>
      <div class="glp1-fields" ${h.glp1?.med ? '' : 'hidden'}>
        <div class="opt-grid">${Object.entries(MEDS).map(([k, m]) => radio('glp1_med', k, h.glp1?.med, m.n, m.sub)).join('')}</div>
        <div class="form-row">
          <label>Dia da aplicação<select name="glp1_weekday"><option value="">—</option>${WEEKDAYS.map((d, i) => `<option value="${i}" ${String(h.glp1?.weekday) === String(i) ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
          <label>Dose atual <small class="muted">(opcional)</small><span class="num-wrap"><input type="number" name="glp1_dose" min="0" max="20" step="0.25" value="${h.glp1?.dose ?? ''}"><em>mg</em></span></label>
        </div>
        <fieldset><legend>Foi prescrita por um médico?</legend><div class="yn">
          <label><input type="radio" name="glp1_rx" value="1" ${h.glp1?.prescribed === true ? 'checked' : ''}><span>Sim</span></label>
          <label><input type="radio" name="glp1_rx" value="0" ${h.glp1?.prescribed === false ? 'checked' : ''}><span>Não</span></label></div></fieldset>
        <p class="muted small">O app adapta a dieta (proteína, porções, gordura, hidratação) e os exames sugeridos. Ele não orienta dose nem uso do medicamento.</p>
      </div></fieldset>`;
}

function stepFood(w) {
  const h = w.h;
  return `<fieldset><legend>Tipo de alimentação</legend><div class="opt-grid opt-grid-3">
      ${Object.entries(DIETS).map(([k, l]) => radio('diet_type', k, h.diet_type || 'onivoro', l)).join('')}</div></fieldset>
    <fieldset><legend>Restrições</legend><div class="chk-grid">${Object.entries(RESTRICTIONS).map(([k, l]) => check('restrictions', k, h.restrictions, l)).join('')}</div></fieldset>
    <fieldset><legend>Alergias alimentares</legend><div class="chk-grid">${Object.entries(ALLERGIES).map(([k, l]) => check('allergies', k, h.allergies, l)).join('')}</div></fieldset>
    <label>Cidade <small class="muted">(para os preços da feira)</small><input name="city" maxlength="60" value="${esc(h.city || 'Campina Grande - PB')}"></label>
    <fieldset><legend>Refeições por dia</legend><div class="opt-grid opt-grid-4">
      ${[3, 4, 5, 6].map((n) => radio('meals_per_day', n, h.meals_per_day ?? 5, `${n} refeições`)).join('')}</div></fieldset>`;
}

const lvl = (c) => (c ? `<span class="lvl lvl-${c.level}">${esc(c.label)}</span>` : '');

/** Relatório da avaliação — usado no fim do assistente e na aba Dieta → Avaliação. */
export function renderReport(an, { flags = [] } = {}) {
  const pct = (g, k) => Math.round(((g * k) / an.kcal) * 100);
  const metric = (label, value, extra = '') => `<div class="metric"><span>${label}</span><b>${value}</b>${extra}</div>`;
  return `<div class="report">
    <div class="metrics">
      ${metric(an.pending?.includes('peso') || an.pending?.includes('altura') ? 'IMC (estimado)' : 'IMC', String(an.bmi).replace('.', ','), an.pending?.includes('peso') ? '<small>peso não informado</small>' : lvl(an.bmiClass))}
      ${metric('% Gordura', an.bf != null ? `${String(an.bf).replace('.', ',')}%` : '—', an.bf != null ? `${lvl(an.bfClass)}<small>${esc(an.bfSource)}</small>` : '<small>não calculado</small>')}
      ${metric('Massa magra', an.lbm != null ? `${String(an.lbm).replace('.', ',')} kg` : '—', an.fatMass != null ? `<small>gordura: ${String(an.fatMass).replace('.', ',')} kg</small>` : '')}
      ${metric('Cintura/altura', an.whtr != null ? String(an.whtr).replace('.', ',') : '—', lvl(an.whtrClass))}
      ${an.waistRisk ? metric('Cintura', `${String(an.waist).replace('.', ',')} cm`, lvl(an.waistRisk)) : ''}
      ${metric('Idade', `${an.age} anos`)}
    </div>
    ${an.hideNumbers ? `<div class="alert alert-info">${icon('shield')}<p>Seu plano segue <b>sem contagem de calorias</b>, focado em qualidade, regularidade e saciedade.</p></div>` : `
    <h4 class="sub-title">Gasto energético</h4>
    <div class="metrics">
      ${metric('Metabolismo basal', `${fmt(an.bmr)} kcal`, `<small>${esc(an.bmrMethod)}</small>`)}
      ${metric('Gasto total diário', `${fmt(an.tdee)} kcal`, `<small>fator de atividade ${String(an.factor).replace('.', ',')}</small>`)}
      ${metric('Meta diária', `${fmt(an.kcal)} kcal`, `<small>${esc(GOALS[an.goal]?.label ?? '')}${an.goalChanged ? ' (ajustado)' : ''}</small>`)}
    </div>
    <h4 class="sub-title">Macronutrientes</h4>
    <div class="macros">
      <div class="macro" style="--c:#ff3d71"><b>${an.protein} g</b><span>Proteína · ${pct(an.protein, 4)}%</span></div>
      <div class="macro" style="--c:#00e5ff"><b>${an.carbs} g</b><span>Carboidrato · ${pct(an.carbs, 4)}%</span></div>
      <div class="macro" style="--c:#ffc53d"><b>${an.fat} g</b><span>Gordura · ${pct(an.fat, 9)}%</span></div>
      <div class="macro" style="--c:#3dff9a"><b>${(an.water / 1000).toFixed(1).replace('.', ',')} L</b><span>Água</span></div>
      <div class="macro" style="--c:#a66bff"><b>${an.fiber} g</b><span>Fibras</span></div>
    </div>`}
    ${an.alerts.length ? `<h4 class="sub-title">Alertas de segurança</h4>${an.alerts.map((a) => `<div class="alert alert-${a.level}">${icon(a.level === 'bad' ? 'x' : 'eye')}<p>${esc(a.text)}</p></div>`).join('')}` : ''}
    ${flags.length ? `<h4 class="sub-title">Auditoria desta avaliação</h4><div class="flag-row">${flags.map((f) => `<span class="flag ${f === 'peso_com_foto' ? 'ok' : ''}">${esc(FLAGS[f] ?? f)}</span>`).join('')}</div>` : ''}
    <h4 class="sub-title">Orientações</h4>
    <ul class="tips">${an.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <p class="muted small disclaimer">Estimativas baseadas em equações populacionais (erro típico de ±3–5% no % de gordura por perimetria). Não substituem avaliação presencial com nutricionista ou médico.</p>
  </div>`;
}

export function renderWizard(w, { full = true } = {}) {
  const steps = WIZ_STEPS[w.mode];
  const key = steps[w.step];
  const body = { consent: stepConsent, body: stepBody, measures: stepMeasures, scale: stepScale, routine: stepRoutine, health: stepHealth, food: stepFood }[key];
  let content;
  if (key === 'report') {
    const an = analyze(w.h, measuresForAnalysis(w));
    content = renderReport(an);
  } else content = body(w);
  const last = w.step === steps.length - 1;
  const box = `<div class="wiz ${full ? 'auth-box panel auth-wide' : ''}">
    ${full ? `<div class="logo"><span class="logo-mark">${icon('bolt')}</span><span class="logo-text">ASCEND</span></div>` : ''}
    <div class="wiz-head"><div class="kicker">[ AVALIAÇÃO ${w.mode === 'reassess' ? 'DE PROGRESSO' : w.mode === 'complete' ? 'COMPLETAR' : 'INICIAL'} ] · etapa ${w.step + 1}/${steps.length}</div>
      <h2 class="wiz-title">${esc(TITLES[key])}</h2>
      <div class="wiz-dots">${steps.map((_, i) => `<i class="${i < w.step ? 'done' : i === w.step ? 'on' : ''}"></i>`).join('')}</div></div>
    <form class="form" data-form="wiz" novalidate>
      ${content}
      ${w.msg ? `<p class="form-msg">${esc(w.msg)}</p>` : ''}
      <div class="modal-actions wiz-actions">
        ${w.step > 0 ? `<button type="button" class="btn btn-ghost" data-act="wiz-back">Voltar</button>` : ''}
        ${!full ? `<button type="button" class="btn btn-ghost" data-act="wiz-cancel">Cancelar</button>` : ''}
        ${SKIPPABLE.has(key) && (w.mode === 'initial' || w.mode === 'complete') ? `<button type="button" class="btn btn-ghost" data-act="wiz-skip">Pular por enquanto</button>` : ''}
        <button class="btn" type="submit">${last ? `${icon('check')} Salvar avaliação` : key === 'scale' && !w.proofId ? 'Pular (autodeclarado)' : 'Continuar'}</button>
      </div>
      ${SKIPPABLE.has(key) && (w.mode === 'initial' || w.mode === 'complete') ? `<p class="skip-warn small">${icon('eye')}<span>Não tem essa informação agora? Pode pular — mas <b>o resultado não será preciso</b>. Preencha assim que possível: o app vai lembrar você.</span></p>` : ''}
    </form></div>`;
  return full ? `<main class="auth">${box}</main>` : `<section class="view-wiz">${box}</section>`;
}

const avg = (a, b) => (Number(a) + Number(b)) / 2;

/** Converte os campos do assistente (2 medidas por ponto) no formato da avaliação. */
export function measuresForAnalysis(w) {
  const m = w.m;
  return {
    weight_kg: Number(m.weight_kg),
    height_cm: Number(w.h.height_cm),
    waist_cm: m.waist_1 ? avg(m.waist_1, m.waist_2) : null,
    neck_cm: m.neck_1 ? avg(m.neck_1, m.neck_2) : null,
    hip_cm: m.hip_1 ? avg(m.hip_1, m.hip_2) : null,
    bf_method: m.bf_method || 'fita',
    bf_pct: m.bf_method === 'fita' || m.bf_method === 'nenhum' ? null : Number(m.bf_pct) || null,
    estimates: [isPending(w, 'peso') && 'peso_estimado', isPending(w, 'altura') && 'altura_estimada', isPending(w, 'medidas') && 'sem_medidas'].filter(Boolean),
  };
}

/** "Pular por enquanto": preenche padrões conservadores, marca como pendente e avança. */
export function skipWizardStep(w, form) {
  const key = WIZ_STEPS[w.mode][w.step];
  const f = new FormData(form);
  if (key === 'measures') {
    const typed = Number(String(f.get('weight_kg') ?? '').replace(',', '.'));
    const hm = Number(w.h.height_cm) / 100;
    if (typed >= 30 && typed <= 300) { w.m.weight_kg = typed; setPending(w, 'peso', false); }
    else { w.m.weight_kg = Math.round(23.5 * hm * hm * 10) / 10; setPending(w, 'peso', true); } // IMC 23,5 (meio da faixa normal)
    Object.assign(w.m, { bf_method: 'nenhum', bf_pct: null, waist_1: null, waist_2: null, neck_1: null, neck_2: null, hip_1: null, hip_2: null });
    setPending(w, 'medidas', true);
  }
  if (key === 'routine') {
    Object.assign(w.h, { job: w.h.job || 'sentado', training_days: w.h.training_days ?? 3, experience: w.h.experience || 'iniciante', goal: w.h.goal || 'manter' });
    setPending(w, 'rotina', true);
  }
  if (key === 'health') { Object.assign(w.h, { parq: [], conditions: [] }); setPending(w, 'saude', true); }
  if (key === 'food') {
    Object.assign(w.h, { diet_type: w.h.diet_type || 'onivoro', restrictions: [], allergies: [], meals_per_day: w.h.meals_per_day || 5, city: w.h.city || 'Campina Grande - PB' });
    setPending(w, 'alimentacao', true);
  }
  w.msg = '';
  w.step += 1;
}

/** Lê o formulário da etapa atual para o estado do assistente e valida. Retorna mensagem de erro ou ''. */
export function readWizardStep(w, form) {
  const key = WIZ_STEPS[w.mode][w.step];
  const f = new FormData(form);
  const n = (k) => (f.get(k) === '' || f.get(k) == null ? null : Number(String(f.get(k)).replace(',', '.')));
  const need = (cond, msg) => (cond ? '' : msg);

  if (key === 'consent') {
    w.h.consent = f.get('consent') === '1';
    return need(w.h.consent, 'É preciso consentir para continuar.');
  }
  if (key === 'body') {
    Object.assign(w.h, { sex: f.get('sex'), birth_date: f.get('birth_date'), height_cm: n('height_cm') });
    if (!w.h.sex) return 'Selecione o sexo biológico.';
    if (w.h.height_cm == null) { w.h.height_cm = AVG_HEIGHT[w.h.sex]; setPending(w, 'altura', true); }
    else setPending(w, 'altura', false);
    if (!w.h.birth_date) return 'Informe a data de nascimento.';
    const age = ageFrom(w.h.birth_date);
    if (age < 13 || age > 100) return 'Idade fora da faixa atendida (13 a 100 anos).';
    return need(w.h.height_cm >= 120 && w.h.height_cm <= 230, 'Altura deve estar entre 120 e 230 cm.');
  }
  if (key === 'measures') {
    const m = w.m;
    Object.assign(m, {
      weight_kg: n('weight_kg'), bf_method: f.get('bf_method') || 'fita', bf_pct: n('bf_pct'),
      waist_1: n('waist_1'), waist_2: n('waist_2'), neck_1: n('neck_1'), neck_2: n('neck_2'), hip_1: n('hip_1'), hip_2: n('hip_2'),
    });
    if (!(m.weight_kg >= 30 && m.weight_kg <= 300)) return 'Peso deve estar entre 30 e 300 kg.';
    const pairs = [['waist', 'cintura'], ['neck', 'pescoço'], ...(w.h.sex === 'F' ? [['hip', 'quadril']] : [])];
    for (const [k, label] of pairs) {
      const a = m[`${k}_1`], b = m[`${k}_2`];
      if (!a || !b) return `Informe as duas medidas de ${label}.`;
      if (Math.abs(a - b) > 1) return `As duas medidas de ${label} diferem mais de 1 cm (${a} × ${b}). Meça de novo com calma.`;
    }
    if (m.bf_method !== 'fita' && !(m.bf_pct >= 3 && m.bf_pct <= 65)) return 'Informe o % de gordura do laudo (3 a 65%).';
    setPending(w, 'peso', false);
    setPending(w, 'medidas', false);
    if (m.bf_method === 'fita') {
      const mm = measuresForAnalysis(w);
      if (navyBodyFat({ sex: w.h.sex, height: mm.height_cm, waist: mm.waist_cm, neck: mm.neck_cm, hip: mm.hip_cm }) == null) {
        return 'As medidas não fecham no protocolo (ex.: pescoço maior que a cintura). Confira se mediu no ponto certo.';
      }
    }
    return '';
  }
  if (key === 'scale') return '';
  if (key === 'routine') {
    Object.assign(w.h, { job: f.get('job'), training_days: n('training_days'), experience: f.get('experience'), goal: f.get('goal') });
    if (!w.h.job || !w.h.experience || !w.h.goal) return 'Responda todas as perguntas.';
    setPending(w, 'rotina', false);
    return need(w.h.training_days >= 0 && w.h.training_days <= 7, 'Dias de treino: de 0 a 7.');
  }
  if (key === 'health') {
    const parq = PARQ.map((_, i) => f.get(`parq_${i}`));
    if (parq.some((v) => v == null)) return 'Responda todas as perguntas do PAR-Q+.';
    w.h.parq = parq.map((v) => v === '1');
    w.h.conditions = f.getAll('conditions');
    if (f.get('glp1_use') === '1') {
      if (!f.get('glp1_med')) return 'Selecione qual caneta você está usando.';
      if (f.get('glp1_rx') == null) return 'Informe se a caneta foi prescrita por um médico.';
      w.h.glp1 = { med: f.get('glp1_med'), weekday: f.get('glp1_weekday') === '' ? null : Number(f.get('glp1_weekday')),
        dose: f.get('glp1_dose') ? Number(f.get('glp1_dose')) : null, prescribed: f.get('glp1_rx') === '1' };
    } else w.h.glp1 = null;
    setPending(w, 'saude', false);
    return '';
  }
  if (key === 'food') {
    Object.assign(w.h, {
      diet_type: f.get('diet_type') || 'onivoro', restrictions: f.getAll('restrictions'), allergies: f.getAll('allergies'),
      meals_per_day: Number(f.get('meals_per_day')) || 5,
      city: String(f.get('city') || 'Campina Grande - PB').trim(),
    });
    setPending(w, 'alimentacao', false);
    return '';
  }
  return '';
}
