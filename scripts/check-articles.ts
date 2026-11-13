import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { zipSync, strToU8 } from 'fflate'
import { importArticle } from '../shared/import'
import { parseMarkdownFile, renderMarkdown } from '../shared/markdown'
import { handleApi } from '../functions/_lib/api'
import { renderPublicPage } from '../functions/_lib/site'
import { AzureObjectStore } from '../functions/_lib/azure-store'
import { onRequest as productionApi } from '../functions/api/[[path]]'
import { StorageConflict, type ObjectStore, type StoredObject } from '../functions/_lib/store'
import {
  canonicalCategory,
  categoryTopicId,
  sortArticlesByPublication,
  type ArticleRecord,
  type ArticleSummary,
} from '../shared/articles'

// 验证行为边界：草稿隔离、图片授权、发布撤回、并发写入和动态 HTML。
class MemoryStore implements ObjectStore {
  values = new Map<string, StoredObject>()
  async get(key: string) { return this.values.get(key) || null }
  async put(key: string, bytes: Uint8Array, contentType: string, expected?: string | null) {
    if (expected !== undefined && (this.values.get(key)?.etag || null) !== expected) throw new StorageConflict()
    this.values.set(key, { bytes, contentType, etag: createHash('sha256').update(bytes).digest('hex') })
  }
  async delete(key: string) { this.values.delete(key) }
}

const store = new MemoryStore()
const origin = 'http://localhost:4318'
const env = { LOCAL_DEV: 'true' }
const call = (path: string, init: RequestInit = {}, local = env) => handleApi(new Request(origin + '/api/' + path, init), local, store)
const save = (article: ArticleRecord) => call('admin/articles/' + article.id, { method: 'PUT', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(article) })
const assets = { async fetch(input: Request | string) {
  const path = new URL(typeof input === 'string' ? input : input.url).pathname
  return new Response(await readFile('dist' + path, 'utf8'))
} }

assert.equal((await call('admin/catalog', {}, {})).status, 401)
assert.equal((await productionApi({ request: new Request(origin + '/api/admin/catalog'), env: { LOCAL_DEV: 'true' } })).status, 401)
assert.equal((await call('admin/import', { method: 'POST', headers: { origin: 'https://other.invalid' } })).status, 403)
assert.equal(canonicalCategory(' agent  工程 '), 'Agent 工程')
assert.equal(categoryTopicId('Agent 工程'), 'agent')
assert.equal(categoryTopicId('Agent工程'), 'agent')
assert.equal(categoryTopicId('后端工程'), 'backend')
assert.deepEqual(
  sortArticlesByPublication([
    { title: '旧', publishedAt: '2026-01-01T00:00:00.000Z' },
    { title: '新', publishedAt: '2026-02-01T00:00:00.000Z' },
  ]).map(item => item.title),
  ['新', '旧'],
)

const picture = new Uint8Array(await readFile('public/brand/mascot-d2-128.png'))
const source = '---\ntitle: 从 Markdown 到博客\nslug: markdown-to-blog\ncategory: 开发记录\ntags: [Markdown, 博客]\n---\n# 从 Markdown 到博客\n\n这是用于本地验收的文章，不会上传到正式站点。\n\n## 一起打包图片\n\n![示例图片](./illustration.png)\n\n## 代码与表格\n\n\x60\x60\x60python\nprint("Hello, blog!")\n\x60\x60\x60\n\n| 项目 | 状态 |\n| --- | --- |\n| Markdown | 已导入 |\n| 图片 | 同级打包 |\n\n> 发布之前，可以先检查阅读效果。\n'
const zip = zipSync({ '文章/文章.md': strToU8(source), '文章/illustration.png': picture })
const fixtureDir = '.local-data/fixtures'
await mkdir(fixtureDir, { recursive: true })
await writeFile(fixtureDir + '/article-with-image.zip', zip)
await writeFile(fixtureDir + '/article.md', source.replace('![示例图片](./illustration.png)', '这篇单文件文章没有图片。'))
const form = new FormData()
form.set('file', new File([zip.slice().buffer], 'article.zip', { type: 'application/zip' }))
const imported = await call('admin/import', { method: 'POST', body: form })
assert.equal(imported.status, 201, await imported.clone().text())
let article = await imported.json() as ArticleRecord
assert.equal(article.status, 'draft')
assert.equal(article.title, '从 Markdown 到博客')
assert.equal(article.media.length, 1)
assert.match(article.markdown, /\/api\/media\//)
assert.equal((await call('articles/' + article.slug)).status, 404)
const image = article.markdown.match(/\]\((\/api\/media\/[^)]+)\)/)![1]!
assert.equal((await handleApi(new Request(origin + image), env, store)).status, 404)
assert.equal((await call('admin/media/' + article.id + '/' + article.media[0])).status, 200)
assert.equal((await call('admin/media/' + article.id + '/' + article.media[0], {}, {})).status, 401)
article.status = 'published'
article.category = 'agent工程'
article = await (await save(article)).json() as ArticleRecord
assert.equal(article.category, 'Agent 工程')
assert.equal((await call('articles/' + article.slug)).status, 200)
assert.equal((await handleApi(new Request(origin + image), env, store)).status, 200)
const publishedHtml = await renderPublicPage(new Request(origin + '/blog/' + article.slug), store, assets)
const html = await publishedHtml.text()
assert.equal(publishedHtml.status, 200)
assert.match(html, /<h1>从 Markdown 到博客<\/h1>/)
assert.match(html, /hljs-built_in/)
assert.match(html, /article-bootstrap/)
assert.equal((html.match(/<main\b/g) || []).length, 1)
const home = await (await renderPublicPage(new Request(origin + '/'), store, assets)).text()
assert.match(home.split('id="article-bootstrap"')[0]!, /从 Markdown 到博客/)
const agentBlog = await (await renderPublicPage(new Request(origin + '/blog?topic=agent'), store, assets)).text()
assert.equal((agentBlog.match(/href="\/blog\?topic=agent"/g) || []).length, 1)
assert.match(agentBlog, /从 Markdown 到博客/)
const sitemap = await (await renderPublicPage(new Request(origin + '/sitemap.xml'), store, assets)).text()
assert(sitemap.includes(article.slug))

