import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`)
})

const results = []
const ok = (name, condition, extra = '') =>
  results.push(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  [${extra}]` : ''}`)
const pause = () => page.waitForTimeout(180)
const panelText = () => page.locator('#garan-product-panel').innerText()

await page.goto(process.env.PROTOTYPE_URL || 'http://127.0.0.1:5180/', { waitUntil: 'networkidle' })

// ---------- 首页会员入口、权益与演示开通 ----------
const main = page.locator('#AppFrameMain')
ok('首页展示会员升级入口', await page.getByRole('heading', { name: '升级会员，交付完整保证声明' }).isVisible())
ok('默认展示三项会员核心价值', (await page.locator('.membership-highlight').count()) === 3)
await page.getByRole('button', { name: '查看权益并升级' }).click()
await pause()
ok('展开 Growth / Pro 权益', await page.locator('.membership-plan').count() === 2)
const benefits = await page.locator('#membership-benefits').innerText()
ok('权益包含声明、数据同源与交付', benefits.includes('C1–C5') && benefits.includes('共享数据') && benefits.includes('可打印声明'))
ok('权益包含批量与导出能力', benefits.includes('批量 CSV') && benefits.includes('审计记录 CSV / PDF 导出'))
await page.screenshot({ path: 'screenshots/13-membership-benefits.png', fullPage: true })
await page.getByRole('button', { name: '开通 Growth', exact: true }).click()
await pause()
ok('开通后显示 Growth 当前套餐', await page.getByRole('heading', { name: 'Growth 会员已开通' }).isVisible())
ok('当前套餐按钮不可重复开通', await page.locator('.membership-plan.current').getByRole('button', { name: '当前套餐' }).isDisabled())
ok('侧栏套餐同步更新', (await page.locator('nav select').inputValue()) === 'growth')
await page.locator('nav select').selectOption('free')
await pause()

// ---------- GARAN 统计、四个状态 Tab ----------
await page.locator('[data-testid="garan"]').click()
await pause()
ok('GARAN 展示标签统计总览', await page.getByRole('heading', { name: '标签统计总览' }).isVisible())
ok('展示标签管理范围与已排除数量', (await main.innerText()).includes('共 17 个商品，其中 13 个进入标签管理') && (await main.innerText()).includes('4 个已排除'))
const expectedTabs = ['已贴标 8', '符合条件，未贴标 1', '不符合条件 1', '未审阅 3']
for (const name of expectedTabs) {
  const tab = page.getByRole('tab', { name, exact: true })
  ok(`状态 Tab：${name}`, await tab.count() === 1)
  await tab.click()
  await pause()
  ok(`${name} 明确选中`, (await tab.getAttribute('aria-selected')) === 'true')
}
await page.getByRole('tab', { name: '已贴标 8', exact: true }).click()
await pause()
ok('已贴标列表展示 8 行', (await page.locator('#garan-product-panel tbody tr').count()) === 8)
ok('默认不展示其他状态商品', !(await panelText()).includes('已归档滑雪板') && !(await panelText()).includes('仅表框'))
await page.screenshot({ path: '/tmp/prototype-garan-labelled.png', fullPage: true })

await page.getByRole('tab', { name: '符合条件，未贴标 1', exact: true }).click()
await pause()
ok('符合条件未贴标仅展示归档滑雪板', (await panelText()).includes('已归档滑雪板') && (await page.locator('#garan-product-panel tbody tr').count()) === 1)
await page.getByRole('tab', { name: '不符合条件 1', exact: true }).click()
await pause()
ok('不符合条件仅展示部分覆盖商品', (await panelText()).includes('仅表框') && (await page.locator('#garan-product-panel tbody tr').count()) === 1)
await page.getByRole('tab', { name: '未审阅 3', exact: true }).click()
await pause()
ok('未审阅列表展示 3 行', (await page.locator('#garan-product-panel tbody tr').count()) === 3)

// ---------- 开关 ----------
const displaySwitch = page.getByRole('switch', { name: '添加标签后立即在商品和购物车页面展示' })
ok('展示开关默认开启', (await displaySwitch.getAttribute('aria-checked')) === 'true')
await displaySwitch.click()
await pause()
ok('开关可关闭且文案同步', (await displaySwitch.getAttribute('aria-checked')) === 'false' && (await main.innerText()).includes('已有标签不受此开关影响'))
await displaySwitch.click()
await pause()
ok('开关可重新开启', (await displaySwitch.getAttribute('aria-checked')) === 'true' && (await main.innerText()).includes('保存新标签后，商品页与购物车会立即向买家展示'))

// ---------- 搜索与排序 ----------
await page.getByRole('tab', { name: '已贴标 8', exact: true }).click()
const search = page.getByRole('textbox', { name: '搜索商品' })
await search.fill('Nordwind')
await pause()
ok('可按品牌或供应商搜索并命中 4 个商品', (await page.locator('#garan-product-panel tbody tr').count()) === 4, `${await page.locator('#garan-product-panel tbody tr').count()} rows`)
await search.fill('不存在的商品')
await pause()
ok('无结果时展示空状态', await page.getByRole('heading', { name: '没有找到匹配的商品' }).isVisible())
await page.getByRole('button', { name: '清除搜索', exact: true }).last().click()
await pause()
ok('清除搜索恢复当前状态列表', (await page.locator('#garan-product-panel tbody tr').count()) === 8)

const sort = page.getByRole('combobox', { name: '商品排序' })
await sort.selectOption('years-desc')
await pause()
const descYears = await page.locator('#garan-product-panel tbody tr td:nth-child(3)').allTextContents()
ok('保证期从高到低排序', descYears.slice(0, 3).join(',') === '5,5,4,5', descYears.join(','))
await sort.selectOption('years-asc')
await pause()
const ascYears = await page.locator('#garan-product-panel tbody tr td:nth-child(3)').allTextContents()
ok('保证期从低到高排序', ascYears[0] === '2,5', ascYears.join(','))
await sort.selectOption('title-asc')
await pause()
const titles = await page.locator('#garan-product-panel tbody tr td:nth-child(1)').allTextContents()
const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b, 'zh-CN'))
ok('商品名称排序生效', titles.join('|') === sortedTitles.join('|'))

// 统计卡片与 Tab 使用同一筛选状态，键盘可以切换。
await page.getByRole('button', { name: '未审阅 3 个商品，点击筛选', exact: true }).click()
await pause()
ok('统计卡片可切换商品列表', (await page.locator('#garan-product-panel tbody tr').count()) === 3)
await page.getByRole('tab', { name: '未审阅 3', exact: true }).focus()
await page.keyboard.press('ArrowRight')
await pause()
ok('Tab 支持方向键切换', (await page.getByRole('tab', { name: '已贴标 8', exact: true }).getAttribute('aria-selected')) === 'true')

// 桌面与窄屏布局留档。
await page.getByRole('tab', { name: '已贴标 8', exact: true }).click()
await sort.selectOption('default')
await page.screenshot({ path: 'screenshots/14-garan-overview.png', fullPage: true })
await page.setViewportSize({ width: 820, height: 1180 })
await pause()
await page.screenshot({ path: '/tmp/prototype-garan-final-narrow.png', fullPage: true })
ok('窄屏无页面级横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))

console.log(results.join('\n'))
console.log('\n=== runtime errors ===')
console.log(errors.length ? errors.join('\n') : '(none)')
console.log(`\n${results.filter((result) => result.startsWith('PASS')).length}/${results.length} passed`)
await browser.close()
if (results.some((result) => result.startsWith('FAIL')) || errors.length) process.exitCode = 1
