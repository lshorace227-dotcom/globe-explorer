/* 寰宇地图册 Service Worker：壳网络优先（保更新），CDN 库缓存优先（保启动与离线）；
   维基/geoBoundaries 数据请求不经 SW（应用自带 localStorage 缓存层） */
const VER = 'hy-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 导航与同源静态：网络优先，失败回缓存（离线仍可开壳）
  if (e.request.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const cp = r.clone();
          caches.open(VER).then(c => c.put(e.request, cp));
          return r;
        })
        .catch(() =>
          caches.match(e.request, { ignoreSearch: true })
            .then(m => m || caches.match('./index.html'))
        )
    );
    return;
  }

  // CDN 库与字体：缓存优先（版本稳定，离线可用）
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(VER).then(c => c.put(e.request, cp));
        return r;
      }))
    );
  }
  // 其余（维基/geoBoundaries 等）直连
});
