<script setup lang="ts">
import { computed } from 'vue'
import { getPost, posts } from '../content/posts'
import { getProject } from '../content/projects'
const props = defineProps<{ slug: string }>()
const post = computed(() => getPost(props.slug)!)
const project = computed(() => getProject(post.value.projectId)!)
const next = computed(() => posts.find(item => item.slug !== props.slug))
</script>
<template>
  <article class="container article-page">
    <nav class="breadcrumbs" aria-label="当前位置"><RouterLink to="/">首页</RouterLink><span>/</span><RouterLink to="/blog">文章</RouterLink><span>/</span><span>{{ post.category }}</span></nav>
    <header class="article-header"><span class="category-label">{{ post.category }}</span><h1>{{ post.title }}</h1><p>{{ post.summary }}</p><div class="article-meta"><span>项目笔记</span><RouterLink :to="'/projects/' + project.id">关联项目：{{ project.name }}</RouterLink></div></header>
    <div class="article-layout"><div class="article-body"><section v-for="section in post.sections" :id="section.id" :key="section.id"><h2>{{ section.title }}</h2><p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p><ul v-if="section.points"><li v-for="point in section.points" :key="point">{{ point }}</li></ul></section><div class="article-source"><p>本文根据项目介绍整理，侧重设计思路。具体功能状态与演示开放情况，请以项目页为准。</p><RouterLink :to="'/projects/' + project.id" class="inline-link">了解 {{ project.name }}</RouterLink></div><nav class="article-end-nav" aria-label="继续阅读"><RouterLink to="/blog" class="quiet-link">返回文章列表</RouterLink><RouterLink v-if="next" :to="'/blog/' + next.slug"><span>另一篇项目笔记</span><strong>{{ next.title }}</strong></RouterLink></nav></div><aside class="article-toc" aria-label="文章目录"><h2>本文内容</h2><a v-for="section in post.sections" :key="section.id" :href="'#' + section.id">{{ section.title }}</a></aside></div>
  </article>
</template>
