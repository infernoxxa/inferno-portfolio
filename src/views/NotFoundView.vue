<script setup lang="ts">
import Icon from '../components/Icon.vue'
</script>
<template><section class="not-found container"><p class="eyebrow">SOME PATHS LEAD ELSEWHERE</p><div class="error-code" aria-hidden="true">4<span>0</span>4<span class="error-cursor">_</span></div><h1>这条路径，还没有内容。</h1><p>页面可能已移动，或这个地址暂时不存在。<br />回到作品集，继续探索正在构建的项目。</p><div class="hero-actions"><RouterLink to="/" class="button primary">返回主页 <Icon name="arrow" :size="18" /></RouterLink><RouterLink to="/#projects" class="button secondary">浏览项目</RouterLink></div></section></template>
