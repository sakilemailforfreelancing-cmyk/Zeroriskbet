export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
