<script setup lang="ts">
import type { Project } from '../content/projects'
defineProps<{ project: Project; compact?: boolean }>()
</script>
<template>
  <article :class="['project-summary', { compact }]">
    <div class="project-summary-heading"><h3><RouterLink :to="'/projects/' + project.id">{{ project.name }}</RouterLink></h3><span class="status-label">{{ project.status }}</span></div>
    <p>{{ project.description }}</p>
    <ul v-if="!compact" class="project-feature-list"><li v-for="highlight in project.highlights" :key="highlight">{{ highlight }}</li></ul>
    <div class="tags"><span v-for="tag in project.tags" :key="tag">{{ tag }}</span></div>
    <div class="project-summary-links"><RouterLink :to="'/projects/' + project.id" class="inline-link" :aria-label="'了解 ' + project.name">项目详情</RouterLink><a v-if="project.demoUrl" :href="project.demoUrl" class="quiet-link" target="_blank" rel="noopener noreferrer">打开演示</a><RouterLink v-else :to="project.demoPath" class="quiet-link" :aria-label="project.name + ' 演示开放说明'">演示开放说明</RouterLink></div>
  </article>
</template>
