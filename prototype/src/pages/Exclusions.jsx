import React, { useMemo } from 'react'
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Checkbox,
  TextField,
  Banner,
  Divider,
  Box,
  Toast,
  Tag,
} from '@shopify/polaris'
import { products } from '../mock/products.js'
import { checkExcluded, ExclusionKind, renderHalfUnits } from '../domain/garan.js'

export default function Exclusions({ ctx }) {
  const { rules, setRules, products: liveProducts, pushAudit } = ctx
  const [tagInput, setTagInput] = React.useState('')
  const [toast, setToast] = React.useState(null)

  // 每个商品的完全排除明细，用同一个 checkExcluded
  const rows = useMemo(
    () =>
      liveProducts.map((p) => ({
        product: p,
        ...checkExcluded(p, rules),
      })),
    [liveProducts, rules]
  )

  const excluded = rows.filter((r) => r.excluded)
  const notExcluded = rows.filter((r) => !r.excluded)

  function patch(next) {
    setRules((r) => ({ ...r, ...next }))
  }

  function toggleManual(id, on) {
    const p = liveProducts.find((x) => x.id === id)
    if (on) {
      // v2 修复：排除必须同时删除标签，否则会产生"被排除却有标签"的矛盾态
      ctx.excludeProduct(id, p && p.yearsHalfUnits != null ? '标签已一并删除' : '手动')
      setToast(`「${p.title}」已排除${p && p.yearsHalfUnits != null ? ' —— 其标签已一并删除' : ''}`)
    } else {
      ctx.unexcludeProduct(id)
      setToast(`「${p.title}」已不再排除`)
    }
  }

  return (
    <>
      <Page
        title="排除规则"
        subtitle="被排除的商品在所有位置都被排除 —— 法律保证告知、GARAN 列表、批量选择器和 CSV 导入。"
      >
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                规则
              </Text>
              <Banner tone="info">
                <p>
                  商品只要命中任意一条规则即被排除。规则对所有套餐免费 ——
                  这是合规要求，不是加价项。
                </p>
              </Banner>

              <BlockStack gap="300">
                <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Checkbox
                        label="礼品卡"
                        checked={rules.giftCard}
                        onChange={(v) => patch({ giftCard: v })}
                        disabled
                        helpText="法规要求。无法关闭。"
                      />
                    </BlockStack>
                    <Badge tone="success">始终开启</Badge>
                  </InlineStack>
                </Box>

                <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Checkbox
                        label="数字商品"
                        checked={rules.digital}
                        onChange={(v) => patch({ digital: v })}
                        disabled
                        helpText="不需要物流配送的商品。法规要求。"
                      />
                    </BlockStack>
                    <Badge tone="success">始终开启</Badge>
                  </InlineStack>
                </Box>

                <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                  <BlockStack gap="200">
                    <Checkbox
                      label="B2B 与批发商品"
                      checked={rules.b2b}
                      onChange={(v) => patch({ b2b: v })}
                      helpText="按标签匹配。消费者保护不适用于 B2B 买家。"
                    />
                    <InlineStack gap="100">
                      {rules.b2bTags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </Box>

                <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                  <BlockStack gap="200">
                    <Checkbox
                      label="排除带特定标签的商品"
                      checked={rules.customTagsEnabled}
                      onChange={(v) => patch({ customTagsEnabled: v })}
                    />
                    {rules.customTagsEnabled && (
                      <InlineStack gap="200" blockAlign="end">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="标签"
                            labelHidden
                            value={tagInput}
                            onChange={setTagInput}
                            autoComplete="off"
                            placeholder="如 final-sale"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!tagInput.trim()) return
                            patch({ customTags: [...rules.customTags, tagInput.trim()] })
                            setTagInput('')
                          }}
                        >
                          添加标签
                        </Button>
                      </InlineStack>
                    )}
                    {rules.customTags.length > 0 && (
                      <InlineStack gap="100">
                        {rules.customTags.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>

                <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                  <Checkbox
                    label="仅覆盖商品的部分部件"
                    checked={false}
                    disabled
                    onChange={() => {}}
                    helpText="在 GARAN 弹窗中按商品设置。部分保证永远不能使用 GARAN 标签。"
                  />
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  已排除的商品
                </Text>
                <Badge tone="attention">{`${excluded.length} / ${liveProducts.length}`}</Badge>
              </InlineStack>
              <Text as="p" tone="subdued" variant="bodySm">
                这些商品不出现在 GARAN 列表和任何标签选择器中。它们的排除原因只在这里展示与记录。
              </Text>
              <Divider />
              <BlockStack gap="200">
                {excluded.map((r) => (
                  <InlineStack key={r.product.id} align="space-between" blockAlign="center" gap="300">
                    <BlockStack gap="050">
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        {r.product.title}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {r.reason}
                      </Text>
                    </BlockStack>
                    <InlineStack gap="200" blockAlign="center">
                      {r.kind === ExclusionKind.MANUAL ? (
                        <Button size="micro" variant="plain" onClick={() => toggleManual(r.product.id, false)}>
                          移除排除
                        </Button>
                      ) : (
                        <Text as="span" variant="bodySm" tone="subdued">
                          按规则排除
                        </Text>
                      )}
                      <Badge tone="critical">已排除</Badge>
                    </InlineStack>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                手动排除商品
              </Text>
              <Text as="p" tone="subdued" variant="bodySm">
                如果商品已带 GARAN 标签，排除它会同时删除标签，并在审计中写入一条同时记录两个事实的日志。不存在"被排除却仍带标签"的状态。
              </Text>
              <Divider />
              <BlockStack gap="200">
                {notExcluded.map((r) => {
                  const hasLabel = r.product.yearsHalfUnits != null && (r.product.brand || '').trim() !== ''
                  return (
                    <InlineStack key={r.product.id} align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm">
                          {r.product.title}
                        </Text>
                        {hasLabel && (
                          <Badge tone="success">{`已贴标 · ${renderHalfUnits(r.product.yearsHalfUnits)} 年`}</Badge>
                        )}
                      </InlineStack>
                      <Button size="micro" onClick={() => toggleManual(r.product.id, true)}>
                        排除
                      </Button>
                    </InlineStack>
                  )
                })}
              </BlockStack>
            </BlockStack>
          </Card>
        </BlockStack>

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </>
  )
}
