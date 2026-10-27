<script setup lang="ts">
import { projects } from '../content/projects'
import ProjectCard from '../components/ProjectCard.vue'
</script>
<template><div class="container collection-page"><header class="page-header"><h1>项目</h1><p>主要展示 PersonalAI 与 CloudSync。<br />项目介绍关注实现、取舍和边界，公开演示暂未开放。</p></header><div class="project-collection"><ProjectCard v-for="project in projects" :key="project.id" :project="project" /></div><div class="collection-bottom"><p>想从某个具体问题开始？</p><RouterLink to="/blog" class="inline-link">阅读相关工程笔记</RouterLink></div></div></template>
