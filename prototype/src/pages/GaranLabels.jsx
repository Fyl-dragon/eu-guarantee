import React, { useState, useMemo } from 'react'
import {
  Page,
  Card,
  IndexTable,
  Badge,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Modal,
  TextField,
  Checkbox,
  RadioButton,
  Banner,
  Divider,
  Box,
  Select,
  Toast,
  EmptyState,
  Icon,
  ProgressBar,
} from '@shopify/polaris'
import { SearchIcon, SortIcon } from '@shopify/polaris-icons'
import {
  GaranState,
  deriveGaranState,
  validateGaran,
  ValidationCode,
  renderYears,
  renderHalfUnits,
  parseYears,
  checkExcluded,
  selectableProducts,
  unselectableBreakdown,
  validateBatch,
  isStepOneValid,
} from '../domain/garan.js'
import GaranPreview from '../components/GaranPreview.jsx'

export default function GaranLabels({ ctx }) {
  const { products, setProducts, rules, counts, pushAudit, garanDisplay, setGaranDisplay, go } = ctx
  const [editing, setEditing] = useState(null)     // product object
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkResetKey, setBulkResetKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [statusFilter, setStatusFilter] = useState(GaranState.LABELLED)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default')

  const scopedRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('zh-CN')
    return products
      .map((p) => ({ product: p, ...deriveGaranState(p, rules) }))
      .filter((r) => {
        // EXCLUDED 不在 GARAN 列表显示（P2：入口不存在，而不是变灰）
        if (r.state === GaranState.EXCLUDED) return false
        if (r.state !== statusFilter) return false
        if (!normalizedQuery) return true
        return [r.product.title, r.product.vendor, r.product.brand, r.product.model]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery))
      })
  }, [products, rules, statusFilter, searchQuery])

  const rows = useMemo(() => {
    const sorted = [...scopedRows]
    const textCompare = (a, b, key) => String(a.product[key] || '').localeCompare(String(b.product[key] || ''), 'zh-CN')
    if (sortBy === 'title-asc') sorted.sort((a, b) => textCompare(a, b, 'title'))
    if (sortBy === 'title-desc') sorted.sort((a, b) => textCompare(b, a, 'title'))
    if (sortBy === 'vendor-asc') sorted.sort((a, b) => textCompare(a, b, 'vendor') || textCompare(a, b, 'title'))
    if (sortBy === 'years-desc') sorted.sort((a, b) => (b.product.yearsHalfUnits ?? -1) - (a.product.yearsHalfUnits ?? -1))
    if (sortBy === 'years-asc') sorted.sort((a, b) => (a.product.yearsHalfUnits ?? Infinity) - (b.product.yearsHalfUnits ?? Infinity))
    return sorted
  }, [scopedRows, sortBy])

  const hiddenExcluded = counts[GaranState.EXCLUDED]
  const listedCount = products.length - hiddenExcluded
  const labelled = counts[GaranState.LABELLED]
  const eligible = counts[GaranState.ELIGIBLE_UNLABELLED]
  const reviewed = labelled + eligible + (counts[GaranState.NOT_ELIGIBLE] || 0)
  const coverage = listedCount ? Math.round((labelled / listedCount) * 100) : 0
  const reviewProgress = listedCount ? Math.round((reviewed / listedCount) * 100) : 0
  const selectedLabel = STATUS_TABS.find((tab) => tab.state === statusFilter)?.label || '商品'

  function toggleStorefrontDisplay(enabled) {
    setGaranDisplay((current) => ({ ...current, showNewLabels: enabled }))
    pushAudit({
      kind: 'GARAN_DISPLAY_CHANGED',
      productId: null,
      productTitle: null,
      detail: `添加标签后立即在商品和购物车页面展示：${enabled ? '已开启' : '已关闭'}`,
    })
    setToast(enabled
      ? '已开启：添加标签后将在商品和购物车页面展示'
      : '已关闭：新增标签仅保存，不在店面展示；已有标签保持不变')
  }

  function saveLabel(product, draft) {
    const v = validateGaran(product, draft, rules)
    if (!v.ok) return v
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              guaranteeFreeOfCharge: draft.guaranteeFreeOfCharge,
              coverage: draft.coverage,
              yearsHalfUnits: v.yearsHalfUnits,
              brand: draft.brand.trim(),
              model: draft.model.trim(),
            }
          : p
      )
    )
    pushAudit({
      kind: 'GARAN_SAVED',
      productId: product.id,
      productTitle: product.title,
      detail: `已贴标 · ${renderHalfUnits(v.yearsHalfUnits)} 年 · ${draft.brand.trim()} / ${draft.model.trim()}`,
    })
    setToast(`已为「${product.title}」保存标签`)
    setStatusFilter(GaranState.LABELLED)
    setEditing(null)
    return { ok: true }
  }

  function removeLabel(product) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, yearsHalfUnits: null, brand: null, model: null }
          : p
      )
    )
    pushAudit({
      kind: 'GARAN_REMOVED',
      productId: product.id,
      productTitle: product.title,
      detail: '标签已移除',
    })
    setToast('标签已移除，已切换至符合条件但未贴标的商品')
    setStatusFilter(GaranState.ELIGIBLE_UNLABELLED)
  }

  function rejectAttempt(product, reasons) {
    pushAudit({
      kind: 'GARAN_REJECTED',
      productId: product.id,
      productTitle: product.title,
      detail: `被拒：${reasons.map((r) => r.text).join('；')}`,
    })
  }

  return (
    <>
      <Page
        title="GARAN 标签"
        subtitle="只有符合条件的商品才能贴标。被排除的商品不会出现在这里。"
        primaryAction={{ content: '批量贴标', onAction: () => setBulkOpen(true) }}
      >
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start" gap="300" wrap>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">标签统计总览</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {`共 ${products.length} 个商品，其中 ${listedCount} 个进入标签管理；点击统计卡片可筛选对应商品。`}
                  </Text>
                </BlockStack>
                <Button size="slim" variant="plain" onClick={() => go('exclusions')}>
                  {`${hiddenExcluded} 个已排除 · 查看规则`}
                </Button>
              </InlineStack>
              <div className="garan-stat-grid">
                <CoverageCard
                  label="标签覆盖率"
                  value={`${coverage}%`}
                  detail={`已贴标 ${labelled} / ${listedCount} 个商品 · 已审阅 ${reviewProgress}%`}
                  progress={coverage}
                />
                {STATUS_TABS.map((tab) => (
                  <StatCard
                    key={tab.state}
                    label={tab.label}
                    value={counts[tab.state] || 0}
                    detail={tab.description}
                    tone={tab.tone}
                    active={statusFilter === tab.state}
                    onClick={() => setStatusFilter(tab.state)}
                  />
                ))}
              </div>
            </BlockStack>
          </Card>

          <Card>
            <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingSm">添加标签后立即在商品和购物车页面展示</Text>
                  <Badge tone={garanDisplay.showNewLabels ? 'success' : undefined}>
                    {garanDisplay.showNewLabels ? '已开启' : '已关闭'}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm" id="garan-display-description">
                  {garanDisplay.showNewLabels
                    ? '保存新标签后，商品页与购物车会立即向买家展示。'
                    : '新标签仅保存，不在商品页与购物车展示；已有标签不受此开关影响。'}
                </Text>
              </BlockStack>
              <button
                type="button"
                role="switch"
                aria-checked={garanDisplay.showNewLabels}
                aria-label="添加标签后立即在商品和购物车页面展示"
                aria-describedby="garan-display-description"
                className={`display-switch ${garanDisplay.showNewLabels ? 'is-on' : ''}`}
                onClick={() => toggleStorefrontDisplay(!garanDisplay.showNewLabels)}
              >
                <span className="display-switch-track" aria-hidden="true">
                  <span className="display-switch-thumb" />
                </span>
                <span className="display-switch-text">{garanDisplay.showNewLabels ? '开' : '关'}</span>
              </button>
            </InlineStack>
          </Card>

          <Card padding="0">
            <div className="garan-list-controls">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" gap="300">
                  <Text as="h2" variant="headingMd">商品标签管理</Text>
                  <Text as="span" tone="subdued" variant="bodySm">选择状态，再搜索或排序</Text>
                </InlineStack>
                <div className="garan-status-tabs" role="tablist" aria-label="商品状态">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.state}
                      type="button"
                      role="tab"
                      id={`tab-${tab.state}`}
                      aria-selected={statusFilter === tab.state}
                      aria-controls="garan-product-panel"
                      tabIndex={statusFilter === tab.state ? 0 : -1}
                      className={`garan-status-tab ${statusFilter === tab.state ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter(tab.state)}
                      onKeyDown={(event) => handleTabKeyDown(event, tab.state, setStatusFilter)}
                    >
                      <span>{tab.label}</span>
                      <span className="garan-tab-count">{counts[tab.state] || 0}</span>
                    </button>
                  ))}
                </div>
                <div className="garan-table-tools">
                  <div className="garan-search-field">
                    <TextField
                      label="搜索商品"
                      labelHidden
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="搜索商品名称、供应商、品牌或型号"
                      prefix={<Icon source={SearchIcon} tone="subdued" />}
                      clearButton
                      onClearButtonClick={() => setSearchQuery('')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="garan-sort-field">
                    <Select
                      label="商品排序"
                      labelHidden
                      value={sortBy}
                      onChange={setSortBy}
                      prefix={<Icon source={SortIcon} tone="subdued" />}
                      options={[
                        { label: '默认排序', value: 'default' },
                        { label: '商品名称 A–Z', value: 'title-asc' },
                        { label: '商品名称 Z–A', value: 'title-desc' },
                        { label: '供应商名称', value: 'vendor-asc' },
                        { label: '保证期：从高到低', value: 'years-desc' },
                        { label: '保证期：从低到高', value: 'years-asc' },
                      ]}
                    />
                  </div>
                </div>
              </BlockStack>
            </div>
            <div
              role="tabpanel"
              id="garan-product-panel"
              aria-labelledby={`tab-${statusFilter}`}
              className="garan-table-panel"
            >
              <div className="garan-result-summary" aria-live="polite">
                <Text as="span" variant="bodySm" tone="subdued">
                  {`${selectedLabel} ${counts[statusFilter] || 0} 个商品${searchQuery ? ` · 找到 ${rows.length} 个匹配结果` : ''}`}
                </Text>
                {searchQuery && <Button variant="plain" size="slim" onClick={() => setSearchQuery('')}>清除搜索</Button>}
              </div>
              {rows.length > 0 ? (
                <IndexTable
                  resourceName={{ singular: '商品', plural: '商品' }}
                  itemCount={rows.length}
                  selectable={false}
                  headings={[
                    { title: '商品' },
                    { title: '供应商' },
                    { title: '年数' },
                    { title: '品牌' },
                    { title: '型号' },
                    { title: '状态' },
                    { title: '' },
                  ]}
                >
                  {rows.map((r, i) => (
                    <IndexTable.Row id={r.product.id} key={r.product.id} position={i}>
                      <IndexTable.Cell>
                        <div className="product-cell">
                          <ProductThumbnail product={r.product} />
                          <Text as="span" fontWeight="semibold" variant="bodySm">
                            {r.product.title}
                          </Text>
                        </div>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued" variant="bodySm">
                          {r.product.vendor}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <span className="mono">{renderHalfUnits(r.product.yearsHalfUnits) || '—'}</span>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <span className="mono">{r.product.brand || '—'}</span>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <span className="mono">{r.product.model || '—'}</span>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <StateBadge state={r.state} />
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack gap="200">
                          <Button
                            size="micro"
                            onClick={() => setEditing(r.product)}
                          >
                            {r.state === GaranState.LABELLED ? '编辑' : '审阅'}
                          </Button>
                          {r.state === GaranState.LABELLED && (
                            <Button size="micro" variant="plain" tone="critical" onClick={() => removeLabel(r.product)}>
                              移除
                            </Button>
                          )}
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              ) : (
                <div className="garan-empty-results">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="h3" variant="headingSm">没有找到匹配的商品</Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      {`当前为“${selectedLabel}”状态，请尝试其他关键词或切换状态。`}
                    </Text>
                    <Button onClick={() => setSearchQuery('')}>清除搜索</Button>
                  </BlockStack>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                为什么有些商品永远不能贴标签
              </Text>
              <Text as="p" tone="subdued" variant="bodySm">
                礼品卡、数字商品、仅限 B2B 的商品，以及保证仅覆盖部分部件的商品，都不能使用
                GARAN 标签。这些商品会在每一个入口被过滤掉 —— 上方列表、批量选择器和 CSV
                导入，而不是只显示一个警告。
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>

        {editing && (
          <GaranDialog
            product={editing}
            rules={rules}
            onClose={() => setEditing(null)}
            onSave={saveLabel}
            onReject={rejectAttempt}
          />
        )}

        {bulkOpen && (
          <BulkDialog
            key={bulkResetKey}
            ctx={ctx}
            onClose={() => setBulkOpen(false)}
            onDone={(msg) => {
              setBulkOpen(false)
              setStatusFilter(GaranState.LABELLED)
              setBulkResetKey((key) => key + 1)
              setToast(msg)
            }}
          />
        )}

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </>
  )
}

const STATUS_TABS = [
  { state: GaranState.LABELLED, label: '已贴标', tone: 'success', description: '标签信息已完整保存' },
  { state: GaranState.ELIGIBLE_UNLABELLED, label: '符合条件，未贴标', tone: 'warning', description: '已满足条件，等待添加标签' },
  { state: GaranState.NOT_ELIGIBLE, label: '不符合条件', tone: 'critical', description: '已审阅，不能使用标签' },
  { state: GaranState.NOT_REVIEWED, label: '未审阅', tone: 'neutral', description: '尚未确认商品保证信息' },
]

function CoverageCard({ label, value, detail, progress }) {
  return (
    <div className="garan-stat-card garan-coverage-card">
      <BlockStack gap="200">
        <Text as="span" variant="bodySm" tone="subdued">{label}</Text>
        <Text as="span" variant="headingXl">{value}</Text>
        <ProgressBar progress={progress} size="small" tone="success" />
        <Text as="span" variant="bodySm" tone="subdued">{detail}</Text>
      </BlockStack>
    </div>
  )
}

function StatCard({ label, value, detail, tone, active, onClick }) {
  return (
    <button
      type="button"
      className={`garan-stat-card garan-stat-button tone-${tone} ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} ${value} 个商品，点击筛选`}
    >
      <span className="garan-stat-label">{label}</span>
      <span className="garan-stat-value">{value}</span>
      <span className="garan-stat-detail">{detail}</span>
      <span className="garan-stat-action">{active ? '当前筛选' : '查看商品 →'}</span>
    </button>
  )
}

function handleTabKeyDown(event, currentState, onChange) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const current = STATUS_TABS.findIndex((tab) => tab.state === currentState)
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? STATUS_TABS.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + STATUS_TABS.length) % STATUS_TABS.length
  const nextState = STATUS_TABS[next].state
  onChange(nextState)
  requestAnimationFrame(() => document.getElementById(`tab-${nextState}`)?.focus())
}

function ProductThumbnail({ product }) {
  const tone = ['滑雪板', '安全装备', '鞋靴'].includes(product.type)
    ? 'ski'
    : ['零部件', '套装包'].includes(product.type)
      ? 'gear'
      : 'accessory'
  return <span className={`product-thumbnail tone-${tone}`} aria-hidden="true">{product.title.slice(0, 1)}</span>
}

function StateBadge({ state }) {
  if (state === GaranState.LABELLED) return <Badge tone="success">已贴标</Badge>
  if (state === GaranState.ELIGIBLE_UNLABELLED)
    return <Badge tone="attention">符合条件 · 未贴标</Badge>
  if (state === GaranState.NOT_ELIGIBLE) return <Badge tone="critical">不符合条件</Badge>
  return <Badge>未审阅</Badge>
}

// ---------------- 单个编辑弹窗 ----------------
function GaranDialog({ product, rules, onClose, onSave, onReject }) {
  const [draft, setDraft] = useState({
    guaranteeFreeOfCharge: product.guaranteeFreeOfCharge === true,
    coverage: product.coverage || 'whole',
    years: renderHalfUnits(product.yearsHalfUnits) || '',
    brand: product.brand || '',
    model: product.model || '',
  })
  const [touched, setTouched] = useState({})

  const result = validateGaran(product, draft, rules)
  const step1Ok = isStepOneValid(product, draft, rules)

  const excluded = checkExcluded(product, rules)

  function update(k, v) {
    setDraft((d) => ({ ...d, [k]: v }))
    setTouched((t) => ({ ...t, [k]: true }))
  }

  function handleSave() {
    if (!result.ok) {
      onReject(product, result.reasons)
      return
    }
    onSave(product, draft)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="添加 GARAN 标签"
      primaryAction={{ content: '保存标签', onAction: handleSave, disabled: !result.ok }}
      secondaryActions={[{ content: '取消', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <InlineStack gap="300" blockAlign="center">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: '#e3e3e3',
                flex: '0 0 40px',
              }}
            />
            <BlockStack gap="050">
              <Text as="span" fontWeight="semibold">
                {product.title}
              </Text>
              <Text as="span" tone="subdued" variant="bodySm">
                {product.vendor} · {product.type}
              </Text>
            </BlockStack>
          </InlineStack>

          {excluded.excluded && (
            <Banner tone="critical" title={`该商品已被排除（${excluded.reason}）`}>
              <p>
                被排除的商品不能带 GARAN 标签。请先修改排除设置。即使表单被直接提交，服务端也会拒绝这次写入。
              </p>
            </Banner>
          )}

          <Divider />

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              步骤 1 —— 该商品是否符合条件？
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              三个条件全部来自法规。只要有一个不成立，就不能使用标签。
            </Text>

            <Checkbox
              label="该保证对消费者免费"
              checked={draft.guaranteeFreeOfCharge}
              onChange={(v) => update('guaranteeFreeOfCharge', v)}
            />

            <BlockStack gap="100">
              <Text as="span" variant="bodySm" fontWeight="medium">
                覆盖范围
              </Text>
              <RadioButton
                label="整机"
                id="cov-whole"
                name="coverage"
                checked={draft.coverage === 'whole'}
                onChange={() => update('coverage', 'whole')}
              />
              <RadioButton
                label="仅部分部件"
                id="cov-partial"
                name="coverage"
                checked={draft.coverage === 'partial'}
                onChange={() => update('coverage', 'partial')}
                helpText="选择此项将完全取消 GARAN 选项 —— 法规不允许贴标。"
              />
            </BlockStack>

            <TextField
              label="保证期（年）"
              value={draft.years}
              onChange={(v) => update('years', v)}
              autoComplete="off"
              placeholder="3"
              helpText="必须长于 2 年。整年，或半年如 2,5、4,5。"
              error={
                touched.years && !validateGaran(product, { ...draft, brand: 'x', model: 'x' }, rules).ok
                  ? result.reasons.find((r) => r.code === ValidationCode.YEARS)?.text
                  : undefined
              }
            />
          </BlockStack>

          <Divider />

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              步骤 2 —— 标签信息
            </Text>
            {!step1Ok ? (
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" tone="subdued" variant="bodySm">
                  请先完成步骤 1。商品符合条件后，以下字段才会解锁。
                </Text>
              </Box>
            ) : (
              <BlockStack gap="300">
                <TextField
                  label="品牌 / 商标"
                  value={draft.brand}
                  onChange={(v) => update('brand', v)}
                  autoComplete="off"
                  requiredIndicator
                  maxLength={60}
                  error={touched.brand && !draft.brand.trim() ? '必填' : undefined}
                />
                <TextField
                  label="型号标识"
                  value={draft.model}
                  onChange={(v) => update('model', v)}
                  autoComplete="off"
                  requiredIndicator
                  maxLength={40}
                  error={touched.model && !draft.model.trim() ? '必填' : undefined}
                />
                <InlineStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">
                    年数
                  </Text>
                  <span className="mono">{renderYears(parseFloatSafe(draft.years)) || '—'}</span>
                  <Text as="span" variant="bodySm" tone="subdued">
                    （来自步骤 1，按法规用逗号渲染）
                  </Text>
                </InlineStack>
              </BlockStack>
            )}
          </BlockStack>

          <Divider />

          <GaranPreview
            brand={draft.brand}
            model={draft.model}
            years={parseFloatSafe(draft.years)}
          />

          {!result.ok && (
            <Banner tone="warning" title="当前还无法保存此标签">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.reasons.map((r, i) => (
                  <li key={i}>
                    <Text as="span" variant="bodySm">
                      {r.text}
                    </Text>
                  </li>
                ))}
              </ul>
            </Banner>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}

function parseFloatSafe(s) {
  const v = String(s || '').trim().replace(',', '.')
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// ---------------- 批量 ----------------
function BulkDialog({ ctx, onClose, onDone }) {
  const { products, setProducts, rules, pushAudit } = ctx
  // N-1：选择器只列出可选商品 —— 被排除与不合格的商品根本不出现
  const selectable = useMemo(() => selectableProducts(products, rules), [products, rules])
  const hidden = useMemo(() => unselectableBreakdown(products, rules), [products, rules])

  const [selected, setSelected] = useState([])
  const [draft, setDraft] = useState({
    guaranteeFreeOfCharge: true,
    coverage: 'whole',
    years: '3',
    brand: '',
    model: '',
  })
  const [attempted, setAttempted] = useState(false)

  const entries = selected.map((id) => {
    const p = products.find((x) => x.id === id)
    return { product: p, draft }
  })
  const batch = validateBatch(entries, rules)

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function apply() {
    setAttempted(true)
    if (!batch.ok || selected.length === 0) {
      // N-3：每次被拒也要留痕（原型 v1 漏了这条，只记单条不记批量）
      for (const f of batch.failures) {
        pushAudit({
          kind: 'GARAN_REJECTED',
          productId: f.productId,
          productTitle: f.title,
          detail: `批量被拒：${f.reasons.map((r) => r.text).join('；')}`,
        })
      }
      return
    }
    setProducts((prev) =>
      prev.map((p) =>
        selected.includes(p.id)
          ? {
              ...p,
              guaranteeFreeOfCharge: draft.guaranteeFreeOfCharge,
              coverage: draft.coverage,
              yearsHalfUnits: parseYears(draft.years).halfUnits,
              brand: draft.brand.trim(),
              model: draft.model.trim(),
            }
          : p
      )
    )
    for (const id of selected) {
      const p = products.find((x) => x.id === id)
      pushAudit({
        kind: 'GARAN_SAVED',
        productId: id,
        productTitle: p.title,
        detail: `批量贴标 · ${renderYears(parseFloatSafe(draft.years))} 年 · ${draft.brand.trim()} / ${draft.model.trim()}`,
      })
    }
    onDone(`已保存 ${selected.length} 个标签`)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="批量添加 GARAN 标签"
      primaryAction={{
        content: `应用到 ${selected.length} 个商品`,
        onAction: apply,
        disabled: selected.length === 0 || (attempted && !batch.ok),
      }}
      secondaryActions={[{ content: '取消', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info" title={`${hidden.total} 个商品无法选择`}>
            <p>
              {`已排除 ${hidden.excluded} 个、不符合条件 ${hidden.notEligible}
              个，它们完全不出现在这里。礼品卡、数字商品和 B2B
              商品属于排除；保证仅覆盖部分部件的商品属于不符合条件。两类商品在任何入口都不会进入这个选择器。`}
            </p>
          </Banner>

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              选择商品（{selectable.length} 个可选）
            </Text>
            <Box
              padding="200"
              borderColor="border"
              borderWidth="025"
              borderRadius="200"
              overflowY="auto"
              style={{ maxHeight: 240 }}
            >
              <BlockStack gap="100">
                {selectable.map((p) => (
                  <Checkbox
                    key={p.id}
                    label={`${p.title} · ${p.vendor}`}
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                ))}
              </BlockStack>
            </Box>
            {selected.includes('p5') && null}
          </BlockStack>

          <Divider />

          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              应用到所有选中商品的标签值
            </Text>
            <Checkbox
              label="该保证对消费者免费"
              checked={draft.guaranteeFreeOfCharge}
              onChange={(v) => setDraft((d) => ({ ...d, guaranteeFreeOfCharge: v }))}
            />
            <RadioButton
              label="整机"
              id="b-whole"
              name="b-cov"
              checked={draft.coverage === 'whole'}
              onChange={() => setDraft((d) => ({ ...d, coverage: 'whole' }))}
            />
            <TextField
              label="保证期（年）"
              value={draft.years}
              onChange={(v) => setDraft((d) => ({ ...d, years: v }))}
              autoComplete="off"
              helpText="必须长于 2 年。整年或半年（如 2,5）。"
            />
            <TextField
              label="品牌 / 商标"
              value={draft.brand}
              onChange={(v) => setDraft((d) => ({ ...d, brand: v }))}
              autoComplete="off"
            />
            <TextField
              label="型号标识"
              value={draft.model}
              onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
              autoComplete="off"
            />
          </BlockStack>

          {attempted && !batch.ok && (
            <Banner tone="critical" title="未保存任何内容">
              <p style={{ marginBottom: 8 }}>
                整批被拒绝。任务是原子性的 —— 不存在部分成功。
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {batch.failures.map((f) => (
                  <li key={f.productId}>
                    <Text as="span" variant="bodySm">
                      <strong>{f.title}</strong>：{f.reasons.map((r) => r.text).join('；')}
                    </Text>
                  </li>
                ))}
              </ul>
            </Banner>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}
