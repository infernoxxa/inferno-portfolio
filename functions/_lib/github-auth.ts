import { base64url } from 'jose'
import {
  authConfigured, authCookie, flowCookie, oauthOrigin, readCookie, requireAdmin,
  sessionCookie, signCredential, verifyCredential, type ApiEnv,
} from './access'

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(null, { status: 303, headers })
}

function failed(code: string): Response {
  return redirect('/manage?auth_error=' + code, [authCookie(flowCookie, '', 0), authCookie(sessionCookie, '', 0)])
}

function randomValue(): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(32)))
}

async function begin(request: Request, env: ApiEnv): Promise<Response> {
  if (await requireAdmin(request, env)) return redirect('/manage')
  const state = randomValue()
  const verifier = randomValue()
  const challenge = base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  const target = new URL('https://github.com/login/oauth/authorize')
  target.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!, redirect_uri: oauthOrigin(env) + '/api/auth/github/callback',
    state, code_challenge: challenge, code_challenge_method: 'S256',
  }).toString()
  // 不申请仓库或邮箱权限；仅使用 GitHub 返回的公开用户 ID。
  const flow = await signCredential(env, 'oauth', { state, verifier }, 600)
  return redirect(target.href, [authCookie(flowCookie, flow, 600)])
}

async function callback(request: Request, env: ApiEnv): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  let verifier: string
  try {
    const flow = await verifyCredential(env, 'oauth', readCookie(request, flowCookie))
    if (!state || state !== flow.state || typeof flow.verifier !== 'string') return failed('state')
    verifier = flow.verifier
  } catch { return failed('state') }
  if (url.searchParams.has('error') || !code) return failed('cancelled')
  try {
    // 授权码和访问令牌只在服务端交换，使用 PKCE 绑定本次浏览器登录。
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, client_secret: env.GITHUB_CLIENT_SECRET!, code,
        redirect_uri: oauthOrigin(env) + '/api/auth/github/callback', code_verifier: verifier }),
    })
    if (!tokenResponse.ok) return failed('github')
    const token = await tokenResponse.json() as { access_token?: string; token_type?: string }
    if (!token.access_token || token.token_type?.toLowerCase() !== 'bearer') return failed('github')
    const userResponse = await fetch('https://api.github.com/user', {
      signal: AbortSignal.timeout(10000),
      headers: { accept: 'application/vnd.github+json', authorization: 'Bearer ' + token.access_token, 'user-agent': 'inferno-portfolio' },
    })
    if (!userResponse.ok) return failed('github')
    const user = await userResponse.json() as { id?: number }
    if (!Number.isSafeInteger(user.id) || String(user.id) !== env.ADMIN_GITHUB_ID) return failed('denied')
    const session = await signCredential(env, 'session', { sub: String(user.id) }, 8 * 3600)
    return redirect('/manage', [authCookie(sessionCookie, session, 8 * 3600), authCookie(flowCookie, '', 0)])
  } catch { return failed('github') }
}

export async function handleAuth(request: Request, env: ApiEnv): Promise<Response> {
  const path = new URL(request.url).pathname
  if (path === '/api/auth/session' && request.method === 'GET') {
    return Response.json({ authenticated: await requireAdmin(request, env),
      configured: authConfigured(env), local: env.LOCAL_DEV === 'true' }, { headers: { 'cache-control': 'no-store' } })
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    if (request.headers.get('origin') !== new URL(request.url).origin) return new Response('不允许跨站退出。', { status: 403 })
    return redirect('/manage', [authCookie(sessionCookie, '', 0), authCookie(flowCookie, '', 0)])
  }
  if (!['/api/auth/github/login', '/api/auth/github/callback'].includes(path) || request.method !== 'GET') {
    return new Response('未找到登录接口。', { status: 404 })
  }
  if (!authConfigured(env)) return failed('config')
  if (new URL(request.url).origin !== oauthOrigin(env)) return new Response('请从正式站域名进入管理页。', { status: 403 })
  return path.endsWith('/login') ? begin(request, env) : callback(request, env)
}
