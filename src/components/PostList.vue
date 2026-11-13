<script setup lang="ts">
import type { ArticleSummary } from '../../shared/articles'
import { dateLabel } from '../../shared/articles'
defineProps<{ posts: ArticleSummary[] }>()
</script>
<template>
  <div class="post-list">
    <article v-for="post in posts" :key="post.slug" class="post-preview">
      <span class="category-label">{{ post.category }}</span>
      <h3><RouterLink :to="'/blog/' + post.slug">{{ post.title }}</RouterLink></h3>
      <p>{{ post.summary }}</p>
      <div v-if="post.publishedAt || post.tags.length" class="post-preview-meta"><time v-if="post.publishedAt" :datetime="post.publishedAt">{{ dateLabel(post.publishedAt) }}</time><span v-for="tag in post.tags.slice(0, 2)" :key="tag">{{ tag }}</span></div>
      <RouterLink :to="'/blog/' + post.slug" class="inline-link" :aria-label="'阅读：' + post.title">阅读全文</RouterLink>
    </article>
  </div>
</template>
