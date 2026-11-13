<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { canonicalCategory, slugify, dateLabel, type ArticleRecord, type ArticleSummary } from '../../shared/articles'
import { adminRequest, getAdminArticle, getAdminCatalog } from '../content/admin'
import ArticleEditor from '../components/ArticleEditor.vue'

const articles = ref<ArticleSummary[]>([])
const selected = ref<ArticleRecord | null>(null)
const saved = ref('')
const persisted = ref(false)
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const query = ref('')
const filter = ref('all')
const deleteDialog = ref<HTMLDialogElement | null>(null)
const dirty = computed(() => selected.value !== null && JSON.stringify(selected.value) !== saved.value)
const visible = computed(() => articles.value
  .filter(article =>
    (filter.value === 'all' || article.status === filter.value) &&
    (article.title + article.category + article.tags.join(' ')).toLocaleLowerCase().includes(query.value.toLocaleLowerCase()),
  )
  .sort((left, right) => {
    if (left.status !== right.status) return left.status === 'published' ? -1 : 1
    const leftDate = left.status === 'published' ? left.publishedAt || left.createdAt : left.updatedAt
    const rightDate = right.status === 'published' ? right.publishedAt || right.createdAt : right.updatedAt
    return rightDate.localeCompare(leftDate)
  }))
const published = computed(() => articles.value.filter(article => article.status === 'published').length)
const categoryOptions = computed(() => [...new Set(articles.value.map(article => canonicalCategory(article.category)))])

