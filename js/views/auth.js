import { esc } from '../util.js';
import { ATTRS, CLASSES } from '../game.js';
import { AVATARS, icon } from '../ui/icons.js';

const logo = `<div class="logo"><span class="logo-mark">${icon('bolt')}</span><span class="logo-text">ASCEND</span></div>`;

export function renderAuth({ tab = 'in', msg = '' } = {}) {
  return `<main class="auth">
    <div class="auth-box panel">
      ${logo}
      <p class="auth-tag">[ SISTEMA ] Você foi escolhido como <b>Jogador</b>.<br>Aceita o desafio de evoluir?</p>
      <nav class="tabs">
        <button class="tab ${tab === 'in' ? 'active' : ''}" data-act="auth-tab" data-tab="in">Entrar</button>
        <button class="tab ${tab === 'up' ? 'active' : ''}" data-act="auth-tab" data-tab="up">Criar conta</button>
      </nav>
      <form class="form" data-form="auth" data-mode="${tab}">
        <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
        <label>Senha<input name="password" type="password" required minlength="6" autocomplete="${tab === 'in' ? 'current-password' : 'new-password'}"></label>
        ${msg ? `<p class="form-msg">${msg}</p>` : ''}
        <button class="btn btn-block" type="submit">${tab === 'in' ? 'ACEITAR' : 'DESPERTAR'}</button>
      </form>
    </div></main>`;
}

export function profileFields(p = {}) {
  const cls = p.hero_class || 'guerreiro';
  const av = p.avatar || 'bolt';
  return `<label>Nome de caçador<input name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_.]{3,20}"
      value="${esc(p.username || '')}" placeholder="ex.: sung_jinwoo" autocomplete="nickname"></label>
    <small class="muted">3 a 20 caracteres: letras, números, _ ou .</small>
    <fieldset><legend>Classe</legend><div class="class-grid">
      ${Object.entries(CLASSES).map(([k, c]) => `<label class="class-opt" style="--c:${ATTRS[c.attr].color}">
        <input type="radio" name="hero_class" value="${k}" ${k === cls ? 'checked' : ''}>
        <span><b>${c.name}</b><small>${c.desc}</small></span></label>`).join('')}
    </div></fieldset>
    <fieldset><legend>Sigilo</legend><div class="avatar-grid">
      ${AVATARS.map((a) => `<label class="avatar-opt"><input type="radio" name="avatar" value="${a}" ${a === av ? 'checked' : ''}><span>${icon(a)}</span></label>`).join('')}
    </div></fieldset>`;
}

export function renderOnboarding({ msg = '' } = {}) {
  return `<main class="auth">
    <div class="auth-box panel auth-wide">
      ${logo}
      <p class="auth-tag">[ SISTEMA ] Registro de novo Jogador.</p>
      <form class="form" data-form="onboarding">
        ${profileFields()}
        ${msg ? `<p class="form-msg">${msg}</p>` : ''}
        <button class="btn btn-block" type="submit">${icon('bolt')} INICIAR JORNADA</button>
      </form>
    </div></main>`;
}
