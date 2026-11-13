import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface ApiEnv {
  ACCESS_AUD?: string
  ACCESS_TEAM_DOMAIN?: string
  ADMIN_EMAIL?: string
  AZURE_STORAGE_ACCOUNT?: string
  AZURE_STORAGE_ACCOUNT_KEY?: string
  AZURE_STORAGE_CONTAINER?: string
  AZURE_STORAGE_ENDPOINT?: string
  LOCAL_DEV?: string
}

let jwksUrl = ''
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function tokenFrom(request: Request): string {
  return request.headers.get('cf-access-jwt-assertion') || ''
}

// Cloudflare Access 在受保护请求上注入 JWT；写入接口再次验签，避免只依赖页面路由保护。
export async function requireAdmin(request: Request, env: ApiEnv): Promise<boolean> {
  if (env.LOCAL_DEV === 'true') return true
  const token = tokenFrom(request)
  const audience = env.ACCESS_AUD
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!token || !audience || !teamDomain || !env.ADMIN_EMAIL) return false
  const issuer = `https://${teamDomain}`
  const currentJwksUrl = `${issuer}/cdn-cgi/access/certs`
  if (!jwks || jwksUrl !== currentJwksUrl) {
    jwksUrl = currentJwksUrl
    jwks = createRemoteJWKSet(new URL(currentJwksUrl))
  }
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience })
    if (env.ADMIN_EMAIL && payload.email !== env.ADMIN_EMAIL) return false
    return Boolean(payload.email)
  } catch {
    return false
  }
}