const stale = { ...article }
article.title += '：已更新'
article = await (await save(article)).json() as ArticleRecord
assert.equal((await save(stale)).status, 409)
const concurrent = await Promise.all([save({ ...article, summary: '并发保存 A' }), save({ ...article, summary: '并发保存 B' })])
assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 409])
article = await (await call('admin/articles/' + article.id)).json() as ArticleRecord
article.status = 'draft'
article = await (await save(article)).json() as ArticleRecord
assert.equal((await call('articles/' + article.slug)).status, 404)
assert.equal((await handleApi(new Request(origin + image), env, store)).status, 404)
assert.equal((await renderPublicPage(new Request(origin + '/blog/' + article.slug), store, assets)).status, 404)
assert(!(await (await renderPublicPage(new Request(origin + '/sitemap.xml'), store, assets)).text()).includes(article.slug))
assert(!(await (await renderPublicPage(new Request(origin + '/'), store, assets)).text()).includes('从 Markdown 到博客'))
assert.equal((await call('admin/articles/' + article.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revision: stale.revision }) })).status, 409)
assert.equal((await call('admin/articles/' + article.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revision: article.revision }) })).status, 204)
assert.equal((await call('admin/articles/' + article.id)).status, 404)

await assert.rejects(() => importArticle(new File(['# 缺图\n\n![缺失](./missing.png)'], 'test.md'), []), /找不到图片/)
const chineseZip = zipSync({ '笔记/文章.md': strToU8('# 中文图片\n\n![示意图](<./同级 图片.png>)'), '笔记/同级 图片.png': picture })
const chineseArticle = await importArticle(new File([chineseZip.slice().buffer], 'chinese.zip'), [])
assert.match(chineseArticle.article.markdown, /!\[示意图\]\(<\/api\/media\//)
assert.equal(parseMarkdownFile('\x60\x60\x60sh\n# 代码注释\n\x60\x60\x60\n\n# 真正标题\n\n正文').title, '真正标题')
assert(!renderMarkdown('[危险](javascript:alert(1))\n\n<script>alert(1)</script>').html.includes('<script>'))
assert.match(renderMarkdown('## 相同\n\n## 相同').html, /id="相同-2"/)
const emptyCatalog = await call('articles')
assert.equal(((await emptyCatalog.json()) as { articles: ArticleSummary[] }).articles.length, 2)

// 独立计算 Shared Key，确保 PUT 的 blob-type 和条件头均参与签名。
const originalFetch = globalThis.fetch
let checkedSignatures = 0
globalThis.fetch = async (input, init) => {
  const target = new URL(String(input))
  const headers = new Headers(init?.headers)
  const method = init?.method || 'GET'
  const length = init?.body ? (init.body as ArrayBuffer).byteLength : 0
  const canonicalHeaders = [...headers.entries()].filter(([name]) => name.startsWith('x-ms-')).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => name + ':' + value + '\n').join('')
  const signed = [method, '', '', length ? String(length) : '', '', headers.get('content-type') || '', '', '', headers.get('if-match') || '', headers.get('if-none-match') || '', '', ''].join('\n') + '\n' + canonicalHeaders + '/example' + target.pathname
  const digest = createHmac('sha256', Buffer.from('test-key')).update(signed).digest('base64')
  assert.equal(headers.get('authorization'), 'SharedKey example:' + digest)
  checkedSignatures++
  return new Response(method === 'GET' ? 'test' : null, { status: method === 'GET' ? 200 : 201 })
}
try {
  const azure = new AzureObjectStore({ account: 'example', accountKey: Buffer.from('test-key').toString('base64'), container: 'articles' })
  await azure.get('content/example.json')
  await azure.put('content/example.json', strToU8('hello'), 'application/json', null)
  await azure.put('content/example.json', strToU8('world'), 'application/json', '"etag"')
  await azure.delete('content/example.json')
} finally { globalThis.fetch = originalFetch }
assert.equal(checkedSignatures, 4)
console.log('PASS：导入、图片引用、草稿隔离、发布与撤回、删除、版本冲突、动态 HTML、站点地图、Markdown 安全和 Azure 签名。')
console.log('浏览器测试文件：' + fixtureDir + '/article-with-image.zip')
