import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

if (!process.env.PLAYWRIGHT_MODULE) throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright index.mjs')
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const base = process.env.QA_URL || 'http://127.0.0.1:4173'
const output = resolve(process.env.QA_OUTPUT || 'artifacts/browser')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER || 'chrome' })
const paths = ['/', '/blog', '/blog/agent-file-evidence', '/blog/upload-retry-and-versions', '/projects', '/projects/personal-ai', '/projects/cloud-sync', '/about', '/ai/', '/cloud/', '/resume', '/does-not-exist', '/blog/not-a-post']
const errors = []
const warnings = []
const results = []
const interactions = []
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    const expected404 = message.text().includes('404') && /does-not-exist|not-a-post/.test(message.location().url)
    if (message.type() === 'error' && !expected404) errors.push(message.text())
    if (message.type() === 'warning') warnings.push(message.text())
  })
  page.on('requestfailed', request => errors.push(`Network: ${request.url()} ${request.failure()?.errorText}`))
  for (const width of [360, 390, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of paths) {
      const response = await page.goto(base + path, { waitUntil: 'networkidle' })
      assert.equal(response.status(), /does-not-exist|not-a-post/.test(path) ? 404 : 200, `${width} ${path}: HTTP`)
      await page.locator('h1').waitFor()
      assert.equal(await page.locator('h1').count(), 1)
      assert.equal(await page.locator('main').count(), 1)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${path}: overflow`)
      if (path === '/' || [390, 1440].includes(width) && ['/blog/agent-file-evidence', '/projects/personal-ai', '/resume'].includes(path)) {
        const label = path === '/' ? 'home' : path.startsWith('/blog/') ? 'article' : path === '/resume' ? 'resume' : 'personal-ai'
        await page.screenshot({ path: resolve(output, `${label}-${width}.png`), fullPage: true })
        if (path === '/' && width === 1920) await page.screenshot({ path: resolve(output, 'home-desktop-viewport.png'), fullPage: false })
      }
      results.push({ width, path, overflow: false })
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '展开导航' }).click()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '文章', exact: true }).click()
  await page.waitForURL(/\/blog\/?$/)
  assert.equal(await page.getByRole('button', { name: '展开导航' }).getAttribute('aria-expanded'), 'false')
  assert.equal(await page.locator('#main-navigation a[href="/blog"]').getAttribute('aria-current'), 'page')
  interactions.push('mobile page navigation, active state and automatic menu close')
  await page.getByRole('button', { name: '展开导航' }).click()
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '展开导航')
  interactions.push('Escape closes menu and returns focus')

  await page.getByRole('navigation', { name: '文章分类' }).getByRole('link', { name: '后端工程' }).click()
  await page.waitForURL('**/blog?topic=backend')
  assert.equal(await page.locator('.post-preview').count(), 1)
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('.post-preview').count(), 1)
  assert.match(await page.locator('.post-preview').innerText(), /重试、冲突和版本/)
  interactions.push('category query persists across refresh')
  await page.getByRole('navigation', { name: '文章分类' }).getByRole('link', { name: '全部文章' }).click()
  assert.equal(await page.locator('.post-preview').count(), 2)
  await page.locator('.post-preview h3 a').first().click()
  await page.waitForURL(/\/blog\/agent-file-evidence\/?$/)
  await page.getByRole('complementary', { name: '文章目录' }).getByRole('link', { name: '状态正确，还需要实际授权' }).click()
  assert(await page.locator('#permission').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 170), 'article anchor scroll')
  await page.getByRole('link', { name: '返回文章列表' }).click()
  await page.waitForURL(/\/blog\/?$/)
  await page.goBack()
  await page.waitForURL(/agent-file-evidence\/?#permission$/)
  interactions.push('article reading, table of contents and browser back')

  await page.goto(base + '/projects/', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'PersonalAI', exact: true }).click()
  await page.waitForURL(/\/projects\/personal-ai\/?$/)
  await page.getByRole('link', { name: '演示开放说明', exact: true }).click()
  await page.waitForURL('**/ai/')
  await page.getByRole('link', { name: '返回 PersonalAI 项目介绍' }).click()
  await page.waitForURL(/\/projects\/personal-ai\/?$/)
  await page.getByRole('link', { name: '另一个项目：CloudSync' }).click()
  await page.waitForURL(/\/projects\/cloud-sync\/?$/)
  await page.getByRole('link', { name: '返回项目列表' }).click()
  await page.waitForURL(/\/projects\/?$/)
  interactions.push('project list, details, demo, correct return and next project')

  for (const [hash, target] of [['#projects', '/projects'], ['#about', '/about'], ['#skills', '/about#skills'], ['#contact', '/resume#contact']]) {
    await page.goto(base + '/' + hash, { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    assert.equal(url.pathname.replace(/\/$/, '') + url.hash, target)
  }
  interactions.push('legacy home anchors redirect to the correct pages')

  await page.goto(base + '/resume/', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '跳到正文')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main')
  assert.equal(await page.locator('a[download]').count(), 0)
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printRequested = 'true' } })
  await page.getByRole('button', { name: '打印简历' }).click()
  assert.equal(await page.locator('html').getAttribute('data-print-requested'), 'true')
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.site-header').isVisible(), false)
  assert.equal(await page.locator('.resume-actions').isVisible(), false)
  assert(await page.locator('.resume-page').isVisible())
  await page.screenshot({ path: resolve(output, 'resume-print.png'), fullPage: true })
  await page.emulateMedia({ media: 'screen' })
  interactions.push('skip link, reviewed public resume and print mode')

  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const plain = await noJs.newPage()
  for (const path of ['/blog/agent-file-evidence', '/projects/cloud-sync', '/resume']) {
    const response = await plain.goto(base + path)
    assert.equal(response.status(), 200)
    assert.equal(await plain.locator('h1').count(), 1)
    assert((await plain.locator('main').innerText()).length > 500)
  }
  await noJs.close()
  interactions.push('articles, projects and resume readable without JavaScript')

  assert.equal(errors.length, 0, `Browser errors: ${errors.join('\n')}`)
  assert.equal(warnings.length, 0, `Browser warnings: ${warnings.join('\n')}`)
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ checks: results.length, results, interactions, errors, warnings }, null, 2))
  console.log(`PASS ${results.length} page/viewport combinations; ${interactions.length} user journeys; no console errors or warnings`)
  console.log(`Screenshots and report: ${output}`)
} finally { await browser.close() }
