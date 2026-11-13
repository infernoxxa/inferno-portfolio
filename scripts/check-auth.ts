import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { SignJWT } from 'jose'
import { authConfigured, flowCookie, requireAdmin, sessionCookie, signCredential, type ApiEnv } from '../functions/_lib/access'
import { handleApi } from '../functions/_lib/api'
import { onRequest as productionApi } from '../functions/api/[[path]]'
import type { ObjectStore } from '../functions/_lib/store'

// 全程使用虚构凭据与空存储；模拟 GitHub 响应，覆盖真实路由与密码学边界。
const origin = 'https://blog.example.test'
const env: ApiEnv = { GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-client-secret',
  ADMIN_GITHUB_ID: '189717213', SESSION_SECRET: 'test-session-secret-with-at-least-32-bytes', GITHUB_OAUTH_ORIGIN: origin }
const store: ObjectStore = { async get() { return null }, async put() { throw new Error('测试禁止写入') }, async delete() { throw new Error('测试禁止删除') } }
const call = (path: string, init: RequestInit = {}, bindings = env) => handleApi(new Request(origin + '/api/' + path, init), bindings, store)
function cookieFrom(response: Response, name: string) {
  return response.headers.getSetCookie().find(value => value.startsWith(name + '='))?.split(';')[0] || ''
}

assert(authConfigured(env))
assert(!authConfigured({ ...env, SESSION_SECRET: 'short' }))
assert(!authConfigured({ ...env, ADMIN_GITHUB_ID: 'infernoxxa' }))
assert(!authConfigured({ ...env, GITHUB_CLIENT_SECRET: '' }))
assert(!authConfigured({ ...env, GITHUB_OAUTH_ORIGIN: 'http://blog.example.test' }))
assert.equal((await call('admin/catalog')).status, 401)
assert.equal((await call('admin/catalog', { headers: { 'cf-access-jwt-assertion': 'fake', 'cf-access-authenticated-user-email': 'owner@example.test' } })).status, 401)
assert.equal((await productionApi({ request: new Request(origin + '/api/admin/catalog'), env: { LOCAL_DEV: 'true' } })).status, 401)
assert.deepEqual(await (await call('auth/session')).json(), { authenticated: false, configured: true, local: false })
assert.equal((await call('auth/github/login', {}, {})).headers.get('location'), '/manage?auth_error=config')
assert.equal((await handleApi(new Request('https://preview.example.test/api/auth/github/login'), env, store)).status, 403)

const login = await call('auth/github/login')
assert.equal(login.status, 303)
const target = new URL(login.headers.get('location')!)
assert.equal(target.origin, 'https://github.com')
assert.equal(target.pathname, '/login/oauth/authorize')
assert.equal(target.searchParams.get('redirect_uri'), origin + '/api/auth/github/callback')
assert.equal(target.searchParams.get('client_id'), env.GITHUB_CLIENT_ID)
assert.equal(target.searchParams.get('code_challenge_method'), 'S256')
assert(!target.searchParams.has('scope'))
const flow = cookieFrom(login, flowCookie)
assert(flow)
assert.match(login.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Lax; Max-Age=600/)
const state = target.searchParams.get('state')!
const callbackPath = 'auth/github/callback?code=test-code&state=' + state

let fetchCount = 0
let allowedId = Number(env.ADMIN_GITHUB_ID)
let providerFailure = false
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  fetchCount++
  if (String(input) === 'https://github.com/login/oauth/access_token') {
    const body = new URLSearchParams(init?.body as URLSearchParams)
    assert.equal(body.get('code'), 'test-code')
    assert.equal(body.get('client_secret'), env.GITHUB_CLIENT_SECRET)
    assert.equal(body.get('redirect_uri'), origin + '/api/auth/github/callback')
    assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), target.searchParams.get('code_challenge'))
    if (providerFailure) return Response.json({ error: 'bad_verification_code' }, { status: 400 })
    return Response.json({ access_token: 'test-access-token-never-sent-to-browser', token_type: 'bearer' })
  }
  assert.equal(String(input), 'https://api.github.com/user')
  assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-access-token-never-sent-to-browser')
  // 故意使用户名不匹配，证明授权基于固定 ID 而不是用户名。
  return Response.json({ id: allowedId, login: 'renamed-account' })
}

