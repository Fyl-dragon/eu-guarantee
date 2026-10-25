import React from 'react'
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Box,
  Divider,
  Banner,
  Modal,
  Toast,
  Icon,
} from '@shopify/polaris'
import { CheckIcon, StarIcon } from '@shopify/polaris-icons'
import { GaranState } from '../domain/garan.js'

export default function Home({ ctx }) {
  const { shop, counts, excludedWithLabel, go, products, placements, statement } = ctx
  const [help, setHelp] = React.useState(null)
  const [membershipOpen, setMembershipOpen] = React.useState(false)
  const [toast, setToast] = React.useState(null)

  const total = products.length
  const labelled = counts[GaranState.LABELLED]
  const eligible = counts[GaranState.ELIGIBLE_UNLABELLED]
  const notEligible = counts[GaranState.NOT_ELIGIBLE] || 0
  const notReviewed = counts[GaranState.NOT_REVIEWED]
  const excluded = counts[GaranState.EXCLUDED]

  // 不再硬编码：全部从应用级状态实时推导
  const liveCount = [
    placements.siteWide,
    placements.productPage,
    placements.cartPage,
    placements.cartDrawer,
  ].filter((p) => p && p.enabled).length
  const productBlockOn = !!placements.productPage.enabled
  const noticeLive = liveCount > 0

  const rows = [
    {
      id: 1,
      label: '法律保证告知已生效',
      status: noticeLive ? 'success' : 'attention',
      badge: noticeLive ? `生效中 · 4 个位置中的 ${liveCount} 个` : '未生效',
      detail: noticeLive
        ? `4 个位置中的 ${liveCount} 个正在展示告知。剩余 ${4 - liveCount} 个可在「法律保证告知」中开启。`
        : '尚无位置展示告知。请开启全站页脚横条以符合要求。',
      action: { label: noticeLive ? '管理位置' : '开启告知', page: 'notice' },
    },
    {
      id: 2,
      label: '商品页区块',
      status: productBlockOn ? 'success' : 'warning',
      badge: productBlockOn ? '已放置' : '未放置',
      detail: productBlockOn
        ? '告知正在你的商品页上展示。'
        : '商品页还没有展示告知。请先在主题编辑器中添加应用区块，然后在这里确认。',
      action: productBlockOn
        ? { label: '检查位置', page: 'notice' }
        : { label: '添加商品页区块', page: 'notice' },
      secondary: productBlockOn ? null : { label: '再次检查', page: 'notice' },
    },
    {
      id: 3,
      label: 'GARAN 标签覆盖情况',
      status: eligible > 0 ? 'warning' : 'success',
      badge: `已贴标 ${labelled} / 符合条件 ${labelled + eligible} / 不符合条件 ${notEligible}`,
      detail:
        eligible > 0
          ? `${eligible} 个商品符合 GARAN 标签条件但尚未贴标。${notEligible} 个已审但不合格。${excluded} 个商品已排除，永远不会出现在任何标签选择器中。`
          : `所有符合条件的商品均已贴标。${notEligible} 个不合格，${excluded} 个已排除。`,
      action:
        eligible > 0
          ? { label: `继续处理剩余 ${eligible} 个`, page: 'garan' }
          : { label: '打开 GARAN 标签', page: 'garan' },
    },
    {
      id: 4,
      label: '商业保证声明',
      status: shop.plan === 'free' ? 'attention' : statement.isActive ? 'success' : 'warning',
      badge:
        shop.plan === 'free'
          ? 'Free 套餐不可用'
          : statement.isActive
          ? '已发布 · 交付中'
          : '草稿 —— 未发布',
      detail:
        shop.plan === 'free'
          ? '自 2026 年 9 月 27 日起，如你提供耐久性保证则必须提供声明。Growth 套餐起可用。'
          : statement.isActive
          ? `买家在订单状态页收到完整的 C1–C5 声明，外加可打印链接。覆盖 ${labelled} 个已贴标商品。`
          : '声明已填写但未发布，买家还看不到。',
      action:
        shop.plan === 'free'
          ? { label: '查看套餐', page: 'statement' }
          : { label: statement.isActive ? '打开声明' : '去发布', page: 'statement' },
    },
  ]

  return (
    <Page
      title="EU 保证与耐久性标签"
      subtitle={`${shop.name} · ${shop.domain}`}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {excludedWithLabel.length > 0 && (
              <Banner
                tone="critical"
                title="已排除的商品仍带有 GARAN 标签"
                action={{ content: '立即修复', onAction: () => go('garan') }}
              >
                <p>
                  {excludedWithLabel.length}
                  个商品已被排除但仍显示 GARAN
                  标签。必须先解决才能导出合规快照。完整检查见「审计 → 导出」。
                </p>
              </Banner>
            )}

            <MembershipEntry
              plan={shop.plan}
              open={membershipOpen}
              onToggle={() => setMembershipOpen((open) => !open)}
              onActivate={(plan) => {
                ctx.changePlan(plan)
                setToast(`已开通 ${plan === 'pro' ? 'Pro' : 'Growth'} 会员（原型演示，未产生费用）`)
              }}
            />

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  设置状态
                </Text>
                <Text as="p" tone="subdued">
                  店铺要符合要求，四件事必须成立。每一行展示哪里有问题、为什么重要，以及修复它的一次操作。
                </Text>
                <Divider />
                <BlockStack gap="300">
                  {rows.map((r) => (
                    <StatusRow key={r.id} row={r} onGo={go} onHelp={setHelp} />
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    覆盖情况一览
                  </Text>
                  <Badge tone="info">{`${total} 个商品`}</Badge>
                </InlineStack>
                <InlineStack gap="600" wrap>
                  <Metric label="已贴标" value={labelled} tone="success" />
                  <Metric label="符合条件，未贴标" value={eligible} tone="warning" />
                  <Metric label="不符合条件" value={notEligible} tone="subdued" />
                  <Metric label="未审阅" value={notReviewed} tone="subdued" />
                  <Metric label="已排除" value={excluded} tone="subdued" />
                </InlineStack>
                <Divider />
                <Text as="p" tone="subdued" variant="bodySm">
                  已排除的商品永远不会出现在 GARAN 选择器、CSV 导入或 API 中。这在服务端强制执行，而不只是界面隐藏。
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  店铺
                </Text>
                <KeyValue k="主语言" v={shop.primaryLocale} />
                <KeyValue k="欧盟市场" v={shop.euLocales.join(', ') || '未检测到'} />
                <KeyValue k="告知语言" v="24 种（官方素材）" />
                <KeyValue k="套餐" v={planLabel(shop.plan)} />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  这个原型是什么
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  一个使用 mock 数据的交互原型。不保存任何内容，不连接任何店铺。用侧边栏的套餐切换器查看付费墙。
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {help && (
        <Modal
          open
          onClose={() => setHelp(null)}
          title={HELP[help].title}
          primaryAction={{ content: '知道了', onAction: () => setHelp(null) }}
        >
          <Modal.Section>
            <BlockStack gap="200">
              {HELP[help].body.map((line, i) => (
                <Text as="p" key={i} variant="bodySm">
                  {line}
                </Text>
              ))}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
      {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
    </Page>
  )
}

const PLANS = [
  {
    id: 'growth',
    name: 'Growth',
    price: '$4.99/月',
    annual: '或 $49/年 · 7 天试用',
    description: '完成从标签到声明交付的完整流程',
    action: '开通 Growth',
    features: [
      '商业保证声明 C1–C5',
      '声明与 GARAN 标签共享数据',
      '订单状态页展示与可打印声明',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99/月',
    annual: '或 $99/年 · 7 天试用',
    description: '适合需要批量管理与记录导出的店铺',
    action: '开通 Pro',
    features: [
      '包含 Growth 全部权益',
      '逐变体标签、批量 CSV 与组应用',
      '审计记录 CSV / PDF 导出与优先支持',
    ],
  },
]

function MembershipEntry({ plan, open, onToggle, onActivate }) {
  const paid = plan !== 'free'
  return (
    <Card>
      <div className="membership-entry">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start" gap="300" wrap>
            <InlineStack gap="300" blockAlign="start" wrap={false}>
              <div className="membership-star" aria-hidden="true">
                <Icon source={StarIcon} tone="info" />
              </div>
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    {paid ? `${plan === 'pro' ? 'Pro' : 'Growth'} 会员已开通` : '升级会员，交付完整保证声明'}
                  </Text>
                  <Badge tone={paid ? 'success' : 'info'}>{paid ? '当前套餐' : '7 天免费试用'}</Badge>
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  {paid
                    ? '声明与标签数据同源。你可以随时查看当前权益或切换套餐。'
                    : '免费版已包含告知、无限 GARAN 标签与排除规则；升级后解锁声明交付及规模化运营能力。'}
                </Text>
              </BlockStack>
            </InlineStack>
            <Button variant="primary" onClick={onToggle} aria-expanded={open} aria-controls="membership-benefits">
              {open ? '收起会员权益' : paid ? '查看会员权益' : '查看权益并升级'}
            </Button>
          </InlineStack>

          {!open && (
            <div className="membership-highlights" aria-label="会员核心权益">
              <MembershipHighlight title="完整声明" text="C1–C5 一次配置" />
              <MembershipHighlight title="自动同步" text="声明与标签数据同源" />
              <MembershipHighlight title="买家可留存" text="订单页展示与可打印副本" />
            </div>
          )}

          {open && (
            <div id="membership-benefits" className="membership-details">
              <Divider />
              <Text as="p" tone="subdued" variant="bodySm">
                选择适合你的套餐。月付与年付均提供 7 天试用；以下操作仅用于原型演示，不会发起真实扣费。
              </Text>
              <div className="membership-plan-grid">
                {PLANS.map((item) => {
                  const current = plan === item.id
                  return (
                    <section className={`membership-plan ${current ? 'current' : ''}`} key={item.id}>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center" gap="200">
                          <Text as="h3" variant="headingSm">{item.name}</Text>
                          {current && <Badge tone="success">使用中</Badge>}
                        </InlineStack>
                        <BlockStack gap="050">
                          <Text as="p" variant="headingLg">{item.price}</Text>
                          <Text as="p" tone="subdued" variant="bodySm">{item.annual}</Text>
                        </BlockStack>
                        <Text as="p" variant="bodySm">{item.description}</Text>
                        <BlockStack gap="150">
                          {item.features.map((feature) => (
                            <InlineStack gap="150" blockAlign="start" wrap={false} key={feature}>
                              <span className="benefit-check"><Icon source={CheckIcon} tone="success" /></span>
                              <Text as="span" variant="bodySm">{feature}</Text>
                            </InlineStack>
                          ))}
                        </BlockStack>
                        <Button
                          variant={item.id === 'growth' && !current ? 'primary' : undefined}
                          disabled={current}
                          onClick={() => onActivate(item.id)}
                          fullWidth
                        >
                          {current ? '当前套餐' : plan === 'free' ? item.action : `切换至 ${item.name}`}
                        </Button>
                      </BlockStack>
                    </section>
                  )
                })}
              </div>
              <Text as="p" tone="subdued" variant="bodySm">
                所有套餐均保留基础告知与 GARAN 功能。本工具用于信息展示与交付，不提供法律意见。
              </Text>
            </div>
          )}
        </BlockStack>
      </div>
    </Card>
  )
}

function MembershipHighlight({ title, text }) {
  return (
    <div className="membership-highlight">
      <Icon source={CheckIcon} tone="success" />
      <Text as="p" variant="bodySm"><strong>{title}</strong> · {text}</Text>
    </div>
  )
}

// UX-FLOWS §2.2：每行状态都要能"就地"得到怎么做，而不是只有跳转。
// 参考 Pandectes 的 `How to add it` / `Not able to find it?`（17 §3B.4）。
const HELP = {
  1: {
    title: '如何展示法律保证告知',
    body: [
      '先开启全站页脚横条 —— 一个开关覆盖所有页面。',
      '然后可选：在主题编辑器中放置商品页区块，并开启购物车位置。',
      '你不需要编辑任何主题代码。一切都通过应用嵌入和区块完成。',
    ],
  },
  2: {
    title: '如何添加商品页区块',
    body: [
      '打开主题编辑器，进入商品模板，添加名为「EU 保证 —— 商品页区块」的区块。',
      '把它放在「加入购物车」按钮下方。',
      '回到这里用「我已添加区块」确认。我们不读取你的主题文件，所以这个确认就是我们的记录依据。',
    ],
  },
  3: {
    title: 'GARAN 覆盖条件如何运作',
    body: [
      '商品能带 GARAN 标签的条件：保证免费、覆盖整机、且长于 2 年。',
      '礼品卡、数字商品和 B2B 商品自动排除 —— 它们永远不会出现在标签选择器中。',
      '如果保证仅覆盖部分部件，商品会被标记为「不符合条件」，不能贴标。',
    ],
  },
  4: {
    title: '声明如何交付',
    body: [
      '填写五个必填部分（C1–C5），然后发布。',
      '买家在订单状态页看到声明，并可通过签名链接保存可打印副本，链接在订单结束后仍有效。',
      '声明读取与 GARAN 标签相同的数据记录，因此两者永远不会不一致。',
    ],
  },
}

function planLabel(p) {
  return p === 'free' ? 'Free' : p === 'growth' ? 'Growth · $4.99/月' : 'Pro · $9.99/月'
}

function StatusRow({ row, onGo, onHelp }) {
  const toneMap = { success: 'success', warning: 'attention', attention: 'attention' }
  const dotColor = { success: '#108043', warning: '#ffc453', attention: '#ffc453' }
  return (
    <Box
      padding="300"
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      background="bg-surface-secondary"
    >
      <InlineStack gap="300" blockAlign="start" wrap={false}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            marginTop: 7,
            flex: '0 0 8px',
            background: dotColor[row.status] || '#8c9196',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {row.label}
              </Text>
              <Badge tone={toneMap[row.status] || 'new'}>{row.badge}</Badge>
            </InlineStack>
            <Text as="p" tone="subdued" variant="bodySm">
              {row.detail}
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Button size="micro" onClick={() => onGo(row.action.page)}>
                {row.action.label}
              </Button>
              {row.secondary && (
                <Button size="micro" variant="plain" onClick={() => onGo(row.secondary.page)}>
                  {row.secondary.label}
                </Button>
              )}
              {/* UX-FLOWS §2.2 要求每行给出"帮助链接"，参考 Pandectes 的 How to add it */}
              <Button size="micro" variant="plain" onClick={() => onHelp(row.id)}>
                如何操作
              </Button>
            </InlineStack>
          </BlockStack>
        </div>
      </InlineStack>
    </Box>
  )
}

function Metric({ label, value, tone }) {
  return (
    <BlockStack gap="050">
      <Text as="span" variant="headingLg" tone={tone === 'subdued' ? 'subdued' : undefined}>
        {value}
      </Text>
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
    </BlockStack>
  )
}

function KeyValue({ k, v }) {
  return (
    <InlineStack align="space-between" gap="200">
      <Text as="span" variant="bodySm" tone="subdued">
        {k}
      </Text>
      <Text as="span" variant="bodySm">
        {v}
      </Text>
    </InlineStack>
  )
}
