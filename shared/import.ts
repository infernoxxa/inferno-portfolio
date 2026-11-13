import { strFromU8, unzipSync } from 'fflate'
import { rewriteImages, parseMarkdownFile, imageSources } from './markdown'
import { canonicalCategory, slugify, type Article, type ArticleSummary } from './articles'

const imageTypes: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif',
}

export interface ImportedArticle {
  article: Article
  files: { filename: string; bytes: Uint8Array; type: string }[]
}

function uniqueSlug(base: string, existing: ArticleSummary[]): string {
  const normalized = slugify(base) || `article-${Date.now()}`
  if (!existing.some(item => item.slug === normalized)) return normalized
  let number = 2
  while (existing.some(item => item.slug === `${normalized}-${number}`)) number++
  return `${normalized}-${number}`
}

function safeName(path: string): string {
  return path.split('/').pop()!.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-80)
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes.slice().buffer)
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function importArticle(file: File, existing: ArticleSummary[], defaults: { category?: string } = {}): Promise<ImportedArticle> {
  if (file.size > 25 * 1024 * 1024) throw new Error('压缩包或 Markdown 文件不能超过 25 MB。')
  const lowerName = file.name.toLowerCase()
  let markdown = ''
  let markdownPath = file.name
  const media = new Map<string, Uint8Array>()
  if (lowerName.endsWith('.zip')) {
    let totalSize = 0
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: entry => {
        if (entry.name.startsWith('__MACOSX/') || entry.name.split('/').pop()!.startsWith('.')) return false
        if (entry.name.split('/').includes('..') || entry.name.startsWith('/') || entry.name.includes('\\')) throw new Error('压缩包包含无效路径。')
        totalSize += entry.originalSize
        if (totalSize > 30 * 1024 * 1024) throw new Error('压缩包解压后不能超过 30 MB。')
        return true
      },
    })
    const entryNames = Object.keys(entries)
    const markdownFiles = entryNames.filter(name => /\.(md|markdown)$/i.test(name))
    if (markdownFiles.length !== 1) throw new Error('ZIP 中请只放一个 Markdown 文章。')
    markdownPath = markdownFiles[0]!
    markdown = strFromU8(entries[markdownPath]!)
    let uncompressed = 0
    const markdownDir = markdownPath.includes('/') ? markdownPath.slice(0, markdownPath.lastIndexOf('/') + 1) : ''
    for (const name of entryNames) {
      const bytes = entries[name]!
      uncompressed += bytes.byteLength
      if (uncompressed > 30 * 1024 * 1024) throw new Error('压缩包解压后不能超过 30 MB。')
      const extension = name.toLowerCase().split('.').pop() || ''
      if (!(extension in imageTypes)) continue
      const relative = name.startsWith(markdownDir) ? name.slice(markdownDir.length) : name
      if (media.has(relative)) throw new Error(`图片文件名重复：${relative}`)
      media.set(relative, bytes)
    }
  } else if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    markdown = await file.text()
  } else {
    throw new Error('请上传 .zip、.md 或 .markdown 文件。')
  }

  const parsed = parseMarkdownFile(markdown)
  if (!parsed.title) throw new Error('没有找到文章标题。请在正文中写一级标题，或添加 title 字段。')
  const id = crypto.randomUUID()
  const files: ImportedArticle['files'] = []
  const replacements = new Map<string, string>()
  for (const [relative, bytes] of media) {
    const extension = relative.toLowerCase().split('.').pop()!
    const filename = `${await digest(bytes)}-${safeName(relative)}`
    files.push({ filename, bytes, type: imageTypes[extension]! })
    replacements.set(relative, `/api/media/${id}/${filename}`)
    replacements.set('./' + relative, `/api/media/${id}/${filename}`)
    replacements.set(encodeURI(relative), `/api/media/${id}/${filename}`)
    replacements.set('./' + encodeURI(relative), `/api/media/${id}/${filename}`)
  }
  const unresolved = imageSources(parsed.markdown).filter(src => !/^(https?:|data:|\/api\/media\/)/i.test(src) && !replacements.has(src))
  if (unresolved.length) throw new Error(`找不到图片：${unresolved[0]}。请将图片与 Markdown 一起打包上传。`)
  const now = new Date().toISOString()
  const article: Article = {
    id, slug: uniqueSlug(parsed.slug, existing), title: parsed.title, summary: parsed.summary,
    category: canonicalCategory(parsed.category || defaults.category || '随笔'), tags: parsed.tags,
    markdown: rewriteImages(parsed.markdown, replacements), status: 'draft',
    createdAt: now, updatedAt: now, publishedAt: null, revision: 1,
    media: files.map(item => item.filename),
  }
  return { article, files }
}
