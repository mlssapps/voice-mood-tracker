// Voice Mood Tracker service worker: works offline, and adds the isolation headers
// that let the voice model use several processor cores (GitHub Pages can't set them).
const VERSION = 'vmt-shell-v5';
const SHELL = ['./', 'index.html', 'featex.js', 'featex-worker.js', 'mel.js', 'model-parts.js', 'ort.min.js',
  'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('vmt-shell-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function isolate(res) {
  if (!res || res.status === 0 || res.type === 'opaque') return res;
  const h = new Headers(res.headers);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(res.body, {status: res.status, statusText: res.statusText, headers: h});
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (/dam-fp16\.part\d+$/.test(req.url)) return; // the app stores the model itself
  e.respondWith((async () => {
    if (req.mode === 'navigate' || /index\.html$/.test(req.url)) {
      try { const r = await fetch(req, {cache: 'no-cache'}); const c = await caches.open(VERSION); c.put('index.html', r.clone()); return isolate(r); }
      catch (err) { return isolate(await caches.match('index.html')); }
    }
    const hit = await caches.match(req, {ignoreSearch: true});
    if (hit) return isolate(hit);
    try { return isolate(await fetch(req)); } catch (err) { return new Response('', {status: 504}); }
  })());
});
