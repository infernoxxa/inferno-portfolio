import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const paths = ['/', '/blog', '/blog/agent-file-evidence', '/blog/upload-retry-and-versions', '/projects', '/projects/personal-ai', '/projects/cloud-sync', '/about', '/ai/', '/cloud/', '/resume', '/404']
const routeFiles = new Map(paths.map(path => [path, path === '/' ? 'dist/index.html' : path === '/404' ? 'dist/404.html' : join('dist', path, 'index.html')]))
const canonicalPath = path => path === '/' ? path : path.replace(/\/$/, '')
const validPaths = new Set(paths.map(canonicalPath))
const titles = new Set()
const descriptions = new Set()
let checkedLinks = 0
for (const [path, file] of routeFiles) {
  const html = await readFile(file, 'utf8')
  assert.match(html, /<html lang="zh-CN">/, `${path}: language`)
  const title = html.match(/<title>(.*?)<\/title>/)?.[1]
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
  assert(title && !titles.has(title), `${path}: unique title`)
  assert(description && !descriptions.has(description), `${path}: unique description`)
  titles.add(title)
  descriptions.add(description)
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: single H1`)
  assert(!html.includes('<!--app-html-->'), `${path}: pre-rendered body`)
  assert.match(html, /<main[^>]*id="main"/, `${path}: main landmark`)
  if (['/ai/', '/cloud/', '/404'].includes(path)) assert.match(html, /content="noindex, follow"/)
  if (path.startsWith('/blog/')) assert.match(html, /property="og:type" content="article"/)
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"/g)) {
    const href = match[1]
    assert(href && href !== '#', `${path}: non-placeholder links`)
    if (/^(https?:|mailto:)/.test(href)) continue
    const url = new URL(href.replaceAll('&amp;', '&'), `https://xxxinferno.me${path}`)
    assert(validPaths.has(canonicalPath(url.pathname)), `${path}: known target ${href}`)
    if (url.hash) {
      const targetFile = [...routeFiles].find(([target]) => canonicalPath(target) === canonicalPath(url.pathname))?.[1]
      const targetHtml = targetFile === file ? html : await readFile(targetFile, 'utf8')
      assert(targetHtml.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${path}: valid anchor ${href}`)
    }
    checkedLinks++
  }
  console.log(`PASS ${path}: HTML, metadata, headings, links and anchors`)
}
const personal = await readFile(routeFiles.get('/projects/personal-ai'), 'utf8')
assert.match(personal, /已完成 · 本地运行/)
assert.match(personal, /公开 Demo 筹备中/)
const cloud = await readFile(routeFiles.get('/projects/cloud-sync'), 'utf8')
assert.match(cloud, /baseVersionId/)
assert.match(cloud, /不是|不将其描述为/)
async function files(dir) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    result.push(...(entry.isDirectory() ? await files(path) : [path]))
  }
  return result
}
for (const file of await files('dist')) {
  if (!/\.(html|js|css|xml|txt|svg)$/.test(file)) continue
  const text = await readFile(file, 'utf8')
  assert(!/(?<!\d)1[3-9]\d{9}(?!\d)|[A-Z0-9._%+-]+@(?:163|qq|gmail|outlook)\.com/iu.test(text), `${file}: unreviewed personal contact`)
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8')
assert(!sitemap.includes('/ai/') && !sitemap.includes('/cloud/') && !sitemap.includes('/404'))
assert(sitemap.includes('/blog/agent-file-evidence') && sitemap.includes('/about'))
console.log(`PASS ${paths.length} pages and ${checkedLinks} internal links; content states, public data and sitemap`)
