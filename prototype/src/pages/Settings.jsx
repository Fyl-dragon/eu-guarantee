import React, { useState } from 'react'
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Select,
  Divider,
  Banner,
  Box,
  Button,
  Modal,
  Toast,
} from '@shopify/polaris'
import { locales } from '../mock/store.js'

export default function Settings({ ctx }) {
  const { shop, setShop } = ctx
  const [overrideLang, setOverrideLang] = useState('none')
  const [uninstallOpen, setUninstallOpen] = useState(false)
  const [toast, setToast] = useState(null)

  return (
    <>
      <Page title="设置" subtitle="店铺信息、语言行为，以及卸载时会发生什么。">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    店铺
                  </Text>
                  <KV k="店铺" v={shop.name} />
                  <KV k="域名" v={shop.domain} />
                  <KV k="主语言" v={shop.primaryLocale} />
                  <KV k="检测到的欧盟市场" v={shop.euLocales.join(', ') || '无'} />
                  <KV k="套餐" v={shop.plan === 'free' ? 'Free' : shop.plan === 'growth' ? 'Growth $4.99' : 'Pro $9.99'} />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    语言行为
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    告知自动跟随买家自己的语言。全部 24 种官方语言包含在每个套餐里 —— 包括 Free。
                  </Text>
                  <Divider />
                  <div style={{ maxWidth: 360 }}>
                    <Select
                      label="告知的手动覆盖"
                      value={overrideLang}
                      onChange={setOverrideLang}
                      options={[
                        { label: '跟随买家语言（推荐）', value: 'none' },
                        ...locales.map((l) => ({ label: `${l.name} (${l.code})`, value: l.code })),
                      ]}
                      helpText="覆盖会为所有人固定语言。仅建议单语言店铺使用。"
                    />
                  </div>
                  <Banner tone="info">
                    <p>
                      素材本身永远不能被应用编辑或翻译 —— 只展示欧盟委员会的官方文件。
                    </p>
                  </Banner>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    权限
                  </Text>
                  <BlockStack gap="200">
                    <PermissionRow label="读写商品" granted reason="用于存储 GARAN 字段。" />
                    <PermissionRow label="读取主题" granted={false} reason="未申请 —— 位置由你自己确认。" />
                    <PermissionRow label="写入店铺文件" granted={false} reason="未申请。" />
                    <PermissionRow label="读取客户" granted={false} reason="未申请 —— 不读取任何个人数据。" />
                  </BlockStack>
                  <Text as="p" tone="subdued" variant="bodySm">
                    只需要 <span className="mono">write_products</span>。声明在订单状态页从公开数据渲染，因此从不读取买家邮箱或地址。
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    卸载
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    移除应用会自动移除应用嵌入与商品区块。存储的 GARAN 值与审计日志立即删除 —— 主题里不会留下任何东西。
                  </Text>
                  <Button tone="critical" onClick={() => setUninstallOpen(true)}>
                    移除应用
                  </Button>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    关于这个原型
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Mock 数据，不连接店铺。侧边栏的套餐切换器只改变一个本地标志，供你查看付费墙。
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {uninstallOpen && (
          <Modal
            open
            onClose={() => setUninstallOpen(false)}
            title="移除应用？"
            primaryAction={{
              content: '移除（演示）',
              destructive: true,
              onAction: () => {
                setUninstallOpen(false)
                setToast('仅演示 —— 没有卸载任何东西。')
              },
            }}
            secondaryActions={[{ content: '取消', onAction: () => setUninstallOpen(false) }]}
          >
            <Modal.Section>
              <BlockStack gap="200">
                <Text as="p">应用存储的所有内容都会被删除，包括：</Text>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>所有商品上的 GARAN 标签值</li>
                  <li>排除规则</li>
                  <li>审计历史</li>
                  <li>已发布的声明</li>
                </ul>
                <Text as="p" tone="subdued" variant="bodySm">
                  你的主题、商品和订单不受影响。
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

function KV({ k, v }) {
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

function PermissionRow({ label, granted, reason }) {
  return (
    <InlineStack align="space-between" blockAlign="center" gap="300">
      <BlockStack gap="050">
        <Text as="span" variant="bodySm">
          {label}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {reason}
        </Text>
      </BlockStack>
      <Badge tone={granted ? 'success' : undefined}>{granted ? '已申请' : '未申请'}</Badge>
    </InlineStack>
  )
}
