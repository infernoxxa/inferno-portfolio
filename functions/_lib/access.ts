import { jwtVerify, SignJWT } from 'jose'

export interface ApiEnv {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  ADMIN_GITHUB_ID?: string
  SESSION_SECRET?: string
  GITHUB_OAUTH_ORIGIN?: string
  AZURE_STORAGE_ACCOUNT?: string
  AZURE_STORAGE_ACCOUNT_KEY?: string
  AZURE_STORAGE_CONTAINER?: string
  AZURE_STORAGE_ENDPOINT?: string
  LOCAL_DEV?: string
}

export const sessionCookie = '__Host-inferno_admin'
export const flowCookie = '__Host-inferno_oauth'

export function readCookie(request: Request, name: string): string {
  return (request.headers.get('cookie') || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(name + '='))?.slice(name.length + 1) || ''
}

export function oauthOrigin(env: ApiEnv): string {
  const value = env.GITHUB_OAUTH_ORIGIN || 'https://xxxinferno.me'
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.origin !== value) throw new Error('登录域名必须是 HTTPS 源地址。')
  return url.origin
}

export function authConfigured(env: ApiEnv): boolean {
  try {
    oauthOrigin(env)
    return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && /^\d+$/.test(env.ADMIN_GITHUB_ID || '')
      && env.SESSION_SECRET && new TextEncoder().encode(env.SESSION_SECRET).length >= 32)
  } catch { return false }
}

// 会话和 OAuth 临时凭据分别限定用途及站点，预览域名无法复用正式站登录态。
export async function signCredential(env: ApiEnv, purpose: 'session' | 'oauth', claims: Record<string, string>, seconds: number): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuer('inferno-portfolio')
    .setAudience(oauthOrigin(env) + ':' + purpose).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(new TextEncoder().encode(env.SESSION_SECRET))
}

export async function verifyCredential(env: ApiEnv, purpose: 'session' | 'oauth', token: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(env.SESSION_SECRET), {
    algorithms: ['HS256'], issuer: 'inferno-portfolio', audience: oauthOrigin(env) + ':' + purpose,
    requiredClaims: ['exp', 'iat'],
  })
  return payload
}

export function authCookie(name: string, value: string, seconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`
}

// 所有管理接口独立核验签名与固定用户 ID，不依赖入口是否显示。
export async function requireAdmin(request: Request, env: ApiEnv): Promise<boolean> {
  if (env.LOCAL_DEV === 'true') return true
  if (!authConfigured(env)) return false
  try {
    if (new URL(request.url).origin !== oauthOrigin(env)) return false
    const payload = await verifyCredential(env, 'session', readCookie(request, sessionCookie))
    return payload.sub === env.ADMIN_GITHUB_ID
  } catch { return false }
}
