// 加入主畫面用。network-first＋同源快取備援；照片也先存好，樂齡中心網路不穩時才玩得下去。
importScripts('photos.js');
const CACHE_NAME = 'nostalgia-memory-game-shell-v2';
const SHELL_FILES = ['./', './index.html', './app.js', './data.js', './sources.js', './photos.js', './manual.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES).then(() => Promise.all(Object.keys(PHOTOS).map((id) => cache.add('./photos/' + id + '.jpg').catch(() => null)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k.indexOf(CACHE_NAME.replace(/\d+$/, '')) === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
