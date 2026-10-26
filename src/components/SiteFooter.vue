<script setup lang="ts">
import { profile } from '../content/profile'
import Icon from './Icon.vue'
</script>
<template>
  <footer class="site-footer container">
    <div><span class="footer-name">XXX INFERNO<span class="accent">.</span></span><p>保持好奇，持续构建。</p></div>
    <div class="footer-meta"><span>© 2026 XXX Inferno</span><span>更新于 {{ profile.updated }}</span></div>
    <a class="back-top" href="#top">回到顶部 <Icon name="diagonal" :size="16" /></a>
  </footer>
</template>
