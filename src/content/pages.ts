import { profile } from './profile'

export const publicPages = [
  { path: '/', title: 'XXX Inferno · AI Agent 与后端开发', description: 'XXX Inferno 的开发者作品集。探索 PersonalAI 的可靠执行与工具授权，以及 CloudSync 的文件传输、版本管理和一致性设计。', index: true },
  { path: '/projects/personal-ai', title: 'PersonalAI · 可靠执行型个人 AI Agent | XXX Inferno', description: 'PersonalAI 项目实践：Agent Runtime、Durable Worker、任务恢复、工具审批、文件并发保护与 SSE 流式交互。', index: true },
  { path: '/projects/cloud-sync', title: 'CloudSync · 可靠文件传输与版本管理 | XXX Inferno', description: 'CloudSync 项目实践：分片上传、SHA-256 校验、幂等提交、不可变版本、乐观并发与 PostgreSQL / MinIO 一致性。', index: true },
  { path: '/ai/', title: 'PersonalAI · 公开演示筹备中 | XXX Inferno', description: 'PersonalAI 已完成并在本地运行，公开演示环境正在筹备。查看项目介绍与执行机制。', index: false },
  { path: '/cloud/', title: 'CloudSync · 公开演示筹备中 | XXX Inferno', description: 'CloudSync 公开演示环境正在筹备。了解可靠文件传输、版本管理与存储一致性的设计。', index: false },
  { path: '/resume', title: '能力与经历 · 公开简历摘要 | XXX Inferno', description: 'XXX Inferno 的公开经历摘要：2027 届软件工程硕士在读，关注 AI Agent、Python 与 Java 后端开发。', index: true },
  { path: '/404', title: '页面未找到 | XXX Inferno', description: '这个页面暂时不存在，返回 XXX Inferno 作品集继续浏览。', index: false },
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
  set('meta[name="robots"]', page.index ? 'index, follow' : 'noindex, follow')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
}
