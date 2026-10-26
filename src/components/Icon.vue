<script setup lang="ts">
withDefaults(defineProps<{ name?: 'arrow' | 'diagonal' | 'chevron' | 'check' | 'code' | 'download' | 'back' | 'mail'; size?: number }>(), { name: 'arrow', size: 20 })
const paths = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  diagonal: 'M6 18 18 6M6 6h12v12',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  code: 'm8 5-6 7 6 7m8-14 6 7-6 7m-3-15-2 16',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  back: 'M20 12H5m6-6-6 6 6 6',
  mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]" /></svg></template>
