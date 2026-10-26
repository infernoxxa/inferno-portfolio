<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>
<template>
  <div id="top" class="site-wrap">
    <a class="skip-link" href="#main">跳到正文</a>
    <SiteHeader />
    <main id="main" tabindex="-1"><RouterView /></main>
    <SiteFooter />
  </div>
</template>
