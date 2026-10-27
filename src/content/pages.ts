import { profile } from './profile'
import { posts } from './posts'

export const publicPages = [
  { path: '/', title: 'XXX Inferno | 个人博客与简历', description: 'XXX Inferno 的个人网站，记录 AI Agent、Python 与 Java 后端开发中的技术笔记、PersonalAI 和 CloudSync 项目实践，以及公开简历。', index: true, kind: 'website' },
  { path: '/blog', title: '文章 | XXX Inferno', description: '关于 Agent、后端开发与工程实践的项目笔记。从具体问题出发，记录实现思路和设计边界。', index: true, kind: 'website' },
  ...posts.map(post => ({ path: '/blog/' + post.slug, title: post.title + ' | XXX Inferno', description: post.summary, index: true, kind: 'article' })),
  { path: '/projects', title: '项目 | XXX Inferno', description: 'PersonalAI 与 CloudSync 的工程实践：Agent 可靠执行、工具授权、文件传输、不可变版本和存储一致性。', index: true, kind: 'website' },
  { path: '/projects/personal-ai', title: 'PersonalAI 项目介绍 | XXX Inferno', description: 'PersonalAI 的 Agent Runtime、Durable Worker、任务恢复、工具审批、文件并发保护与 SSE 流式交互实践。', index: true, kind: 'website' },
  { path: '/projects/cloud-sync', title: 'CloudSync 项目介绍 | XXX Inferno', description: 'CloudSync 的分片上传、SHA-256 校验、幂等提交、不可变版本、乐观并发与存储一致性实践。', index: true, kind: 'website' },
  { path: '/about', title: '关于我 | XXX Inferno', description: '认识 XXX Inferno：2027 届软件工程硕士在读，关注 AI Agent、Python 与 Java 后端开发，记录项目实践和开发思考。', index: true, kind: 'website' },
  { path: '/ai/', title: 'PersonalAI 演示开放说明 | XXX Inferno', description: 'PersonalAI 已完成并在本地运行，公开演示环境仍在筹备。可先阅读项目介绍与相关工程笔记。', index: false, kind: 'website' },
  { path: '/cloud/', title: 'CloudSync 演示开放说明 | XXX Inferno', description: 'CloudSync 公开演示环境尚未开放，可先了解项目实现、文件版本管理与存储一致性的设计。', index: false, kind: 'website' },
  { path: '/resume', title: '公开简历 | XXX Inferno', description: 'XXX Inferno 的公开简历。2027 届软件工程硕士在读，关注 Agent、Python 与 Java 后端岗位，展示核心项目和技术能力。', index: true, kind: 'website' },
  { path: '/404', title: '页面未找到 | XXX Inferno', description: '没有找到这个页面，请返回 XXX Inferno 个人博客首页或继续阅读文章。', index: false, kind: 'website' },
]

export function pageMeta(path: string) {
  return publicPages.find(page => page.path === path || (page.path !== '/' && page.path.replace(/\/$/, '') === path.replace(/\/$/, ''))) || publicPages[publicPages.length - 1]!
}
export function updateMeta(path: string) {
  const page = pageMeta(path)
  const canonical = profile.domain + page.path
  document.title = page.title
  const set = (selector: string, content: string) => document.querySelector(selector)?.setAttribute('content', content)
  set('meta[name="description"]', page.description)
  set('meta[property="og:title"]', page.title)
  set('meta[property="og:description"]', page.description)
  set('meta[property="og:url"]', canonical)
  set('meta[property="og:type"]', page.kind)
  set('meta[name="robots"]', page.index ? 'index, follow' : 'noindex, follow')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
}
