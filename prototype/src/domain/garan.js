// ============================================================
// domain/garan.js — 整个原型的唯一真相
// ============================================================
// 设计约束（对应 UX-FLOWS.md §1 P1/P2/P3）：
//   1. 三个函数是纯函数，不依赖 React → 可直接搬到服务端复用
//   2. 单条 / 批量 / CSV 三个入口都必须只调用这三个函数
//   3. 不允许在组件里出现第二套 if 判断
// ============================================================
// 汉化约定：对外的 kind / code 是稳定英文枚举（供逻辑判断，永不显示）；
// reason / why / text 是中文显示文本（永不参与逻辑判断）。
// ============================================================

export const GaranState = {
  EXCLUDED: 'EXCLUDED',
  NOT_REVIEWED: 'NOT_REVIEWED',
  // v2 新增：已审但结论是不合格（付费保证 / 仅部分部件）。
  // UX-FLOWS §5.7 明确要求区分"还没看"与"看了不合格"——Pandectes 混成一个
  // `Not required` 是它的缺陷，我们不应重犯。
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  ELIGIBLE_UNLABELLED: 'ELIGIBLE_UNLABELLED',
  LABELLED: 'LABELLED',
}

// ---------- 1. 排除判定（单一真相，notice 与 GARAN 共用） ----------
// 返回 { excluded: bool, kind: string|null, reason: string|null }
export const ExclusionKind = {
  GIFT_CARD: 'gift_card',
  DIGITAL: 'digital',
  B2B_TAG: 'b2b_tag',
  CUSTOM_TAG: 'custom_tag',
  MANUAL: 'manual',
}

export function checkExcluded(product, rules) {
  if (rules.giftCard && product.isGiftCard) {
    return { excluded: true, kind: ExclusionKind.GIFT_CARD, reason: '礼品卡' }
  }
  if (rules.digital && !product.requiresShipping) {
    return { excluded: true, kind: ExclusionKind.DIGITAL, reason: '数字商品' }
  }
  if (rules.b2b) {
    const hit = product.tags.find((t) => rules.b2bTags.includes(t))
    if (hit)
      return { excluded: true, kind: ExclusionKind.B2B_TAG, reason: `命中 B2B 标签 "${hit}"` }
  }
  if (rules.customTagsEnabled) {
    const hit = product.tags.find((t) => rules.customTags.includes(t))
    if (hit)
      return { excluded: true, kind: ExclusionKind.CUSTOM_TAG, reason: `命中排除标签 "${hit}"` }
  }
  if (rules.manual.includes(product.id)) {
    return { excluded: true, kind: ExclusionKind.MANUAL, reason: '手动排除' }
  }
  // 注意：coverage === 'partial' **不是排除**。
  // 仅覆盖部分部件的商品仍必须展示 notice（法规要求），只是不能用 GARAN 标签。
  // UX-FLOWS §5.3 把它列在排除规则表里，但 §5.2 的状态机把它归为"已审不合格"。
  // 两者冲突时以 §5.2 的状态机为准——否则 notice 会漏展示，是法务风险。
  return { excluded: false, kind: null, reason: null }
}

// ---------- 2. 年份格式（B0-4b） ----------
// 法规：> 2，且整数或整数+.5；渲染固定用逗号
// TECH-DESIGN §6.1 要求用「半年单位整数」而非 float，避免 IEEE754 误差进入比较。
//   '3' → 6（半年单位）  '2,5' / '2.5' → 5
export const YearErrorCode = {
  REQUIRED: 'required',
  NUMBERS_ONLY: 'numbers_only',
  DOT_ZERO: 'dot_zero',
  INVALID_STEP: 'invalid_step',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
}

export function parseYears(raw) {
  if (raw === null || raw === undefined)
    return { ok: false, code: YearErrorCode.REQUIRED, why: '必填' }
  const s = String(raw).trim().replace(',', '.')
  if (s === '') return { ok: false, code: YearErrorCode.REQUIRED, why: '必填' }
  if (!/^\d+(\.\d+)?$/.test(s))
    return { ok: false, code: YearErrorCode.NUMBERS_ONLY, why: '只能填数字' }
  // 拒绝 3.0 / 2.0 这类带 .0 的写法（法规要求整数或 .5）
  if (/\.0$/.test(s))
    return {
      ok: false,
      code: YearErrorCode.DOT_ZERO,
      why: '整年不带小数（不要写 3.0）',
    }

  const [intPart, fracPartRaw] = s.split('.')
  const fracPart = fracPartRaw === undefined ? '' : fracPartRaw
  if (fracPart !== '' && fracPart !== '5') {
    return {
      ok: false,
      code: YearErrorCode.INVALID_STEP,
      why: '只能整年或半年（如 2,5）',
    }
  }
  const halfUnits = parseInt(intPart, 10) * 2 + (fracPart === '5' ? 1 : 0)

  // 2.5 年 = 5 单位；99 年 = 198 单位
  if (halfUnits <= 4)
    return { ok: false, code: YearErrorCode.TOO_SHORT, why: '必须长于 2 年' }
  if (halfUnits > 198)
    return { ok: false, code: YearErrorCode.TOO_LONG, why: '最长 99 年' }

  return { ok: true, value: halfUnits / 2, halfUnits, code: null, why: null }
}

