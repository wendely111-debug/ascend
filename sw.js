// Service worker: app shell offline (cache-first) e rede para todo o resto.
// Suba a versão a cada deploy para os aparelhos pegarem a atualização.
const VERSION = 'ascend-v11';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'data/exercises.json',
  'js/app.js', 'js/config.js', 'js/util.js', 'js/game.js', 'js/exercises.js', 'js/routines.js',
  'js/views/training.js', 'js/views/diet.js', 'js/views/audit.js', 'js/views/assessment.js',
  'js/rules.js', 'js/foods.js', 'js/recipes.js', 'js/nutrition.js', 'js/motion.js', 'js/idb.js', 'js/ui/camera.js', 'js/progression.js', 'js/readiness.js', 'js/labs.js', 'js/guide.js', 'js/timer.js',
  'js/market.js', 'js/routine.js', 'js/medications.js', 'js/checkup.js', 'js/bluetooth.js', 'js/views/live.js', 'js/views/health.js', 'js/views/timer.js',
  'js/store/index.js', 'js/store/local.js', 'js/store/supabase.js',
  'js/ui/icons.js', 'js/ui/components.js',
  'js/views/status.js', 'js/views/quests.js', 'js/views/guild.js', 'js/views/achievements.js', 'js/views/auth.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' ignora o cache HTTP do GitHub Pages, garantindo os arquivos da versão nova
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API do Supabase: sempre rede.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Mesma origem: stale-while-revalidate (rápido e se atualiza sozinho).
  // Fontes e SDK na CDN: cache-first.
  const sameOrigin = url.origin === self.location.origin;
  const cdn = /fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$/.test(url.hostname);
  if (!sameOrigin && !cdn) return;

  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(request, { ignoreSearch: sameOrigin });
    const network = fetch(request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
