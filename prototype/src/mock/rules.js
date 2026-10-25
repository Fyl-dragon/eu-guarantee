// 排除规则：决定商品是否 EXCLUDED
// 对应 UX-FLOWS.md §5.3
export const exclusions = {
  digital: true,     // 法规排除，不可关
  giftCard: true,    // 法规排除，不可关
  b2bTags: ['b2b', 'wholesale', 'trade-only'],
  b2b: true,
  customTags: [],
  customTagsEnabled: false,
  // 手动排除用商品 id 列表
  manual: ['p8'],
}
