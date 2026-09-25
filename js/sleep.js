// Botões "Estou indo dormir" / "Acordei": mede o sono pelo relógio e preenche o check-in.
// Guardado nos check-ins diários (vale em qualquer aparelho da conta):
//   dia em que deitou → data.bed_at (ISO) e data.bed_done quando acordar;
//   dia em que acordou → data.sleep_h, data.sleep_from (ISO de quando deitou) e data.wake_at.
import { dayKey, addDays } from './util.js';

export const SLEEP_MIN_H = 0.25; // menos de 15 min: toque sem querer → cancela
export const SLEEP_MAX_H = 16;   // mais que isso: esqueceu de tocar em "Acordei" → lançar à mão

/** Sono em andamento (deitou e ainda não acordou), olhando hoje e ontem. */
export function pendingSleep(checkins, now = new Date()) {
  for (const day of [dayKey(now), addDays(dayKey(now), -1)]) {
    const c = checkins[day]?.data;
    if (!c?.bed_at || c.bed_done) continue;
    const h = (now - new Date(c.bed_at)) / 3.6e6;
    if (h >= 0 && h <= 20) return { day, bedAt: c.bed_at };
  }
  return null;
}

/** Horas dormidas arredondadas para 1/4 de hora. */
export const sleepHours = (bedAt, wake = new Date()) => Math.round(((wake - new Date(bedAt)) / 3.6e6) * 4) / 4;

/** "HH:MM" a que precisa deitar para dormir `hours` até acordar em `wake` ("06:30"). */
export function bedtimeFor(wake, hours = 8) {
  const [h, m] = String(wake || '06:30').split(':').map(Number);
  const t = (((h * 60 + m - hours * 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Texto curto: 7,25 → "7h15". */
export const fmtSleep = (h) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** Avaliação simples da duração (adultos: 7–9 h). */
export const sleepVerdict = (h) => h < 6 ? { cls: 'bad', txt: 'Pouco sono — o treino de hoje fica mais leve.' }
  : h < 7 ? { cls: 'warn', txt: 'Abaixo do ideal (7–9 h).' }
  : h <= 9.5 ? { cls: 'good', txt: 'Sono na faixa ideal.' }
  : { cls: 'warn', txt: 'Sono longo — se for frequente, vale investigar.' };
