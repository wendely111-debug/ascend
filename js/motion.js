// Sensor de movimento durante o treino (acelerômetro do celular).
// Não conta repetições com precisão — mede se houve ATIVIDADE FÍSICA real em janelas de 10 s.
// Celular parado o treino inteiro vira um sinal de alerta para a auditoria (não reprova sozinho).
const WINDOW_MS = 10000;
const ACTIVE_STD = 0.6; // desvio-padrão da aceleração (m/s²) acima do qual a janela conta como ativa

export function createMotionTracker(saved) {
  const s = saved ?? { supported: false, windows: 0, active: 0, samples: 0 };
  let buf = [];
  let timer = null;
  let handler = null;

  function flush() {
    if (buf.length > 5) {
      const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
      const std = Math.sqrt(buf.reduce((a, b) => a + (b - mean) ** 2, 0) / buf.length);
      s.windows += 1;
      if (std > ACTIVE_STD) s.active += 1;
    }
    buf = [];
  }

  return {
    /** Precisa ser chamado dentro de um toque do usuário (exigência do iOS). */
    async start() {
      if (handler || typeof DeviceMotionEvent === 'undefined') return false;
      try {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          if ((await DeviceMotionEvent.requestPermission()) !== 'granted') return false;
        }
      } catch { return false; }
      handler = (e) => {
        const a = e.accelerationIncludingGravity;
        if (!a || a.x == null) return;
        s.supported = true;
        s.samples += 1;
        buf.push(Math.hypot(a.x, a.y, a.z));
      };
      window.addEventListener('devicemotion', handler);
      timer = setInterval(flush, WINDOW_MS);
      return true;
    },
    stop() {
      if (handler) window.removeEventListener('devicemotion', handler);
      clearInterval(timer);
      handler = null;
      flush();
    },
    state: () => s,
    summary: () => ({
      supported: s.supported && s.windows > 0,
      windows: s.windows,
      active_ratio: s.windows ? Math.round((s.active / s.windows) * 100) / 100 : null,
      samples: s.samples,
    }),
  };
}