// 渲染用：halfUnits → '3' / '2,5'
export function renderHalfUnits(halfUnits) {
  if (halfUnits === null || halfUnits === undefined) return ''
  const whole = Math.floor(halfUnits / 2)
  return halfUnits % 2 === 0 ? String(whole) : `${whole},5`
}

// 渲染用：3 → '3'，2.5 → '2,5'
export function renderYears(n) {
  if (n === null || n === undefined) return ''
  return String(n).replace('.', ',')
}

// ---------- 3. 唯一校验入口 ----------
// 任何写入路径（单条 / 批量 / CSV）都必须走这里
// reasons 是 [{ code, text }]：code 稳定（供逻辑判断），text 中文（供显示）
export const ValidationCode = {
  EXCLUDED: 'excluded',
  NOT_FREE: 'not_free',
  NOT_WHOLE: 'not_whole',
  YEARS: 'years',
  BRAND_REQUIRED: 'brand_required',
  BRAND_TOO_LONG: 'brand_too_long',
  MODEL_REQUIRED: 'model_required',
  MODEL_TOO_LONG: 'model_too_long',
}

export function validateGaran(product, draft, rules) {
  const reasons = []
  const push = (code, text) => reasons.push({ code, text })

  // 资格：被排除的商品不允许写入（N-1 的数据层保障）
  const ex = checkExcluded(product, rules)
  if (ex.excluded) {
    push(ValidationCode.EXCLUDED, `该商品已被排除（${ex.reason}），请先移除排除。`)
  }

  // B0-1 免费
  if (draft.guaranteeFreeOfCharge !== true) {
    push(ValidationCode.NOT_FREE, '保证必须对消费者免费。')
  }

  // B0-2 整机
  if (draft.coverage !== 'whole') {
    push(ValidationCode.NOT_WHOLE, '使用 GARAN 标签时保证必须覆盖整机。')
  }

  // B0-3 / B9 年份
  const y = parseYears(draft.years)
  if (!y.ok) push(ValidationCode.YEARS, `保证期：${y.why}`)

  // B10 / B11 品牌与型号（上限见 TECH-DESIGN §3.4.2：
  // brand 60 字符、model 40 字符；超限拒绝而非截断）
  const brand = (draft.brand || '').trim()
  if (!brand) push(ValidationCode.BRAND_REQUIRED, '必填：品牌 / 商标。')
  if (brand.length > 60) push(ValidationCode.BRAND_TOO_LONG, '品牌 / 商标过长（最多 60）。')

  const model = (draft.model || '').trim()
  if (!model) push(ValidationCode.MODEL_REQUIRED, '必填：型号标识。')
  if (model.length > 40) push(ValidationCode.MODEL_TOO_LONG, '型号标识过长（最多 40）。')

  return { ok: reasons.length === 0, reasons, yearsHalfUnits: y.ok ? y.halfUnits : null }
}

// ---------- 3b. Step 1 是否通过（显式判定，不做字符串匹配） ----------
// UX-FLOWS §5.4：Step 2 在 Step 1 合法前整块不可编辑。
// 独立成函数，避免在组件里靠 reasons 文本推断状态（脆弱且易漂移）。
export function isStepOneValid(product, draft, rules) {
  const ex = checkExcluded(product, rules)
  if (ex.excluded) return false
  if (draft.guaranteeFreeOfCharge !== true) return false
  if (draft.coverage !== 'whole') return false
  return parseYears(draft.years).ok
}

