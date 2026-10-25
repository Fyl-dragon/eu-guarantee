import { chromium } from 'playwright'
import { parseYears, validateGaran, validateSnapshotConsistency } from '../src/domain/garan.js'
import { products } from '../src/mock/products.js'
import { exclusions } from '../src/mock/rules.js'

const results = []
const ok = (n, c, extra='') => results.push(`${c?'PASS':'FAIL'}  ${n}${extra?'  ['+extra+']':''}`)

// 纯函数边界：与页面共用同一解析、写入和导出校验。
for (const raw of ['2.5', '2,5']) {
  const parsed = parseYears(raw)
  ok(`T3b ${raw} 归一化为 5 个半年单位`, parsed.ok && parsed.halfUnits === 5)
}
for (const raw of ['2', '2.1', '4,1', '3.0', 'abc', '']) {
  ok(`T3 拒绝非法年份 ${JSON.stringify(raw)}`, !parseYears(raw).ok)
}
ok('初始快照不被空标签字段误判', validateSnapshotConsistency(products, exclusions).ok)
const validProduct = products.find((p) => p.id === 'p10')
const validDraft = { guaranteeFreeOfCharge: true, coverage: 'whole', years: '4,5', brand: 'Alpine', model: 'HB-900' }
const savedProduct = { ...validProduct, ...validDraft, yearsHalfUnits: 9 }
ok('合法重试后不被历史拒绝事件拦截', validateSnapshotConsistency([savedProduct], exclusions).ok)
for (const [name, patch] of [
  ['非法年份', { yearsHalfUnits: 2 }],
  ['缺品牌', { brand: '' }],
  ['缺型号', { model: '' }],
]) {
  const candidate = { ...savedProduct, ...patch }
  const check = validateSnapshotConsistency([candidate], exclusions)
  ok(`导出拦截${name}`, !check.ok && check.conflicts[0]?.typeCode === 'invalid_label')
}
ok('合法重试保存半年单位整数', validateGaran(validProduct, validDraft, exclusions).yearsHalfUnits === 9)
ok('写入入口拒绝非法年份', !validateGaran(validProduct, { ...validDraft, years: '1' }, exclusions).ok)

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } })
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: '+e.message))
await page.goto(process.env.PROTOTYPE_URL || 'http://127.0.0.1:5180/', { waitUntil: 'networkidle' })

// ---- T5b: 批量选择器不含礼品卡 ----
await page.locator('[data-testid="garan"]').click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: '未审阅 3' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '批量贴标' }).click()
await page.waitForTimeout(600)
const modalText = await page.locator('[role="dialog"]').innerText()
ok('T5b 批量选择器不列 礼品卡', !modalText.includes('礼品卡 · '))
ok('T5b 不列 数字下载', !modalText.includes('数字下载'))
ok('T5b 不列 批发托盘', !modalText.includes('批发托盘'))
ok('T4 不列 仅表框（部分部件不合格）', !modalText.includes('仅表框'))
ok('提示不可选总数 5（4 排除 + 1 不合格）', /5 个商品无法选择/.test(modalText) && /已排除 4 个/.test(modalText) && /不符合条件 1 个/.test(modalText), '4+1')
await page.screenshot({ path: '/tmp/p-bulk.png' })

// 选一个商品，故意填非法年份看整批拒绝
await page.getByRole('checkbox', { name: /液压刹车套件/ }).check()
await page.waitForTimeout(200)
const yearInput = page.locator('[role="dialog"] input').nth(0)
await page.locator('[role="dialog"]').getByLabel('保证期（年）').fill('2')
await page.getByRole('button', { name: /应用到 1 个商品/ }).click()
await page.waitForTimeout(600)
const afterText = await page.locator('[role="dialog"]').innerText()
ok('T5d 批量非法年份 → 整批拒绝', afterText.includes('未保存任何内容'))
ok('T5d 列出具体原因', afterText.includes('必须长于 2 年'))

// 修正后应成功
await page.locator('[role="dialog"]').getByLabel('保证期（年）').fill('4,5')
await page.locator('[role="dialog"]').getByLabel('品牌 / 商标').fill('Alpine')
await page.locator('[role="dialog"]').getByLabel('型号标识').fill('HB-900')
await page.waitForTimeout(300)
await page.getByRole('button', { name: /应用到 1 个商品/ }).click()
await page.waitForTimeout(700)
await page.getByRole('tab', { name: /^已贴标/ }).click()
await page.waitForTimeout(200)
const listText = await page.locator('#AppFrameMain').first().innerText()
ok('批量保存后自动切到已贴标列表', await page.getByRole('tab', { name: /^已贴标/ }).getAttribute('aria-selected') === 'true')
ok('批量保存后 液压刹车套件 变 已贴标', /液压刹车套件[\s\S]{0,300}4,5/.test(listText))

// ---- T4: 单个弹窗 partial 覆盖 → 不可保存 ----
await page.getByRole('button', { name: '编辑' }).first().click()
await page.waitForTimeout(600)
const d1 = await page.locator('[role="dialog"]').innerText()
ok('弹窗含 步骤1/步骤2', d1.includes('步骤 1') && d1.includes('步骤 2'))
ok('含官方几何预览', d1.includes('非官方渲染示意'))
await page.screenshot({ path: '/tmp/p-dialog.png' })

// 改成 partial → 保存按钮禁用
await page.locator('label[for="cov-partial"]').click()
await page.waitForTimeout(400)
const saveBtn = page.getByRole('button', { name: '保存标签' })
ok('T4 partial 覆盖 → 保存禁用', await saveBtn.isDisabled())
ok('T4 显示原因', (await page.locator('[role="dialog"]').innerText()).includes('覆盖整机'))
await page.getByRole('button', { name: '取消' }).click()
await page.waitForTimeout(300)

// ---- Audit 一致性 ----
await page.locator('[data-testid="audit"]').click()
await page.waitForTimeout(600)
const auditText = await page.locator('#AppFrameMain').first().innerText()
ok('Audit 有一致性校验', auditText.includes('一致性校验'))
ok('Audit 有变更历史', auditText.includes('变更历史'))
ok('Audit 记录被拒尝试', auditText.includes('写入被拒'))
ok('合法重试后 Audit 允许导出', auditText.includes('全部一致') && !auditText.includes('导出已阻止'))
await page.screenshot({ path: '/tmp/p-audit.png' })

// ---- Statement 付费墙 ----
await page.locator('[data-testid="statement"]').click()
await page.waitForTimeout(600)
const stText = await page.locator('#AppFrameMain').first().innerText()
ok('Free 档声明被锁', stText.includes('开始 Growth 7 天试用') || stText.includes('Growth'))
await page.screenshot({ path: '/tmp/p-statement-gate.png' })

console.log(results.join('\n'))
console.log('\n=== page errors ===')
console.log(errs.length ? errs.join('\n') : '(none)')
console.log(`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} passed`)
await browser.close()
if (results.some((r) => r.startsWith('FAIL')) || errs.length) process.exitCode = 1
