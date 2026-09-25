// Exames laboratoriais: faixas de referência de ADULTOS e orientação educativa.
// Referências: SBEM/SBPC-ML 2017 (vitamina D), SBD 2023/ADA (glicemia/HbA1c), SBC 2017 (lípides),
// OMS (hemoglobina/ferritina). Faixas variam entre laboratórios — o usuário pode usar a referência do laudo.
// Nada aqui é prescrição: suplementação e dose são definidas pelo médico/nutricionista.

// z: faixas [limite superior exclusivo, nível, rótulo]; por sexo quando necessário.
export const GROUPS = {
  vitaminas: 'Vitaminas e minerais', sangue: 'Hemograma e ferro', glicose: 'Glicose e insulina', lipides: 'Colesterol e triglicérides',
  tireoide: 'Tireoide', rim: 'Rins', pancreas: 'Pâncreas (quem usa caneta)', figado: 'Fígado e músculo', hormonios: 'Hormônios', inflamacao: 'Inflamação',
};

export const MARKERS = {
  vitd: { n: 'Vitamina D (25-OH)', u: 'ng/mL', g: 'vitaminas', z: [[20, 'bad', 'Deficiência'], [30, 'ok', 'Adequado (população geral)'], [60, 'good', 'Ideal p/ atletas e grupos de risco'], [100, 'warn', 'Elevado'], [Infinity, 'bad', 'Risco de toxicidade']],
    low: 'Exposição solar de 15–20 min (braços e pernas, fora do horário de pico), peixes gordos (sardinha, salmão), gema de ovo. Níveis abaixo de 20 costumam exigir reposição prescrita pelo médico; a manutenção usual em adultos fica entre 1.000 e 2.000 UI/dia (SBEM) — confirme a dose com seu médico.',
    high: 'Suspenda suplementos de vitamina D e procure seu médico: excesso eleva o cálcio no sangue.' },
  b12: { n: 'Vitamina B12', u: 'pg/mL', g: 'vitaminas', z: [[200, 'bad', 'Deficiência'], [300, 'warn', 'Limítrofe'], [900, 'good', 'Adequado'], [Infinity, 'warn', 'Elevado']],
    low: 'Fontes: carnes, ovos, laticínios, peixes. Veganos e usuários de metformina ou omeprazol precisam de suplementação — converse com o médico (também dosar ácido metilmalônico se limítrofe).',
    high: 'Geralmente reflete suplementação. Se não suplementa, mostre ao médico.' },
  folato: { n: 'Ácido fólico', u: 'ng/mL', g: 'vitaminas', z: [[4, 'bad', 'Baixo'], [Infinity, 'good', 'Adequado']],
    low: 'Folhas verde-escuras, feijões, lentilha, grão-de-bico, laranja. Mulheres que planejam gestar devem falar com o médico sobre suplementação.' },
  magnesio: { n: 'Magnésio', u: 'mg/dL', g: 'vitaminas', z: [[1.7, 'bad', 'Baixo'], [2.4, 'good', 'Adequado'], [Infinity, 'warn', 'Elevado']],
    low: 'Castanhas, sementes (abóbora, chia), cacau, feijões, folhas verdes, aveia. Perdas aumentam com suor intenso e álcool.' },
  zinco: { n: 'Zinco', u: 'µg/dL', g: 'vitaminas', z: [[70, 'bad', 'Baixo'], [120, 'good', 'Adequado'], [Infinity, 'warn', 'Elevado']],
    low: 'Carnes, frutos do mar, ovos, castanhas, sementes de abóbora, feijões (deixar de molho melhora a absorção).' },
  calcio: { n: 'Cálcio total', u: 'mg/dL', g: 'vitaminas', z: [[8.5, 'bad', 'Baixo'], [10.5, 'good', 'Adequado'], [Infinity, 'bad', 'Elevado']],
    low: 'Laticínios, sardinha com espinha, tofu, brócolis. Verifique também a vitamina D.', high: 'Cálcio elevado precisa de avaliação médica.' },
  potassio: { n: 'Potássio', u: 'mEq/L', g: 'vitaminas', z: [[3.5, 'bad', 'Baixo'], [5.1, 'good', 'Adequado'], [Infinity, 'bad', 'Elevado']],
    low: 'Banana, batata, feijão, abacate, água de coco. Diuréticos e vômitos/diarreia reduzem o potássio.', high: 'Potássio alto pode afetar o coração — procure o médico.' },
  sodio: { n: 'Sódio', u: 'mEq/L', g: 'vitaminas', z: [[135, 'bad', 'Baixo'], [145, 'good', 'Adequado'], [Infinity, 'bad', 'Elevado']],
    low: 'Sódio baixo em atletas pode vir de excesso de água sem eletrólitos em provas longas — procure o médico.', high: 'Pode indicar desidratação.' },
  hb: { n: 'Hemoglobina', u: 'g/dL', g: 'sangue', z: { M: [[13.5, 'bad', 'Anemia'], [17.5, 'good', 'Adequado'], [Infinity, 'warn', 'Elevada']], F: [[12, 'bad', 'Anemia'], [15.5, 'good', 'Adequado'], [Infinity, 'warn', 'Elevada']] },
    low: 'Investigue a causa com o médico (ferro, B12, folato). Anemia reduz muito o condicionamento aeróbio.', high: 'Pode ocorrer por desidratação, altitude ou uso de hormônios — avalie com o médico.' },
  ferritina: { n: 'Ferritina', u: 'ng/mL', g: 'sangue', z: { M: [[30, 'bad', 'Estoque de ferro baixo'], [400, 'good', 'Adequado'], [Infinity, 'warn', 'Elevada']], F: [[30, 'bad', 'Estoque de ferro baixo'], [150, 'good', 'Adequado'], [Infinity, 'warn', 'Elevada']] },
    low: 'Carne vermelha magra, fígado, feijão e lentilha junto com vitamina C (laranja, acerola). Evite café/chá nas refeições principais. Reposição de ferro só com prescrição.',
    high: 'Ferritina alta também sobe com inflamação e fígado gorduroso — mostre ao médico.' },
  ferro: { n: 'Ferro sérico', u: 'µg/dL', g: 'sangue', z: [[60, 'warn', 'Baixo'], [170, 'good', 'Adequado'], [Infinity, 'warn', 'Elevado']], low: 'Veja a ferritina: ela mostra melhor o estoque de ferro.' },
  glicemia: { n: 'Glicemia de jejum', u: 'mg/dL', g: 'glicose', z: [[70, 'warn', 'Baixa'], [100, 'good', 'Normal'], [126, 'warn', 'Pré-diabetes'], [Infinity, 'bad', 'Compatível com diabetes']],
    high: 'Priorize carboidratos integrais e fibras, distribua o carboidrato ao longo do dia, treine força + cardio e reduza açúcar e ultraprocessados. Confirme o diagnóstico com o médico.' },
  hba1c: { n: 'Hemoglobina glicada (HbA1c)', u: '%', g: 'glicose', z: [[5.7, 'good', 'Normal'], [6.5, 'warn', 'Pré-diabetes'], [Infinity, 'bad', 'Compatível com diabetes']],
    high: 'Reflete a média de glicose de ~3 meses. Mesmas condutas da glicemia alta; o plano reduziu a fatia de carboidratos.' },
  insulina: { n: 'Insulina de jejum', u: 'µU/mL', g: 'glicose', z: [[2, 'warn', 'Baixa'], [25, 'good', 'Adequada'], [Infinity, 'warn', 'Elevada']],
    high: 'Insulina alta sugere resistência à insulina: perda de gordura abdominal, treino de força e sono melhoram muito.' },
  colesterol: { n: 'Colesterol total', u: 'mg/dL', g: 'lipides', z: [[190, 'good', 'Desejável'], [240, 'warn', 'Elevado'], [Infinity, 'bad', 'Muito elevado']],
    high: 'Reduza gordura saturada (frituras, carnes gordas, embutidos), aumente fibras solúveis (aveia, feijão, frutas) e prefira azeite e peixes.' },
  ldl: { n: 'LDL-colesterol', u: 'mg/dL', g: 'lipides', z: [[130, 'good', 'Adequado (baixo risco)'], [160, 'warn', 'Limítrofe/alto'], [190, 'bad', 'Alto'], [Infinity, 'bad', 'Muito alto — avaliar hipercolesterolemia familiar']],
    high: 'A meta de LDL depende do seu risco cardiovascular (o médico define). Fibras solúveis, menos gordura saturada e perda de gordura corporal ajudam.' },
  hdl: { n: 'HDL-colesterol', u: 'mg/dL', g: 'lipides', z: [[40, 'bad', 'Baixo'], [Infinity, 'good', 'Adequado']],
    low: 'Exercício aeróbio regular, perda de gordura, parar de fumar e gorduras boas (azeite, castanhas, abacate) elevam o HDL.' },
  tg: { n: 'Triglicérides', u: 'mg/dL', g: 'lipides', z: [[150, 'good', 'Desejável'], [500, 'warn', 'Elevado'], [Infinity, 'bad', 'Muito elevado — risco de pancreatite']],
    high: 'Corte açúcar, bebidas açucaradas e álcool; reduza carboidratos refinados; peixes gordos e cardio ajudam bastante.' },
  tsh: { n: 'TSH', u: 'mUI/L', g: 'tireoide', z: [[0.4, 'warn', 'Baixo (hipertireoidismo?)'], [4.5, 'good', 'Normal'], [10, 'warn', 'Elevado (hipotireoidismo subclínico?)'], [Infinity, 'bad', 'Muito elevado']],
    low: 'Leve ao endocrinologista junto com o T4 livre.', high: 'Leve ao endocrinologista junto com o T4 livre e anti-TPO. Hipotireoidismo reduz o gasto calórico.' },
  t4l: { n: 'T4 livre', u: 'ng/dL', g: 'tireoide', z: [[0.7, 'warn', 'Baixo'], [1.8, 'good', 'Normal'], [Infinity, 'warn', 'Elevado']] },
  creatinina: { n: 'Creatinina', u: 'mg/dL', g: 'rim', z: { M: [[0.7, 'ok', 'Baixa'], [1.3, 'good', 'Normal'], [2, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']], F: [[0.6, 'ok', 'Baixa'], [1.1, 'good', 'Normal'], [2, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']] },
    high: 'Quem tem muita massa muscular ou toma creatina costuma ter creatinina um pouco acima — mas o médico precisa avaliar a função renal (TFG, cistatina C). Enquanto isso, o plano limita a proteína a 1,2 g/kg.' },
  ureia: { n: 'Ureia', u: 'mg/dL', g: 'rim', z: [[15, 'ok', 'Baixa'], [45, 'good', 'Normal'], [Infinity, 'warn', 'Elevada']],
    high: 'Sobe com dieta muito rica em proteína e desidratação. Hidrate-se e mostre ao médico junto com a creatinina.' },
  acido_urico: { n: 'Ácido úrico', u: 'mg/dL', g: 'rim', z: { M: [[3.4, 'ok', 'Baixo'], [7, 'good', 'Normal'], [Infinity, 'warn', 'Elevado']], F: [[2.4, 'ok', 'Baixo'], [6, 'good', 'Normal'], [Infinity, 'warn', 'Elevado']] },
    high: 'Reduza álcool (sobretudo cerveja), refrigerantes/sucos com frutose e excesso de carnes vermelhas e vísceras; hidrate-se.' },
  tgo: { n: 'TGO / AST', u: 'U/L', g: 'figado', z: [[40, 'good', 'Normal'], [120, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']],
    high: 'Treino pesado nos 2–3 dias anteriores eleva TGO e CK. Refaça o exame após 72 h sem treino intenso; se persistir, procure o médico.' },
  tgp: { n: 'TGP / ALT', u: 'U/L', g: 'figado', z: [[41, 'good', 'Normal'], [120, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']],
    high: 'TGP alta sugere agressão ao fígado (gordura no fígado, álcool, remédios, anabolizantes). Perda de gordura e cortar álcool ajudam — avalie com o médico.' },
  ggt: { n: 'GGT (gama-GT)', u: 'U/L', g: 'figado', z: { M: [[60, 'good', 'Normal'], [180, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']], F: [[40, 'good', 'Normal'], [120, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']] },
    high: 'GGT sobe com álcool, gordura no fígado e alguns remédios — reduza o álcool e mostre ao médico.' },
  amilase: { n: 'Amilase', u: 'U/L', g: 'pancreas', z: [[28, 'ok', 'Baixa'], [100, 'good', 'Normal'], [300, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada']],
    high: 'Com dor abdominal forte, procure atendimento (pancreatite). Sem dor, mostre ao médico que acompanha a caneta.' },
  lipase: { n: 'Lipase', u: 'U/L', g: 'pancreas', z: [[60, 'good', 'Normal'], [180, 'warn', 'Elevada'], [Infinity, 'bad', 'Muito elevada (3× o limite)']],
    high: 'Lipase acima de 3× o limite com dor abdominal sugere pancreatite: atendimento médico imediato. Quem usa caneta deve avisar o médico de qualquer elevação.' },
  ck: { n: 'CK (creatinoquinase)', u: 'U/L', g: 'figado', z: { M: [[190, 'good', 'Normal'], [1000, 'warn', 'Elevada (comum após treino)'], [5000, 'bad', 'Muito elevada'], [Infinity, 'bad', 'Risco de rabdomiólise']], F: [[170, 'good', 'Normal'], [1000, 'warn', 'Elevada (comum após treino)'], [5000, 'bad', 'Muito elevada'], [Infinity, 'bad', 'Risco de rabdomiólise']] },
    high: 'Hidrate-se e reduza a intensidade. Urina escura + dor muscular intensa = procure atendimento médico.' },
  testo: { n: 'Testosterona total', u: 'ng/dL', g: 'hormonios', z: { M: [[264, 'warn', 'Baixa'], [916, 'good', 'Normal'], [Infinity, 'warn', 'Elevada']], F: [[8, 'ok', 'Baixa'], [60, 'good', 'Normal'], [Infinity, 'warn', 'Elevada']] },
    low: 'Sono insuficiente, déficit calórico agressivo, excesso de gordura e overtraining reduzem a testosterona. Avalie com endocrinologista antes de qualquer reposição.' },
  pcr: { n: 'PCR ultrassensível', u: 'mg/L', g: 'inflamacao', z: [[1, 'good', 'Risco cardiovascular baixo'], [3, 'warn', 'Risco médio'], [10, 'bad', 'Risco alto'], [Infinity, 'bad', 'Inflamação/infecção aguda']],
    high: 'Perda de gordura, sono, dieta com peixes, azeite, frutas e vegetais reduzem a inflamação. Acima de 10, repita após 2 semanas (pode ser infecção).' },
};

// Valores críticos: pedem atenção médica rápida.
const CRITICAL = { lipase: [null, 180], glicemia: [54, 250], hb: [9, null], potassio: [3, 6], sodio: [128, 152], tsh: [0.1, 15], creatinina: [null, 2], ck: [null, 5000], tg: [null, 1000], calcio: [7.5, 11.5] };

function zones(def, sex) { return Array.isArray(def.z) ? def.z : def.z[sex] ?? def.z.M; }

/** Interpreta um valor. custom = {min,max} da referência do laudo (opcional). */
export function interpret(key, value, sex, custom) {
  const def = MARKERS[key];
  const v = Number(value);
  if (!def || !Number.isFinite(v)) return null;
  let level, label;
  if (custom?.min != null || custom?.max != null) {
    if (custom.min != null && v < custom.min) { level = 'bad'; label = 'Abaixo da referência do laudo'; }
    else if (custom.max != null && v > custom.max) { level = 'bad'; label = 'Acima da referência do laudo'; }
    else { level = 'good'; label = 'Dentro da referência do laudo'; }
  } else {
    const z = zones(def, sex).find(([max]) => v < max);
    [, level, label] = z;
  }
  const zs = zones(def, sex);
  const goodIdx = zs.findIndex(([, lv]) => lv === 'good');
  let dir = level === 'good' || level === 'ok' ? null : zs.findIndex(([max]) => v < max) < goodIdx ? 'low' : 'high';
  if (custom?.min != null || custom?.max != null) dir = level === 'good' ? null : v < (custom.min ?? -Infinity) ? 'low' : 'high';
  const [cLo, cHi] = CRITICAL[key] ?? [];
  const critical = (cLo != null && v < cLo) || (cHi != null && v > cHi);
  return { key, name: def.n, unit: def.u, v, level, label, dir, advice: dir ? def[dir] ?? '' : '', critical };
}

export function interpretAll(values, sex) {
  const out = [];
  for (const [k, x] of Object.entries(values || {})) {
    const r = interpret(k, x?.v ?? x, sex, x);
    if (r) out.push(r);
  }
  return out;
}

/** Efeitos dos exames sobre o plano alimentar (usado pelo analyze()). */
export function labEffects(results) {
  const by = Object.fromEntries(results.map((r) => [r.key, r]));
  const fx = { carbCap: null, proteinCapPerKg: null, alerts: [], tips: [] };
  const hi = (k) => by[k] && by[k].dir === 'high';
  const lo = (k) => by[k] && by[k].dir === 'low';
  if (hi('glicemia') || hi('hba1c') || hi('insulina')) {
    fx.carbCap = 0.4;
    fx.tips.push('Exames de glicose alterados: carboidratos limitados a 40% das calorias, sempre acompanhados de proteína e fibra.');
  }
  if (hi('creatinina') || hi('ureia')) {
    fx.proteinCapPerKg = 1.2;
    fx.alerts.push({ level: 'bad', text: 'Creatinina/ureia elevadas: proteína limitada a 1,2 g/kg até avaliação médica da função renal.' });
  }
  if (lo('ferritina') || lo('hb')) fx.tips.push('Ferro baixo: inclua carne vermelha magra 3×/semana ou feijão/lentilha com fruta cítrica na mesma refeição.');
  if (hi('ldl') || hi('colesterol') || hi('tg')) fx.tips.push('Lípides alterados: peixe 2×/semana, aveia diária, azeite no lugar de manteiga, zero frituras e ultraprocessados.');
  if (lo('vitd')) fx.tips.push('Vitamina D baixa: sol diário de 15–20 min e peixes gordos; peça ao médico orientação de reposição.');
  if (lo('b12')) fx.tips.push('B12 baixa: priorize ovos, laticínios e carnes (ou suplemento prescrito, se vegano).');
  if (hi('tsh') || lo('tsh')) fx.alerts.push({ level: 'warn', text: 'Tireoide alterada: o gasto calórico estimado pode estar errado — reavalie o peso a cada 2 semanas e procure o endocrinologista.' });
  for (const r of results.filter((x) => x.critical)) fx.alerts.push({ level: 'bad', text: `${r.name} = ${String(r.v).replace('.', ',')} ${r.unit}: valor crítico. Procure seu médico o quanto antes.` });
  return fx;
}
