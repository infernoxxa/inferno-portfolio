import { canonicalCategory, slugify, summarize, type Article, type ArticleRecord, type Catalog } from '../../shared/articles'
import { initialArticles } from '../../shared/seed'
import { StorageConflict, type ObjectStore } from './store'

// 正文与目录共用一个小型 JSON 文档，通过 ETag 条件写入原子更新。
// 此方案面向个人博客；图片仍以独立 Blob 保存，避免把二进制写进目录。
const documentKey = 'content/library.json'
const mediaKey = (id: string, filename: string) => `content/media/${id}/${filename}`
interface Library { version: 1; articles: ArticleRecord[] }

async function readLibrary(store: ObjectStore): Promise<{ library: Library; etag: string | null }> {
  const object = await store.get(documentKey)
  if (!object) return { library: { version: 1, articles: initialArticles() }, etag: null }
  const library = JSON.parse(new TextDecoder().decode(object.bytes)) as Library
  if (library.version !== 1 || !Array.isArray(library.articles)) throw new Error('文章存储格式无效。')
  return { library, etag: object.etag! }
}

async function writeLibrary(store: ObjectStore, library: Library, etag: string | null) {
  await store.put(documentKey, new TextEncoder().encode(JSON.stringify(library)), 'application/json; charset=utf-8', etag)
}

export async function readCatalog(store: ObjectStore): Promise<Catalog> {
  return { version: 1, articles: (await readLibrary(store)).library.articles.map(summarize) }
}

export async function readArticle(store: ObjectStore, idOrSlug: string): Promise<ArticleRecord | null> {
  const { library } = await readLibrary(store)
  return library.articles.find(article => article.id === idOrSlug || article.slug === idOrSlug) || null
}

export function validateArticle(value: unknown): asserts value is ArticleRecord {
  if (!value || typeof value !== 'object') throw new Error('文章格式无效。')
  const input = value as ArticleRecord
  for (const field of ['id', 'slug', 'title', 'summary', 'category', 'markdown'] as const) {
    if (typeof input[field] !== 'string') throw new Error(`文章字段 ${field} 无效。`)
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)) throw new Error('文章 ID 无效。')
  if (!input.title.trim() || !slugify(input.slug)) throw new Error('文章标题和地址不能为空。')
  if (input.title.length > 250 || input.summary.length > 1000 || input.category.length > 80) throw new Error('标题、摘要或分类过长。')
  if (new TextEncoder().encode(input.markdown).length > 2 * 1024 * 1024) throw new Error('Markdown 正文不能超过 2 MB。')
  if (!['draft', 'published'].includes(input.status)) throw new Error('文章发布状态无效。')
  if (!Number.isInteger(input.revision) || input.revision < 0) throw new Error('文章版本无效。')
  if (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== 'string' || tag.length > 80)) throw new Error('文章标签无效。')
  if (!Array.isArray(input.media) || input.media.some(name => typeof name !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(name))) throw new Error('图片路径无效。')
}

export async function saveArticle(store: ObjectStore, input: ArticleRecord): Promise<ArticleRecord> {
  validateArticle(input)
  const { library, etag } = await readLibrary(store)
  const existing = library.articles.find(article => article.id === input.id)
  if (existing && input.revision !== existing.revision) throw new StorageConflict()
  const slug = slugify(input.slug)
  if (library.articles.some(article => article.id !== input.id && article.slug === slug)) throw new Error('文章地址已被其他文章使用。')
  const now = new Date().toISOString()
  const article: ArticleRecord = {
    id: input.id, slug, title: input.title.trim(), summary: input.summary.trim(),
    category: canonicalCategory(input.category),
    tags: [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))].slice(0, 12),
    markdown: input.markdown, media: existing?.media || [...new Set(input.media)], status: input.status,
    createdAt: existing?.createdAt || now, updatedAt: now,
    publishedAt: input.status === 'published' ? existing?.publishedAt || now : null,
    revision: (existing?.revision || 0) + 1,
    projectId: existing?.projectId, topic: existing?.topic,
  }
  library.articles = existing ? library.articles.map(item => item.id === article.id ? article : item) : [article, ...library.articles]
  await writeLibrary(store, library, etag)
  return article
}

export async function putImportedArticle(store: ObjectStore, article: Article, files: { filename: string; bytes: Uint8Array; type: string }[]) {
  for (const file of files) await store.put(mediaKey(article.id, file.filename), file.bytes, file.type)
  return saveArticle(store, article)
}

export async function deleteArticle(store: ObjectStore, id: string, revision: number): Promise<void> {
  const { library, etag } = await readLibrary(store)
  const article = library.articles.find(item => item.id === id)
  if (!article) return
  if (article.revision !== revision) throw new StorageConflict()
  library.articles = library.articles.filter(item => item.id !== id)
  await writeLibrary(store, library, etag)
  for (const name of article.media) await store.delete(mediaKey(id, name))
}

export async function getMedia(store: ObjectStore, id: string, filename: string) {
  return store.get(mediaKey(id, filename))
}

export async function canReadPublicMedia(store: ObjectStore, id: string, filename: string) {
  const article = await readArticle(store, id)
  return article?.status === 'published' && article.media.includes(filename)
}

export async function addImage(store: ObjectStore, id: string, filename: string, bytes: Uint8Array, type: string) {
  const { library, etag } = await readLibrary(store)
  const article = library.articles.find(item => item.id === id)
  if (!article) throw new Error('请先保存文章，再上传图片。')
  await store.put(mediaKey(id, filename), bytes, type)
  if (!article.media.includes(filename)) article.media.push(filename)
  await writeLibrary(store, library, etag)
  return `/api/media/${id}/${filename}`
}
