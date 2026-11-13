import http from 'node:http'
import { readFile, stat, realpath } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { LocalObjectStore } from './local-store.ts'
import { requestBody, requestHeaders, send } from './vite-api.ts'
import { handleApi } from '../functions/_lib/api.ts'
import { renderPublicPage } from '../functions/_lib/site.ts'

// Preview the static output, including redirects, response headers and real 404s.
// 本地构建预览同时运行文章接口，正式部署由 Pages Functions 承担这些操作。
const root = await realpath(resolve('dist'))
const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = Number(portIndex === -1 ? 4173 : args[portIndex + 1])
const articleStore = new LocalObjectStore(resolve(process.env.ARTICLE_LOCAL_DATA_DIR || '.local-data/article-storage'))
const assets = { async fetch(input) {
  const path = new URL(typeof input === 'string' ? input : input.url).pathname
  return new Response(await readFile(resolve(root, '.' + path)), { headers: { 'content-type': 'text/html; charset=utf-8' } })
} }
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.woff2': 'font/woff2' }
const headerRules = []
for (const line of (await readFile(resolve(root, '_headers'), 'utf8')).split(/\r?\n/)) {
  if (line.startsWith('/')) headerRules.push({ pattern: line.trim(), headers: {} })
  else if (/^\s+\S/.test(line)) {
    const [name, ...rest] = line.trim().split(':')
    headerRules.at(-1).headers[name] = rest.join(':').trim()
  }
}
const inside = path => path === root || path.startsWith(root + sep)
async function fileOrNull(path) {
  if (!inside(path)) return null
  try {
    const actual = await realpath(path)
    if (!inside(actual)) return null
    return { actual, info: await stat(actual) }
  } catch { return null }
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://' + (request.headers.host || '127.0.0.1'))
    const pathname = decodeURIComponent(url.pathname)
    for (const rule of headerRules) {
      if (rule.pattern === '/*' || rule.pattern.endsWith('*') && pathname.startsWith(rule.pattern.slice(0, -1)) || rule.pattern === pathname) {
        for (const [name, value] of Object.entries(rule.headers)) response.setHeader(name, value)
      }
    }
    const webRequest = () => new Request(url, { method: request.method, headers: requestHeaders(request) })
    if (pathname.startsWith('/api/')) {
      const body = await requestBody(request)
      await send(response, await handleApi(new Request(url, {
        method: request.method, headers: requestHeaders(request), body: body?.slice().buffer,
      }), { LOCAL_DEV: 'true' }, articleStore))
      return
    }
    const path = pathname.replace(/\/$/, '') || '/'
    if (['GET', 'HEAD'].includes(request.method) && (path === '/' || path === '/blog' || path.startsWith('/blog/') || path === '/sitemap.xml')) {
      await send(response, await renderPublicPage(webRequest(), articleStore, assets))
      return
    }
    if (path === '/manage') {
      let html = await readFile(resolve(root, 'index.html'), 'utf8')
      html = html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/, '$1$2').replace(/data-page="[^"]*"/, 'data-page=""')
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html)
      return
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end()
      return
    }
    let file = await fileOrNull(resolve(root, '.' + pathname))
    if (file?.info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        // Build Location from the parsed path, preventing scheme-relative redirects.
        response.writeHead(308, { Location: url.pathname + '/' + url.search }).end()
        return
      }
      file = await fileOrNull(resolve(file.actual, 'index.html'))
    }
    const found = file?.info.isFile() && !pathname.startsWith('/_') && pathname !== '/404' && pathname !== '/404/' && pathname !== '/404.html'
    const target = found ? file.actual : resolve(root, '404.html')
    response.writeHead(found ? 200 : 404, { 'Content-Type': mime[extname(target)] || 'application/octet-stream' })
    response.end(request.method === 'HEAD' ? undefined : await readFile(target))
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request')
  }
})
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
server.listen(port, '127.0.0.1', () => console.log(`  Local: http://127.0.0.1:${port}/`))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
