// Only explicitly public information belongs here. The source resume stays outside this repo.
export const profile = {
  name: 'XXX Inferno',
  brand: 'XXX Inferno',
  domain: 'https://xxxinferno.me',
  updated: '2026-10-27',
  graduation: '2027 届',
  role: 'AI Agent 开发 / Python / Java 后端',
  summary: '软件工程硕士在读，关注 AI 应用与后端系统。喜欢把复杂问题拆解为清晰的边界，再用可以解释、可以恢复的工程机制将它们连接起来。',
  // Leave absent until the owner confirms the exact public addresses.
  portfolioRepository: 'https://github.com/infernoxxa/inferno-portfolio',
  github: '',
  email: '',
  resumePdf: '',
}

export const skills = [
  { number: '01', title: 'Agent 与 AI 应用', caption: '让智能具备可靠的执行边界', tags: ['Python', 'FastAPI', 'Tool Calling', 'Durable Worker', 'MCP', 'SSE'], description: '围绕任务规划、持久化执行、检查点与失败恢复构建 Agent Harness；将工具调用、用户审批和执行预算放入明确的运行边界。' },
  { number: '02', title: 'Java 与数据系统', caption: '把一致性落实到每一次操作', tags: ['Java 21', 'Spring Boot 3', 'Spring Security', 'PostgreSQL', 'MinIO', 'MyBatis-Plus'], description: '关注事务、乐观并发、幂等和存储一致性。通过文件版本与上传会话建模，处理重试、冲突和中断后的恢复。' },
  { number: '03', title: '检索与工程协作', caption: '连接模型、数据与产品体验', tags: ['RAG', 'pgvector', 'Rerank', 'RabbitMQ', 'Vue 3', 'Docker'], description: '在独立的文献阅读 Demo 中实践异步解析、向量检索与引用定位；使用 Git、Linux 与容器完成服务集成和问题排查。' },
]
