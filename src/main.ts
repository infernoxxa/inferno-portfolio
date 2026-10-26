import { nextTick } from 'vue'
import { makeApp } from './app'
import { updateMeta } from './content/pages'
import './styles/main.css'

const { app, router } = makeApp()
router.afterEach(async (to, from, failure) => {
  if (failure) return
  updateMeta(to.path)
  // Let keyboard and screen-reader users find the new page after in-app navigation.
  if (from.matched.length && to.path !== from.path && !to.hash) {
    await nextTick()
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
  }
})
router.isReady().then(() => app.mount('#app'))
