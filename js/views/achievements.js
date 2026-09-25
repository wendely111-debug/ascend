import { esc } from '../util.js';
import { ACHIEVEMENTS } from '../game.js';
import { icon } from '../ui/icons.js';

export function renderAchievements({ d }) {
  const got = d.unlocked;
  return `<section class="view-ach">
    <header class="view-head"><div class="kicker">[ CONQUISTAS ]</div>
      <h1 class="view-title">${got.size} / ${ACHIEVEMENTS.length} desbloqueadas</h1>
      <div class="bar bar-xp"><i style="width:${(got.size / ACHIEVEMENTS.length) * 100}%"></i></div></header>
    <ul class="ach-grid">${ACHIEVEMENTS.map((a) => {
      const on = got.has(a.id);
      return `<li class="panel ach ${on ? 'on' : ''}">
        <span class="ach-ico">${icon(on ? 'trophy' : 'lock')}</span>
        <div><div class="ach-name">${esc(a.name)}</div><div class="ach-desc muted small">${esc(a.desc)}</div></div></li>`;
    }).join('')}</ul></section>`;
}
