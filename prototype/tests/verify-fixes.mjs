// 本次审计发现的问题的回归测试
// 对应 AUDIT-PROTOTYPE.md 的 F1–F7
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 } })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))

const results = []
const ok = (n, c, extra = '') =>
  results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${extra ? '  [' + extra + ']' : ''}`)

const M = () => page.locator('#AppFrameMain').first().innerText()
const nav = async (testid) => {
  await page.locator(`[data-testid="${testid}"]`).click()
  await page.waitForTimeout(500)
}

await page.goto(process.env.PROTOTYPE_URL || 'http://127.0.0.1:5180/', { waitUntil: 'networkidle' })

// ---------- F1: 手动排除必须连带删除标签 ----------
await nav('exclusions')
await page.getByRole('button', { name: '排除' }).first().click()
await page.waitForTimeout(700)
let t = await M()
// 该商品不应再出现在"可排除"列表里、也不应有已贴标徽章残留于排除区
await nav('audit')
t = await M()
ok('F1 排除后不再产生"被排除却有标签"矛盾', !/项矛盾/.test(t), t.match(/\d+ 项矛盾/)?.[0] || 'clean')

// ---------- F2: Home 与 法律保证告知 状态同步 ----------
await page.reload({ waitUntil: 'networkidle' })
await nav('notice')
await page.getByLabel('全站页脚横条').uncheck()
await page.waitForTimeout(400)
await nav('home')
t = await M()
ok('F2 关闭全站横条后 Home 不再显示生效中', !t.includes('生效中 · 4 个位置中的 4 个') && /未生效/.test(t))

// ---------- F3: 批量被拒写入审计（N-3） ----------
await nav('garan')
await page.getByRole('button', { name: '批量贴标' }).click()
await page.waitForTimeout(600)
await page.getByRole('checkbox', { name: /液压刹车套件/ }).check()
await page.locator('[role="dialog"]').getByLabel('保证期（年）').fill('2')
await page.getByRole('button', { name: /应用到 1 个商品/ }).click()
await page.waitForTimeout(700)
await page.getByRole('button', { name: '取消' }).click()
await page.waitForTimeout(400)
await nav('audit')
t = await M()
ok('F3 批量被拒写入审计', /写入被拒[\s\S]{0,160}液压/.test(t))

// ---------- F4: 区分"未审"与"不合格" ----------
await nav('garan')
t = await M()
ok('F4 出现独立的 不符合条件 状态', t.includes('不符合条件'))
ok('F4 未审与不合格分开计数', await page.getByRole('button', { name: '不符合条件 1 个商品，点击筛选', exact: true }).isVisible() && await page.getByRole('button', { name: '未审阅 3 个商品，点击筛选', exact: true }).isVisible())

// ---------- F5: model 上限 40 而非 60 ----------
await page.getByRole('button', { name: '编辑' }).first().click()
await page.waitForTimeout(600)
const modelInput = page.locator('[role="dialog"]').getByLabel('型号标识')
const maxAttr = await modelInput.getAttribute('maxlength')
ok('F5 model 输入上限为 40', maxAttr === '40', `maxlength=${maxAttr}`)
await modelInput.fill('X'.repeat(45))
const modelVal = await modelInput.inputValue()
ok('F5 输入被截断到 40（不会静默接受 45）', modelVal.length === 40, `len=${modelVal.length}`)
await page.getByRole('button', { name: '取消' }).click()
await page.waitForTimeout(300)

// ---------- F6: Statement 真实读取 GARAN 数据 + C5 渲染 ----------
await page.locator('nav select').selectOption('growth')
await page.waitForTimeout(400)
await nav('garan')
await page.getByRole('tab', { name: '未审阅 3' }).click()
await page.waitForTimeout(200)
await nav('statement')
t = await M()
ok('F6 声明显示"从 GARAN 推导"的商品', /从你的 GARAN 标签推导/.test(t))
ok('F6 买家预览包含 C5 条款', t.includes('条款与除外责任') && !/条款与除外责任\s*\n\s*—/.test(t))

// ---------- F7: Home 帮助链接 ----------
await nav('home')
t = await M()
ok('F7 Home 每行有 如何操作', (t.match(/如何操作/g) || []).length >= 4)
await page.getByRole('button', { name: '如何操作' }).first().click()
await page.waitForTimeout(500)
ok('F7 帮助弹窗可打开', /如何/.test(await page.locator('[role="dialog"]').innerText()))
await page.keyboard.press('Escape')

await page.screenshot({ path: '/tmp/p-v2-home.png', fullPage: true })
console.log(results.join('\n'))
console.log('\n=== page errors ===')
console.log(errs.length ? errs.join('\n') : '(none)')
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
await browser.close()
if (results.some((r) => r.startsWith('FAIL')) || errs.length) process.exitCode = 1
