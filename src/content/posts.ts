import type { ProjectId } from './projects'

export interface Post {
  slug: string
  title: string
  summary: string
  topic: 'agent' | 'backend'
  category: string
  projectId: ProjectId
  sections: { id: string; title: string; paragraphs: string[]; points?: string[] }[]
}

// Project notes distilled from the supplied resume; no invented publication history.
export const posts: Post[] = [
  {
    slug: 'agent-file-evidence',
    title: 'Agent 修改文件前，为什么要再次校验？',
    summary: '从读取到写入之间，文件可能已经变化。整理 PersonalAI 对读取证据、运行时元数据和工具授权的处理思路。',
    topic: 'agent', category: 'Agent 工程', projectId: 'personal-ai',
    sections: [
      { id: 'stale-read', title: '读取过，不代表现在仍然有效', paragraphs: ['一次文件任务可能经过读取、分析、生成修改内容和等待审批。Agent 真正写入时，编辑器或其他进程可能已经修改了同一份文件。', '如果直接覆盖，模型给出的修改即使本身正确，也可能丢掉其他人的工作。问题发生在读取与写入之间的时间窗口，不能仅靠提示词约束解决。'] },
      { id: 'evidence', title: '把读取证据交给运行时', paragraphs: ['PersonalAI 记录文件读取证据与版本信息，在修改阶段重新校验文件状态，再采用原子写入。这里需要区分两个问题：写入依据是否仍然有效，以及写入过程是否会暴露不完整内容。', '重新校验用于发现过期依据；原子写入用于避免读者看到部分写入的文件。两者各自处理不同的风险，不能相互替代。'], points: ['读取时保留可用于后续校验的证据。', '修改前核对当前文件状态，发现外部变化后避免静默覆盖。', '由运行时管理文件哈希、版本和审批 ID，分离业务参数与执行控制元数据。'] },
      { id: 'permission', title: '状态正确，还需要实际授权', paragraphs: ['文件没有变化，不代表这次操作已经获得许可。模型提出的调用参数、用户的实际意图，以及运行时最终允许的操作范围，需要分别判断。', '项目将工具授权与敏感路径保护放在执行边界中，并结合历史禁止约束和对话内授权复用。一次允许不能自动扩大为对其他路径或其他操作的无限授权。'] },
      { id: 'limits', title: '把边界展示出来', paragraphs: ['在界面上展示任务计划、审批状态和文件 Diff，能帮助使用者理解：准备执行什么、当前为什么等待，以及最后改了哪里。', '这些机制降低了过期覆盖和越权操作的风险，但不等于任意外部工具副作用都可以回滚。任务恢复仍需要结合具体操作的执行语义。'] },
    ],
  },
  {
    slug: 'upload-retry-and-versions',
    title: '重试、冲突和版本：一次文件上传的三个边界',
    summary: '结合 CloudSync，拆开上传完整性、重复提交和并发修改三个问题，再看 PostgreSQL 与 MinIO 之间的一致性边界。',
    topic: 'backend', category: '后端工程', projectId: 'cloud-sync',
    sections: [
      { id: 'integrity', title: '先确认内容是否完整', paragraphs: ['大文件上传无法假设一次请求就能成功。网络可能中断，分片可能缺失，客户端也可能重新提交已经发送过的内容。', 'CloudSync 将上传会话和分片状态持久化，结合 SHA-256 分片与整文件校验、缺失分片查询，保留中断后继续上传的依据。完整性校验回答的是：收到的内容是否与预期一致。'] },
      { id: 'retry', title: '再确认重试会不会重复生效', paragraphs: ['内容完整之后，还有一个独立问题：客户端没有收到提交结果时，再次提交是否会创建重复版本？', '幂等提交关注同一个提交的重试是否安全。它与分片校验不同：校验正确的内容仍然可能被重复创建，因而需要单独处理提交语义。'] },
      { id: 'conflict', title: '用版本表达并发修改', paragraphs: ['当多个设备修改同一文件时，后到的请求不一定基于最新内容。CloudSync 将逻辑文件节点与不可变内容版本分开，使用 baseVersionId 和 PostgreSQL 事务内条件更新实现乐观并发控制。', '过期提交发生冲突时应被拒绝，而不是静默覆盖。恢复历史版本也通过新增版本表达，保留已经发生过的修改。这里不包含自动内容合并或实时协同编辑。'], points: ['文件节点描述同一个逻辑文件。', '不可变版本保存每次提交的内容。', '条件更新检查提交所依据的版本，显式暴露冲突。'] },
      { id: 'storage', title: '最后处理跨存储的失败', paragraphs: ['元数据在 PostgreSQL，对象内容在 MinIO，两者不能共享同一个本地数据库事务。因此对象写入成功，并不意味着元数据提交一定成功。', '项目采用对象暂存、完整性校验与元数据事务提交相结合的分阶段写入，并通过孤儿对象延迟清理、版本引用复核和失败恢复降低不一致风险。', '这是为失败准备收尾机制，不能描述为数据库和对象存储之间的强原子事务。上传可靠性来自这些边界的配合，而不是某个单独的技术名词。'] },
    ],
  },
]

export const topics = [{ id: 'all', label: '全部文章' }, { id: 'agent', label: 'Agent 工程' }, { id: 'backend', label: '后端工程' }]
export function getPost(slug: string) { return posts.find(post => post.slug === slug) }
