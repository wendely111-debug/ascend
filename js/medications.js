// Agonistas de GLP-1/GIP (canetas para obesidade/diabetes) — ajustes de dieta e segurança.
// Base: Joint Advisory ACLM/ASN/OMA/TOS 2025 "Nutritional priorities to support GLP-1 therapy";
// bula do Mounjaro (Anvisa); alertas da Anvisa sobre tirzepatida irregular (Tirzec, T.G.) em 2026.
// O app NÃO orienta dose nem uso — só adapta a alimentação e aponta riscos para discutir com o médico.

export const MEDS = {
  mounjaro: { n: 'Mounjaro', sub: 'tirzepatida · Eli Lilly', registered: true },
  tirzec: { n: 'Tirzec', sub: 'tirzepatida · Paraguai', registered: false },
  tg: { n: 'TG / T.G.', sub: 'tirzepatida · Paraguai', registered: false },
  outro: { n: 'Outra caneta', sub: 'Ozempic, Wegovy, Saxenda…', registered: true },
};

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Ajustes do plano para quem usa a caneta. Recebe o perfil e devolve modificadores para analyze().
 * refWeight = peso de referência usado para proteína.
 */
export function medEffects(h, refWeight, sex) {
  const g = h.glp1;
  if (!g?.med) return null;
  const m = MEDS[g.med] ?? MEDS.outro;
  const alerts = [];
  const tips = [];

  if (!m.registered) {
    alerts.push({ level: 'bad', text: `${m.n}: a Anvisa proibiu a venda e o uso deste produto no Brasil (sem registro). Análises encontraram frascos sem o princípio ativo, contaminados ou só com solvente — a dose real é desconhecida. Converse com seu médico sobre a troca por um medicamento registrado.` });
  }
  if (g.prescribed === false) {
    alerts.push({ level: 'bad', text: 'Uso sem prescrição médica: essa medicação exige acompanhamento (ajuste de dose, efeitos colaterais, exames). Procure um endocrinologista.' });
  }
  if ((h.conditions || []).includes('gestante') || (h.conditions || []).includes('lactante')) {
    alerts.push({ level: 'bad', text: 'Gestação/amamentação: tirzepatida e semaglutida não devem ser usadas. Fale com seu médico imediatamente.' });
  }
  if ((h.conditions || []).includes('diabetes')) {
    alerts.push({ level: 'warn', text: 'Diabetes + caneta: se você usa insulina ou sulfonilureia (glibenclamida, gliclazida), há risco de hipoglicemia com a perda de apetite — ajuste com o médico e tenha glicose rápida à mão.' });
  }
  if (sex === 'F') {
    alerts.push({ level: 'warn', text: 'Tirzepatida reduz a eficácia do anticoncepcional oral nas 4 semanas após o início e após cada aumento de dose: use também preservativo nesse período.' });
  }
  alerts.push({ level: 'warn', text: 'Procure atendimento se tiver dor forte na barriga que irradia para as costas (pancreatite), dor no lado direito após comer (vesícula), vômitos persistentes ou sinais de desidratação.' });

  tips.push(
    'Proteína primeiro: comece cada refeição pela proteína — com pouco apetite, é ela que preserva seus músculos.',
    'Refeições pequenas e frequentes (5–6/dia), mastigando devagar; pare ao sentir a primeira saciedade.',
    'Pouca gordura e nada de fritura: gordura retarda ainda mais o esvaziamento do estômago e piora a náusea.',
    'Hidratação reforçada: a caneta reduz a sede. Beba ao longo do dia, em goles, fora das refeições.',
    'Treino de força 2–3×/semana é obrigatório: até 40% do peso perdido com essas canetas pode ser massa magra sem treino e proteína adequados.',
    'Evite álcool e bebidas açucaradas; para prisão de ventre, aumente fibras aos poucos com bastante água.',
    'Não pule refeições mesmo sem fome: comer menos que o mínimo do plano acelera a perda de músculo e causa deficiências.',
  );
  if (g.weekday != null && g.weekday !== '') {
    tips.push(`Dia da aplicação: ${WEEKDAYS[g.weekday]}. Náusea costuma ser maior em 1–3 dias após — o app sugere refeições mais leves nesses dias.`);
  }

  return {
    alerts,
    tips,
    minProteinPerKg: 1.6,           // piso de proteína (ACLM/ASN/OMA/TOS 2025: 1,2–1,6 g/kg; usamos o teto)
    maxDeficit: -0.2,               // o remédio já reduz a ingestão: não empilhar déficit agressivo
    fatShare: 0.25,                 // gordura ~25% das calorias (tolerância gastrointestinal)
    minMeals: 5,
    lossTolerance: 0.025,           // perda semanal esperada maior (até ~2,5%/sem no início)
  };
}

/** Dias pós-aplicação (0 = dia da injeção). */
export function daysSinceInjection(g, now = new Date()) {
  if (g?.weekday == null || g.weekday === '') return null;
  return (now.getDay() - Number(g.weekday) + 7) % 7;
}
