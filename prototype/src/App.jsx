import React, { useState, useMemo, useCallback } from 'react'
import { Frame } from '@shopify/polaris'
import { products as seedProducts } from './mock/products.js'
import { exclusions as seedExclusions, } from './mock/rules.js'
import { shop as seedShop, noticePlacements as seedPlacements, noticeAppearance as seedAppearance, garanDisplaySettings as seedGaranDisplay, statementConfig as seedStatement } from './mock/store.js'
import { deriveGaranState, GaranState, checkExcluded } from './domain/garan.js'

import Home from './pages/Home.jsx'
import LegalNotice from './pages/LegalNotice.jsx'
import GaranLabels from './pages/GaranLabels.jsx'
import Exclusions from './pages/Exclusions.jsx'
import Statement from './pages/Statement.jsx'
import Audit from './pages/Audit.jsx'
import Settings from './pages/Settings.jsx'

const NAV = [
  { id: 'home', label: '首页' },
  { id: 'notice', label: '法律保证告知' },
  { id: 'garan', label: 'GARAN 标签' },
  { id: 'exclusions', label: '排除规则' },
  { id: 'statement', label: '商业保证声明', planGate: 'growth' },
  { id: 'audit', label: '审计' },
  { id: 'settings', label: '设置' },
]

export default function App() {
  const [page, setPage] = useState('home')
  const [products, setProducts] = useState(seedProducts)
  const [rules, setRules] = useState(seedExclusions)
  const [shop, setShop] = useState(seedShop)
  // v2 修复：notice / statement 提升为应用级状态，否则 Home 与各自页面会互相脱节
  const [placements, setPlacements] = useState(seedPlacements)
  const [appearance, setAppearance] = useState(seedAppearance)
  const [garanDisplay, setGaranDisplay] = useState(seedGaranDisplay)
  const [statement, setStatement] = useState(seedStatement)
  const [auditEvents, setAuditEvents] = useState([
    {
      id: 'a1',
      at: '2026-10-22 09:14',
      actor: 'anna@nordwind-supply.example',
      kind: 'GARAN_SAVED',
      productId: 'p1',
      productTitle: '经典滑雪板：Hydrogen',
      detail: '已贴标 · 3 年 · Nordwind / NWT-240',
    },
    {
      id: 'a2',
      at: '2026-10-22 09:22',
      actor: 'anna@nordwind-supply.example',
      kind: 'GARAN_REJECTED',
      productId: 'p7',
      productTitle: '批发托盘 — 24 件',
      detail: '被拒：商品已被排除（B2B 标签 "wholesale"）',
    },
    {
      id: 'a3',
      at: '2026-10-22 10:05',
      actor: 'anna@nordwind-supply.example',
      kind: 'NOTICE_ENABLED',
      productId: null,
      productTitle: null,
      detail: '开启全站页脚告知',
    },
  ])

  const pushAudit = useCallback((evt) => {
    setAuditEvents((prev) => [
      {
        id: `a${prev.length + 1}`,
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actor: 'anna@nordwind-supply.example',
        ...evt,
      },      ...prev,
    ])
  }, [])

  // v2 修复：把商品加入排除时，必须同时删除标签（一条审计记两个事实），
  // 否则会产生我们自己定义为"禁止"的中间态：被排除却有标签。
  const excludeProduct = useCallback(
    (id, reason) => {
      setRules((r) =>
        r.manual.includes(id) ? r : { ...r, manual: [...r.manual, id] }
      )
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, yearsHalfUnits: null, brand: null, model: null } : p
        )
      )
      const p = products.find((x) => x.id === id)
      pushAudit({
        kind: 'EXCLUSION_ADDED',
        productId: id,
        productTitle: p ? p.title : null,
        detail: p && p.yearsHalfUnits != null
          ? `商品被排除（${reason}）——同一次操作中已删除其 GARAN 标签`
          : `商品被排除（${reason}）`,
      })
    },
    [products, pushAudit]
  )

  const unexcludeProduct = useCallback(
    (id) => {
      setRules((r) => ({ ...r, manual: r.manual.filter((x) => x !== id) }))
      const p = products.find((x) => x.id === id)
      pushAudit({
        kind: 'EXCLUSION_REMOVED',
        productId: id,
        productTitle: p ? p.title : null,
        detail: '手动排除已移除 —— 商品回到未审阅状态',
      })
    },
    [products, pushAudit]
  )

  const counts = useMemo(() => {
    const c = {
      [GaranState.LABELLED]: 0,
      [GaranState.ELIGIBLE_UNLABELLED]: 0,
      [GaranState.NOT_ELIGIBLE]: 0,
      [GaranState.NOT_REVIEWED]: 0,
      [GaranState.EXCLUDED]: 0,
    }
    for (const p of products) {
      c[deriveGaranState(p, rules).state] += 1
    }
    return c
  }, [products, rules])

  const changePlan = useCallback((plan) => {
    const labels = { free: 'Free', growth: 'Growth', pro: 'Pro' }
    setShop((current) => ({ ...current, plan }))
    pushAudit({
      kind: 'PLAN_CHANGED',
      productId: null,
      productTitle: null,
      detail: `已切换至 ${labels[plan]} 套餐（原型演示，未产生费用）`,
    })
  }, [pushAudit])

  const excludedWithLabel = useMemo(
    () =>
      products.filter((p) => {
        const ex = checkExcluded(p, rules)
        const hasLabel = p.yearsHalfUnits != null && (p.brand || '').trim() !== ''
        return ex.excluded && hasLabel
      }),
    [products, rules]
  )

  const ctx = {
    shop,
    setShop,
    products,
    setProducts,
    rules,
    setRules,
    auditEvents,
    pushAudit,
    counts,
    excludedWithLabel,
    go: setPage,
    placements,
    setPlacements,
    appearance,
    setAppearance,
    garanDisplay,
    setGaranDisplay,
    changePlan,
    statement,
    setStatement,
    excludeProduct,
    unexcludeProduct,
    // 演示用：注入竞品那类矛盾（被排除却有标签），用来验证 B0-6 一致性校验
    injectConflict: () => {
      setProducts((prev) =>
        prev.map((p) =>
          ['p5', 'p7'].includes(p.id)
            ? { ...p, yearsHalfUnits: 5, brand: 'Nordwind', model: 'BUG-001' }
            : p
        )
      )
      pushAudit({
        kind: 'GARAN_SAVED',
        productId: 'p5',
        productTitle: '礼品卡',
        detail: '演示：直接向被排除商品写入标签（模拟竞品的缺陷）',
      })
    },
  }

  const showStatementGate = shop.plan === 'free'

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="nav-brand">
          EU 保证
          <br />
          <span style={{ fontWeight: 400, color: '#6d7175' }}>与耐久性标签</span>
        </div>
        {NAV.map((item) => {
          const locked = item.id === 'statement' && showStatementGate
          return (
            <button
              key={item.id}
              data-testid={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
              {locked && (
                <span className="nav-item-lock" title="需要 Growth 套餐">
                  <LockSmall />
                </span>
              )}
            </button>
          )
        })}
        <div className="nav-section">套餐</div>
        <div style={{ padding: '0 12px 8px', fontSize: 12, color: '#6d7175' }}>
          {shop.plan === 'free' ? 'Free' : shop.plan === 'growth' ? 'Growth · $4.99/月' : 'Pro · $9.99/月'}
        </div>
        <div style={{ padding: '0 12px' }}>
          <select
            value={shop.plan}
            onChange={(e) => setShop({ ...shop, plan: e.target.value })}
            style={{ width: '100%', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid #c9cccf' }}
          >
            <option value="free">Free（演示）</option>
            <option value="growth">Growth $4.99</option>
            <option value="pro">Pro $9.99</option>
          </select>
          <div style={{ fontSize: 11, color: '#8c9196', marginTop: 6, lineHeight: 1.4 }}>
            仅原型 —— 切换套餐可查看付费墙。
          </div>
        </div>
      </nav>

      <main className="app-main">
        <Frame>
          {page === 'home' && <Home ctx={ctx} />}
          {page === 'notice' && <LegalNotice ctx={ctx} />}
          {page === 'garan' && <GaranLabels ctx={ctx} />}
          {page === 'exclusions' && <Exclusions ctx={ctx} />}
          {page === 'statement' && <Statement ctx={ctx} />}
          {page === 'audit' && <Audit ctx={ctx} />}
          {page === 'settings' && <Settings ctx={ctx} />}
        </Frame>
      </main>
    </div>
  )
}

function LockSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="#8c9196" aria-hidden="true">
      <path d="M6 8V6a4 4 0 118 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1h1zm2 0h4V6a2 2 0 10-4 0v2z" />
    </svg>
  )
}
