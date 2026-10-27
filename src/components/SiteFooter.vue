<script setup lang="ts">
import BrandMark from './BrandMark.vue'
import { profile } from '../content/profile'
</script>
<template>
  <footer class="site-footer container"><div><RouterLink to="/" class="footer-name"><BrandMark />XXX Inferno</RouterLink><p>技术笔记、项目实践与我的经历。</p></div><div class="footer-links"><RouterLink to="/blog">文章</RouterLink><RouterLink to="/resume">简历</RouterLink><a :href="profile.portfolioRepository" target="_blank" rel="noopener noreferrer">站点源码</a><a href="#top">回到顶部</a></div><p class="footer-meta">© 2026 XXX Inferno <span>更新于 {{ profile.updated }}</span></p></footer>
</template>