function choose(article: ArticleRecord, exists = true) {
  selected.value = structuredClone(article)
  saved.value = JSON.stringify(article)
  persisted.value = exists
}
function mayLeave() {
  return !dirty.value || window.confirm('当前文章有未保存的修改。确认离开并放弃这些修改？')
}
function patch(value: Partial<ArticleRecord>) {
  if (selected.value) selected.value = { ...selected.value, ...value }
}
async function catalog() {
  articles.value = (await getAdminCatalog()).articles
}
async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try { await action() } catch (caught) { error.value = caught instanceof Error ? caught.message : '操作失败。' }
  finally { busy.value = false }
}
async function open(id: string) {
  if (!mayLeave()) return
  await run(async () => choose(await getAdminArticle(id)))
}
function create() {
  if (!mayLeave()) return
  const now = new Date().toISOString()
  choose({ id: crypto.randomUUID(), slug: '', title: '', summary: '', category: '随笔', tags: [], markdown: '',
    status: 'draft', createdAt: now, updatedAt: now, publishedAt: null, revision: 0, media: [] }, false)
  notice.value = ''
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !mayLeave()) return
  await run(async () => {
    const form = new FormData()
    form.set('file', file)
    const imported = await adminRequest<ArticleRecord>('import', { method: 'POST', body: form })
    choose(imported)
    await catalog()
    notice.value = '已导入为草稿。检查正文和图片后，可以发布。'
  })
}
async function save(status: 'draft' | 'published') {
  if (!selected.value) return
  const snapshot = { ...selected.value, status }
  snapshot.slug = slugify(snapshot.slug || snapshot.title)
  if (!snapshot.title.trim()) { error.value = '请先填写文章标题。'; return }
  await run(async () => {
    const result = await adminRequest<ArticleRecord>('articles' + (persisted.value ? '/' + snapshot.id : ''), {
      method: persisted.value ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot),
    })
    choose(result)
    await catalog()
    notice.value = status === 'published' ? '文章已发布，访客现在可以阅读。' : '草稿已保存，只有你能查看。'
  })
}
async function image(file: File) {
  if (!selected.value) return
  if (!persisted.value) { error.value = '请先填写标题并保存草稿，再添加图片。'; return }
  const id = selected.value.id
  await run(async () => {
    const form = new FormData()
    form.set('file', file)
    const { url } = await adminRequest<{ url: string }>('media/' + id, { method: 'POST', body: form })
    patch({ markdown: selected.value!.markdown + '\n\n![' + file.name.replace(/[\[\]]/g, '') + '](' + url + ')\n' })
    notice.value = '图片已添加到正文，记得保存文章。'
  })
}
async function remove() {
  if (!selected.value) return
  const article = selected.value
  deleteDialog.value?.close()
  await run(async () => {
    await adminRequest('articles/' + article.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revision: article.revision }) })
    selected.value = null
    saved.value = ''
    await catalog()
    notice.value = '文章已删除。'
  })
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) event.preventDefault() }
onBeforeRouteLeave(mayLeave)
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  await run(catalog)
  loading.value = false
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="container manager-page">
    <header class="manager-heading">
      <div><h1>文章管理</h1><p>把写好的内容，变成可以分享的文章。</p></div>
      <RouterLink to="/blog" class="quiet-link">查看公开文章</RouterLink>
    </header>
    <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="manager-notice" role="status">{{ notice }}</p>
    <div class="manager-layout" :aria-busy="busy">
      <aside class="manager-library" aria-label="管理文章列表">
        <div class="manager-library-heading"><h2>我的文章</h2><span>{{ articles.length }} 篇</span></div>
        <div class="manager-import-actions">
          <label class="button primary file-button">导入文章<input type="file" accept=".md,.markdown,.zip" :disabled="busy" aria-label="导入 Markdown 或 ZIP" @change="importFile" /></label>
          <button type="button" class="button secondary" :disabled="busy" @click="create">新建</button>
        </div>
        <p class="import-help">上传 .md，或把一篇文章和图片一起打成 ZIP。图片可放在文章同级或子目录中。</p>
        <label class="field"><span class="sr-only">搜索文章</span><input v-model="query" type="search" placeholder="搜索标题、分类或标签" aria-label="搜索文章" /></label>
        <label class="field"><span class="sr-only">筛选状态</span><select v-model="filter" aria-label="筛选状态"><option value="all">全部文章（{{ articles.length }}）</option><option value="published">已发布（{{ published }}）</option><option value="draft">草稿（{{ articles.length - published }}）</option></select></label>
        <p v-if="loading" class="small-note" role="status">正在读取文章…</p>
        <p v-else-if="!visible.length" class="small-note">没有符合条件的文章。可以导入一篇，或换个条件搜索。</p>
        <div class="manager-article-list">
          <button v-for="article in visible" :key="article.id" type="button" :class="['manager-article', { selected: selected?.id === article.id }]" :aria-pressed="selected?.id === article.id" :disabled="busy" @click="open(article.id)">
            <span class="manager-article-top"><span :class="['publication-state', article.status]">{{ article.status === 'published' ? '已发布' : '草稿' }}</span><span>{{ article.category }}</span></span>
            <strong>{{ article.title }}</strong><time :datetime="article.publishedAt || article.createdAt">{{ article.status === 'published' ? '发布于 ' : '更新于 ' }}{{ dateLabel(article.publishedAt || (article.status === 'draft' ? article.updatedAt : article.createdAt)) }}</time>
          </button>
        </div>
      </aside>
      <section v-if="selected" class="manager-workspace" aria-label="文章编辑">
        <div class="manager-savebar">
          <span class="save-state">{{ busy ? '正在处理…' : dirty ? '有未保存的修改' : persisted ? '已保存' : '新文章' }}</span>
          <div class="manager-save-actions">
            <button v-if="persisted" type="button" class="text-button danger" :disabled="busy" @click="deleteDialog?.showModal()">删除</button>
            <a v-if="selected.status === 'published'" :href="'/blog/' + selected.slug" target="_blank" rel="noopener" class="quiet-link">阅读文章</a>
            <button v-if="selected.status === 'published'" type="button" class="button secondary" :disabled="busy" @click="save('draft')">取消发布</button>
            <button v-else type="button" class="button secondary" :disabled="busy" @click="save('draft')">保存草稿</button>
            <button type="button" class="button primary" :disabled="busy" @click="save('published')">{{ selected.status === 'published' ? '更新文章' : '发布文章' }}</button>
          </div>
        </div>
        <ArticleEditor :article="selected" :busy="busy" :categories="categoryOptions" @change="patch" @image="image" />
      </section>
      <section v-else class="manager-welcome">
        <span class="welcome-mark" aria-hidden="true">#</span>
        <h2>写好的文章，从这里发布。</h2>
        <p>导入 MarkText 写好的 Markdown，<br />检查图片和排版，再把它分享出去。</p>
        <p class="small-note">也可以从左侧选择已有文章继续编辑。<br />导入的内容先保存为草稿，不会直接公开。</p>
      </section>
    </div>
    <dialog ref="deleteDialog" class="delete-dialog">
      <h2>删除这篇文章？</h2><p>“{{ selected?.title }}”及其图片将被删除，无法从管理页恢复。</p>
      <div class="dialog-actions"><button type="button" class="button secondary" @click="deleteDialog?.close()">保留文章</button><button type="button" class="button primary" @click="remove">确认删除</button></div>
    </dialog>
  </div>
</template>
