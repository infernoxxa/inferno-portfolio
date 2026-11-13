import type { ApiEnv } from '../_lib/access'
import { handleApi } from '../_lib/api'
import { configuredStore } from '../_lib/config'

interface PagesContext {
  request: Request
  env: ApiEnv
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  // 本地免登录仅由 Vite 开发服务启用，生产绑定无法开启该开关。
  return handleApi(request, { ...env, LOCAL_DEV: undefined }, configuredStore(env))
}
