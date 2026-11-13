import { computed, reactive } from 'vue'
import type { ArticleRecord, ArticleSummary } from '../../shared/articles'
import { summarize } from '../../shared/articles'
import { initialArticles } from '../../shared/seed'

const initial = initialArticles()
// 动态 HTML 携带当前目录与正文，客户端不再用旧的构建期文章覆盖它。
const bootstrap = typeof document !== 'undefined'
  ? JSON.parse(document.getElementById('article-bootstrap')?.textContent || 'null') as { articles: ArticleSummary[]; article: ArticleRecord | null } | null
  : null
const state = reactive({
  articles: bootstrap?.articles || initial.map(summarize) as ArticleSummary[],
  details: new Map<string, ArticleRecord>(bootstrap
    ? bootstrap.article ? [[bootstrap.article.slug, bootstrap.article]] : []
    : initial.map(article => [article.slug, article])),
  loadedSlugs: new Set<string>(),
  loading: false,
  error: '',
  pendingSlug: '',
})

let loadPromise: Promise<void> | null = null

export async function refreshArticles(): Promise<void> {
  if (loadPromise) return loadPromise
  state.loading = true
  state.error = ''
  loadPromise = fetch('/api/articles', { headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '文章列表暂时无法读取。')
      const payload = await response.json() as { articles: ArticleSummary[] }
      state.articles = payload.articles
    })
    .catch(error => { state.error = error instanceof Error ? error.message : '文章列表暂时无法读取。' })
    .finally(() => { state.loading = false; loadPromise = null })
  return loadPromise
}

export async function loadArticle(slug: string): Promise<ArticleRecord | null> {
  state.pendingSlug = slug
  state.error = ''
  try {
    const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
    if (response.status === 404) {
      state.details.delete(slug)
      state.loadedSlugs.add(slug)
      return null
    }
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '文章暂时无法读取。')
    const article = await response.json() as ArticleRecord
    state.details.set(slug, article)
    state.loadedSlugs.add(slug)
    const index = state.articles.findIndex(item => item.slug === slug)
    if (index >= 0) state.articles[index] = summarize(article)
    else state.articles.unshift(summarize(article))
    return article
  } catch (error) {
    state.error = error instanceof Error ? error.message : '文章暂时无法读取。'
    return null
  } finally {
    state.pendingSlug = ''
  }
}

export function useArticleLibrary() {
  return {
    state,
    articles: computed(() => state.articles.filter(article => article.status === 'published')),
    refreshArticles,
    loadArticle,
  }
}

export function seedArticle(slug: string): ArticleRecord | null {
  return state.details.get(slug) || null
}
