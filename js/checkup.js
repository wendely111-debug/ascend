// Check-up recomendado: quais médicos procurar e quais exames levar, conforme o perfil.
// Base: rastreamentos do Ministério da Saúde/INCA, SBD 2024, SBC 2019 (avaliação pré-participação),
// SBEM, e o monitoramento usual de quem usa agonistas de GLP-1/GIP.
// O app não prescreve: gera uma LISTA PARA DISCUTIR COM O MÉDICO, que é quem solicita os exames.
import { MARKERS } from './labs.js';

const E = (key, name, why, months = 12) => ({ key, name, why, months });

export function buildCheckup({ h, an, labs, age }) {
  const sex = h.sex;
  const cond = new Set(h.conditions || []);
  const glp1 = Boolean(h.glp1?.med);
  const parqYes = (h.parq || []).some(Boolean);
  const obese = an && an.bmi >= 30;
  const doctors = [];
  const add = (esp, why, prio = 'rotina') => doctors.push({ esp, why, prio });

  // ---- Médicos
  add('Clínico geral ou médico de família', 'Porta de entrada: avalia o conjunto, solicita os exames de rotina e encaminha aos especialistas.', 'primeiro');
  if (glp1 || obese || cond.has('diabetes') || cond.has('tireoide')) {
    add('Endocrinologista', glp1 ? 'Acompanhar a caneta (dose, efeitos, exames a cada 3 meses no início). Obrigatório se o produto não tem registro ou não foi prescrito.' : 'Obesidade, glicose, tireoide ou hormônios alterados.', 'prioritario');
  }
  if (age >= 35 || parqYes || cond.has('hipertensao') || cond.has('cardiaca') || cond.has('diabetes') || obese) {
    add('Cardiologista', 'Avaliação pré-participação para treino intenso: eletrocardiograma e teste ergométrico (idade ≥ 35, fatores de risco ou PAR-Q positivo).', parqYes || cond.has('cardiaca') ? 'prioritario' : 'rotina');
  }
  add('Nutricionista ou nutrólogo', glp1 ? 'Ajustar o cardápio à caneta: proteína, micronutrientes e sintomas gastrointestinais.' : 'Individualizar o plano alimentar a partir do cardápio do app.');
  if (cond.has('renal')) add('Nefrologista', 'Liberação para dieta e treino; controle da proteína.', 'prioritario');
  if (cond.has('transtorno')) add('Psicólogo e psiquiatra', 'Histórico de transtorno alimentar exige acompanhamento conjunto.', 'prioritario');
  if (sex === 'F') add('Ginecologista', glp1 ? 'Rotina anual e anticoncepção durante o uso da caneta.' : 'Rotina anual (citopatológico, mamografia conforme idade).');
  if (sex === 'M' && age >= 45) add('Urologista', 'Rotina a partir dos 45–50 anos (converse sobre o PSA).');
  add('Profissional de educação física', 'Montar e supervisionar o treino, principalmente se iniciante.');

  // ---- Exames (painel base + extras por perfil)
  const exams = [
    E('hb', 'Hemograma completo', 'Anemia, infecções, plaquetas.'),
    E('glicemia', 'Glicemia de jejum', 'Rastreio de diabetes.'),
    E('hba1c', 'Hemoglobina glicada (HbA1c)', 'Média da glicose em 3 meses.'),
    E('insulina', 'Insulina de jejum (HOMA-IR)', 'Resistência à insulina.'),
    E('colesterol', 'Perfil lipídico (colesterol total, LDL, HDL, triglicérides)', 'Risco cardiovascular.'),
    E('creatinina', 'Creatinina e ureia (função renal / TFG)', 'Função dos rins — essencial com dieta rica em proteína.'),
    E('tgp', 'TGO, TGP e GGT', 'Fígado (gordura no fígado, álcool, remédios).'),
    E('tsh', 'TSH e T4 livre', 'Tireoide (interfere no gasto calórico).'),
    E('vitd', 'Vitamina D (25-OH)', 'Ossos, músculo, imunidade.'),
    E('b12', 'Vitamina B12', 'Energia e nervos (veganos, metformina, omeprazol).'),
    E('ferritina', 'Ferritina e ferro sérico', 'Estoque de ferro — condicionamento aeróbio.'),
    E('acido_urico', 'Ácido úrico', 'Gota e risco metabólico.'),
    E('potassio', 'Sódio, potássio, magnésio e cálcio', 'Eletrólitos — câimbras, pressão, coração.'),
    E('pcr', 'PCR ultrassensível', 'Inflamação e risco cardiovascular.'),
    E(null, 'Urina tipo 1 (EAS)', 'Rins e vias urinárias.'),
  ];
  if (glp1) {
    exams.push(
      E('lipase', 'Amilase e lipase', 'Pâncreas — referência antes/durante a caneta e se houver dor abdominal.', 3),
      E(null, 'Calcitonina (discutir com o médico)', 'Só se houver histórico pessoal/familiar de câncer medular de tireoide ou NEM2 (contraindicação da caneta).', 0),
    );
    for (const x of exams) if (['hb', 'glicemia', 'hba1c', 'colesterol', 'creatinina', 'tgp', 'b12', 'ferritina', 'vitd', 'potassio'].includes(x.key)) x.months = 3;
  }
  if (sex === 'M' && (age >= 40 || h.goal === 'hipertrofia')) exams.push(E('testo', 'Testosterona total e livre', 'Somente se houver sintomas (cansaço, libido, perda de massa) — discutir com o médico.'));
  if (sex === 'M' && age >= 45) exams.push(E(null, 'PSA (decisão compartilhada com o urologista)', 'Rastreio de próstata a partir dos 45–50 anos.'));
  if (age >= 35 || parqYes || obese) exams.push(E(null, 'Eletrocardiograma e teste ergométrico', 'Liberação para treino de alta intensidade.', 24));
  if (h.training_days >= 4) exams.push(E('ck', 'CK (creatinoquinase)', 'Dano muscular — colete após 72 h sem treino pesado.'));

  // ---- Situação de cada exame (último lançamento na aba Exames)
  const lastDate = {};
  for (const l of labs) for (const k of Object.keys(l.values || {})) if (!lastDate[k] || l.taken_on > lastDate[k]) lastDate[k] = l.taken_on;
  const today = new Date();
  for (const x of exams) {
    const d = x.key ? lastDate[x.key] : null;
    if (!x.key) { x.status = 'manual'; continue; }
    if (!d) { x.status = 'faltando'; continue; }
    const monthsAgo = (today - new Date(`${d}T12:00`)) / (30.4 * 86400000);
    x.last = d;
    x.status = x.months && monthsAgo > x.months ? 'vencido' : 'ok';
  }
  const freq = glp1 ? 'A cada 3 meses no primeiro ano de caneta; depois, a cada 6 meses.' : age >= 40 ? 'Anualmente.' : 'A cada 1–2 anos, ou antes se houver sintomas.';
  return { doctors, exams, freq, glp1 };
}

/** Texto pronto para copiar/levar à consulta. */
export function checkupText({ doctors, exams, freq }, name) {
  const lines = [
    `CHECK-UP — ${name} (gerado pelo ASCEND em ${new Date().toLocaleDateString('pt-BR')})`,
    'Lista para DISCUTIR com o médico — quem solicita os exames é o profissional.',
    '',
    'ESPECIALISTAS:',
    ...doctors.map((d) => `• ${d.esp}${d.prio === 'prioritario' ? ' (prioritário)' : ''} — ${d.why}`),
    '',
    'EXAMES SUGERIDOS:',
    ...exams.map((e) => `• ${e.name}${e.status === 'faltando' ? ' [nunca feito]' : e.status === 'vencido' ? ` [último em ${e.last.split('-').reverse().join('/')}]` : ''}`),
    '',
    `Frequência: ${freq}`,
  ];
  return lines.join('\n');
}

export const markerKnown = (k) => Boolean(MARKERS[k]);
