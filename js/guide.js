// Guia de condicionamento e suplementação — conteúdo educativo baseado em consensos:
// OMS 2020 (atividade física), ACSM (prescrição de exercício), ISSN (proteína 2017, creatina 2017, cafeína 2021),
// Tanaka 2001 (FC máxima), Cooper 1968 (teste de 12 min), ANVISA RDC 243/2018 e IN 28/2018 (suplementos).

/** Zonas de frequência cardíaca pelo método de Karvonen (usa FC de repouso quando informada). */
export function hrZones(age, restHr) {
  const max = Math.round(208 - 0.7 * age);
  const rest = Number(restHr) || null;
  const bpm = (p) => Math.round(rest ? rest + (max - rest) * p : max * p);
  const Z = [
    [1, 'Recuperação', 0.5, 0.6, 'Aquecimento, desaquecimento e dias leves.'],
    [2, 'Base aeróbia', 0.6, 0.7, 'Consegue conversar. Queima gordura e constrói resistência — a maior parte do cardio deve ficar aqui.'],
    [3, 'Tempo', 0.7, 0.8, 'Frases curtas. Melhora a eficiência aeróbia.'],
    [4, 'Limiar', 0.8, 0.9, 'Respiração pesada. Eleva o limiar de lactato — intervalos de 3 a 10 min.'],
    [5, 'VO₂máx', 0.9, 1, 'Esforço máximo. Tiros de 30 s a 3 min; no máximo 1–2×/semana.'],
  ];
  return { max, rest, method: rest ? 'Karvonen (FC de reserva)' : '% da FC máxima', zones: Z.map(([n, name, lo, hi, use]) => ({ n, name, lo: bpm(lo), hi: bpm(hi), use })) };
}

/** VO₂máx estimado pelo teste de Cooper (distância em metros em 12 min). */
export function cooper(distance, age, sex) {
  const vo2 = Math.round(((distance - 504.9) / 44.73) * 10) / 10;
  // Classificação aproximada (ACSM) por sexo e faixa etária.
  const t = sex === 'F'
    ? (age < 30 ? [31, 35, 39, 44] : age < 40 ? [29, 33, 37, 42] : age < 50 ? [27, 31, 35, 40] : [24, 28, 32, 36])
    : (age < 30 ? [38, 42, 46, 51] : age < 40 ? [35, 39, 43, 48] : age < 50 ? [33, 37, 41, 46] : [30, 34, 38, 43]);
  const labels = ['Fraco', 'Regular', 'Bom', 'Muito bom', 'Excelente'];
  const idx = t.findIndex((x) => vo2 < x);
  return { vo2, label: labels[idx === -1 ? 4 : idx] };
}

