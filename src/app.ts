import { createApp, createSSRApp } from 'vue'
import App from './App.vue'
import { makeRouter } from './router'

export function makeApp(server = false) {
  const normalize = (path: string) => path.replace(/\/$/, '') || '/'
  const hydrate = server || (typeof document !== 'undefined' && normalize(document.querySelector('#app')?.getAttribute('data-page') || '') === normalize(window.location.pathname) && !!document.querySelector('#app')?.children.length)
  const app = hydrate ? createSSRApp(App) : createApp(App)
  const router = makeRouter(server)
  app.use(router)
  return { app, router }
}
