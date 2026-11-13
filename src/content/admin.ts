import type { ArticleRecord, ArticleSummary } from '../../shared/articles'

// 管理接口统一处理会话过期和服务错误，防止登录 HTML 被误当作保存成功。
export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/admin/' + path, { ...init, credentials: 'same-origin', redirect: 'error' })
  if (response.status === 401 || response.status === 403) throw new Error('管理员登录已失效，请刷新管理页，重新使用 GitHub 登录。')
  if (response.status === 204) return undefined as T
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('未收到有效响应，请检查管理页登录状态。')
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '操作失败，请稍后重试。')
  return payload as T
}

export const getAdminCatalog = () => adminRequest<{ articles: ArticleSummary[] }>('catalog')
export const getAdminArticle = (id: string) => adminRequest<ArticleRecord>('articles/' + encodeURIComponent(id))
