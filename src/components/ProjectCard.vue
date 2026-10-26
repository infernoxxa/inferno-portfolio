<script setup lang="ts">
import type { Project } from '../content/projects'
import { demoTarget } from '../content/projects'
import EngineeringDiagram from './EngineeringDiagram.vue'
import Icon from './Icon.vue'
defineProps<{ project: Project }>()
</script>
<template>
  <article :class="['project-card', project.id]">
    <RouterLink :to="'/projects/' + project.id" class="project-art-link" :aria-label="'了解 ' + project.name + ' 的技术设计'"><EngineeringDiagram :kind="project.id" compact /></RouterLink>
    <div class="project-card-content">
      <div class="project-card-heading"><span class="mono project-index">{{ project.number }} / SELECTED PROJECT</span><span class="status-dot" :class="{ green: project.id === 'personal-ai' }">{{ project.status }}</span></div>
      <RouterLink :to="'/projects/' + project.id" class="project-title-link"><h3>{{ project.name }}</h3><Icon name="diagonal" :size="28" /></RouterLink>
      <p class="project-card-description">{{ project.description }}</p>
      <ul class="project-highlights"><li v-for="highlight in project.highlights" :key="highlight"><Icon name="check" :size="15" />{{ highlight }}</li></ul>
      <div class="tags"><span v-for="tag in project.tags" :key="tag">{{ tag }}</span></div>
      <div class="project-actions"><RouterLink :to="'/projects/' + project.id" class="text-link">探索技术细节 <Icon name="arrow" :size="17" /></RouterLink><a v-if="project.demoUrl" :href="demoTarget(project)" class="muted-link" target="_blank" rel="noopener noreferrer">公开演示 <Icon name="diagonal" :size="15" /></a><RouterLink v-else :to="project.demoPath" class="muted-link">演示筹备中 <Icon name="diagonal" :size="15" /></RouterLink></div>
    </div>
  </article>
</template>
