import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { parseDocument } from 'yaml'
import { slugify } from './articles'

for (const [name, language] of Object.entries({ javascript, typescript, python, java, json, bash, sql, css, xml, yaml })) hljs.registerLanguage(name, language)

export interface Heading { id: string; text: string; level: number }
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

// 不允许原始 HTML；链接协议由 markdown-it 检查，防止正文执行脚本。
const parser = new MarkdownIt({
  html: false, linkify: true, typographer: false,
  highlight(code, language) {
    if (code.length < 30000 && language && hljs.getLanguage(language)) return hljs.highlight(code, { language, ignoreIllegals: true }).value
    return ''
  },
})
parser.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  tokens[index]!.attrSet('rel', 'noopener noreferrer')
  return renderer.renderToken(tokens, index, options)
}
parser.renderer.rules.image = (tokens, index, options, _env, renderer) => {
  tokens[index]!.attrSet('loading', 'lazy')
  tokens[index]!.attrSet('decoding', 'async')
  return renderer.renderToken(tokens, index, options)
}

export function renderMarkdown(markdown: string, admin = false): { html: string; headings: Heading[] } {
  const tokens = parser.parse(markdown, {})
  const headings: Heading[] = []
  const used = new Map<string, number>()
  // 标题锚点去重；兼容已有文章的稳定锚点。
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!
    if (token.type !== 'heading_open') continue
    const inline = tokens[index + 1]!
    const explicit = inline.content.match(/\s+\{#([a-zA-Z0-9_-]+)\}$/)
    if (explicit) {
      inline.content = inline.content.slice(0, explicit.index)
      inline.children = parser.parseInline(inline.content, {})[0]!.children
    }
    const text = inline.children?.filter(child => child.type === 'text' || child.type === 'code_inline').map(child => child.content).join('') || inline.content
    const base = explicit?.[1] || slugify(text) || 'section'
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    const id = count === 1 ? base : `${base}-${count}`
    token.attrSet('id', id)
    headings.push({ id, text, level: Number(token.tag.slice(1)) })
  }
  if (admin) for (const token of tokens) for (const child of token.children || []) {
    if (child.type === 'image') {
      const src = String(child.attrGet('src') || '')
      if (src.startsWith('/api/media/')) child.attrSet('src', src.replace('/api/media/', '/api/admin/media/'))
    }
  }
  return { html: parser.renderer.render(tokens, parser.options, {}), headings }
}

export function parseMarkdownFile(source: string) {
  let markdown = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  let metadata: Record<string, unknown> = {}
  if (markdown.startsWith('---\n')) {
    const end = markdown.indexOf('\n---\n', 4)
    if (end < 0) throw new Error('文章开头的 YAML 信息没有用 --- 正确结束。')
    const document = parseDocument(markdown.slice(4, end), { uniqueKeys: true })
    if (document.errors.length) throw new Error('文章开头的 YAML 格式有误，请检查缩进和字段。')
    const value = document.toJS({ maxAliasCount: 10 })
    if (value && typeof value === 'object' && !Array.isArray(value)) metadata = value
    markdown = markdown.slice(end + 5).trim()
  }
  const titleTokens = parser.parse(markdown, {})
  const titleIndex = titleTokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1')
  const headingTitle = titleIndex >= 0 ? titleTokens[titleIndex + 1]?.content || '' : ''
  const title = typeof metadata.title === 'string' ? metadata.title : headingTitle
  // 标题由文章页统一显示，避免正文再次出现同一个一级标题。
  if (headingTitle.trim() === title.trim() && titleIndex >= 0) {
    const lines = markdown.split('\n')
    const range = titleTokens[titleIndex]!.map!
    lines.splice(range[0], range[1] - range[0])
    markdown = lines.join('\n').trim()
  }
  const summary = typeof metadata.description === 'string' ? metadata.description : typeof metadata.summary === 'string' ? metadata.summary : markdown.split(/\n\s*\n/).find(block => block.trim() && !/^[#>`|!\-]/.test(block.trim()))?.replace(/[*_`\[\]]/g, '').slice(0, 160) || ''
  const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : typeof metadata.tags === 'string' ? metadata.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean) : []
  return { title: title.trim(), summary, category: typeof metadata.category === 'string' ? metadata.category : '随笔', tags, slug: typeof metadata.slug === 'string' ? slugify(metadata.slug) : slugify(title), markdown }
}

export function imageSources(markdown: string): string[] {
  return parser.parse(markdown, {}).flatMap(token => (token.children || []).filter(child => child.type === 'image').map(child => String(child.attrGet('src') || '')))
}

export function rewriteImages(markdown: string, replacements: Map<string, string>): string {
  // 仅在 Markdown 语法中的图片位置重写；支持引用式图片，避免更改普通正文。
  const tokens = parser.parse(markdown, {})
  const definitions = new Set<string>()
  for (const token of tokens) for (const child of token.children || []) if (child.type === 'image') definitions.add(String(child.attrGet('src') || ''))
  let result = markdown
  for (const [from, to] of replacements) {
    if (!definitions.has(parser.normalizeLink(from))) continue
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`(\\]\\(\\s*<?)${escaped}(?=>?(?:[\\s)]))`, 'g'), `$1${to}`)
    result = result.replace(new RegExp(`(^[ \\t]{0,3}\\[[^\\]]+\\]:[ \\t]*<?)${escaped}(?=>?(?:[ \\t]|$))`, 'gm'), `$1${to}`)
  }
  return result
}
