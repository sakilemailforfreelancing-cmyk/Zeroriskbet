self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('zeroriskbet-v1').then((cache) => cache.addAll(['/', '/index.html', '/manifest.webmanifest'])),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached
      }
      return fetch(event.request)
    }),
  )
})
