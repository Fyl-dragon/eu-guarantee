// 店铺与语言 mock
export const shop = {
  name: 'Nordwind 供应店',
  domain: 'nordwind-supply.myshopify.com',
  primaryLocale: '英语',
  primaryLocaleCode: 'en',
  euLocales: ['DE', 'FR', 'PL', 'NL'],
  plan: 'free', // 'free' | 'growth' | 'pro'
}

export const locales = [
  { code: 'BG', name: '保加利亚语' },
  { code: 'CS', name: '捷克语' },
  { code: 'DA', name: '丹麦语' },
  { code: 'DE', name: '德语' },
  { code: 'EL', name: '希腊语' },
  { code: 'EN', name: '英语' },
  { code: 'ES', name: '西班牙语' },
  { code: 'ET', name: '爱沙尼亚语' },
  { code: 'FI', name: '芬兰语' },
  { code: 'FR', name: '法语' },
  { code: 'GA', name: '爱尔兰语' },
  { code: 'HR', name: '克罗地亚语' },
  { code: 'HU', name: '匈牙利语' },
  { code: 'IT', name: '意大利语' },
  { code: 'LT', name: '立陶宛语' },
  { code: 'LV', name: '拉脱维亚语' },
  { code: 'MT', name: '马耳他语' },
  { code: 'NL', name: '荷兰语' },
  { code: 'PL', name: '波兰语' },
  { code: 'PT', name: '葡萄牙语' },
  { code: 'RO', name: '罗马尼亚语' },
  { code: 'SK', name: '斯洛伐克语' },
  { code: 'SL', name: '斯洛文尼亚语' },
  { code: 'SV', name: '瑞典语' },
]

// notice 位置状态
export const noticePlacements = {
  siteWide: { enabled: true, live: true },
  productPage: { enabled: false, live: false, manuallyConfirmed: false },
  cartPage: { enabled: false, live: false },
  cartDrawer: { enabled: false, live: false },
}

export const noticeAppearance = {
  display: 'full', // 'full' | 'collapsed'
  position: 'footer', // 'footer' | 'top'
  previewLocale: 'EN',
}

// producerName / producerAddress 是法律实体信息，保留原文
// GARAN 店面展示偏好（原型内存状态）
export const garanDisplaySettings = {
  showNewLabels: true,
}

export const statementConfig = {
  claimScope: 'producer',
  producerName: 'Nordwind Supply GmbH',
  producerAddress: 'Hafenstraße 12\n20457 Hamburg\nGermany',
  steps: '发送邮件至 support@nordwind-supply.example 并附上订单号。',
  coveredGoods: '所有带有 GARAN 标签的滑雪板和滑雪装备。',
  terms: '由我们酌情提供维修或更换。正常磨损除外。',
  coveredComponents: 'whole',
  isActive: false,
}
