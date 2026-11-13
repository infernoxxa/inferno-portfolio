<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ArticleRecord } from '../../shared/articles'
import { canonicalCategory } from '../../shared/articles'
import { renderMarkdown } from '../../shared/markdown'

const props = defineProps<{ article: ArticleRecord; busy: boolean; categories: string[] }>()
const emit = defineEmits<{ change: [patch: Partial<ArticleRecord>]; image: [file: File] }>()
const view = ref<'split' | 'edit' | 'preview'>('split')
const rendered = computed(() => renderMarkdown(props.article.markdown, true))
const tagsText = ref('')
const tagsFocused = ref(false)
const update = (field: keyof ArticleRecord, event: Event) => emit('change', { [field]: (event.target as HTMLInputElement).value })
const formatTags = (tags: string[]) => tags.join('，')
function parseTags(value: string) {
  return value.split(/[,，;；]/).map(tag => tag.trim()).filter(Boolean)
}
function updateTags(event: Event) {
  tagsText.value = (event.target as HTMLInputElement).value
  emit('change', { tags: parseTags(tagsText.value) })
}
function syncCategory(event: Event) {
  const input = event.target as HTMLInputElement
  const category = canonicalCategory(input.value)
  input.value = category
  emit('change', { category })
}
function image(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) emit('image', file)
  target.value = ''
}
watch(() => props.article.id, () => {
  tagsFocused.value = false
  tagsText.value = formatTags(props.article.tags)
}, { immediate: true })
watch(() => props.article.tags, tags => {
  if (!tagsFocused.value) tagsText.value = formatTags(tags)
}, { deep: true })
</script>

<template>
  <fieldset class="article-editor" :disabled="busy">
    <div class="editor-fields">
      <label class="field field-title">文章标题<input :value="article.title" maxlength="250" placeholder="给这篇文章起个标题" @input="update('title', $event)" /></label>
      <div class="field-pair">
        <label class="field">文章地址<input :value="article.slug" maxlength="100" placeholder="例如：my-first-post" @input="update('slug', $event)" /><span class="field-hint">/blog/{{ article.slug || '文章地址' }}</span></label>
        <label class="field">分类<input :value="article.category" list="article-category-options" maxlength="80" placeholder="随笔" @input="update('category', $event)" @blur="syncCategory" /><datalist id="article-category-options"><option v-for="category in categories" :key="category" :value="category"></option></datalist></label>
      </div>
      <label class="field">摘要<textarea :value="article.summary" rows="2" maxlength="1000" placeholder="用一两句话，告诉读者这篇文章讲什么。" @input="update('summary', $event)"></textarea></label>
      <label class="field">标签<input v-model="tagsText" placeholder="用逗号分隔，例如：Python，工程实践" @focus="tagsFocused = true" @blur="tagsFocused = false" @input="updateTags" /></label>
    </div>
    <div class="editor-toolbar">
      <span class="editor-label">正文</span>
      <div class="editor-views" role="group" aria-label="编辑视图">
        <button type="button" :aria-pressed="view === 'edit'" @click="view = 'edit'">编辑</button>
        <button type="button" :aria-pressed="view === 'split'" @click="view = 'split'">对照</button>
        <button type="button" :aria-pressed="view === 'preview'" @click="view = 'preview'">预览</button>
      </div>
      <label class="image-upload"><span>添加图片</span><input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.avif" :disabled="busy" aria-label="添加图片" @change="image" /></label>
    </div>
    <div :class="['editor-panes', 'view-' + view]">
      <label v-show="view !== 'preview'" class="markdown-input"><span class="sr-only">Markdown 正文</span><textarea :value="article.markdown" spellcheck="false" placeholder="在这里编辑 Markdown，或从左侧导入文章。" @input="update('markdown', $event)"></textarea></label>
      <section v-show="view !== 'edit'" class="editor-preview" aria-label="文章预览">
        <div class="preview-caption">阅读效果</div>
        <h2 class="preview-title">{{ article.title || '尚未填写标题' }}</h2>
        <p v-if="article.summary" class="preview-summary">{{ article.summary }}</p>
        <div class="markdown-body" v-html="rendered.html"></div>
      </section>
    </div>
    <p class="field-hint editor-footnote">{{ article.markdown.length.toLocaleString() }} 字符。更改需要点击保存；发布后访客才能阅读。</p>
  </fieldset>
</template>
