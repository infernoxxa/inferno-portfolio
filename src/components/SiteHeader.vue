<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandMark from './BrandMark.vue'
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const route = useRoute()
const links = [{ label: '首页', path: '/' }, { label: '文章', path: '/blog' }, { label: '项目', path: '/projects' }, { label: '关于', path: '/about' }, { label: '简历', path: '/resume' }]
const active = (path: string) => path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(path + '/')
function closeMenu() { open.value = false; trigger.value?.focus() }
watch(() => route.fullPath, () => { open.value = false })
</script>
<template>
  <header class="site-header" @keydown.esc="closeMenu">
    <div class="nav-shell container">
      <RouterLink to="/" class="brand" aria-label="XXX Inferno 首页"><BrandMark /><span>XXX Inferno<span class="brand-dot">.</span></span></RouterLink>
      <button ref="trigger" class="menu-toggle" type="button" :aria-expanded="open" aria-controls="main-navigation" :aria-label="open ? '收起导航' : '展开导航'" @click="open = !open"><span></span><span></span></button>
      <nav id="main-navigation" :class="['main-nav', { open }]" aria-label="主导航"><RouterLink v-for="link in links" :key="link.path" :to="link.path" :class="{ 'nav-current': active(link.path) }" :aria-current="active(link.path) ? 'page' : undefined">{{ link.label }}</RouterLink></nav>
    </div>
  </header>
</template>
