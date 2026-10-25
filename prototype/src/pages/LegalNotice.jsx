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
  Checkbox,
  RadioButton,
  Select,
  Banner,
  Divider,
  Box,
  Toast,
  Modal,
} from '@shopify/polaris'
import { locales } from '../mock/store.js'

export default function LegalNotice({ ctx }) {
  // v2 修复：改用应用级 state，否则 Home 与这里会各说一套
  const { placements, setPlacements, appearance, setAppearance } = ctx
  const [toast, setToast] = useState(null)
  const [confirmBlock, setConfirmBlock] = useState(false)

  const langCode = appearance.previewLocale
  const imgSrc = `/assets/notice/Legal guarantee_notice ${langCode}.svg`

  function toggle(key, v) {
    setPlacements((p) => ({ ...p, [key]: { ...p[key], enabled: v, live: v } }))
  }

  function confirmProductBlock() {
    setPlacements((p) => ({
      ...p,
      productPage: { enabled: true, live: true, manuallyConfirmed: true },
    }))
    ctx.pushAudit({
      kind: 'NOTICE_PLACEMENT',
      productId: null,
      productTitle: null,
      detail: '商家确认已放置商品页区块（手动确认，未读主题）',
    })
    setConfirmBlock(false)
    setToast('商品页区块已标记为已放置')
  }

  return (
    <>
      <Page
        title="法律保证告知"
        subtitle="欧盟统一告知，24 种官方语言，使用欧盟委员会官方素材。"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    告知出现的位置
                  </Text>
                  <Banner tone="info">
                    <p>
                      告知内容不可编辑。素材、标题、勾号、二维码与颜色由欧盟委员会固定。只有周围的位置与折叠/完整展示可以调整。
                    </p>
                  </Banner>

                  <BlockStack gap="300">
                    <PlacementRow
                      label="全站页脚横条"
                      carrier="应用嵌入"
                      state={placements.siteWide}
                      onToggle={(v) => toggle('siteWide', v)}
                      description="页脚上方的一条细横条，所有页面可见。"
                      recommended
                    />

                    <PlacementRow
                      label="商品页区块"
                      carrier="应用区块"
                      state={placements.productPage}
                      onToggle={() => {}}
                      description="在主题编辑器中添加区块，然后在这里确认。"
                      action={
                        <InlineStack gap="200">
                          <Button
                            size="micro"
                            onClick={() =>
                              setToast(
                                '生产环境中这里会深链到你的主题编辑器。原型：未连接主题。'
                              )
                            }
                          >
                            打开主题编辑器
                          </Button>
                          <Button size="micro" onClick={() => setConfirmBlock(true)}>
                            我已添加区块
                          </Button>
                          <Button
                            size="micro"
                            variant="plain"
                            onClick={() =>
                              setToast(
                                '再次检查在 v1 中是手动确认：我们不申请 read_themes 权限。'
                              )
                            }
                          >
                            再次检查
                          </Button>
                        </InlineStack>
                      }
                    />

                    <PlacementRow
                      label="购物车页"
                      carrier="应用嵌入（共享）"
                      state={placements.cartPage}
                      onToggle={(v) => toggle('cartPage', v)}
                      description="展示在购物车金额上方。"
                    />

                    <PlacementRow
                      label="购物车抽屉"
                      carrier="应用嵌入（共享）"
                      state={placements.cartDrawer}
                      onToggle={(v) => toggle('cartDrawer', v)}
                      description="展示在滑出式购物车内。"
                    />
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      外观
                    </Text>
                    <RadioButton
                      label="完整告知"
                      id="full"
                      name="display"
                      checked={appearance.display === 'full'}
                      onChange={() => setAppearance((a) => ({ ...a, display: 'full' }))}
                    />
                    <RadioButton
                      label="折叠"
                      id="collapsed"
                      name="display"
                      checked={appearance.display === 'collapsed'}
                      onChange={() => setAppearance((a) => ({ ...a, display: 'collapsed' }))}
                      helpText="折叠时只显示保证期。展开可查看完整告知。"
                    />

                    <div style={{ maxWidth: 320 }}>
                      <Select
                        label="位置"
                        value={appearance.position}
                        onChange={(v) => setAppearance((a) => ({ ...a, position: v }))}
                        options={[
                          { label: '页脚横条', value: 'footer' },
                          { label: '顶部横条', value: 'top' },
                        ]}
                      />
                    </div>

                    <div style={{ maxWidth: 320 }}>
                      <Select
                        label="预览语言"
                        value={appearance.previewLocale}
                        onChange={(v) => setAppearance((a) => ({ ...a, previewLocale: v }))}
                        options={locales.map((l) => ({ label: `${l.name} (${l.code})`, value: l.code }))}
                        helpText="买家始终看到自己的语言。这里只改变预览。"
                      />
                    </div>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    实时预览
                  </Text>
                  <Badge tone="info">{langCode}</Badge>
                </InlineStack>
                <div className="storefront">
                  <div className="storefront-inner">
                    <BlockStack gap="200">
                      <div
                        style={{
                          height: 90,
                          background: '#f6f6f7',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#8c9196',
                          fontSize: 12,
                        }}
                      >
                        商品页 · Nordwind 供应店
                      </div>
                      <Text as="p" variant="bodySm" tone="subdued">
                        经典滑雪板：Hydrogen
                      </Text>
                    </BlockStack>
                  </div>
                  <div className="storefront-notice-strip">
                    {appearance.display === 'full' ? (
                      <img src={imgSrc} alt="欧盟法律保证告知" />
                    ) : (
                      <InlineStack gap="200" blockAlign="center">
                        <span style={{ fontSize: 14 }}>▸</span>
                        <Text as="span" variant="bodySm">
                          法律保证
                        </Text>
                      </InlineStack>
                    )}
                  </div>
                </div>
                <Text as="p" tone="subdued" variant="bodySm">
                  来自欧盟委员会的真实官方素材。在上方切换语言 —— 全部 24 种在 Free 套餐可用。
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {confirmBlock && (
          <Modal
            open
            onClose={() => setConfirmBlock(false)}
            title="确认商品页区块"
            primaryAction={{ content: '是，已放置', onAction: confirmProductBlock }}
            secondaryActions={[{ content: '取消', onAction: () => setConfirmBlock(false) }]}
          >
            <Modal.Section>
              <BlockStack gap="300">
                <Text as="p">
                  打开你的主题编辑器，添加 <strong>EU 保证 —— 商品页区块</strong>，然后回来确认。这条确认会写入审计日志。
                </Text>
                <Banner tone="warning">
                  <p>
                    我们刻意不读取你的主题文件。申请主题访问权限可以自动检测，但那是我们不需要的权限。
                  </p>
                </Banner>
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </>
  )
}

function PlacementRow({ label, carrier, state, onToggle, description, action, recommended }) {
  return (
    <Box padding="300" borderColor="border" borderWidth="025" borderRadius="200">
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Checkbox
              label={label}
              checked={state.enabled}
              onChange={onToggle}
              disabled={!onToggle || label === '商品页区块'}
            />
            {recommended && <Badge tone="success">推荐</Badge>}
          </InlineStack>
          <Badge tone={state.enabled ? 'success' : undefined}>
            {state.enabled ? '生效中' : '关闭'}
          </Badge>
        </InlineStack>
        <Text as="p" tone="subdued" variant="bodySm">
          {description}
        </Text>
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" tone="subdued" variant="bodySm">
            {carrier}
          </Text>
          {action}
        </InlineStack>
      </BlockStack>
    </Box>
  )
}
