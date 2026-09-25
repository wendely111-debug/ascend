// Motor de tempo: cronômetro, temporizador, intervalos (ciclos) e alarmes.
// Tudo é calculado a partir de timestamps (Date.now), então não "atrasa" quando o navegador economiza bateria.
const KEY = 'ascend:timer';
const ALARMS_KEY = 'ascend:alarms';

export const PRESETS = [
  { id: 'tabata', name: 'Tabata', prep: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 0 },
  { id: 'hiit', name: 'HIIT 40/20', prep: 10, work: 40, rest: 20, rounds: 10, sets: 1, setRest: 0 },
  { id: 'emom', name: 'EMOM 10 min', prep: 10, work: 60, rest: 0, rounds: 10, sets: 1, setRest: 0 },
  { id: 'sprints', name: 'Tiros 30/90', prep: 60, work: 30, rest: 90, rounds: 8, sets: 1, setRest: 0 },
  { id: 'circuito', name: 'Circuito 3×(5×45/15)', prep: 10, work: 45, rest: 15, rounds: 5, sets: 3, setRest: 120 },
  { id: 'forca', name: 'Força: 4 séries, 2 min', prep: 10, work: 40, rest: 120, rounds: 4, sets: 1, setRest: 0, tempo: { down: 2, hold: 0, up: 1 } },
];

export const DEFAULT_INTERVAL = { ...PRESETS[1] };

// ---------------- Áudio / voz / vibração ----------------
let ctx = null;
/** Precisa ser chamado dentro de um toque do usuário (política de autoplay). */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* sem áudio */ }
}
export function beep(freq = 880, ms = 150, vol = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + ms / 1000 + 0.02);
}
let voiceOn = true;
export const setVoice = (on) => { voiceOn = on; };
export function say(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 1.1;
    speechSynthesis.speak(u);
  } catch { /* sem voz */ }
}
const vibrate = (p) => navigator.vibrate?.(p);

// ---------------- Intervalos: linha do tempo ----------------
export function buildPhases(c) {
  const out = [];
  if (c.prep > 0) out.push({ type: 'prep', label: 'Preparar', s: c.prep, round: 0, set: 1 });
  for (let set = 1; set <= c.sets; set++) {
    for (let r = 1; r <= c.rounds; r++) {
      out.push({ type: 'work', label: c.workLabel || 'Trabalho', s: c.work, round: r, set });
      if (r < c.rounds && c.rest > 0) out.push({ type: 'rest', label: 'Descanso', s: c.rest, round: r, set });
    }
    if (set < c.sets && c.setRest > 0) out.push({ type: 'setrest', label: 'Descanso entre séries', s: c.setRest, round: c.rounds, set });
  }
  return out;
}

export const totalSeconds = (c) => buildPhases(c).reduce((a, p) => a + p.s, 0);

export const tempoTotal = (t) => (t ? t.down + t.hold + t.up : 0);

/** Onde estamos na linha do tempo, dado o tempo decorrido (s). */
export function intervalStatus(c, elapsedS) {
  const phases = buildPhases(c);
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (elapsedS < acc + p.s) {
      const inPhase = elapsedS - acc;
      let rep = null, repPart = null;
      const tt = tempoTotal(c.tempo);
      if (p.type === 'work' && tt) {
        rep = Math.floor(inPhase / tt) + 1;
        const r = inPhase % tt;
        repPart = r < c.tempo.down ? 'Desce' : r < c.tempo.down + c.tempo.hold ? 'Segura' : 'Sobe';
      }
      return { done: false, i, phase: p, next: phases[i + 1] ?? null, left: p.s - inPhase, inPhase, rep, repPart, totalLeft: phases.slice(i).reduce((a, x) => a + x.s, 0) - inPhase, count: phases.length };
    }
    acc += p.s;
  }
  return { done: true, i: phases.length, phase: null, left: 0, totalLeft: 0, count: phases.length };
}

// ---------------- Estado persistente ----------------
export function loadTimer() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? null; } catch { return null; }
}
export const saveTimer = (t) => localStorage.setItem(KEY, JSON.stringify(t));

export function newTimer() {
  return { mode: 'interval', running: false, startedAt: 0, acc: 0, laps: [], countdown: 60, interval: { ...DEFAULT_INTERVAL }, voice: true };
}

/** Tempo decorrido em ms (pausas não contam). */
export const elapsedMs = (t) => t.acc + (t.running ? Date.now() - t.startedAt : 0);

export function start(t) { if (!t.running) { t.running = true; t.startedAt = Date.now(); } }
export function pause(t) { if (t.running) { t.acc += Date.now() - t.startedAt; t.running = false; } }
export function reset(t) { t.running = false; t.acc = 0; t.startedAt = 0; t.laps = []; }

