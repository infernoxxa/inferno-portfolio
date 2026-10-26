import { renderToString } from '@vue/server-renderer'
import { makeApp } from './app'
export { publicPages } from './content/pages'

export async function render(path: string) {
  const { app, router } = makeApp(true)
  await router.push(path)
  await router.isReady()
  return renderToString(app)
}
