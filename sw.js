const CACHE = 'recipe-box-v1-51';
const RECIPE_ASSETS = Array.from({length:75},(_,i)=>`./data/recipes-${String(i+1).padStart(2,'0')}.json`);
const EXTRA_RECIPE_ASSETS = Array.from({length:11},(_,i)=>`./data/recipes-${i+76}.json`);
const ASSETS = ['./','./index.html','./styles.css','./app.js','./kitchen-fractions.js','./recipe-extra-loader.js','./recipe-helpers.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png',...RECIPE_ASSETS,...EXTRA_RECIPE_ASSETS];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

function isFreshRecipeAsset(url, request) {
  if (request.mode === 'navigate') return true;
  if (url.pathname.endsWith('/app.js')) return true;
  if (url.pathname.endsWith('/styles.css')) return true;
  if (url.pathname.endsWith('/recipe-extra-loader.js')) return true;
  const match = url.pathname.match(/\/data\/recipes-(\d+)\.json$/);
  return Boolean(match && Number(match[1]) >= 76);
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isFreshRecipeAsset(url, event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});