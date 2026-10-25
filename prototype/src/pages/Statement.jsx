import React, { useState } from 'react'
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  TextField,
  Select,
  RadioButton,
  Banner,
  Divider,
  Box,
  Toast,
  EmptyState,
  Modal,
} from '@shopify/polaris'
import { statementConfig as seed } from '../mock/store.js'
import { deriveGaranState, GaranState, renderHalfUnits } from '../domain/garan.js'

export default function Statement({ ctx }) {
  const { shop, setShop, auditEvents, pushAudit, products, rules, statement: cfg, setStatement } = ctx
  const [toast, setToast] = useState(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const gated = shop.plan === 'free'

  // N-2：声明里的"覆盖商品"不是手填文案，而是从 GARAN 记录实时推导。
  // 这正是 9/9 竞品缺失的地方（PlainClaim 是两套独立表单）。
  const labelled = products
    .filter((p) => deriveGaranState(p, rules).state === GaranState.LABELLED)
    .map((p) => ({
      title: p.title,
      brand: p.brand,
      model: p.model,
      years: renderHalfUnits(p.yearsHalfUnits),
    }))

  if (gated) {
    return (
      <>
        <Page title="商业保证声明" subtitle="交付给买家的商业保证声明。">
          <Card>
            <EmptyState
              heading="交付完整的 C1–C5 声明，而不只是一条提醒"
              action={{
                content: '开始 Growth 7 天试用',
                onAction: () => setUpgradeOpen(true),
              }}
              secondaryAction={{
                content: '查看包含内容',
                onAction: () => setUpgradeOpen(true),
              }}
              image=""
            >
              <p>
                声明最迟必须在商品交付时以耐用介质送达消费者。该套餐包含五个法定部分，并发布在订单状态页与可打印页上。
              </p>
              <p style={{ marginTop: 12 }}>
                Growth 套餐起可用，$4.99/月。告知与 GARAN 标签保持免费。
              </p>
            </EmptyState>
          </Card>

          {upgradeOpen && (
            <Modal
              open
              onClose={() => setUpgradeOpen(false)}
              title="声明属于 Growth 套餐"
              primaryAction={{
                content: '激活 Growth（演示）',
                onAction: () => {
                  setShop({ ...shop, plan: 'growth' })
                  setUpgradeOpen(false)
                  setToast('Growth 已激活 —— 声明已解锁')
                },
              }}
              secondaryActions={[{ content: '暂不', onAction: () => setUpgradeOpen(false) }]}
            >
              <Modal.Section>
                <BlockStack gap="300">
                  <Text as="p">
                    <strong>Growth · $4.99/月</strong> 或 <strong>$49/年</strong>。包含 Free 的全部功能，外加声明及其交付。
                  </Text>
                  <Divider />
                  <Text as="p" tone="subdued" variant="bodySm">
                    生产环境中这里会创建 Shopify 周期性扣费。在这个原型里只是切换一个本地标志。
                  </Text>
                </BlockStack>
              </Modal.Section>
            </Modal>
          )}
          {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
        </Page>
      </>
    )
  }

  const complete =
    cfg.producerName.trim() &&
    cfg.producerAddress.trim() &&
    cfg.steps.trim() &&
    cfg.coveredGoods.trim() &&
    cfg.terms.trim()

  return (
    <>
      <Page
        title="商业保证声明"
        subtitle="与 GARAN 标签共享同一条记录 —— 声明与标签永远不会不一致。"
        primaryAction={{
          content: cfg.isActive ? '更新声明' : '发布声明',
          onAction: () => {
            setStatement((c) => ({ ...c, isActive: true }))
            pushAudit({
              kind: 'STATEMENT_PUBLISHED',
              productId: null,
              productTitle: null,
              detail: '声明已发布 · 版本 1 · 在订单状态页交付',
            })
            setToast('声明已发布。买家现在可以在订单状态页看到它。')
          },
          disabled: !complete,
        }}
        secondaryActions={[
          {
            content: '以买家视角预览',
            onAction: () => setToast('预览打开订单状态页卡片（见右栏）。'),
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      法定必填部分
                    </Text>
                    <Badge tone={cfg.isActive ? 'success' : 'attention'}>
                      {cfg.isActive ? '已发布 · v1' : '草稿'}
                    </Badge>
                  </InlineStack>
                  <Banner tone="info">
                    <p>
                      这五项直接来自《货物销售指令》。本应用帮助你发布它们；不提供法律意见。
                    </p>
                  </Banner>

                  <BlockStack gap="300">
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        C1 —— 谁提供保证
                      </Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        声明必须明确：你的法定保证独立存在，且不因本商业保证受任何影响。
                      </Text>
                      <div style={{ maxWidth: 320, marginTop: 8 }}>
                        <Select
                          label="提供方"
                          labelHidden
                          value={cfg.claimScope}
                          onChange={(v) => setStatement((c) => ({ ...c, claimScope: v }))}
                          options={[
                            { label: '我们是生产者', value: 'producer' },
                            { label: '我们是销售者', value: 'seller' },
                          ]}
                        />
                      </div>
                    </div>

                    <Divider />

                    <TextField
                      label="C2 —— 生产者名称"
                      value={cfg.producerName}
                      onChange={(v) => setStatement((c) => ({ ...c, producerName: v }))}
                      autoComplete="off"
                      requiredIndicator
                    />
                    <TextField
                      label="C2 —— 生产者地址"
                      value={cfg.producerAddress}
                      onChange={(v) => setStatement((c) => ({ ...c, producerAddress: v }))}
                      autoComplete="off"
                      multiline={3}
                      requiredIndicator
                      helpText="每行一条地址。"
                    />

                    <Divider />

                    <TextField
                      label="C3 —— 消费者如何使用保证"
                      value={cfg.steps}
                      onChange={(v) => setStatement((c) => ({ ...c, steps: v }))}
                      autoComplete="off"
                      multiline={3}
                      requiredIndicator
                    />

                    <TextField
                      label="C4 —— 覆盖的商品"
                      value={cfg.coveredGoods}
                      onChange={(v) => setStatement((c) => ({ ...c, coveredGoods: v }))}
                      autoComplete="off"
                      multiline={2}
                      requiredIndicator
                      helpText="与 GARAN 标签读取同一批记录。"
                    />

                    <TextField
                      label="C5 —— 条款与除外责任"
                      value={cfg.terms}
                      onChange={(v) => setStatement((c) => ({ ...c, terms: v }))}
                      autoComplete="off"
                      multiline={4}
                      requiredIndicator
                    />
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    共享数据
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    品牌、型号、保证期与排除状态读取与 GARAN
                    标签相同的记录。编辑标签会更新本声明，可打印 PDF 也从同一来源生成。
                  </Text>
                  <InlineStack gap="200">
                    <Badge tone="success">同源数据</Badge>
                    <Text as="span" tone="subdued" variant="bodySm">
                      没有需要保持同步的第二张表单。
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    买家看到的
                  </Text>
                  <Badge>订单状态页</Badge>
                </InlineStack>
                <div className="storefront">
                  <div className="storefront-inner">
                    <BlockStack gap="300">
                      <Box
                        padding="300"
                        background="bg-surface-secondary"
                        borderRadius="200"
                      >
                        <BlockStack gap="150">
                          <Text as="span" variant="bodySm" fontWeight="semibold">
                            你的商业保证不影响你的法定权利
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            作为消费者，若商品存在缺陷你有权要求销售者免费补救。本商业保证是对这些权利的补充，不限制它们。
                          </Text>
                        </BlockStack>
                      </Box>

                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          保证提供方
                        </Text>
                        <Text as="p" variant="bodySm">
                          {cfg.producerName || '—'}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued" style={{ whiteSpace: 'pre-line' }}>
                          {cfg.producerAddress || '—'}
                        </Text>
                      </BlockStack>

                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          覆盖商品
                        </Text>
                        <Text as="p" variant="bodySm">
                          {cfg.coveredGoods || '—'}
                        </Text>
                        {/* N-2：实际覆盖的商品与型号从 GARAN 记录推导，不是另一处手填 */}
                        {labelled.length > 0 && (
                          <Box
                            padding="200"
                            background="bg-surface-secondary"
                            borderRadius="100"
                          >
                            <BlockStack gap="050">
                              <Text as="span" variant="bodySm" tone="subdued">
                                {`从你的 GARAN 标签推导（${labelled.length} 个）`}
                              </Text>
                              {labelled.map((l, i) => (
                                <Text as="span" key={i} variant="bodySm">
                                  <span className="mono">
                                    {l.brand} / {l.model} · {l.years} 年
                                  </span>
                                </Text>
                              ))}
                            </BlockStack>
                          </Box>
                        )}
                      </BlockStack>

                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          如何申请
                        </Text>
                        <Text as="p" variant="bodySm">
                          {cfg.steps || '—'}
                        </Text>
                      </BlockStack>

                      {/* C5 条款 —— v1 原型漏渲染，是法定五项之一 */}
                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          条款与除外责任
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued" style={{ whiteSpace: 'pre-line' }}>
                          {cfg.terms || '—'}
                        </Text>
                      </BlockStack>

                      <Button size="slim">保存为 PDF</Button>
                    </BlockStack>
                  </div>
                </div>
                <Text as="p" tone="subdued" variant="bodySm">
                  可打印页位于一个签名链接，在订单结束后仍有效。买家无需登录。
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </>
  )
}
