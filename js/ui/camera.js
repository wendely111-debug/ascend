// Câmera de prova: SOMENTE captura ao vivo (não existe opção de galeria/arquivo — de propósito).
// A foto sai com marca d'água gravada nos pixels: usuário, data/hora, código e desafio.
import { esc } from '../util.js';
import { PROOF_FRAME } from '../rules.js';
import { icon } from './icons.js';

const MAX_W = 960;
const QUALITY = 0.72;

const fmtDate = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function cameraError(err) {
  if (!window.isSecureContext) return 'A câmera só funciona em conexão segura (HTTPS).';
  if (err?.name === 'NotAllowedError') return 'Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador.';
  if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return 'Nenhuma câmera encontrada neste aparelho.';
  if (err?.name === 'NotReadableError') return 'A câmera está em uso por outro app. Feche-o e tente de novo.';
  return 'Não foi possível abrir a câmera.';
}

function watermark(ctx, w, h, { username, code, challenge, kind }) {
  const pad = Math.round(w * 0.02);
  const fs = Math.max(14, Math.round(w * 0.026));
  const lines = [`ASCEND · ${username} · ${fmtDate(new Date())}`, `#${code} · ${challenge}`];
  const bandH = pad * 2 + fs * 2.5;
  ctx.fillStyle = 'rgba(4,6,12,.72)';
  ctx.fillRect(0, h - bandH, w, bandH);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(0, h - bandH, w, Math.max(2, Math.round(w * 0.003)));
  ctx.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(lines[0], pad, h - bandH + pad);
  ctx.fillStyle = '#ffc53d';
  ctx.fillText(lines[1], pad, h - bandH + pad + fs * 1.3);
  // selo de canto
  ctx.font = `800 ${Math.round(fs * 0.9)}px Orbitron, sans-serif`;
  ctx.fillStyle = 'rgba(0,229,255,.9)';
  const tag = `PROVA AO VIVO · ${kind.toUpperCase()}`;
  ctx.fillText(tag, pad, pad);
}

/**
 * Abre a câmera e resolve com { blob, meta } ou null se cancelado/expirado.
 * proof = { challenge, code, expires_at, kind }
 */
export function captureProof({ proof, username, title }) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'cam';
    root.innerHTML = `
      <div class="cam-top">
        <div class="cam-kicker">[ PROVA AO VIVO ] ${esc(title || '')}</div>
        <div class="cam-frame">${esc(PROOF_FRAME[proof.kind] || '')} e:</div>
        <div class="cam-challenge">${esc(proof.challenge)}</div>
        <div class="cam-timer"><span data-cam-left>--:--</span> para enviar · código <b class="mono">#${esc(proof.code)}</b></div>
      </div>
      <div class="cam-stage"><video playsinline muted autoplay></video><canvas hidden></canvas><img class="cam-shot" alt="" hidden>
        <p class="cam-msg" hidden></p></div>
      <div class="cam-bar">
        <button class="icon-btn cam-btn" data-cam="cancel" aria-label="Cancelar">${icon('x')}</button>
        <button class="cam-shutter" data-cam="shoot" aria-label="Tirar foto"></button>
        <button class="icon-btn cam-btn" data-cam="flip" aria-label="Trocar câmera">${icon('refresh')}</button>
      </div>
      <div class="cam-bar cam-review" hidden>
        <button class="btn btn-ghost" data-cam="retake">${icon('refresh')} Tirar outra</button>
        <button class="btn" data-cam="use">${icon('check')} Enviar prova</button>
      </div>`;
    document.body.appendChild(root);

    const video = root.querySelector('video');
    const canvas = root.querySelector('canvas');
    const shot = root.querySelector('.cam-shot');
    const msg = root.querySelector('.cam-msg');
    const left = root.querySelector('[data-cam-left]');
    let stream = null;
    let facing = proof.kind === 'meal' || proof.kind === 'weigh_in' ? 'environment' : 'user';
    let blob = null;
    let done = false;
    const expires = new Date(proof.expires_at).getTime();

    const stop = () => stream?.getTracks().forEach((t) => t.stop());
    const finish = (value) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      stop();
      if (shot.src) URL.revokeObjectURL(shot.src);
      root.remove();
      resolve(value);
    };
    const showMsg = (text) => { msg.textContent = text; msg.hidden = false; };

    async function open() {
      stop();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false });
        video.srcObject = stream;
        msg.hidden = true;
      } catch (err) {
        showMsg(cameraError(err));
      }
    }

    const timer = setInterval(() => {
      const s = Math.max(0, Math.round((expires - Date.now()) / 1000));
      left.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      root.classList.toggle('urgent', s <= 30);
      if (s === 0) { showMsg('Tempo esgotado. A prova expirou — o servidor não aceita mais esta foto.'); root.querySelector('[data-cam="shoot"]').disabled = true; }
    }, 250);

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-cam]')?.dataset.cam;
      if (!act) return;
      if (act === 'cancel') finish(null);
      if (act === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; open(); }
      if (act === 'shoot') {
        if (!video.videoWidth) return showMsg('A câmera ainda não iniciou.');
        const scale = Math.min(1, MAX_W / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        watermark(ctx, canvas.width, canvas.height, { username, code: proof.code, challenge: proof.challenge, kind: proof.kind });
        canvas.toBlob((b) => {
          blob = b;
          shot.src = URL.createObjectURL(b);
          shot.hidden = false;
          video.hidden = true;
          root.querySelector('.cam-bar').hidden = true;
          root.querySelector('.cam-review').hidden = false;
        }, 'image/jpeg', QUALITY);
        navigator.vibrate?.(40);
      }
      if (act === 'retake') {
        URL.revokeObjectURL(shot.src);
        shot.hidden = true; video.hidden = false; blob = null;
        root.querySelector('.cam-bar').hidden = false;
        root.querySelector('.cam-review').hidden = true;
      }
      if (act === 'use' && blob) {
        if (Date.now() > expires + 30000) return showMsg('Tempo esgotado. A prova expirou.');
        finish({ blob, meta: { facing, w: canvas.width, h: canvas.height, ua: navigator.userAgent.slice(0, 120), taken_at: new Date().toISOString() } });
      }
    });

    if (!navigator.mediaDevices?.getUserMedia) showMsg(cameraError());
    else open();
  });
}
