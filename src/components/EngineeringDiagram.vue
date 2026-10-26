<script setup lang="ts">
import type { ProjectId } from '../content/projects'
defineProps<{ kind: ProjectId; compact?: boolean }>()
</script>
<template>
  <div :class="['engineering-diagram', kind, { compact }]">
    <div class="diagram-topline"><span class="mono">{{ kind === 'personal-ai' ? 'AGENT EXECUTION' : 'FILE LIFECYCLE' }}</span><span class="diagram-caption">机制示意</span></div>
    <svg v-if="kind === 'personal-ai'" viewBox="0 0 480 266" role="img" aria-label="Agent 执行示意：用户任务进入运行时，经过工具审批后执行文件操作，并向 PostgreSQL 保存任务状态。">
      <defs><pattern id="agent-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".2" /></pattern></defs>
      <rect width="480" height="266" fill="url(#agent-grid)" />
      <path class="diagram-wire" d="M85 69h80m148 0h78M240 97v41m-55 35h-64v42m174-42h65v42M240 199v33" />
      <path class="diagram-loop" d="M386 79v62h-69" />
      <circle class="wire-dot" cx="126" cy="69" r="3" /><circle class="wire-dot" cx="240" cy="123" r="3" />
      <rect class="diagram-node small-node" x="15" y="44" width="86" height="50" rx="7" /><text x="58" y="65" class="diagram-label">USER TASK</text><text x="58" y="82" class="diagram-sub">自然语言任务</text>
      <rect class="diagram-node main-node" x="161" y="35" width="158" height="68" rx="9" /><text x="240" y="63" class="diagram-main-label">Agent Runtime</text><text x="240" y="84" class="diagram-sub">PLAN → CALL → OBSERVE</text>
      <rect class="diagram-node small-node" x="378" y="44" width="87" height="50" rx="7" /><text x="421" y="65" class="diagram-label">APPROVAL</text><text x="421" y="82" class="diagram-sub">权限与审批</text>
      <rect class="diagram-node" x="165" y="145" width="150" height="54" rx="8" /><text x="240" y="168" class="diagram-label">Durable Worker</text><text x="240" y="186" class="diagram-sub">检查点 · 失败恢复</text>
      <rect class="diagram-node" x="42" y="215" width="151" height="39" rx="6" /><text x="117" y="239" class="diagram-label">FILE TOOLS</text>
      <rect class="diagram-node" x="285" y="215" width="151" height="39" rx="6" /><text x="360" y="239" class="diagram-label">PostgreSQL</text>
      <text x="240" y="248" class="diagram-tiny">STATE</text>
    </svg>
    <svg v-else viewBox="0 0 480 266" role="img" aria-label="CloudSync 文件生命周期示意：上传会话经过分片校验与幂等提交，连接 PostgreSQL 版本元数据和 MinIO 对象存储。">
      <defs><pattern id="cloud-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".2" /></pattern></defs>
      <rect width="480" height="266" fill="url(#cloud-grid)" />
      <path class="diagram-wire" d="M99 74h54m168 0h58M240 105v45m-85 37H94v32m231-32h61v32" />
      <path class="diagram-loop" d="M94 219v-94h62" />
      <rect class="diagram-node small-node" x="15" y="47" width="91" height="53" rx="7" /><text x="60" y="69" class="diagram-label">UPLOAD</text><text x="60" y="88" class="diagram-sub">持久化会话</text>
      <rect class="diagram-node main-node" x="155" y="35" width="169" height="77" rx="9" /><text x="240" y="62" class="diagram-main-label">Reliable Transfer</text><text x="240" y="84" class="diagram-sub">分片校验 · SHA-256</text><text x="240" y="101" class="diagram-tiny">RESUME / IDEMPOTENCY</text>
      <rect class="diagram-node small-node" x="377" y="47" width="89" height="53" rx="7" /><text x="421" y="69" class="diagram-label">COMMIT</text><text x="421" y="88" class="diagram-sub">幂等提交</text>
      <rect class="diagram-node" x="155" y="151" width="170" height="53" rx="8" /><text x="240" y="173" class="diagram-label">Immutable Versions</text><text x="240" y="192" class="diagram-sub">乐观并发 · 历史恢复</text>
      <rect class="diagram-node" x="25" y="218" width="141" height="36" rx="6" /><text x="95" y="241" class="diagram-label">PostgreSQL</text>
      <rect class="diagram-node" x="316" y="218" width="141" height="36" rx="6" /><text x="387" y="241" class="diagram-label">MinIO</text>
      <path class="diagram-wire" d="M166 236h150" stroke-dasharray="3 5" /><text x="240" y="230" class="diagram-tiny">引用复核 / 延迟清理</text>
      <circle class="wire-dot" cx="240" cy="131" r="3" />
    </svg>
    <div class="diagram-bottomline"><span><i></i>{{ kind === 'personal-ai' ? 'PERSISTENT BY DESIGN' : 'CONSISTENCY BY DESIGN' }}</span><span class="mono">{{ kind === 'personal-ai' ? '01 / AI' : '02 / BACKEND' }}</span></div>
  </div>
</template>
