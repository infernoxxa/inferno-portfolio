import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Optional QA helper. Use an existing Playwright installation; not a site dependency.
// Example: $env:PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
if (!process.env.PLAYWRIGHT_MODULE) throw new Error('Set PLAYWRIGHT_MODULE to an installed Playwright index.mjs')
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const base = process.env.QA_URL || 'http://127.0.0.1:4173'
const output = resolve(process.env.QA_OUTPUT || 'artifacts/browser')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER || 'chrome' })
const errors = []
const warnings = []
const results = []
const paths = ['/', '/projects/personal-ai', '/projects/cloud-sync', '/ai/', '/cloud/', '/resume', '/does-not-exist']
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    // Navigating to the intentionally missing page reports its expected HTTP 404.
    if (message.type() === 'error' && !(message.text().includes('404') && message.location().url.includes('/does-not-exist'))) errors.push(message.text())
    if (message.type() === 'warning') warnings.push(message.text())
  })
  page.on('requestfailed', request => errors.push(`Network: ${request.url()} ${request.failure()?.errorText}`))
  for (const width of [360, 390, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of paths) {
      const response = await page.goto(base + path, { waitUntil: 'networkidle' })
      assert.equal(response.status(), path === '/does-not-exist' ? 404 : 200, `${path}: HTTP status`)
      await page.locator('h1').waitFor()
      assert.equal(await page.locator('h1').count(), 1, `${width} ${path}: H1`)
      assert.equal(await page.locator('main').count(), 1, `${width} ${path}: main`)
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
      assert(dimensions.content <= dimensions.viewport, `${width} ${path}: horizontal overflow ${dimensions.content}`)
      if (path === '/does-not-exist') assert.match(await page.title(), /页面未找到/)
      if (path === '/' || (width === 390 || width === 1440) && path === '/projects/personal-ai') {
        await page.screenshot({ path: resolve(output, `${path === '/' ? 'home' : 'personal-ai'}-${width}.png`), fullPage: true })
        if (path === '/' && width === 1920) await page.screenshot({ path: resolve(output, 'home-desktop-viewport.png'), fullPage: false })
      }
      results.push({ width, path, overflow: false })
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base, { waitUntil: 'networkidle' })
  const menu = page.getByRole('button', { name: '展开导航' })
  await menu.click()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '能力', exact: true }).click()
  await page.waitForURL('**/#skills')
  assert.equal(await page.getByRole('button', { name: '展开导航' }).getAttribute('aria-expanded'), 'false')
  assert(await page.locator('#skills').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 180), 'skill anchor scroll')
  await page.getByRole('button', { name: '展开导航' }).click()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('button', { name: '展开导航' }).getAttribute('aria-expanded'), 'false')

  await page.goto(base, { waitUntil: 'networkidle' })
  const cloudTab = page.getByRole('button', { name: /02 CloudSync/ })
  await cloudTab.click()
  assert.equal(await cloudTab.getAttribute('aria-pressed'), 'true')
  assert.match(await page.locator('.hero-engineering').innerText(), /Reliable Transfer/)
  await page.getByRole('button', { name: /01 PersonalAI/ }).click()
  assert.match(await page.locator('.hero-engineering').innerText(), /Agent Runtime/)
  await page.getByRole('link', { name: '探索技术细节' }).first().click()
  await page.waitForURL(/\/projects\/personal-ai\/?$/)
  assert.match(await page.title(), /PersonalAI/)
  await page.getByRole('link', { name: '演示开放进度' }).click()
  await page.waitForURL('**/ai/')
  assert.match(await page.locator('h1').innerText(), /PersonalAI/)
  await page.getByRole('link', { name: '查看项目技术介绍' }).click()
  await page.waitForURL(/\/projects\/personal-ai\/?$/)
  await page.getByRole('link', { name: /NEXT PROJECT/ }).click()
  await page.waitForURL(/\/projects\/cloud-sync\/?$/)
  assert.match(await page.title(), /CloudSync/)
  await page.goBack()
  await page.waitForURL(/\/projects\/personal-ai\/?$/)
  await page.reload({ waitUntil: 'networkidle' })
  assert.match(await page.locator('h1').innerText(), /PersonalAI/)

  await page.goto(base + '/resume', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '跳到正文')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main')
  assert.equal(await page.locator('a[download]').count(), 0, 'no unreviewed PDF')

  // The prerendered route must remain readable with JavaScript disabled.
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const plain = await noJs.newPage()
  await plain.goto(base + '/projects/cloud-sync')
  assert.match(await plain.locator('h1').innerText(), /CloudSync/)
  assert.match(await plain.locator('body').innerText(), /baseVersionId/)
  await noJs.close()

  assert.equal(errors.length, 0, `Browser errors: ${errors.join('\n')}`)
  assert.equal(warnings.length, 0, `Browser warnings: ${warnings.join('\n')}`)
  const report = { checks: results.length, results, interactions: ['mobile navigation', 'Escape closes menu', 'anchor scrolling', 'engineering diagram switch', 'project details', 'demo placeholder', 'next project', 'browser back', 'deep-link refresh', 'skip link', 'no unreviewed PDF', 'no-JS content'], errors, warnings }
  await writeFile(resolve(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(`PASS ${results.length} page/viewport combinations, ${report.interactions.length} interaction checks, zero console errors or warnings`)
  console.log(`Screenshots and report: ${output}`)
} finally {
  await browser.close()
}
