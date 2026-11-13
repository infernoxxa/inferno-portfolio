<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { getProject, projects } from '../content/projects'
import { useArticleLibrary } from '../content/library'
import EngineeringDiagram from '../components/EngineeringDiagram.vue'
const props = defineProps<{ id: string }>()
const project = computed(() => getProject(props.id)!)
const next = computed(() => projects.find(item => item.id !== props.id)!)
const { articles, refreshArticles } = useArticleLibrary()
const related = computed(() => articles.value.find(post => post.projectId === props.id))
onMounted(refreshArticles)
</script>
<template>
  <article class="container project-page" :class="project.id">
    <nav class="breadcrumbs" aria-label="当前位置"><RouterLink to="/">首页</RouterLink><span>/</span><RouterLink to="/projects">项目</RouterLink><span>/</span><span>{{ project.name }}</span></nav>
    <header class="project-header"><div><span class="status-label">{{ project.status }}</span><h1>{{ project.name }}</h1><p class="project-subtitle">{{ project.id === 'personal-ai' ? '可靠执行型个人 AI Agent' : '自托管私有云盘与可靠文件传输平台' }}</p><p>{{ project.description }}</p><div class="project-header-actions"><a href="#technical-design" class="button primary">阅读技术设计</a><a v-if="project.demoUrl" :href="project.demoUrl" class="button secondary" target="_blank" rel="noopener noreferrer">打开演示</a><RouterLink v-else :to="project.demoPath" class="button secondary">演示开放说明</RouterLink></div></div><div class="project-visual"><EngineeringDiagram :kind="project.id" /><p class="small-note">工程机制示意，非在线运行画面</p></div></header>
    <dl class="project-facts"><div><dt>项目状态</dt><dd>{{ project.status }}</dd></div><div><dt>公开演示</dt><dd>{{ project.demoStatus }}</dd></div><div><dt>主要技术</dt><dd>{{ project.tags.join(' / ') }}</dd></div></dl>
    <div class="project-reading-layout"><aside class="project-toc" aria-label="项目目录"><h2>本页内容</h2><a href="#overview">项目背景</a><a href="#architecture">架构与职责</a><a href="#technical-design">设计与取舍</a><a href="#progress">当前状态</a></aside><div class="project-body"><section id="overview"><h2>项目背景</h2><p>{{ project.overview }}</p></section><section id="architecture"><h2>架构与职责</h2><ul class="architecture-list"><li v-for="node in project.architecture" :key="node.label"><h3>{{ node.label }}</h3><p>{{ node.detail }}</p></li></ul><p class="small-note">{{ project.id === 'cloud-sync' ? 'PostgreSQL 与 MinIO 分别负责元数据和对象存储，并不共享原子事务。' : 'SSE 将执行过程反馈到 Web；工具审批与任务持久化承担不同职责。' }}</p></section><section id="technical-design"><h2>设计与取舍</h2><article v-for="point in project.designs" :key="point.title" class="design-point"><h3>{{ point.title }}</h3><dl><div><dt>问题</dt><dd>{{ point.problem }}</dd></div><div><dt>做法</dt><dd>{{ point.decision }}</dd></div><div class="design-boundary"><dt>边界</dt><dd>{{ point.boundary }}</dd></div></dl></article></section><section id="progress"><h2>当前状态</h2><div class="progress-columns"><div><h3>核心实现</h3><ul><li v-for="item in project.implemented" :key="item">{{ item }}</li></ul></div><div><h3>公开演示前的规划</h3><ul><li v-for="item in project.planned" :key="item">{{ item }}</li></ul><p class="small-note">规划事项尚未作为在线服务开放。</p></div></div><p class="source-note">{{ project.note }}</p><a v-if="project.repository" :href="project.repository" class="inline-link" target="_blank" rel="noopener noreferrer">查看项目源码</a></section><section v-if="related" class="related-note"><h2>相关笔记</h2><RouterLink :to="'/blog/' + related.slug">{{ related.title }}</RouterLink></section></div></div>
    <nav class="project-end-nav" aria-label="继续浏览项目"><RouterLink to="/projects" class="quiet-link">返回项目列表</RouterLink><RouterLink :to="'/projects/' + next.id">另一个项目：{{ next.name }}</RouterLink></nav>
  </article>
</template>
