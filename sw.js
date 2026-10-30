const CACHE_NAME = 'sports-pos-v11';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Event: အသစ်တွေ့သည်နှင့် ချက်ချင်း Install လုပ်မည်
self.addEventListener('install', (event) => {
  self.skipWaiting(); // တန်းပြီး အသက်သွင်းရန်
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate Event: Cache အဟောင်းများကို ရှင်းလင်းပြီး Clients အားလုံးကို ထိန်းချုပ်မည်
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: HTML အတွက် Network-First (အသစ်အမြဲရစေရန်)၊ ကျန် static များအတွက် Cache-First
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);

  // External CDNs (Tailwind, Firebase, Chart.js စသည်) ကို browser network တိုက်ရိုက်ပေးသွားမည်
  if (requestURL.origin !== self.location.origin) return;

  // 🌟 HTML navigation များအတွက် Network-First Strategy (GitHub က update ကို ချက်ချင်းမြင်ရစေရန်)
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // အင်တာနက်မရှိတော့မှသာ Cache ထဲက HTML ကို ပြမည်
          return caches.match(event.request).then((res) => res || caches.match('./index.html') || caches.match('./'));
        })
    );
    return;
  }

  // Icons နှင့် manifest များအတွက် Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
