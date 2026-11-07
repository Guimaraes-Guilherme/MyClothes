// Service worker do Provador.
// - Arquivos estáticos (JS, CSS, fontes, ícones): guardados no aparelho para abrir rápido.
// - Fotos das roupas e looks (/api/img, com versão na URL): guardadas no aparelho com limite.
// - Páginas: sempre buscadas na rede (os dados são pessoais e mudam); sem internet, mostra /offline.
const VERSION = "v1";
const STATIC = `pv-static-${VERSION}`;
const IMAGES = `pv-images-${VERSION}`;
const PAGES = `pv-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_IMAGES = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") {
    cache.put(request, res.clone());
    if (max) trimCache(cacheName, max);
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
      event.respondWith(cacheFirst(request, STATIC));
    }
    if (url.pathname.startsWith("/api/img/") && url.searchParams.has("v")) {
      event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
    }
    return;
  }

  // Modelo de remoção de fundo (baixado na primeira vez).
  if (url.hostname === "staticimgly.com") {
    event.respondWith(cacheFirst(request, STATIC));
  }
});
