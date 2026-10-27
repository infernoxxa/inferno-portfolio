<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { posts, topics } from '../content/posts'
import PostList from '../components/PostList.vue'
const route = useRoute()
const selected = computed(() => topics.some(topic => topic.id === route.query.topic) ? String(route.query.topic) : 'all')
const visiblePosts = computed(() => selected.value === 'all' ? posts : posts.filter(post => post.topic === selected.value))
</script>
<template>
  <div class="container collection-page">
    <header class="page-header"><h1>文章</h1><p>关于 Agent、后端开发，以及项目里值得记下来的问题。<br />目前从项目笔记开始，慢慢积累。</p></header>
    <div class="blog-layout"><section aria-label="文章列表"><nav class="topic-filter" aria-label="文章分类"><RouterLink v-for="topic in topics" :key="topic.id" :to="{ path: '/blog', query: topic.id === 'all' ? {} : { topic: topic.id } }" :class="{ selected: selected === topic.id }" :aria-current="selected === topic.id ? 'true' : undefined">{{ topic.label }}</RouterLink></nav><PostList v-if="visiblePosts.length" :posts="visiblePosts" /><div v-else class="empty-state"><h2>这个分类还没有文章</h2><RouterLink to="/blog" class="inline-link">查看全部文章</RouterLink></div></section><aside class="reading-aside"><h2>从实践中整理</h2><p>这些笔记来自 PersonalAI 与 CloudSync 的项目介绍，着重解释问题、做法与边界。</p><p>想先了解完整项目，可以从项目页开始。</p><RouterLink to="/projects" class="inline-link">浏览项目</RouterLink></aside></div>
  </div>
</template>
