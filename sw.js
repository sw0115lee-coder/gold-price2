// 금·은·동 PWA Service Worker
const CACHE = "geumeundong-v1";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = e.request.url;
  // 시세 API는 항상 네트워크 우선(실시간), 실패 시 무시
  if (url.includes("api.gold-api.com")) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({error: "offline"}), {headers: {"Content-Type": "application/json"}})));
    return;
  }
  // 앱 셸은 캐시 우선
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
