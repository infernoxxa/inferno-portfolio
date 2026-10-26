import http from 'node:http'
import { readFile, stat, realpath } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

// Preview the static output, including redirects, response headers and real 404s.
// This script is local tooling. Deployment needs only dist/, no Node server.
const root = await realpath(resolve('dist'))
const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = Number(portIndex === -1 ? 4173 : args[portIndex + 1])
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
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    const pathname = decodeURIComponent(url.pathname)
    for (const rule of headerRules) {
      if (rule.pattern === '/*' || rule.pattern.endsWith('*') && pathname.startsWith(rule.pattern.slice(0, -1)) || rule.pattern === pathname) {
        for (const [name, value] of Object.entries(rule.headers)) response.setHeader(name, value)
      }
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
