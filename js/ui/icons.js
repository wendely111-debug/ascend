// Ícones SVG em traço (24×24), herdam a cor via currentColor.
const P = {
  status:   '<path d="M12 2 21 7v10l-9 5-9-5V7z"/><circle cx="12" cy="10" r="3"/><path d="M7 17.5c1-2.2 2.8-3.3 5-3.3s4 1.1 5 3.3"/>',
  quests:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  guild:    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.4.2 4 1.9 4.5 4.6"/>',
  trophy:   '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
  home:     '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  check:    '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x:        '<path d="M6 6l12 12M18 6 6 18"/>',
  bolt:     '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  flame:    '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.3-2-5.4-3.5-7-.4 1.8-1.4 3-2.5 3.3.5-3.6-1-6.6-4-8.5.3 3.2-1.4 5.5-3 7.4C4.7 12.1 5 13.6 5 15.2 5 19.3 8 22 12 22z"/>',
  gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout:   '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  copy:     '<rect x="9" y="9" width="12" height="12" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  edit:     '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash:    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  lock:     '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  refresh:  '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  download: '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/>',
  upload:   '<path d="M12 21V9m0 0-5 5m5-5 5 5M4 3h16"/>',
  camera:   '<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/>',
  food:     '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.3-3.5 3.8-3.5 7v3H17"/>',
  scale:    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8.5a6 6 0 0 1 8 0l-2.2 2.6a2.6 2.6 0 0 0-3.6 0z"/>',
  heart:    '<path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.8 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.6 3.3 4.3 6.7C19.5 15.9 12 20.5 12 20.5z"/><path d="M3.5 12h4l1.5-3 3 6 1.5-3h7"/>',
  drop:     '<path d="M12 3s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z"/>',
  coffee:   '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5s-1 1.2 0 2.5 0 2.5 0 2.5M12 2.5s-1 1.2 0 2.5 0 2.5 0 2.5"/>',
  // Sigilos de avatar
  sword:    '<path d="M14.5 3H21v6.5L9 21.5 2.5 15z"/><path d="m5 13 6 6M3 21l3-3"/>',
  shield:   '<path d="M12 2 4 5v6c0 5.5 3.4 9.4 8 11 4.6-1.6 8-5.5 8-11V5z"/>',
  crown:    '<path d="M3 18h18M4 18 3 7l5 4 4-7 4 7 5-4-1 11"/>',
  eye:      '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  skull:    '<path d="M12 2a8 8 0 0 0-8 8c0 2.8 1.4 4.5 3 5.6V19h10v-3.4c1.6-1.1 3-2.8 3-5.6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 19v3M14 19v3"/>',
  moon:     '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  diamond:  '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3 7.5 9 12 21l4.5-12L15 3"/>',
  star:     '<path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z"/>',
  wolf:     '<path d="M4 3l4 5h8l4-5v9l-3 4-5 6-5-6-3-4z"/><path d="M9 12h.01M15 12h.01M12 16v2"/>',
};

export const AVATARS = ['bolt', 'flame', 'sword', 'shield', 'crown', 'eye', 'skull', 'moon', 'diamond', 'star', 'wolf'];

export const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? P.bolt}</svg>`;
