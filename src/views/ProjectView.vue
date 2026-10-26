<script setup lang="ts">
import { computed } from 'vue'
import { getProject, projects, demoTarget } from '../content/projects'
import EngineeringDiagram from '../components/EngineeringDiagram.vue'
import Icon from '../components/Icon.vue'
const props = defineProps<{ id: string }>()
const project = computed(() => getProject(props.id)!)
const next = computed(() => projects.find(p => p.id !== props.id)!)
</script>
<template>
  <article :class="['project-detail', project.id]">
    <div class="container">
      <RouterLink to="/#projects" class="breadcrumb"><Icon name="back" :size="16" />所有项目 <span>/</span> {{ project.name }}</RouterLink>
      <header class="detail-hero"><div><p class="eyebrow">{{ project.number }} / {{ project.eyebrow }}</p><h1>{{ project.name }}<span class="accent">.</span></h1><p class="detail-tagline">{{ project.title }}</p><p class="detail-description">{{ project.description }}</p><div class="detail-hero-actions"><a href="#technical-design" class="button primary">查看技术设计 <Icon name="arrow" :size="18" /></a><a v-if="project.demoUrl" :href="demoTarget(project)" class="button secondary" target="_blank" rel="noopener noreferrer">公开演示 <Icon name="diagonal" :size="17" /></a><RouterLink v-else :to="project.demoPath" class="button secondary">演示开放进度 <Icon name="diagonal" :size="17" /></RouterLink></div></div><div class="detail-visual"><EngineeringDiagram :kind="project.id" /><p class="diagram-disclaimer">工程机制示意 · 非在线服务运行画面</p></div></header>
      <div class="project-facts"><div><span class="fact-label">项目状态</span><span class="status-dot" :class="{ green: project.id === 'personal-ai' }">{{ project.status }}</span></div><div><span class="fact-label">公开演示</span><span>{{ project.demoStatus }}</span></div><div><span class="fact-label">主要技术</span><span>{{ project.tags.join(' / ') }}</span></div></div>

      <div class="detail-layout"><aside class="detail-toc" aria-label="本页目录"><span class="mono">ON THIS PAGE</span><a href="#overview">01 项目背景</a><a href="#architecture">02 架构与流程</a><a href="#technical-design">03 设计与取舍</a><a href="#progress">04 当前状态</a></aside><div class="detail-body">
        <section id="overview" class="detail-section"><p class="eyebrow">01 / CONTEXT</p><h2>从真实问题出发</h2><p class="body-lead">{{ project.overview }}</p></section>
        <section id="architecture" class="detail-section"><p class="eyebrow">02 / ARCHITECTURE</p><h2>让系统的边界清晰可见</h2><p>以下按关键职责梳理项目结构，展示组件之间的关系。</p><ol class="architecture-list"><li v-for="(node, index) in project.architecture" :key="node.label"><span class="mono">0{{ index + 1 }}</span><div><h3>{{ node.label }}</h3><p>{{ node.detail }}</p></div><span v-if="index < project.architecture.length - 1" class="architecture-arrow" aria-hidden="true">↓</span></li></ol><p class="small-note">{{ project.id === 'cloud-sync' ? 'PostgreSQL 与 MinIO 分别承担元数据和对象存储职责；示意顺序不代表它们共享原子事务。' : 'SSE 将执行过程反馈到 Web；工具审批与任务持久化是独立的运行时职责。' }}</p></section>
        <section id="technical-design" class="detail-section"><p class="eyebrow">03 / ENGINEERING DECISIONS</p><h2>实现之外，讲清楚为什么</h2><div class="design-points"><article v-for="(point, index) in project.designs" :key="point.title" class="design-point"><div class="design-point-title"><span class="mono">0{{ index + 1 }}</span><h3>{{ point.title }}</h3></div><dl><div><dt>问题</dt><dd>{{ point.problem }}</dd></div><div><dt>选择</dt><dd>{{ point.decision }}</dd></div><div class="boundary"><dt>边界</dt><dd>{{ point.boundary }}</dd></div></dl></article></div></section>
        <section id="progress" class="detail-section"><p class="eyebrow">04 / CURRENT STATE</p><h2>实现状态与下一步</h2><div class="progress-columns"><div><h3><span class="status-dot green">核心实现</span></h3><ul class="check-list"><li v-for="item in project.implemented" :key="item"><Icon name="check" :size="16" />{{ item }}</li></ul></div><div><h3><span class="status-dot">公开演示前的规划</span></h3><ul class="plan-list"><li v-for="item in project.planned" :key="item">{{ item }}</li></ul><p>以上为规划事项，当前不提供在线服务。</p></div></div><p class="source-note">{{ project.note }}</p><a v-if="project.repository" :href="project.repository" class="text-link" target="_blank" rel="noopener noreferrer">查看源码 <Icon name="diagonal" :size="17" /></a></section>
      </div></div>
      <RouterLink :to="'/projects/' + next.id" class="next-project"><div><p class="eyebrow">NEXT PROJECT / 下一个项目</p><h2>{{ next.name }}<span class="accent">.</span></h2><p>{{ next.highlights[0] }}</p></div><Icon name="arrow" :size="36" /></RouterLink>
    </div>
  </article>
</template>
