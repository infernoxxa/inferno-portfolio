import type { ApiEnv } from './_lib/access'
import { configuredStore } from './_lib/config'
import { renderPublicPage } from './_lib/site'

interface Context {
  request: Request
  env: ApiEnv & { ASSETS: { fetch(request: Request | string): Promise<Response> } }
  next(): Promise<Response>
}

async function handlePage(context: Context) {
  const { request, env } = context
  const path = new URL(request.url).pathname.replace(/\/$/, '') || '/'
  if (path === '/manage' || path.startsWith('/manage/')) {
    // 页面仅提供登录入口和空外壳，文章数据仍由每个管理 API 独立鉴权。
    const shell = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)))
    let html = await shell.text()
    html = html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/, '$1$2').replace(/data-page="[^"]*"/, 'data-page=""')
      .replace(/(<meta name="robots" content=")[^"]*/, '$1noindex, nofollow')
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } })
  }
  if (['GET', 'HEAD'].includes(request.method) && (path === '/' || path === '/blog' || path.startsWith('/blog/') || path === '/sitemap.xml')) {
    try { return await renderPublicPage(request, configuredStore(env), env.ASSETS) }
    catch { return new Response('文章服务暂时不可用，请稍后重试。', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } }) }
  }
  return context.next()
}

export async function onRequest(context: Context) {
  const response = await handlePage(context)
  const result = new Response(response.body, response)
  // Pages 的静态 _headers 不作用于 Functions 响应，在这里延续同样的页面保护。
  result.headers.set('x-content-type-options', 'nosniff')
  result.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  result.headers.set('x-frame-options', 'DENY')
  result.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  if (!result.headers.has('content-security-policy')) result.headers.set('content-security-policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
  return result
}
