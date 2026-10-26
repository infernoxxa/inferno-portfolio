export type ProjectId = 'personal-ai' | 'cloud-sync'
export interface DesignPoint {
  title: string
  problem: string
  decision: string
  boundary: string
}
export interface Project {
  id: ProjectId
  number: string
  name: string
  eyebrow: string
  title: string
  description: string
  status: string
  demoStatus: string
  demoPath: string
  demoUrl: string
  repository: string
  tags: string[]
  highlights: string[]
  overview: string
  architecture: { label: string; detail: string }[]
  designs: DesignPoint[]
  implemented: string[]
  planned: string[]
  note: string
}

export const projects: Project[] = [
  {
    id: 'personal-ai', number: '01', name: 'PersonalAI', eyebrow: 'PERSONAL AI WORKSPACE',
    title: '让 Agent 的每一步，\n都有迹可循。',
    description: '面向个人文件与自然语言任务的 AI 工作空间。在连续工具调用之外，关注任务如何恢复、文件如何安全修改，以及权限如何被正确执行。',
    status: '已完成 · 本地运行', demoStatus: '公开 Demo 筹备中', demoPath: '/ai/', demoUrl: '', repository: '',
    tags: ['Python', 'Agent Runtime', 'PostgreSQL', 'SSE'],
    highlights: ['持久化任务与失败恢复', '工具授权与文件并发保护', '计划、审批与 Diff 可视化'],
    overview: '自然语言任务往往包含多个步骤，也可能跨越多轮工具调用。这个项目把重点放在模型之外的执行层：将任务状态持久化，将实际权限与模型意图分离，并在文件被修改前确认读取证据仍然有效。',
    architecture: [
      { label: 'Web 工作空间', detail: '任务计划 / 审批 / 文件 Diff' },
      { label: 'Agent Runtime', detail: '规划 / 工具调用 / 执行参数校验' },
      { label: 'Durable Worker', detail: '持久化状态 / 失败处理 / 恢复' },
      { label: '文件工具与 PostgreSQL', detail: '读取证据 / 原子写入 / 任务存储' },
    ],
    designs: [
      { title: '从一次请求，到可恢复的任务', problem: '长任务包含多轮工具调用，执行中断后需要保留已经发生的过程。', decision: '使用统一 Agent Runtime 与 Durable Worker，将执行状态持久化，跟踪工具调用和失败处理，为任务恢复保留依据。', boundary: '持久化状态并不等于任意外部副作用都能自动回滚；恢复仍需考虑每种工具操作的执行语义。' },
      { title: '在写入之前，再确认一次事实', problem: 'Agent 读取文件后，文件可能已被编辑器或其他进程修改。', decision: '记录文件读取证据与版本信息，修改前校验当前状态，并采用原子写入，防止基于过期内容覆盖外部修改。', boundary: '校验信息由运行时管理，不让模型自行生成文件哈希、版本或审批 ID。' },
      { title: '把“想执行”与“允许执行”分开', problem: '模型生成了工具调用参数，并不代表用户已经授权实际操作。', decision: '区分用户意图、实际权限和审批决定，结合敏感路径保护、历史禁止约束与对话内授权复用，限定文件操作范围。', boundary: '授权复用发生在明确的对话和权限范围内，不能从一次同意推导无限权限。' },
      { title: '让执行过程可以被理解', problem: '仅展示最终回答，难以解释任务在哪里等待、修改了什么。', decision: '通过 SSE 推送流式回复，在 Web 端呈现任务计划、工具调用、审批状态、执行结果与文件 Diff。', boundary: '流式内容在内存中处理；不将“实时展示”描述成未经验证的完整审计或事件溯源系统。' },
    ],
    implemented: ['Agent Runtime 与 Durable Worker', '任务状态持久化、失败处理与恢复', '文件读取证据校验与原子写入', '工具授权、审批与运行时元数据隔离', 'SSE 流式回复及 Web 执行过程展示'],
    planned: ['公开演示环境与演示数据隔离', '面向公开访问的配额、成本与工具边界评估'],
    note: '项目已完成并在本地运行，公开演示尚未开放。这里聚焦 Agent 执行层；文档检索、Rerank 与引用定位实践见独立的文献阅读 Demo。',
  },
  {
    id: 'cloud-sync', number: '02', name: 'CloudSync', eyebrow: 'SELF-HOSTED FILE WORKSPACE',
    title: '让每一次传输，\n都可靠抵达。',
    description: '自托管私有云盘与可靠文件传输实践。从分片校验、断点续传到不可变版本，处理网络中断、并发修改与跨存储一致性。',
    status: '项目实践 · 演示筹备中', demoStatus: '公开 Demo 筹备中', demoPath: '/cloud/', demoUrl: '', repository: '',
    tags: ['Java 21', 'Spring Boot 3', 'PostgreSQL', 'MinIO'],
    highlights: ['分片校验、断点续传与幂等', '不可变版本与乐观并发', '元数据和对象存储一致性'],
    overview: '面向个人跨设备文件存储与访问，以 Spring Boot 和 MinIO 构建私有云盘。工程重点是文件从上传到读取的完整生命周期：如何安全重试、如何拒绝过期提交，以及数据库事务失败后如何处理已经写入的对象。',
    architecture: [
      { label: 'Vue 3 浏览器端', detail: '文件 / 目录上传 / 历史恢复 / 预览' },
      { label: 'Spring Boot 3', detail: 'Spring Security / 上传会话 / 版本控制' },
      { label: 'PostgreSQL', detail: '文件节点 / 不可变版本 / 条件更新' },
      { label: 'MinIO 对象存储', detail: '对象暂存 / 流式读取 / 延迟清理' },
    ],
    designs: [
      { title: '把中断当作正常路径', problem: '网络中断、分片丢失与重复提交，使大文件上传无法依赖一次请求成功。', decision: '持久化上传会话和分片状态，使用 SHA-256 进行分片及整文件校验，结合缺失分片查询和幂等提交，支持中断续传。', boundary: '完整性校验与提交幂等分别解决内容是否正确、重试是否重复创建版本的问题。' },
      { title: '用新版本保存变化，而不是抹去历史', problem: '多个设备同时修改同一文件，后提交的过期内容可能覆盖已有变化。', decision: '分离逻辑文件节点与不可变内容版本，使用 baseVersionId 和 PostgreSQL 事务内条件更新实现乐观并发；恢复历史时新增版本。', boundary: '冲突时拒绝过期提交；不宣称实现自动内容合并或实时协同编辑。' },
      { title: '为跨存储失败设计收尾机制', problem: 'PostgreSQL 与 MinIO 不能共享同一个本地原子事务，异常时可能产生孤儿对象。', decision: '将对象暂存、完整性校验与元数据事务提交分阶段处理，通过孤儿对象延迟清理、版本引用复核和失败恢复降低不一致风险。', boundary: '采用分阶段写入与补偿处理，不将其描述为数据库和对象存储之间的强原子事务。' },
      { title: '以流处理大文件', problem: '下载大文件、预览视频和打包目录时，将内容整体载入 JVM 内存会增加内存压力。', decision: '基于 MinIO 对象流下载，利用 HTTP Range 支持视频分段读取和拖动，目录下载采用流式 ZIP。', boundary: '展示实现机制，不编造吞吐量、并发数、内存占用或性能测试结论。' },
    ],
    implemented: ['浏览器文件及目录上传、断点续传', 'SHA-256 分片与整文件校验、幂等提交', '不可变版本、乐观并发及历史恢复', '对象暂存、延迟清理与版本引用复核', 'HTTP Range 预览与流式 ZIP 下载'],
    planned: ['公开演示账号与独立存储空间', '文件配额、下载鉴权与定期清理的上线评估'],
    note: '当前展示文件传输、版本管理与存储一致性的项目实践。公开演示环境尚未开放，以上实现不代表生产环境上线或性能验收结论。',
  },
]

export function getProject(id: string) {
  return projects.find(project => project.id === id)
}

export function demoTarget(project: Project) {
  return project.demoUrl || project.demoPath
}
