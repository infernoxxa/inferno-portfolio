<script setup lang="ts">
import { computed } from 'vue'
import { getProject } from '../content/projects'
const props = defineProps<{ id: string }>()
const project = computed(() => getProject(props.id)!)
</script>
<template><section class="container demo-page"><nav class="breadcrumbs" aria-label="当前位置"><RouterLink to="/projects">项目</RouterLink><span>/</span><RouterLink :to="'/projects/' + project.id">{{ project.name }}</RouterLink><span>/</span><span>演示说明</span></nav><div class="demo-message"><span class="status-label">公开演示筹备中</span><h1>{{ project.name }} 演示暂未开放</h1><p>{{ project.description }}</p><div class="demo-status"><h2>项目当前状态</h2><p>{{ project.status }}</p><p class="small-note">可以先阅读技术介绍。公开演示环境仍在开发中，准备好后会更新这里的入口。</p></div><div class="demo-actions"><RouterLink :to="'/projects/' + project.id" class="button primary">返回 {{ project.name }} 项目介绍</RouterLink><RouterLink to="/projects" class="button secondary">浏览其他项目</RouterLink></div></div></section></template>
