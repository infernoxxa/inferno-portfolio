import { posts } from '../src/content/posts'
import type { Article } from './articles'

// 只用于首次初始化；正式存储中的修改、取消发布和删除优先于初始内容。
export function initialArticles(): Article[] {
  const initialDate = '2026-10-28T00:00:00.000Z'
  return posts.map(post => ({
    id: post.slug, slug: post.slug, title: post.title, summary: post.summary,
    category: post.category, tags: [], status: 'published',
    createdAt: initialDate, updatedAt: initialDate, publishedAt: initialDate,
    revision: 1, media: [], projectId: post.projectId, topic: post.topic,
    markdown: post.sections.map(section => `## ${section.title} {#${section.id}}\n\n${section.paragraphs.join('\n\n')}${section.points ? '\n\n' + section.points.map(point => '- ' + point).join('\n') : ''}`).join('\n\n'),
  }))
}
