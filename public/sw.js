/**
 * Service Worker para LUDIKTIC PWA
 * - Permite instalar la plataforma como app móvil nativa desde el navegador
 * - Cachea el motor de Python Pyodide y recursos estáticos para carga ultra-rápida y soporte offline
 */

const CACHE_NAME = 'ludiktic-v1.0.1'
const CACHE_PYODIDE = 'ludiktic-pyodide-v1'

const RECURSOS_BASICOS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
]

// 1. Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RECURSOS_BASICOS).catch(() => {
        // En caso de que algún recurso falle en desarrollo, continuar
      })
    })
  )
  self.skipWaiting()
})

// 2. Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== CACHE_NAME && clave !== CACHE_PYODIDE) {
            return caches.delete(clave)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// 3. Intercepción inteligente de peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return

  // Ignorar peticiones a Firebase Firestore / Auth (para mantener sincronía en tiempo real)
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('identitytoolkit')) {
    return
  }

  // A. Cache-First para el CDN de Pyodide (ahorra 15MB de descarga a los alumnos)
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(
      caches.open(CACHE_PYODIDE).then(async (cache) => {
        const respuestaEnCache = await cache.match(event.request)
        if (respuestaEnCache) return respuestaEnCache

        try {
          const respuestaRed = await fetch(event.request)
          if (respuestaRed && respuestaRed.status === 200) {
            cache.put(event.request, respuestaRed.clone())
          }
          return respuestaRed
        } catch {
          return respuestaEnCache
        }
      })
    )
    return
  }

  // B. Network-First con fallback a index.html para navegación SPA
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const cachedIndex = await cache.match('/index.html')
        return cachedIndex || fetch(event.request)
      })
    )
    return
  }

  // C. Stale-While-Revalidate para recursos estáticos (JS, CSS, imágenes)
  event.respondWith(
    caches.match(event.request).then((respuestaEnCache) => {
      const peticionRed = fetch(event.request).then((respuestaRed) => {
        if (respuestaRed && respuestaRed.status === 200) {
          const clon = respuestaRed.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clon))
        }
        return respuestaRed
      }).catch(() => null)

      return respuestaEnCache || peticionRed
    })
  )
})
