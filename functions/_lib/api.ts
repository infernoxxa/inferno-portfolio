import { sortArticlesByPublication, type ArticleRecord, type Catalog } from '../../shared/articles'
import { importArticle } from '../../shared/import'
import type { ApiEnv } from './access'
import { requireAdmin } from './access'
import { handleAuth } from './github-auth'
import {
  canReadPublicMedia,
  deleteArticle,
  getMedia,
  putImportedArticle,
  readArticle,
  readCatalog,
  saveArticle,
  addImage,
} from './repository'
import type { ObjectStore } from './store'
import { StorageConflict } from './store'

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders })
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

async function bodyJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('请求格式必须是 JSON。')
  return request.json() as Promise<T>
}

function routeParts(request: Request): string[] {
  return new URL(request.url).pathname.split('/').filter(Boolean).map(decodeURIComponent)
}

async function publicCatalog(store: ObjectStore): Promise<Catalog> {
  const catalog = await readCatalog(store)
  return {
    version: 1,
    articles: sortArticlesByPublication(catalog.articles.filter(article => article.status === 'published')),
  }
}

async function readMedia(store: ObjectStore, articleId: string, filename: string): Promise<Response> {
  const media = await getMedia(store, articleId, filename)
  if (!media) return error('图片不存在。', 404)
    return new Response(media.bytes.slice().buffer, {
    headers: {
      'content-type': media.contentType,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  })
}

async function handleAdmin(request: Request, env: ApiEnv, store: ObjectStore, parts: string[]): Promise<Response> {
  if (!await requireAdmin(request, env)) return error('需要管理员身份。', 401)
  // 同源写入防止其他网站利用浏览器中的登录态代发管理请求。
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return error('不允许跨站管理请求。', 403)
  }
  if (parts.length === 3 && parts[2] === 'catalog' && request.method === 'GET') {
    const catalog = await readCatalog(store)
    const published = sortArticlesByPublication(catalog.articles.filter(article => article.status === 'published'))
    const drafts = catalog.articles
      .filter(article => article.status === 'draft')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    return json({ version: 1, articles: [...published, ...drafts] })
  }
  if (parts.length === 4 && parts[2] === 'articles' && request.method === 'GET') {
    const article = await readArticle(store, parts[3]!)
    return article ? json(article) : error('文章不存在。', 404)
  }
  if (parts.length === 4 && parts[2] === 'articles' && request.method === 'PUT') {
    const input = await bodyJson<ArticleRecord>(request)
    if (input.id !== parts[3]) return error('文章 ID 与请求地址不一致。')
    if (!await readArticle(store, input.id)) return error('文章不存在。', 404)
    return json(await saveArticle(store, input))
  }
  if (parts.length === 4 && parts[2] === 'articles' && request.method === 'DELETE') {
    const { revision } = await bodyJson<{ revision: number }>(request)
    await deleteArticle(store, parts[3]!, revision)
    return new Response(null, { status: 204 })
  }
  if (parts.length === 3 && parts[2] === 'articles' && request.method === 'POST') {
    const input = await bodyJson<ArticleRecord>(request)
    const articles = (await readCatalog(store)).articles
    if (articles.some(article => article.id === input.id)) return error('文章已经存在。', 409)
    return json(await saveArticle(store, input), 201)
  }
  if (parts.length === 3 && parts[2] === 'import' && request.method === 'POST') {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return error('请选择 ZIP 或 Markdown 文件。')
    const catalog = await readCatalog(store)
    const imported = await importArticle(file, catalog.articles, { category: String(form.get('category') || '') })
    return json(await putImportedArticle(store, imported.article, imported.files), 201)
  }
  if (parts.length === 5 && parts[2] === 'media' && request.method === 'GET') {
    return readMedia(store, parts[3]!, parts[4]!)
  }
  if (parts.length === 4 && parts[2] === 'media' && request.method === 'POST') {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024) return error('请选择不超过 8 MB 的图片。')
    const extension = file.name.toLowerCase().split('.').pop() || ''
    const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }
    if (!types[extension]) return error('支持 PNG、JPG、WebP、GIF、AVIF 图片。')
    const filename = `${crypto.randomUUID()}.${extension}`
    const url = await addImage(store, parts[3]!, filename, new Uint8Array(await file.arrayBuffer()), types[extension]!)
    return json({ url }, 201)
  }
  return error('未找到管理接口。', 404)
}

export async function handleApi(request: Request, env: ApiEnv, store: ObjectStore): Promise<Response> {
  try {
    const parts = routeParts(request)
    if (parts[0] !== 'api') return error('接口不存在。', 404)
    if (parts[1] === 'health' && request.method === 'GET') return json({ ok: true })
    if (parts[1] === 'auth') return await handleAuth(request, env)
    if (parts[1] === 'admin') return await handleAdmin(request, env, store, parts)
    if (parts[1] === 'articles' && parts.length === 2 && request.method === 'GET') {
      return json(await publicCatalog(store))
    }
    if (parts[1] === 'articles' && parts.length === 3 && request.method === 'GET') {
      const article = await readArticle(store, parts[2]!)
      if (!article || article.status !== 'published') return error('文章不存在。', 404)
      return json(article)
    }
    if (parts[1] === 'media' && parts.length === 4 && request.method === 'GET') {
      if (!await canReadPublicMedia(store, parts[2]!, parts[3]!)) return error('图片不存在。', 404)
      return readMedia(store, parts[2]!, parts[3]!)
    }
    return error('接口不存在。', 404)
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '处理请求时发生错误。'
    const conflict = caught instanceof StorageConflict
    return error(message, conflict ? 409 : 400)
  }
}