/**
 * Chamado periodicamente. Dispara bipes/voz/vibração nas transições e retorna o status.
 * mem guarda o último estado visto (para detectar mudanças).
 */
export function tick(t, mem) {
  const ms = elapsedMs(t);
  if (t.mode === 'countdown') {
    const left = Math.max(0, t.countdown * 1000 - ms);
    const s = Math.ceil(left / 1000);
    if (t.running && s !== mem.s) {
      if (s === 0) { vibrate([400, 150, 400]); pause(t); t.finished = true; }
      mem.s = s;
    }
    return { left, done: left === 0 };
  }
  if (t.mode === 'interval') {
    const st = intervalStatus(t.interval, ms / 1000);
    if (!t.running) return st;
    const s = Math.ceil(st.left);
    if (st.i !== mem.i) {
      // Sem som nas séries e descansos: só vibração (pedido do usuário).
      if (st.done) { vibrate([500, 200, 500]); pause(t); t.finished = true; }
      else if (st.phase.type === 'work') vibrate(300);
      else if (st.phase.type !== 'prep') vibrate([150, 80, 150]);
      mem.i = st.i;
    }
    if (st.rep != null) mem.rep = st.rep;
    mem.s = s;
    return st;
  }
  return { ms };
}

// ---------------- Alarmes ----------------
export function loadAlarms() {
  try { return JSON.parse(localStorage.getItem(ALARMS_KEY)) ?? []; } catch { return []; }
}
export const saveAlarms = (a) => localStorage.setItem(ALARMS_KEY, JSON.stringify(a));

/** Alarmes que devem tocar agora (e ainda não tocaram hoje). */
export function dueAlarms(alarms, now = new Date()) {
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().slice(0, 10);
  return alarms.filter((a) => a.on && a.time === hm && (a.days?.length ? a.days.includes(now.getDay()) : true) && a.firedOn !== today);
}

/** Exporta alarmes para o calendário do celular (.ics) — toca mesmo com o app fechado. */
export function alarmsToIcs(alarms) {
  const DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ev = alarms.filter((a) => a.on).map((a, i) => {
    const t = a.time.replace(':', '') + '00';
    const rule = a.days?.length ? `RRULE:FREQ=WEEKLY;BYDAY=${a.days.map((x) => DAY[x]).join(',')}` : 'RRULE:FREQ=DAILY';
    return ['BEGIN:VEVENT', `UID:ascend-${a.id || i}@ascend.app`, `DTSTAMP:${stamp}`, `DTSTART:${ymd}T${t}`, 'DURATION:PT5M', rule,
      `SUMMARY:ASCEND · ${a.label || 'Treino'}`, ...(a.detail ? [`DESCRIPTION:${a.detail.replace(/[,;]/g, (c) => `\\${c}`)}`] : []), 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${a.label || 'Hora do treino'}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ASCEND//PT-BR', ...ev, 'END:VCALENDAR'].join('\r\n');
}

// ---------------- Alarme NATIVO do celular ----------------
// Web apps não gravam direto no relógio do sistema. O que existe:
//  • Android (Chrome): intent SET_ALARM abre o app Relógio já preenchido — o usuário só confirma.
//  • iPhone: o app dispara um Atalho da Apple ("ASCEND Alarme") que cria o alarme (configuração única).
export const IOS_SHORTCUT = 'ASCEND Alarme';

export function platform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

export function nativeAlarmUrl(a, os = platform()) {
  const [h, m] = a.time.split(':').map(Number);
  const label = `ASCEND · ${a.label || 'Treino'}`;
  if (os === 'android') {
    return `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${h};`
      + `i.android.intent.extra.alarm.MINUTES=${m};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(label)};`
      + 'B.android.intent.extra.alarm.SKIP_UI=false;end';
  }
  if (os === 'ios') {
    return `shortcuts://run-shortcut?name=${encodeURIComponent(IOS_SHORTCUT)}&input=text&text=${encodeURIComponent(`${a.time}|${label}`)}`;
  }
  return null;
}

/** Configuração de intervalos a partir de um exercício da ficha (séries × tempo de execução + descanso). */
export function intervalForExercise(item, repsSeconds) {
  const tempo = { down: 2, hold: 0, up: 1 };
  const m = String(item.reps).match(/(\d+)\s*(s|seg|min)/i);
  const work = m ? Number(m[1]) * (/min/i.test(m[2]) ? 60 : 1) : repsSeconds ?? Math.max(20, (parseInt(item.reps, 10) || 10) * tempoTotal(tempo));
  return { name: item.name, prep: 10, work, rest: Number(item.rest) || 60, rounds: Number(item.sets) || 3, sets: 1, setRest: 0, tempo: m ? null : tempo, workLabel: 'Série' };
}
