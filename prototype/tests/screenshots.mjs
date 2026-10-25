import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// 默认覆盖仓库内的评审证据；设置 SCREENSHOT_DIR=/tmp 可只写临时目录。
const outputDir = process.env.SCREENSHOT_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
await mkdir(outputDir, { recursive: true })
const baseUrl = process.env.PROTOTYPE_URL || 'http://127.0.0.1:5180/'
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
const pause = () => page.waitForTimeout(250)
const nav = async (id) => {
  await page.locator(`[data-testid="${id}"]`).click()
  await pause()
}
const shot = async (name) => {
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true })
  console.log(`shot ${name}`)
}
const reset = async () => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
}
const dialog = () => page.locator('[role="dialog"]')

await reset()
await page.getByRole('button', { name: '查看权益并升级' }).click()
await pause()
await shot('13-membership-benefits')

await reset()
await nav('garan')
await shot('01-garan-list')
await shot('14-garan-overview')
await page.getByRole('button', { name: '批量贴标' }).click()
await pause()
await shot('02-bulk-picker')
await page.getByRole('checkbox', { name: /液压刹车套件/ }).check()
await dialog().getByLabel('保证期（年）').fill('4,5')
await dialog().getByLabel('品牌 / 商标').fill('Alpine')
await dialog().getByLabel('型号标识').fill('HB-900')
await shot('03-garan-dialog')
await page.getByRole('button', { name: '取消' }).click()
await pause()

await nav('notice')
await shot('04-legal-notice')
await nav('exclusions')
await shot('05-exclusions')
await nav('statement')
await shot('07-statement-gated')
await page.locator('nav select').selectOption('growth')
await pause()
await shot('06-statement-growth')

await nav('audit')
await shot('08-audit-clean')
await page.getByRole('tab', { name: 'GARAN 标签', exact: true }).click()
await pause()
await shot('15-history-tabs')
await page.getByRole('tab', { name: '全部', exact: true }).click()
await page.getByRole('button', { name: '模拟一处矛盾' }).click()
await pause()
await shot('09-audit-conflict')
await page.getByRole('button', { name: '导出快照（PDF）' }).click()
await pause()
await shot('10-export-blocked')

await reset()
await page.locator('nav select').selectOption('growth')
await pause()
await shot('11-home')
await page.setViewportSize({ width: 420, height: 1000 })
await pause()
await shot('12-mobile')

console.log('\n=== console errors ===')
console.log(errors.length ? errors.join('\n') : '(none)')
await browser.close()
if (errors.length) process.exitCode = 1
