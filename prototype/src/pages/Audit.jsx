import React, { useMemo, useState } from 'react'
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Banner,
  Divider,
  Box,
  Toast,
  Modal,
  DataTable,
  Tabs,
  Collapsible,
  EmptyState,
} from '@shopify/polaris'
import {
  GaranState,
  deriveGaranState,
  validateSnapshotConsistency,
  renderHalfUnits,
} from '../domain/garan.js'
import { locales } from '../mock/store.js'

const HISTORY_FILTERS = [
  { id: 'history-all', content: '全部', value: 'all', panelID: 'history-panel-all' },
  { id: 'history-settings', content: '设置', value: 'settings', panelID: 'history-panel-settings' },
  { id: 'history-garan', content: 'GARAN 标签', value: 'garan', panelID: 'history-panel-garan' },
  { id: 'history-exports', content: '导出', value: 'exports', panelID: 'history-panel-exports' },
]

const PLACEMENTS = [
  ['siteWide', '全站页脚横条', '应用嵌入'],
  ['productPage', '商品页区块', '应用区块'],
  ['cartPage', '购物车页', '应用嵌入（共享）'],
  ['cartDrawer', '购物车抽屉', '应用嵌入（共享）'],
]

export default function Audit({ ctx }) {
  const {
    products,
    rules,
    auditEvents,
    counts,
    placements,
    appearance,
    statement,
    shop,
    go,
  } = ctx
  const [toast, setToast] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const historyTabIndex = Math.max(
    0,
    HISTORY_FILTERS.findIndex((tab) => tab.value === historyFilter)
  )

  const check = useMemo(
    () => validateSnapshotConsistency(products, rules),
    [products, rules]
  )

  const excludedProducts = useMemo(
    () => products.filter((p) => deriveGaranState(p, rules).state === GaranState.EXCLUDED),
    [products, rules]
  )
  const labelledProducts = useMemo(
    () => products.filter((p) => deriveGaranState(p, rules).state === GaranState.LABELLED),
    [products, rules]
  )
  const activePlacements = PLACEMENTS.filter(([key]) => placements[key]?.enabled)
  const activeLanguages = locales.filter((l) => shop.euLocales.includes(l.code))
  const statementText =
    shop.plan === 'free'
      ? 'Free 套餐未启用声明交付'
      : statement.isActive
        ? '已发布 · v1 · 在订单状态页交付'
        : '草稿 · 尚未发布，买家不可见'

  function tryExport() {
    setExportOpen(true)
    if (!check.ok) {
      ctx.pushAudit({
        kind: 'EXPORT_BLOCKED',
        productId: null,
        productTitle: null,
        detail: `导出被阻止：发现 ${check.conflicts.length} 处矛盾`,
      })
    }
  }

  const filteredEvents = auditEvents.filter((e) => {
    if (historyFilter === 'garan') return e.kind.startsWith('GARAN_')
    if (historyFilter === 'exports') return e.kind.startsWith('EXPORT_')
    if (historyFilter === 'settings') {
      return ['NOTICE_', 'EXCLUSION_', 'STATEMENT_'].some((prefix) => e.kind.startsWith(prefix))
    }
    return true
  })
  const historyRows = filteredEvents.map((e) => [
    e.at,
    e.actor,
    kindLabel(e.kind),
    e.productTitle || '—',
    e.detail,
  ])

  return (
    <>
      <Page
        title="审计"
        subtitle="当前设置的快照、变更历史，以及导出前的一致性校验。"
        primaryAction={{ content: '导出快照（PDF）', onAction: tryExport }}
        secondaryActions={[
          { content: '导出 CSV', onAction: tryExport },
          {
            content: '模拟一处矛盾',
            onAction: () => {
              ctx.injectConflict()
              setToast('已注入：一个被排除的商品现在带上了标签')
            },
          },
        ]}
      >
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  一致性校验
                </Text>
                <Badge tone={check.ok ? 'success' : 'critical'}>
                  {check.ok ? '全部一致' : `${check.conflicts.length} 项矛盾`}
                </Badge>
              </InlineStack>

              {check.ok ? (
                <BlockStack gap="200">
                  <Text as="p" tone="subdued" variant="bodySm">
                    全部 {products.length} 个商品的排除状态、GARAN 标签与审计记录相互一致。允许导出。
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    可在页面操作里试一下<em>模拟一处矛盾</em>，看看这个校验防住的是什么。
                  </Text>
                </BlockStack>
              ) : (
                <Banner tone="critical" title="这份快照自相矛盾 —— 导出已阻止">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      一份自相矛盾的合规文档比没有文档更糟。它会在一处声称商品已排除，又在另一处声称商品带有保证。先修复下面的问题。
                    </Text>
                    <Divider />
                    {check.conflicts.map((c, i) => (
                      <BlockStack gap="050" key={i}>
                        <InlineStack gap="200" align="start">
                          <Badge tone="critical">{c.type}</Badge>
                          <Text as="span" variant="bodySm" fontWeight="semibold">
                            {c.title}
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {c.detail}
                        </Text>
                      </BlockStack>
                    ))}
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    当前设置快照
                  </Text>
                  <Badge tone={check.ok ? 'success' : 'critical'}>
                    {check.ok ? '快照一致' : '需先修复'}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  记录当前实际配置，而不是只列已贴标商品。这是一份事实记录，不是法律意见。
                </Text>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      {shop.name} · {shop.domain}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      检查于 2026-10-25 15:38 · 原型演示时间；配置版本 1
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>

              <Divider />

              <SnapshotSection title="法律保证告知" subtitle="位置、受众与语言">
                <SnapshotRow
                  label="展示位置"
                  status={activePlacements.length > 0 ? 'on' : 'off'}
                  value={`已开启 ${activePlacements.length} / ${PLACEMENTS.length} 个位置`}
                  detail={PLACEMENTS.map(([key, name, carrier]) =>
                    `${name}（${carrier}，${placements[key]?.enabled ? '已开启' : '已关闭'}）`
                  ).join('；')}
                  action={<Button size="micro" variant="plain" onClick={() => go('notice')}>管理位置</Button>}
                />
                <SnapshotRow
                  label="展示方式与受众"
                  status={activePlacements.length > 0 ? 'on' : 'off'}
                  value={appearance.display === 'collapsed' ? '折叠展示 · 所有买家' : '完整告知 · 所有买家'}
                  detail={`默认位置：${appearance.position === 'footer' ? '页脚横条' : '顶部横条'}；不读取买家个人数据`}
                />
                <SnapshotRow
                  label="语言"
                  status="on"
                  value="欧盟全部 24 种官方语言"
                  detail={`检测到的店铺市场：${activeLanguages.map((l) => `${l.name} (${l.code})`).join('、') || '未检测到'}`}
                />
                <Box paddingInlineStart="400">
                  <Button
                    size="micro"
                    variant="plain"
                    onClick={() => setLanguagesOpen((open) => !open)}
                    ariaExpanded={languagesOpen}
                    ariaControls="audit-language-list"
                  >
                    {languagesOpen ? '收起 24 种语言' : '展开全部 24 种语言'}
                  </Button>
                  <Collapsible open={languagesOpen} id="audit-language-list">
                    <Box paddingBlockStart="200" maxWidth="720px">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {locales.map((l) => `${l.name} (${l.code})`).join('、')}
                      </Text>
                    </Box>
                  </Collapsible>
                </Box>
              </SnapshotSection>

              <Divider />

              <SnapshotSection title="商业保证与 GARAN 标签" subtitle="交付状态与逐商品覆盖">
                <SnapshotRow
                  label="商业保证声明"
                  status={statement.isActive ? 'on' : 'off'}
                  value={statementText}
                  detail="声明与 GARAN 标签读取同一份商品记录；未发布不等于未配置"
                  action={<Button size="micro" variant="plain" onClick={() => go('statement')}>打开声明</Button>}
                />
                <SnapshotRow
                  label="GARAN 标签覆盖"
                  status={counts[GaranState.ELIGIBLE_UNLABELLED] === 0 ? 'on' : 'warning'}
                  value={`已贴标 ${counts[GaranState.LABELLED]} / 符合条件 ${counts[GaranState.LABELLED] + counts[GaranState.ELIGIBLE_UNLABELLED]}`}
                  detail={`符合条件但未贴标 ${counts[GaranState.ELIGIBLE_UNLABELLED]} · 不符合条件 ${counts[GaranState.NOT_ELIGIBLE] || 0} · 未审阅 ${counts[GaranState.NOT_REVIEWED]}`}
                  action={<Button size="micro" variant="plain" onClick={() => go('garan')}>管理标签</Button>}
                />

                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm">
                        已贴标商品（{labelledProducts.length}）
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        商品 / 保证期 / 品牌 / 型号
                      </Text>
                    </InlineStack>
                    {labelledProducts.length ? (
                      <BlockStack gap="150">
                        {labelledProducts.map((p) => (
                          <InlineStack key={p.id} align="space-between" blockAlign="center" wrap>
                            <Text as="span" variant="bodySm">
                              {p.title}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              <span className="mono">
                                {renderHalfUnits(p.yearsHalfUnits)} 年 · {p.brand} / {p.model}
                              </span>
                            </Text>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    ) : (
                      <Text as="p" variant="bodySm" tone="subdued">
                        尚无已贴标商品。
                      </Text>
                    )}
                  </BlockStack>
                </Box>
              </SnapshotSection>

              <Divider />

              <SnapshotSection title="不展示告知的商品" subtitle="排除原因与商品明细">
                <SnapshotRow
                  label="数字商品"
                  status={rules.digital ? 'on' : 'off'}
                  value={rules.digital ? '已排除' : '未启用'}
                  detail="不需要物流配送的商品；法规规则不可关闭"
                />
                <SnapshotRow
                  label="礼品卡"
                  status={rules.giftCard ? 'on' : 'off'}
                  value={rules.giftCard ? '已排除' : '未启用'}
                  detail="法规规则不可关闭"
                />
                <SnapshotRow
                  label="B2B 与批发"
                  status={rules.b2b ? 'on' : 'off'}
                  value={rules.b2b ? '已排除' : '未启用'}
                  detail={`按标签匹配：${rules.b2bTags.map((t) => `"${t}"`).join('、')}`}
                />
                <SnapshotRow
                  label="自定义标签"
                  status={rules.customTagsEnabled ? 'on' : 'off'}
                  value={rules.customTagsEnabled ? '已启用' : '未启用'}
                  detail={rules.customTags.length ? `排除标签：${rules.customTags.join('、')}` : '未添加自定义排除标签'}
                />
                <SnapshotRow
                  label="手动排除"
                  status={rules.manual.length ? 'on' : 'off'}
                  value={`${rules.manual.length} 个商品`}
                  detail="手动排除会同时移除已有 GARAN 标签"
                  action={<Button size="micro" variant="plain" onClick={() => go('exclusions')}>管理排除</Button>}
                />

                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="150">
                    <Text as="h3" variant="headingSm">
                      当前被排除商品（{excludedProducts.length}）
                    </Text>
                    {excludedProducts.map((p) => {
                      const result = deriveGaranState(p, rules)
                      return (
                        <InlineStack key={p.id} align="space-between" blockAlign="center" wrap>
                          <Text as="span" variant="bodySm">
                            {p.title}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {result.reason}
                          </Text>
                        </InlineStack>
                      )
                    })}
                  </BlockStack>
                </Box>
              </SnapshotSection>

              <Banner tone="info">
                <p>
                  快照依据 Commission Implementing Regulation (EU) 2025/1960 的配置项整理；仅记录应用如何配置，不构成合规保证或法律意见。
                </p>
              </Banner>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  变更历史
                </Text>
                <Badge>{`${filteredEvents.length} / ${auditEvents.length} 条记录`}</Badge>
              </InlineStack>
              <Text as="p" tone="subdued" variant="bodySm">
                每次确认的贴标和每次被拒的尝试都有记录。被拒记录是约束被真正强制执行的证明，而不只是展示。
              </Text>
              <Tabs
                tabs={HISTORY_FILTERS}
                selected={historyTabIndex}
                onSelect={(index) => setHistoryFilter(HISTORY_FILTERS[index].value)}
              >
                <Box paddingBlockStart="300">
                  {historyRows.length ? (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                      headings={['时间', '操作人', '事件', '商品', '详情']}
                      rows={historyRows}
                      increasedTableDensity
                    />
                  ) : (
                    <EmptyState heading="该类型暂无记录" image="">
                      <p>切换筛选条件，或完成一次对应操作后再查看。</p>
                    </EmptyState>
                  )}
                </Box>
              </Tabs>
            </BlockStack>
          </Card>
        </BlockStack>

        {exportOpen && (
          <Modal
            open
            onClose={() => setExportOpen(false)}
            title={check.ok ? '导出就绪' : '导出被阻止'}
            primaryAction={{
              content: check.ok ? '下载 PDF（演示）' : '关闭',
              onAction: () => {
                setExportOpen(false)
                if (check.ok) setToast('快照已导出（仅演示 —— 未写入文件）')
              },
            }}
          >
            <Modal.Section>
              {check.ok ? (
                <Text as="p">
                  快照内部一致。生产环境中这里会生成带日期的
                  PDF，说明展示了什么、排除了什么，以及每一次带作者和时间戳的变更。
                </Text>
              ) : (
                <BlockStack gap="200">
                  <Text as="p">
                    必须先解决 {check.conflicts.length}
                    处矛盾。这映射了我们在竞品身上发现的失败：他们导出的
                    PDF 声称"所有必填项就位"，同一页却列着一张带 2.5
                    年标签的礼品卡，并声明礼品卡已排除。
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    前往「排除规则」或「GARAN 标签」修复上述问题。
                  </Text>
                </BlockStack>
              )}
            </Modal.Section>
          </Modal>
        )}

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </>
  )
}

function SnapshotSection({ title, subtitle, children }) {
  return (
    <BlockStack gap="300">
      <BlockStack gap="050">
        <Text as="h3" variant="headingMd">
          {title}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {subtitle}
        </Text>
      </BlockStack>
      <BlockStack gap="300">{children}</BlockStack>
    </BlockStack>
  )
}

function SnapshotRow({ label, value, detail, status, action }) {
  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200" padding="300">
      <div className="audit-snapshot-row">
        <InlineStack gap="200" blockAlign="start" wrap={false}>
          <Box paddingBlockStart="100">
            <span className={`audit-status-dot ${status || 'off'}`} aria-hidden="true" />
          </Box>
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {label}
          </Text>
        </InlineStack>
        <BlockStack gap="100">
          <Text as="p" variant="bodySm">
            {value}
          </Text>
          {detail && (
            <Text as="p" variant="bodySm" tone="subdued">
              {detail}
            </Text>
          )}
        </BlockStack>
        <div>{action}</div>
      </div>
    </Box>
  )
}

function kindLabel(k) {
  const map = {
    GARAN_SAVED: '标签已保存',
    GARAN_REMOVED: '标签已移除',
    GARAN_REJECTED: '写入被拒',
    NOTICE_ENABLED: '告知已开启',
    NOTICE_PLACEMENT: '位置已确认',
    GARAN_DISPLAY_CHANGED: '标签展示设置已变更',
    PLAN_CHANGED: '套餐已变更',
    EXCLUSION_ADDED: '排除已添加',
    EXCLUSION_REMOVED: '排除已移除',
    STATEMENT_PUBLISHED: '声明已发布',
    EXPORT_BLOCKED: '导出被阻止',
  }
  return map[k] || k
}
