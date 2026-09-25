// Feira: converte o cardápio (pesos PRONTOS) em lista de compra (pesos CRUS, embalagens e custo).
// Preços de referência: estimativa de varejo no Nordeste (2026) para o usuário AJUSTAR com o preço real
// do iFood Mercados (ou do mercado) da cidade dele. O iFood não oferece API pública de preços.
import { FOODS } from './foods.js';
import { addDays } from './util.js';
import { planDay } from './nutrition.js';

export const CATEGORIES = {
  carnes: 'Carnes, aves e peixes', ovos: 'Ovos e laticínios', horti: 'Hortifruti', mercearia: 'Mercearia', padaria: 'Padaria', suple: 'Suplementos',
};

// raw: gramas compradas por grama pronta (cozimento, casca, líquido da lata)
// pack: [gramas, descrição] · price: R$ por embalagem (referência editável) · q: termo de busca
export const PURCHASE = {
  arroz:        { nm: 'Arroz branco', cat: 'mercearia', raw: 0.36, pack: [1000, 'pacote 1 kg'], price: 6.5, q: 'arroz branco tipo 1 1kg' },
  arroz_int:    { nm: 'Arroz integral', cat: 'mercearia', raw: 0.36, pack: [1000, 'pacote 1 kg'], price: 8.5, q: 'arroz integral 1kg' },
  feijao:       { nm: 'Feijão carioca', cat: 'mercearia', raw: 0.42, pack: [1000, 'pacote 1 kg'], price: 8, q: 'feijão carioca 1kg' },
  lentilha:     { nm: 'Lentilha', cat: 'mercearia', raw: 0.42, pack: [500, 'pacote 500 g'], price: 9, q: 'lentilha 500g' },
  grao_bico:    { nm: 'Grão-de-bico', cat: 'mercearia', raw: 0.45, pack: [500, 'pacote 500 g'], price: 11, q: 'grão de bico 500g' },
  frango:       { nm: 'Filé de peito de frango', cat: 'carnes', raw: 1.35, pack: [1000, 'kg'], price: 21, q: 'filé de peito de frango kg' },
  frango_desf:  { cat: 'carnes', raw: 1.4, pack: [1000, 'kg'], price: 21, q: 'filé de peito de frango kg', same: 'frango' },
  patinho:      { nm: 'Patinho moído', cat: 'carnes', raw: 1.35, pack: [1000, 'kg'], price: 46, q: 'patinho moído kg' },
  acem:         { nm: 'Acém', cat: 'carnes', raw: 1.45, pack: [1000, 'kg'], price: 36, q: 'acém kg' },
  tilapia:      { nm: 'Filé de tilápia', cat: 'carnes', raw: 1.3, pack: [1000, 'kg'], price: 48, q: 'filé de tilápia kg' },
  atum:         { nm: 'Atum em água', cat: 'mercearia', raw: 1.42, pack: [170, 'lata 170 g'], price: 9.5, q: 'atum sólido em água 170g' },
  sardinha:     { nm: 'Sardinha em lata', cat: 'mercearia', raw: 1.5, pack: [125, 'lata 125 g'], price: 5.5, q: 'sardinha em óleo 125g' },
  ovo:          { nm: 'Ovos', cat: 'ovos', raw: 1, pack: [1500, 'bandeja 30 ovos'], price: 23, q: 'ovos brancos 30 unidades' },
  tofu:         { cat: 'ovos', raw: 1, pack: [300, 'bandeja 300 g'], price: 13, q: 'tofu firme' },
  queijo_minas: { cat: 'ovos', raw: 1, pack: [500, 'peça 500 g'], price: 26, q: 'queijo minas frescal' },
  mucarela:     { cat: 'ovos', raw: 1, pack: [200, 'fatiado 200 g'], price: 11, q: 'queijo muçarela fatiado' },
  cottage:      { cat: 'ovos', raw: 1, pack: [200, 'pote 200 g'], price: 10, q: 'queijo cottage' },
  ricota:       { cat: 'ovos', raw: 1, pack: [250, 'peça 250 g'], price: 9, q: 'ricota fresca' },
  iogurte:      { cat: 'ovos', raw: 1, pack: [170, 'pote 170 g'], price: 3.5, q: 'iogurte natural desnatado 170g' },
  leite:        { cat: 'ovos', raw: 1, pack: [1000, 'caixa 1 L'], price: 5.5, q: 'leite desnatado 1L' },
  whey:         { cat: 'suple', raw: 1, pack: [900, 'pote 900 g'], price: 115, q: 'whey protein 900g' },
  prot_ervilha: { cat: 'suple', raw: 1, pack: [600, 'pote 600 g'], price: 120, q: 'proteína de ervilha' },
  aveia:        { cat: 'mercearia', raw: 1, pack: [500, 'pacote 500 g'], price: 9.5, q: 'aveia em flocos 500g' },
  granola:      { cat: 'mercearia', raw: 1, pack: [500, 'pacote 500 g'], price: 15, q: 'granola sem açúcar' },
  tapioca:      { nm: 'Goma de tapioca', cat: 'mercearia', raw: 1, pack: [1000, 'goma hidratada 1 kg'], price: 9, q: 'goma de tapioca 1kg' },
  pao_integral: { cat: 'padaria', raw: 1, pack: [400, 'pacote 400 g'], price: 9.5, q: 'pão de forma integral' },
  pao_frances:  { cat: 'padaria', raw: 1, pack: [1000, 'kg'], price: 17, q: 'pão francês kg' },
  cuscuz:       { nm: 'Flocão de milho (cuscuz)', cat: 'mercearia', raw: 0.35, pack: [500, 'flocão 500 g'], price: 3.5, q: 'flocão de milho 500g' },
  batata_doce:  { nm: 'Batata-doce', cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 5.5, q: 'batata doce kg' },
  batata:       { nm: 'Batata inglesa', cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 6.5, q: 'batata inglesa kg' },
  mandioca:     { nm: 'Macaxeira (mandioca)', cat: 'horti', raw: 1.25, pack: [1000, 'kg'], price: 5.5, q: 'macaxeira kg' },
  macarrao_int: { nm: 'Macarrão integral', cat: 'mercearia', raw: 0.43, pack: [500, 'pacote 500 g'], price: 7.5, q: 'macarrão integral 500g' },
  abobora:      { nm: 'Jerimum (abóbora cabotiá)', cat: 'horti', raw: 1.3, pack: [1000, 'kg'], price: 4.5, q: 'abóbora jerimum kg' },
  brocolis:     { nm: 'Brócolis', cat: 'horti', raw: 1.3, pack: [350, 'maço ~350 g'], price: 7, q: 'brócolis' },
  cenoura:      { nm: 'Cenoura', cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 5.5, q: 'cenoura kg' },
  abobrinha:    { nm: 'Abobrinha', cat: 'horti', raw: 1.05, pack: [1000, 'kg'], price: 6.5, q: 'abobrinha kg' },
  alface:       { nm: 'Alface', cat: 'horti', raw: 1.3, pack: [250, 'pé ~250 g'], price: 3.5, q: 'alface crespa' },
  tomate:       { nm: 'Tomate', cat: 'horti', raw: 1, pack: [1000, 'kg'], price: 7.5, q: 'tomate kg' },
  pepino:       { nm: 'Pepino', cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 5.5, q: 'pepino kg' },
  cebola:       { nm: 'Cebola', cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 5.5, q: 'cebola kg' },
  molho_tomate: { nm: 'Molho de tomate', cat: 'mercearia', raw: 1, pack: [300, 'sachê 300 g'], price: 3.5, q: 'molho de tomate tradicional' },
  banana:       { cat: 'horti', raw: 1.5, pack: [1000, 'kg'], price: 6.5, q: 'banana prata kg' },
  maca:         { cat: 'horti', raw: 1.1, pack: [1000, 'kg'], price: 11, q: 'maçã gala kg' },
  mamao:        { cat: 'horti', raw: 1.4, pack: [1000, 'kg'], price: 6, q: 'mamão papaia' },
  morango:      { cat: 'horti', raw: 1.05, pack: [250, 'bandeja 250 g'], price: 8.5, q: 'morango bandeja' },
  abacate:      { cat: 'horti', raw: 1.4, pack: [1000, 'kg'], price: 8, q: 'abacate kg' },
  pasta_amend:  { cat: 'mercearia', raw: 1, pack: [500, 'pote 500 g'], price: 19, q: 'pasta de amendoim integral' },
  castanha:     { cat: 'mercearia', raw: 1, pack: [100, 'pacote 100 g'], price: 11, q: 'castanha do pará' },
  chia:         { cat: 'mercearia', raw: 1, pack: [200, 'pacote 200 g'], price: 8.5, q: 'chia em grãos' },
  mel:          { cat: 'mercearia', raw: 1, pack: [500, 'pote 500 g'], price: 23, q: 'mel puro' },
  azeite:       { cat: 'mercearia', raw: 1, pack: [460, 'garrafa 500 ml'], price: 39, q: 'azeite extra virgem 500ml' },
};

