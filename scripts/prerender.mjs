import { build } from 'vite'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Emit real HTML for every public route: content and metadata work before JS executes.
// A top-level 404.html lets Pages return an actual HTTP 404 for unknown URLs.
const root = process.cwd()
const ssrDir = resolve(root, '.ssr')
try {
  await build({ build: { ssr: 'src/entry-server.ts', outDir: ssrDir, emptyOutDir: true } })
  const { render, publicPages } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
  const template = await readFile('dist/index.html', 'utf8')
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  for (const page of publicPages) {
    let html = template.replace('<!--app-html-->', await render(page.path)).replace('<div id="app">', `<div id="app" data-page="${page.path}">`)
    html = html.replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
    html = html.replace(/(<meta name="description" content=")[^"]*/, `$1${escape(page.description)}`)
    html = html.replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(page.title)}`)
    html = html.replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(page.description)}`)
    html = html.replace(/(<meta property="og:url" content=")[^"]*/, `$1https://xxxinferno.me${page.path}`)
    html = html.replace(/(<link rel="canonical" href=")[^"]*/, `$1https://xxxinferno.me${page.path}`)
    html = html.replace(/(<meta name="robots" content=")[^"]*/, `$1${page.index ? 'index, follow' : 'noindex, follow'}`)
    const output = page.path === '/' ? 'dist/index.html' : page.path === '/404' ? 'dist/404.html' : join('dist', page.path, 'index.html')
    await mkdir(resolve(output, '..'), { recursive: true })
    await writeFile(output, html, 'utf8')
    console.log(`Prerendered ${page.path}`)
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPages.filter(page => page.index).map(page => `  <url><loc>https://xxxinferno.me${page.path}</loc><lastmod>2026-10-26</lastmod></url>`).join('\n')}\n</urlset>\n`
  await writeFile('dist/sitemap.xml', sitemap, 'utf8')
} finally {
  // This fixed, generated directory is always inside the project root.
  await rm(ssrDir, { recursive: true, force: true })
}
