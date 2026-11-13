<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { canonicalCategory, categoryTopicId } from '../../shared/articles'
import { useArticleLibrary } from '../content/library'
import PostList from '../components/PostList.vue'
const route = useRoute()
const { articles, state, refreshArticles } = useArticleLibrary()
const topics = computed(() => {
  const grouped = new Map<string, string>()
  for (const post of articles.value) grouped.set(categoryTopicId(post.category), canonicalCategory(post.category))
  return [{ id: 'all', label: '全部文章' }, ...[...grouped].map(([id, label]) => ({ id, label }))]
})
const selected = computed(() => topics.value.some(topic => topic.id === route.query.topic) ? String(route.query.topic) : 'all')
const visiblePosts = computed(() => selected.value === 'all' ? articles.value : articles.value.filter(post => categoryTopicId(post.category) === selected.value))
onMounted(refreshArticles)
</script>
<template>
  <div class="container collection-page">
    <header class="page-header"><h1>文章</h1><p>记录技术实践，也留下开发中的思考。</p></header>
    <div class="blog-layout">
      <section aria-label="文章列表">
        <nav class="topic-filter" aria-label="文章分类"><RouterLink v-for="topic in topics" :key="topic.id" :to="{ path: '/blog', query: topic.id === 'all' ? {} : { topic: topic.id } }" :class="{ selected: selected === topic.id }" :aria-current="selected === topic.id ? 'true' : undefined">{{ topic.label }}</RouterLink></nav>
        <p v-if="state.error" class="inline-error" role="alert">{{ state.error }} <button class="text-button" @click="refreshArticles">重新读取</button></p>
        <PostList v-if="visiblePosts.length" :posts="visiblePosts" />
        <p v-else-if="state.loading" class="small-note" role="status">正在读取文章…</p>
        <div v-else class="empty-state"><h2>这里还没有文章</h2><p class="small-note">换个分类看看，或过一阵再来。</p><RouterLink v-if="selected !== 'all'" to="/blog" class="inline-link">查看全部文章</RouterLink></div>
      </section>
      <aside class="reading-aside"><h2>从实践中整理</h2><p>把遇到的问题、做过的尝试与值得留下的想法，慢慢写在这里。</p><RouterLink to="/projects" class="inline-link">浏览项目</RouterLink></aside>
    </div>
  </div>
</template>
