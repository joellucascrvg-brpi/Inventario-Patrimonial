// IMPORTANTE: suba a versao do CACHE_NAME sempre que o index.html mudar.
// A estrategia e cache-first, entao os PWAs ja instalados so pegam a versao nova
// quando este arquivo muda (o browser revalida o sw.js a cada navegacao).
const CACHE_NAME = "inventario-patrimonial-pwa-v92";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const request = event.request;

  let requestUrl;
  try { requestUrl = new URL(request.url); } catch (_) { requestUrl = null; }
  if (requestUrl && (requestUrl.hostname.endsWith("supabase.co") || requestUrl.hostname.endsWith("supabase.in"))) {
    return;
  }

  // Cache-first. Antes era network-first com cache:"no-store", ou seja, o app rebaixava
  // o bundle inteiro (~2,3 MB) antes de renderizar qualquer coisa -- muito lento no campo
  // com sinal fraco. Agora responde do cache na hora; a atualizacao chega pelo CACHE_NAME novo.
  const cacheKey = request.mode === "navigate" ? "/" : request;

  event.respondWith(
    caches.match(cacheKey).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
