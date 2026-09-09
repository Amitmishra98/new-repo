/* Toolbelt service worker — cache-first offline support for the whole app shell. */
"use strict";

const CACHE = "toolbelt-v1";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./assets/css/style.css",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/js/app.js",
  "./assets/js/tools/base64.js",
  "./assets/js/tools/case.js",
  "./assets/js/tools/color.js",
  "./assets/js/tools/cron.js",
  "./assets/js/tools/diff.js",
  "./assets/js/tools/hash.js",
  "./assets/js/tools/json.js",
  "./assets/js/tools/jwt.js",
  "./assets/js/tools/lorem.js",
  "./assets/js/tools/regex.js",
  "./assets/js/tools/timestamp.js",
  "./assets/js/tools/url.js",
  "./assets/js/tools/uuid.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        try {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
        } catch (e) { /* storage full or unavailable — ignore */ }
        return res;
      }).catch(() =>
        caches.match("./index.html").then((page) => page || Response.error())
      );
    })
  );
});