// ---------- 4. 状态推导 ----------
// 状态由持久化事实推导，不由勾选框决定（P1）
export function deriveGaranState(product, rules) {
  const ex = checkExcluded(product, rules)
  if (ex.excluded) {
    return { state: GaranState.EXCLUDED, reason: ex.reason }
  }
  // 尚未审阅：guaranteeFreeOfCharge 未设置
  if (product.guaranteeFreeOfCharge === null || product.guaranteeFreeOfCharge === undefined) {
    return { state: GaranState.NOT_REVIEWED, reason: null }
  }
  // 已审但结论不合格（付费保证 / 仅部分部件）→ 独立状态，不与"未审"混淆
  if (product.guaranteeFreeOfCharge !== true || product.coverage !== 'whole') {
    return {
      state: GaranState.NOT_ELIGIBLE,
      reasonCode: product.coverage !== 'whole' ? 'partial_coverage' : 'not_free',
      reason:
        product.coverage !== 'whole'
          ? '保证仅覆盖部分部件'
          : '保证不是免费的',
    }
  }
  const complete =
    product.yearsHalfUnits !== null &&
    product.yearsHalfUnits !== undefined &&
    (product.brand || '').trim() !== '' &&
    (product.model || '').trim() !== ''
  if (!complete) {
    return { state: GaranState.ELIGIBLE_UNLABELLED, reason: null }
  }
  return { state: GaranState.LABELLED, reason: null }
}

// ---------- 5. 批量选择器用的商品池 ----------
// 这是 N-1 的核心：不能贴标签的商品「不出现」，不是「变灰」。
// 注意两类都要排除，但原因不同（P2 / T4）：
//   ① 被排除（EXCLUDED）—— 连 notice 都不展示
//   ② 已审不合格（NOT_ELIGIBLE，如仅部分部件覆盖）—— 仍展示 notice，但不能贴标签
export function selectableProducts(products, rules) {
  return products.filter((p) => {
    const st = deriveGaranState(p, rules).state
    return st !== GaranState.EXCLUDED && st !== GaranState.NOT_ELIGIBLE
  })
}

// 给 UI 用：为什么不能被选中（分两类计数，避免把两种原因混成一句）
export function unselectableBreakdown(products, rules) {
  let excluded = 0
  let notEligible = 0
  for (const p of products) {
    const st = deriveGaranState(p, rules).state
    if (st === GaranState.EXCLUDED) excluded += 1
    else if (st === GaranState.NOT_ELIGIBLE) notEligible += 1
  }
  return { excluded, notEligible, total: excluded + notEligible }
}

// ---------- 6. 批量原子性（T5d） ----------
// 任一不合法 → 整批拒绝，列出全部原因，无部分成功
export function validateBatch(entries, rules) {
  const failures = []
  for (const { product, draft } of entries) {
    const v = validateGaran(product, draft, rules)
    if (!v.ok) {
      failures.push({ productId: product.id, title: product.title, reasons: v.reasons })
    }
  }
  return { ok: failures.length === 0, failures }
}

// ---------- 7. 导出一致性校验（B0-6 / T5e） ----------
// 同一商品在 notice 排除 / GARAN 状态 / 审计三处必须一致
// 返回矛盾项；非空则阻止导出
export const ConflictTypeCode = {
  EXCLUDED_BUT_LABELLED: 'excluded_but_labelled',
  INVALID_LABEL: 'invalid_label',
}

// 只比较当前快照事实。历史拒绝是需要保留的审计事件，不是当前数据矛盾；
// 商家修正输入并成功重试后，不应再被旧拒绝事件阻止导出。
export function validateSnapshotConsistency(products, rules) {
  const conflicts = []
  for (const p of products) {
    const ex = checkExcluded(p, rules)
    const hasLabelData =
      (p.yearsHalfUnits !== null && p.yearsHalfUnits !== undefined) ||
      (p.brand || '').trim() !== '' ||
      (p.model || '').trim() !== ''
    const addConflict = (typeCode, type, detail) => {
      conflicts.push({ productId: p.id, title: p.title, typeCode, type, detail })
    }

    // 排除操作必须同时清空标签；即使只残留一个字段，也不能导出矛盾快照。
    if (ex.excluded && hasLabelData) {
      addConflict(
        ConflictTypeCode.EXCLUDED_BUT_LABELLED,
        '已排除却残留标签数据',
        `排除原因是"${ex.reason}"，但该商品仍保留 GARAN 标签字段。`
      )
    } else if (!ex.excluded && hasLabelData) {
      // 与所有写入入口复用同一校验，防止绕过 UI 写入非法或残缺的标签。
      const validation = validateGaran(
        p,
        { ...p, years: renderHalfUnits(p.yearsHalfUnits) },
        rules
      )
      if (!validation.ok) {
        addConflict(
          ConflictTypeCode.INVALID_LABEL,
          '标签数据不完整或不合法',
          validation.reasons.map((reason) => reason.text).join('；')
        )
      }
    }
  }
  return { ok: conflicts.length === 0, conflicts }
}