/** Link de busca do iFood (abra a aba Mercados e confirme o endereço/cidade lá). */
export const ifoodUrl = (q) => `https://www.ifood.com.br/busca?q=${encodeURIComponent(q)}`;

/**
 * Feira de N dias: soma os cardápios, converte para peso cru e embalagens, aplica preços.
 * prices = { food: R$ por embalagem } (ajustes do usuário para a cidade dele).
 */
export function marketList(h, a, fromDay, userId, days, swapsByDay = {}, prices = {}) {
  const cooked = {};
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDay, i);
    const plan = planDay(h, a, d, userId, swapsByDay[d]);
    for (const m of plan.meals) for (const it of m.items) cooked[it.food] = (cooked[it.food] || 0) + it.g;
    if (plan.complement) cooked[plan.complement.food] = (cooked[plan.complement.food] || 0) + plan.complement.g;
  }
  const rawBy = {};
  for (const [food, g] of Object.entries(cooked)) {
    const p = PURCHASE[food];
    const key = p?.same ?? food; // frango desfiado e grelhado = mesma compra
    rawBy[key] = (rawBy[key] || 0) + g * (p?.raw ?? 1);
  }
  const items = Object.entries(rawBy).map(([food, raw]) => {
    const p = PURCHASE[food] ?? { cat: 'mercearia', pack: [1000, 'kg'], price: 0, q: FOODS[food].n };
    const price = prices[food] ?? p.price;
    const byWeight = p.pack[1] === 'kg'; // vendido a granel: compra o peso exato (arredonda p/ 100 g)
    const packs = byWeight ? Math.max(0.1, Math.ceil(raw / 100) / 10) : Math.max(1, Math.ceil(raw / p.pack[0] - 0.05)); // tolera 5% de sobra
    return {
      food, name: p.nm ?? FOODS[food].n, cat: p.cat, raw: Math.round(raw), packs, pack: p.pack[1], unitPrice: price, byWeight,
      qty: byWeight ? `${String(packs).replace('.', ',')} kg` : `${packs} × ${p.pack[1]}`,
      cost: Math.round(packs * price * 100) / 100, q: p.q, custom: prices[food] != null,
      perishable: p.cat === 'horti' || p.cat === 'padaria',
    };
  }).sort((x, y) => x.cat.localeCompare(y.cat) || x.name.localeCompare(y.name, 'pt'));
  const total = items.reduce((s, i) => s + i.cost, 0);
  return { items, total: Math.round(total * 100) / 100, perDay: Math.round((total / days) * 100) / 100 };
}

export const fmtGrams = (g) => (g >= 1000 ? `${String(Math.round(g / 100) / 10).replace('.', ',')} kg` : `${g} g`);
export const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
