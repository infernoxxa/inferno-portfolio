<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandMark from './BrandMark.vue'
import Icon from './Icon.vue'
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
const links = [{ label: '项目', hash: '#projects' }, { label: '能力', hash: '#skills' }, { label: '关于', hash: '#about' }]
</script>
<template>
  <header class="site-header" @keydown.esc="open = false">
    <div class="nav-shell container">
      <RouterLink to="/" class="brand" aria-label="XXX Inferno 首页"><BrandMark /><span>XXX INFERNO<span class="brand-dot">.</span></span></RouterLink>
      <button class="menu-toggle" type="button" :aria-expanded="open" aria-controls="main-navigation" :aria-label="open ? '收起导航' : '展开导航'" @click="open = !open"><span></span><span></span></button>
      <nav id="main-navigation" :class="['main-nav', { open }]" aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.hash" :to="'/' + link.hash" :class="{ 'nav-current': route.path === '/' && route.hash === link.hash }">{{ link.label }}</RouterLink>
        <RouterLink to="/resume" :class="{ 'nav-current': route.path === '/resume' }">简历摘要</RouterLink>
        <RouterLink to="/#contact" class="nav-contact">聊聊机会 <Icon name="diagonal" :size="15" /></RouterLink>
      </nav>
    </div>
  </header>
</template>