try {
  const missingState = await call(callbackPath)
  assert.equal(missingState.headers.get('location'), '/manage?auth_error=state')
  assert.equal((await call('auth/github/callback?code=test-code&state=wrong', { headers: { cookie: flow } })).headers.get('location'), '/manage?auth_error=state')
  assert.equal(fetchCount, 0)
  const expiredFlow = await signCredential(env, 'oauth', { state, verifier: 'test' }, -10)
  assert.equal((await call(callbackPath, { headers: { cookie: flowCookie + '=' + expiredFlow } })).headers.get('location'), '/manage?auth_error=state')
  assert.equal(fetchCount, 0)
  assert.equal((await call('auth/github/callback?error=access_denied&state=' + state, { headers: { cookie: flow } })).headers.get('location'), '/manage?auth_error=cancelled')
  assert.equal(fetchCount, 0)

  const callback = await call(callbackPath, { headers: { cookie: flow } })
  assert.equal(callback.status, 303)
  assert.equal(callback.headers.get('location'), '/manage')
  assert.equal(callback.headers.get('cache-control'), 'no-store')
  const session = cookieFrom(callback, sessionCookie)
  assert(session)
  assert(!JSON.stringify([...callback.headers]).includes('test-access-token'))
  assert.match(callback.headers.getSetCookie().find(value => value.startsWith(flowCookie))!, /Max-Age=0/)
  assert.equal((await call('admin/catalog', { headers: { cookie: session } })).status, 200)
  assert.equal((await (await call('auth/session', { headers: { cookie: session } })).json()).authenticated, true)
  assert.equal((await call('auth/github/login', { headers: { cookie: session } })).headers.get('location'), '/manage')
  assert.equal((await call('admin/articles', { method: 'POST', headers: { cookie: session, origin: 'https://evil.example.test' } })).status, 403)
  assert.equal(await requireAdmin(new Request('https://preview.example.test/api/admin/catalog', { headers: { cookie: session } }), env), false)

  const token = session.slice(session.indexOf('=') + 1)
  const [header, payload, signature] = token.split('.')
  const tampered = [header, payload, (signature![0] === 'a' ? 'b' : 'a') + signature!.slice(1)].join('.')
  assert.equal((await call('admin/catalog', { headers: { cookie: sessionCookie + '=' + tampered } })).status, 401)
  for (const invalidToken of [
    await signCredential(env, 'session', { sub: '999' }, 300),
    await signCredential(env, 'session', { sub: env.ADMIN_GITHUB_ID! }, -10),
    await signCredential(env, 'oauth', { sub: env.ADMIN_GITHUB_ID! }, 300),
    await signCredential({ ...env, SESSION_SECRET: 'a-different-session-secret-with-32-bytes' }, 'session', { sub: env.ADMIN_GITHUB_ID! }, 300),
    await new SignJWT({ sub: env.ADMIN_GITHUB_ID }).setProtectedHeader({ alg: 'HS256' })
      .setIssuer('inferno-portfolio').setAudience(origin + ':session').setIssuedAt().sign(new TextEncoder().encode(env.SESSION_SECRET)),
  ]) {
    assert.equal((await call('admin/catalog', { headers: { cookie: sessionCookie + '=' + invalidToken } })).status, 401)
  }
  allowedId = 999
  const denied = await call(callbackPath, { headers: { cookie: flow } })
  assert.equal(denied.headers.get('location'), '/manage?auth_error=denied')
  assert.match(denied.headers.getSetCookie().find(value => value.startsWith(sessionCookie))!, /Max-Age=0/)
  providerFailure = true
  assert.equal((await call(callbackPath, { headers: { cookie: flow } })).headers.get('location'), '/manage?auth_error=github')
  assert.equal((await call('auth/logout', { method: 'POST', headers: { origin: 'https://evil.example.test' } })).status, 403)
  assert.equal((await call('auth/logout')).status, 404)
  const logout = await call('auth/logout', { method: 'POST', headers: { origin, cookie: session } })
  assert.equal(logout.status, 303)
  assert.match(logout.headers.getSetCookie().find(value => value.startsWith(sessionCookie))!, /Max-Age=0/)
} finally { globalThis.fetch = originalFetch }

console.log('PASS：GitHub OAuth state、PKCE、固定用户 ID、签名与过期校验、站点隔离、退出、跨站写入与生产免登录隔离。使用模拟 GitHub，未执行真实授权。')
