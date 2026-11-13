<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { renderMarkdown } from '../../shared/markdown'
import type { ArticleRecord } from '../../shared/articles'
import { dateLabel } from '../../shared/articles'
import { getProject } from '../content/projects'
import { seedArticle, useArticleLibrary } from '../content/library'

const props = defineProps<{ slug: string }>()
const { articles, state, loadArticle } = useArticleLibrary()
const article = ref<ArticleRecord | null>(seedArticle(props.slug))
const attempted = ref(false)
const articleBody = ref<HTMLElement | null>(null)
const activeHeadingId = ref('')
let scrollFrame = 0

const rendered = computed(() => article.value ? renderMarkdown(article.value.markdown) : { html: '', headings: [] })
const project = computed(() => article.value?.projectId ? getProject(article.value.projectId) || null : null)
const next = computed(() => articles.value.find(item => item.slug !== props.slug) || null)
const notFound = computed(() => attempted.value && !article.value && !state.error)

function syncActiveHeading() {
  scrollFrame = 0
  if (!articleBody.value || typeof document === 'undefined') return
  const headings = rendered.value.headings
  if (!headings.length) {
    activeHeadingId.value = ''
    return
  }
  // 激活线取吸顶导航的实际底边，标题被遮挡后才切换章节。
  const activationLine = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().bottom || 0
  const elements = new Map(
    [...articleBody.value.querySelectorAll<HTMLElement>('[id]')].map(element => [element.id, element]),
  )
  let current = headings[0]!.id
  for (const heading of headings) {
    const element = elements.get(heading.id)
    if (!element) continue
    if (element.getBoundingClientRect().top <= activationLine + 1) current = heading.id
    else break
  }
  // 末章高度不足时无法越过激活线，接近页尾后仍要显示最后一项。
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    current = headings.at(-1)!.id
  }
  activeHeadingId.value = current
}

function jumpToHeading(event: MouseEvent, headingId: string) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  const heading = articleBody.value?.querySelector<HTMLElement>(`[id="${CSS.escape(headingId)}"]`)
  if (!heading) return
  event.preventDefault()
  const headerBottom = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().bottom || 0
  const top = Math.max(0, window.scrollY + heading.getBoundingClientRect().top - headerBottom)
  window.scrollTo({ top, behavior: 'auto' })
  history.replaceState(history.state, '', '#' + encodeURIComponent(headingId))
  activeHeadingId.value = headingId
  scheduleActiveHeading()
}

function scheduleActiveHeading() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(syncActiveHeading)
}

async function resetActiveHeading() {
  await nextTick()
  syncActiveHeading()
}

function updateArticleMeta(value: ArticleRecord | null) {
  if (!value || typeof document === 'undefined') return
  const canonical = `${window.location.origin}/blog/${value.slug}`
  document.title = `${value.title} | XXX Inferno`
  const set = (selector: string, content: string) => document.querySelector(selector)?.setAttribute('content', content)
  set('meta[name="description"]', value.summary)
  set('meta[property="og:title"]', value.title)
  set('meta[property="og:description"]', value.summary)
  set('meta[property="og:url"]', canonical)
  set('meta[property="og:type"]', 'article')
  set('meta[name="robots"]', 'index, follow')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
}

async function load() {
  const requestedSlug = props.slug
  attempted.value = false
  article.value = seedArticle(requestedSlug)
  const loaded = await loadArticle(requestedSlug)
  if (requestedSlug !== props.slug) return
  article.value = loaded
  attempted.value = true
  updateArticleMeta(loaded)
  if (!loaded && typeof document !== 'undefined') document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow')
}

onMounted(() => {
  window.addEventListener('scroll', scheduleActiveHeading, { passive: true })
  window.addEventListener('resize', scheduleActiveHeading, { passive: true })
  void load().then(resetActiveHeading)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleActiveHeading)
  window.removeEventListener('resize', scheduleActiveHeading)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
watch(() => props.slug, load)
watch(() => rendered.value.headings.map(heading => heading.id).join('|'), resetActiveHeading)
</script>

<template>
  <article v-if="article" class="container article-page">
    <nav class="breadcrumbs" aria-label="当前位置"><RouterLink to="/">首页</RouterLink><span>/</span><RouterLink to="/blog">文章</RouterLink><span>/</span><span>{{ article.category }}</span></nav>
    <header class="article-header">
      <span class="category-label">{{ article.category }}</span>
      <h1>{{ article.title }}</h1>
      <p>{{ article.summary }}</p>
      <div class="article-meta">
        <time v-if="article.publishedAt" :datetime="article.publishedAt">{{ dateLabel(article.publishedAt) }}</time>
        <RouterLink v-if="project" :to="'/projects/' + project.id">关联项目：{{ project.name }}</RouterLink>
        <span v-for="tag in article.tags" :key="tag">{{ tag }}</span>
      </div>
    </header>
    <div class="article-layout">
      <div ref="articleBody" class="article-body">
        <div class="markdown-body" v-html="rendered.html"></div>
        <div v-if="project" class="article-source"><p>本文关联 PersonalAI / CloudSync 项目实践，具体功能状态请以项目页为准。</p><RouterLink :to="'/projects/' + project.id" class="inline-link">了解 {{ project.name }}</RouterLink></div>
        <nav class="article-end-nav" aria-label="继续阅读"><RouterLink to="/blog" class="quiet-link">返回文章列表</RouterLink><RouterLink v-if="next" :to="'/blog/' + next.slug"><span>继续阅读</span><strong>{{ next.title }}</strong></RouterLink></nav>
      </div>
      <aside v-if="rendered.headings.length" class="article-toc" aria-label="文章目录">
        <h2>本文内容</h2>
        <a v-for="heading in rendered.headings" :key="heading.id" :class="{ nested: heading.level === 3 }" :href="'#' + heading.id" :aria-current="activeHeadingId === heading.id ? 'location' : undefined" @click="jumpToHeading($event, heading.id)">{{ heading.text }}</a>
      </aside>
    </div>
  </article>
  <section v-else-if="state.error" class="container article-state">
    <p class="category-label">文章暂时不可用</p>
    <h1>没有读取到这篇文章</h1>
    <p role="alert">{{ state.error }}</p>
    <RouterLink to="/blog" class="button secondary">返回文章列表</RouterLink>
  </section>
  <section v-else-if="notFound" class="container article-state">
    <p class="error-code">404</p>
    <h1>没有找到这篇文章</h1>
    <p>文章可能尚未发布，或地址已经更改。</p>
    <RouterLink to="/blog" class="button secondary">返回文章列表</RouterLink>
  </section>
  <section v-else class="container article-state" aria-live="polite">
    <p class="category-label">正在读取</p>
    <h1>载入文章…</h1>
  </section>
</template>
