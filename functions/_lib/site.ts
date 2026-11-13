import {
  canonicalCategory,
  categoryTopicId,
  dateLabel,
  sortArticlesByPublication,
  type ArticleRecord,
  type ArticleSummary,
} from '../../shared/articles'
import { renderMarkdown, escapeHtml as esc } from '../../shared/markdown'
import { readArticle, readCatalog } from './repository'
import type { ObjectStore } from './store'
import { publicPages } from '../../src/content/pages'

const href = (slug: string) => '/blog/' + encodeURIComponent(slug)

function previews(articles: ArticleSummary[]) {
  return '<div class="post-list">' + articles.map(article =>
    '<article class="post-preview"><span class="category-label">' + esc(article.category) +
    '</span><h3><a href="' + href(article.slug) + '">' + esc(article.title) +
    '</a></h3><p>' + esc(article.summary) + '</p><div class="post-preview-meta">' +
    (article.publishedAt ? '<time datetime="' + esc(article.publishedAt) + '">' + dateLabel(article.publishedAt) + '</time>' : '') +
    '</div><a class="inline-link" href="' + href(article.slug) + '">阅读全文</a></article>',
  ).join('') + '</div>'
}

function articleBody(article: ArticleRecord) {
  const rendered = renderMarkdown(article.markdown)
  return '<article class="container article-page"><nav class="breadcrumbs" aria-label="当前位置"><a href="/">首页</a><span>/</span><a href="/blog">文章</a><span>/</span><span>' +
    esc(article.category) + '</span></nav><header class="article-header"><span class="category-label">' +
    esc(article.category) + '</span><h1>' + esc(article.title) + '</h1><p>' + esc(article.summary) +
    '</p><div class="article-meta">' + (article.publishedAt ? '<time>' + dateLabel(article.publishedAt) + '</time>' : '') +
    article.tags.map(tag => '<span>' + esc(tag) + '</span>').join('') +
    '</div></header><div class="article-layout"><div class="article-body"><div class="markdown-body">' +
    rendered.html + '</div><nav class="article-end-nav"><a class="quiet-link" href="/blog">返回文章列表</a></nav></div><aside class="article-toc" aria-label="文章目录"><h2>本文内容</h2>' +
    rendered.headings.map(heading => '<a href="#' + esc(heading.id) + '">' + esc(heading.text) + '</a>').join('') +
    '</aside></div></article>'
}

interface Assets { fetch(request: Request | string): Promise<Response> }

// 从现有静态模板复用站点导航与资源，动态注入当前正文，保证无需重新构建即可分享新链接。
export async function renderPublicPage(request: Request, store: ObjectStore, assets: Assets): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '') || '/'
  const articles = sortArticlesByPublication(
    (await readCatalog(store)).articles.filter(article => article.status === 'published'),
  )
  if (path === '/sitemap.xml') {
    const paths = [...publicPages.filter(page => page.index && !page.path.startsWith('/blog/')).map(page => page.path), ...articles.map(article => href(article.slug))]
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map(item => '<url><loc>' + esc(url.origin + item) + '</loc></url>').join('') + '</urlset>',
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } })
  }
  let article: ArticleRecord | null = null
  let status = 200
  let title = '文章 | XXX Inferno'
  let description = '技术笔记、项目实践与开发思考。'
  let content = ''
  const templatePath = path === '/' ? '/' : '/blog'
  const templateUrl = new URL(templatePath === '/' ? '/index.html' : '/blog/index.html', url)
  const template = await assets.fetch(new Request(templateUrl, { method: 'GET' }))
  if (!template.ok) return new Response('页面模板不可用，请重新构建站点。', { status: 503 })
  let html = await template.text()
  if (path.startsWith('/blog/')) {
    article = await readArticle(store, decodeURIComponent(path.slice(6)))
    if (!article || article.status !== 'published') {
      article = null
      status = 404
      title = '文章未找到 | XXX Inferno'
      content = '<section class="container article-state"><p class="error-code">404</p><h1>没有找到这篇文章</h1><p>文章可能尚未发布，或地址已经更改。</p><a class="button secondary" href="/blog">返回文章列表</a></section>'
    } else {
      title = article.title + ' | XXX Inferno'
      description = article.summary
      content = articleBody(article)
    }
  } else if (path === '/blog') {
    const topics = [...new Map(articles.map(item => [categoryTopicId(item.category), canonicalCategory(item.category)])).entries()]
    const selected = url.searchParams.get('topic') || 'all'
    const filtered = selected === 'all' ? articles : articles.filter(item => categoryTopicId(item.category) === selected)
    content = '<div class="container collection-page"><header class="page-header"><h1>文章</h1><p>记录技术实践，也留下开发中的思考。</p></header><div class="blog-layout"><section aria-label="文章列表"><nav class="topic-filter" aria-label="文章分类"><a href="/blog">全部文章</a>' +
      topics.map(([id, label]) => '<a href="/blog?topic=' + encodeURIComponent(id) + '">' + esc(label) + '</a>').join('') +
      '</nav>' + previews(filtered) + '</section><aside class="reading-aside"><h2>从实践中整理</h2><p>把遇到的问题、做过的尝试与值得留下的想法，慢慢写在这里。</p><a class="inline-link" href="/projects">浏览项目</a></aside></div></div>'
  } else {
    // 首页只替换文章区域，介绍、薪跳和项目展示继续复用原有页面。
    html = html.replace(/(<section class="home-writing"[^>]*>[\s\S]*?)<div class="post-list">[\s\S]*?<\/section>/, (_match, start) => start + previews(articles.slice(0, 2)) + '</section>')
  }
  if (content) html = html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/, (_match, start, end) => start + content + end)
  // 客户端使用同一份初始数据，避免被删除、取消发布的种子文章重新出现。
  const bootstrap = JSON.stringify({ articles, article }).replace(/</g, '\\u003c')
  html = html.replace(/data-page="[^"]*"/, 'data-page="dynamic"')
    .replace('</body>', () => '<script type="application/json" id="article-bootstrap">' + bootstrap + '</script></body>')
  if (path !== '/') {
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + esc(title) + '</title>')
      .replace(/(<meta name="description" content=")[^"]*/, (_match, start) => start + esc(description))
      .replace(/(<meta property="og:title" content=")[^"]*/, (_match, start) => start + esc(title))
      .replace(/(<meta property="og:description" content=")[^"]*/, (_match, start) => start + esc(description))
      .replace(/(<meta property="og:url" content=")[^"]*/, (_match, start) => start + esc(url.origin + path))
      .replace(/(<link rel="canonical" href=")[^"]*/, (_match, start) => start + esc(url.origin + path))
      .replace(/(<meta property="og:type" content=")[^"]*/, '$1' + (article ? 'article' : 'website'))
      .replace(/(<meta name="robots" content=")[^"]*/, '$1' + (status === 404 ? 'noindex, follow' : 'index, follow'))
  }
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
}
