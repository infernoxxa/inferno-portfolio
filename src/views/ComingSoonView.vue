<script setup lang="ts">
import { computed } from 'vue'
import { getProject } from '../content/projects'
import EngineeringDiagram from '../components/EngineeringDiagram.vue'
import Icon from '../components/Icon.vue'
const props = defineProps<{ id: string }>()
const project = computed(() => getProject(props.id)!)
</script>
<template>
  <section class="coming-soon container" :class="project.id">
    <RouterLink to="/" class="breadcrumb"><Icon name="back" :size="16" />返回主页</RouterLink>
    <div class="coming-layout"><div><p class="eyebrow">{{ project.eyebrow }}</p><span class="coming-badge"><span class="live-dot"></span>公开演示环境 · 开发中</span><h1>{{ project.name }}<span class="accent">.</span><small>正在为下一次见面做准备。</small></h1><p class="coming-description">{{ project.description }}</p><div class="coming-state"><span class="mono">PROJECT STATUS</span><p>{{ project.status }}</p><span>项目介绍已可浏览，在线演示暂未开放。</span></div><div class="hero-actions"><RouterLink :to="'/projects/' + project.id" class="button primary">查看项目技术介绍 <Icon name="arrow" :size="18" /></RouterLink><RouterLink to="/" class="button secondary">返回主页</RouterLink></div></div><div class="coming-art"><EngineeringDiagram :kind="project.id" /><p class="diagram-disclaimer">设计机制预览 · 非在线服务</p></div></div>
    <div class="coming-roadmap"><div><span class="mono">01 / AVAILABLE</span><h2>项目与技术介绍</h2><p>先了解问题、设计选择与实现边界。</p></div><div><span class="mono accent">02 / IN PREPARATION</span><h2>公开演示环境</h2><p>准备独立的演示数据、权限与访问边界。</p></div><div><span class="mono">03 / PLANNED</span><h2>正式开放演示</h2><p>完成环境验证后更新站内入口。</p></div></div>
  </section>
</template>
