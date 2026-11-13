// 前端、Pages Functions 和本地验收共用文章协议。
export interface Article {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  markdown: string
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  revision: number
  media: string[]
  projectId?: string
  topic?: 'agent' | 'backend'
}

export type ArticleSummary = Omit<Article, 'markdown' | 'media'>
export interface ArticleRecord extends ArticleSummary { markdown: string; media: string[] }
export interface Catalog { version: 1; articles: ArticleSummary[] }

export function summarize({ markdown: _markdown, media: _media, ...article }: Article): ArticleSummary {
  return article
}

const categoryAliases = new Map([
  ['agent', { id: 'agent', label: 'Agent 工程' }],
  ['agent工程', { id: 'agent', label: 'Agent 工程' }],
  ['backend', { id: 'backend', label: '后端工程' }],
  ['backend工程', { id: 'backend', label: '后端工程' }],
  ['后端工程', { id: 'backend', label: '后端工程' }],
])

function categoryLookupKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase()
}

export function canonicalCategory(value: string): string {
  const label = value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  return categoryAliases.get(categoryLookupKey(label))?.label || label || '随笔'
}

export function categoryTopicId(category: string): string {
  const normalized = canonicalCategory(category)
  return categoryAliases.get(categoryLookupKey(normalized))?.id || slugify(normalized)
}

export function sortArticlesByPublication<T extends Pick<ArticleSummary, 'publishedAt' | 'title'>>(articles: T[]): T[] {
  return [...articles].sort((left, right) => {
    const published = (right.publishedAt || '').localeCompare(left.publishedAt || '')
    return published || left.title.localeCompare(right.title, 'zh-CN')
  })
}

export function slugify(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.replace(/```[\s\S]*?```/g, '').length / 500))
}

export function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : ''
}
