const CACHE = 'recipe-box-v1-28';
const RECIPE_ASSETS = Array.from({length:75},(_,i)=>`./data/recipes-${String(i+1).padStart(2,'0')}.json`);
const ASSETS = ['./','./index.html','./styles.css','./app.js','./kitchen-fractions.js','./recipe-helpers.js','./manifest.webmanifest',...RECIPE_ASSETS];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, clone));
    return response;
  }).catch(() => caches.match('./index.html'))));
});