export const CONDITIONING = [
  { t: 'Os 4 pilares', items: [
    '<b>Sobrecarga progressiva</b>: todo mês, algo precisa ficar mais difícil — carga, repetições, séries ou menos descanso. O app sugere a carga a cada treino.',
    '<b>Especificidade</b>: você melhora no que treina. Força → cargas altas; resistência → volume de cardio; esporte → gestos do esporte.',
    '<b>Recuperação</b>: o músculo cresce no descanso. 48–72 h entre treinos pesados do mesmo grupo e 7–9 h de sono.',
    '<b>Consistência</b>: 80% de aderência por 12 meses vence 100% por 3 semanas.',
  ] },
  { t: 'Força e hipertrofia', items: [
    'Volume: 10–20 séries por grupo muscular por semana, divididas em 2 ou mais sessões.',
    'Faixas: 1–5 reps (força máxima), 6–12 (hipertrofia), 12–20 (resistência muscular) — todas geram hipertrofia quando próximas da falha.',
    'Intensidade: termine as séries com 1–3 repetições em reserva (RIR). Ir à falha só na última série e em máquinas.',
    'Descanso: 2–3 min em exercícios compostos (agachamento, supino, remada); 60–90 s em isolados.',
    'Técnica antes de carga: amplitude completa e controle na descida (2–3 s).',
  ] },
  { t: 'Cardio e condicionamento', items: [
    'OMS: 150–300 min/semana de moderado ou 75–150 min de vigoroso + força 2×/semana.',
    'Distribuição 80/20: ~80% do cardio em zona 2 (conversando) e ~20% intenso (zonas 4–5).',
    'HIIT: 1–2×/semana, ex.: 8 × 30 s forte / 90 s leve. Use o Timer → Intervalos.',
    'Passos: 8–10 mil por dia melhoram a saúde metabólica e aumentam o gasto sem gerar fadiga.',
    'Faça cardio intenso longe do treino de pernas (ou depois dele), para não prejudicar a força.',
  ] },
  { t: 'Aquecimento e mobilidade', items: [
    '5–10 min: cardio leve + mobilidade das articulações que vai usar + 2 séries de aproximação (40% e 70% da carga).',
    'Alongamento estático longo (>60 s) logo antes da força pode reduzir o desempenho — deixe para depois ou para outro horário.',
    'Mobilidade diária de quadril, tornozelo e coluna torácica previne lesões e melhora o agachamento.',
  ] },
  { t: 'Nutrição em torno do treino', items: [
    'Proteína total do dia é o que mais importa (1,6–2,2 g/kg). Distribua em 3–5 refeições com 20–40 g cada.',
    'Pré-treino (1–3 h antes): carboidrato + proteína, pouca gordura e fibra (ex.: tapioca com frango, banana com whey).',
    'Pós-treino: refeição com proteína e carboidrato em até 2 h — não precisa ser imediato.',
    'Treinos acima de 90 min: 30–60 g de carboidrato por hora durante o exercício.',
  ] },
  { t: 'Hidratação', items: [
    'Pese-se antes e depois de um treino: cada 1 kg perdido = reponha ~1,5 L de líquido.',
    'Perder mais de 2% do peso em suor já reduz o desempenho. Em treinos longos e calor, use eletrólitos (sódio).',
    'Urina amarelo-clara ao longo do dia = hidratação adequada.',
  ] },
  { t: 'Sono e recuperação', items: [
    '7–9 h por noite. Menos de 6 h reduz força, aumenta a fome e a perda de massa magra em dieta — o app ajusta suas metas quando você dorme pouco.',
    'Rotina: mesmo horário para deitar e acordar, quarto escuro e fresco (18–22 °C), telas desligadas 1 h antes.',
    'Cafeína só até 6–8 h antes de dormir; álcool piora o sono profundo.',
    'Deload a cada 4–6 semanas (o app aplica na 5ª semana do mesociclo).',
  ] },
  { t: 'Sinais de excesso de treino', items: [
    'Queda de desempenho por mais de 1–2 semanas, cansaço persistente, sono ruim, irritabilidade, FC de repouso 5+ bpm acima do normal, dores que não passam.',
    'O que fazer: 1 semana de deload, mais sono, calorias na manutenção e revisão da carga de treino.',
  ] },
];

