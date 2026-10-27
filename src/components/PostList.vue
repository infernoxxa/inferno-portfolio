<script setup lang="ts">
import type { Post } from '../content/posts'
defineProps<{ posts: Post[] }>()
</script>
<template>
  <div class="post-list">
    <article v-for="post in posts" :key="post.slug" class="post-preview">
      <span class="category-label">{{ post.category }}</span>
      <h3><RouterLink :to="'/blog/' + post.slug">{{ post.title }}</RouterLink></h3>
      <p>{{ post.summary }}</p>
      <RouterLink :to="'/blog/' + post.slug" class="inline-link" :aria-label="'阅读：' + post.title">阅读全文</RouterLink>
    </article>
  </div>
</template>
