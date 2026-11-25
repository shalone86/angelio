// Offline support for the Angelio Games page (scope /games/): it is its own home-screen app.
// Navigations: network first, falling back to the saved games page. Everything else: show what is saved,
// refresh it in the background. Bump VERSION when you change files, and list new files in ASSETS.

const VERSION = "v5";
const CACHE = `games-shell-${VERSION}`;

const ASSETS = [
  "/games/", "/games/index.html", "/games/games.js", "/games/manifest.webmanifest", "/games/icon.svg",
  "/games/icons/icon-192.png", "/games/icons/icon-512.png", "/games/icons/maskable-192.png", "/games/icons/maskable-512.png",
  "/games/icons/apple-touch-icon.png", "/icon.svg", "/css/hub.css", "/fonts/fonts.css", "/js/apps.js", "/js/jingle.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("games-shell-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    if (!url.pathname.startsWith("/games")) return;
    return e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put("/games/", res.clone());
        return res;
      } catch {
        return (await cache.match("/games/")) ?? Response.error();
      }
    })());
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit ?? (await fresh) ?? Response.error();
  })());
});