export const SUPPLEMENTS = [
  { n: 'Creatina monoidratada', ev: 'A', txt: 'O suplemento com mais evidência para força, potência e massa magra. 3–5 g/dia, todos os dias, em qualquer horário (não precisa de fase de saturação). Pode aumentar 1–2 kg de água intramuscular e elevar levemente a creatinina do exame (sem indicar lesão renal em pessoas saudáveis). Quem tem doença renal deve consultar o médico.' },
  { n: 'Whey protein', ev: 'A', txt: 'É um alimento prático para bater a meta de proteína, não é mágica. Veja os tipos abaixo.' },
  { n: 'Cafeína', ev: 'A', txt: '3–6 mg/kg 30–60 min antes do treino melhora o desempenho. Comece com 2–3 mg/kg. Evite nas 6–8 h antes de dormir. Contraindicada em arritmias, gestação (limite 200 mg/dia) e ansiedade.' },
  { n: 'Beta-alanina', ev: 'B', txt: 'Ajuda em esforços de 1 a 4 min (HIIT, lutas, remo). 3,2–6,4 g/dia em doses divididas. Formigamento na pele é normal e inofensivo.' },
  { n: 'Vitamina D, ferro e B12', ev: 'B', txt: 'Só com deficiência comprovada em exame (veja a aba Exames). Suplementar sem precisar não melhora o desempenho, e ferro em excesso faz mal.' },
  { n: 'Ômega-3', ev: 'C', txt: 'Benefício cardiovascular com triglicérides altos; efeito pequeno no desempenho. Prefira comer peixe 2×/semana.' },
  { n: 'BCAA, glutamina, termogênicos, "pré-hormonais"', ev: 'D', txt: 'BCAA e glutamina não trazem benefício quando a proteína do dia está adequada. Termogênicos têm efeito mínimo e riscos cardíacos. Pró-hormonais e anabolizantes: riscos graves à saúde e proibidos no esporte.' },
];

export const WHEY_TYPES = [
  { n: 'Concentrado (WPC)', prot: '70–80%', lact: 'Tem lactose', abs: 'Rápida', custo: '$', para: 'Custo-benefício para quem tolera lactose.' },
  { n: 'Isolado (WPI)', prot: '≥ 90%', lact: 'Quase zero', abs: 'Rápida', custo: '$$', para: 'Intolerantes à lactose, dietas com pouco carboidrato e gordura.' },
  { n: 'Hidrolisado (WPH)', prot: '80–90%', lact: 'Muito baixa', abs: 'Muito rápida', custo: '$$$', para: 'Estômago sensível. A vantagem prática sobre o isolado é pequena.' },
  { n: '3W / Blend', prot: '70–85%', lact: 'Varia', abs: 'Mista', custo: '$$', para: 'Mistura dos três; confira no rótulo a proporção real de cada um.' },
  { n: 'Caseína micelar', prot: '75–85%', lact: 'Tem lactose', abs: 'Lenta (6–7 h)', custo: '$$', para: 'Antes de dormir ou longos períodos sem comer.' },
  { n: 'Proteína vegetal (ervilha + arroz)', prot: '70–85%', lact: 'Zero', abs: 'Média', custo: '$$', para: 'Veganos e alérgicos ao leite. Prefira blends (ervilha + arroz) para ter todos os aminoácidos essenciais.' },
  { n: 'Albumina (clara de ovo)', prot: '~80%', lact: 'Zero', abs: 'Média', custo: '$', para: 'Barata e sem lactose, mas o sabor é mais difícil; alérgicos a ovo não podem.' },
];

export const WHEY_CHECKLIST = [
  'Proteína por dose: divida a proteína pelo tamanho da dose. Abaixo de 70% (ex.: 21 g em 30 g) é concentrado fraco ou tem enchimento.',
  'Lista de ingredientes: o primeiro deve ser a proteína. Desconfie de glicina, taurina, glutamina e creatina entre os primeiros — isso infla a proteína no rótulo ("amino spiking").',
  'Laudos: marcas sérias publicam laudos de laboratórios independentes; testes de associações de consumidores já reprovaram marcas conhecidas.',
  'Regularização: o produto deve seguir a RDC 243/2018 da ANVISA (suplementos alimentares). Desconfie de promessas de "queima de gordura" ou "anabolizante natural".',
  'Dose: 20–40 g por vez. O total de proteína do dia é o que conta — whey não é obrigatório se a alimentação já bate a meta.',
];

/** Custo por 100 g de proteína real. */
export function wheyCost({ price, packG, doseG, protPerDose }) {
  const doses = packG / doseG;
  const protTotal = doses * protPerDose;
  return {
    purity: Math.round((protPerDose / doseG) * 100),
    per100: Math.round((price / protTotal) * 100 * 100) / 100,
    perDose: Math.round((price / doses) * 100) / 100,
    doses: Math.floor(doses),
  };
}
