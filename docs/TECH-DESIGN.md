# TECH-DESIGN — EU Guarantee & Warranty

> 版本：**v1.2**（2026-10-23，前身项目研究回填 + 复用表纠错）
> 上游：`PRD.md` v1.2、`UX-FLOWS.md` v1.0、`../../market-research/18-requirement-matrix.md` v1.1、
> **`../../market-research/21-asset-verification.md`**（实测数据）
> 状态：**待评审**。本文件通过前不写功能代码。
>
> 本文件只回答"怎么做"，不重复"做什么"（那是 PRD）与"怎么交互"（那是 UX-FLOWS）。
> 每个关键决策都标注了它解决的验收用例（T1–T12）。
> 阅读路由见 `INDEX.md`，不要整读本文件。
>
> **v1.1 变更**：3.3 资产策略重写（不再预渲染 WebP）、3.4.1 修正"三 text = 三字段"的错误假设、
> 3.4.2 年限上限有几何证据、新增第 11 节（折叠态用嵌套版 SVG）、
> 新增 A1（字体未内嵌）/ A2（brand/model 写入位置未知）两个 M3 阻塞项。
>
> **v1.2 变更**：从已废弃的 `ReorderFlow` 研究抽取三节 ——
> 新增 §4.2.1 订单状态页三种认证态（匿名/预认证/完全认证）、
> §4.5 扩展运行时约束（`network_access` / CORS / bundle 上限）、
> §4.6 session token 语义三误用；§4.4 降级表扩为 6 行。
> 修正 §1.2 复用表三处事实错误（`billing` 真实路径、`vitest.config.ts` 不存在、Playwright 未使用）。

---

## 1. 技术栈与复用

### 1.1 栈（沿用 `quote-forge` 已验证的组合）

| 层      | 选型                                                     | 理由                                                   |
| ------- | -------------------------------------------------------- | ------------------------------------------------------ |
| 运行时  | Node ≥ 22.12                                             | 模板默认                                               |
| 框架    | **React Router 7** + `@shopify/shopify-app-react-router` | `rfq-v1` 已在真实 dev store 跑通鉴权、billing、webhook |
| 数据库  | **Prisma 6** + PostgreSQL                                | 迁移与会话存储已就绪                                   |
| 后台 UI | Polaris（App Home，iframe 模型）                         | 与 Shopify 后台一致；不需要自建设计系统                |
| 店面    | **Theme App Extension**（Liquid + 少量 JS）              | 零主题侵入，卸载零残留                                 |
| 买家侧  | **Customer Account UI Extension**（2026-07）             | 订单状态页原生宿主，不需要读 orders scope              |
| 测试    | Vitest（单测）；Playwright 需**新装**（`rfq-v1` 未用）    | 单测部分沿用，E2E 工具链为本项目新增                   |

### 1.2 从 `rfq-v1` 直接复用的资产

| 资产                                                      | 位置                                     | 复用方式                                         |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Shopify 鉴权与安装流程                                    | `app/shopify.server.ts`（71 行）         | 直接沿用，改 `scopes`                            |
| Prisma session storage                                    | `prisma/schema.prisma` 的 `Session` 模型 | 原样保留                                         |
| Billing 封装                                              | `app/lib/billing.server.ts`              | 改为 Free/Starter/Pro 三档                       |
| Webhook 骨架（含 `app/uninstalled`、`app/scopes_update`） | `app/routes/webhooks.*`                  | 增加三个 GDPR webhook                            |
| Theme App Extension 骨架                                  | `extensions/quote-forge/`                | 目录重建，但 `shopify.extension.toml` 结构可参考 |
| Vitest 依赖                                               | `package.json` 的 `vitest` devDependency | **无独立配置文件**，测试从 `vite.config.ts` 读配置 |
| PCD `ACCESS_DENIED` 处理模式                              | 前身 `app/lib/`（已随代码保留）          | **不适用**：新方向不碰受保护客户数据             |

> **2026-10-23 核对修正**：原表写 `app/billing.server.ts` 与 `vitest.config.ts`，二者均不存在。
> 实际路径为 `app/lib/billing.server.ts`；vitest 只配在 `package.json` 的 scripts + devDependencies，
> 没有独立配置文件（`vite.config.ts` 中也无 `test` 段）。复制脚手架时按本表执行。

**不继承**：任何 RFQ 业务模型、`draftOrder` 相关代码、PCD 申请表。

> 上述文件当前**仍在本地** `../../quote-forge/`（仅删了 `node_modules`，代码未删）。
> 若将来删除该目录，可从 GitHub `Fyl-dragon/quote-forge` 的 `rfq-v1` tag 取回。

### 1.3 目录结构

```
eu-guarantee/
├── app/
│   ├── routes/
│   │   ├── app.tsx                    嵌入式后台布局
│   │   ├── app._index.tsx             Home（四行状态）
│   │   ├── app.notice.tsx             Legal notice 配置
│   │   ├── app.garan.tsx              GARAN 列表
│   │   ├── app.garan.$id.tsx          GARAN 编辑（唯一写入入口）
│   │   ├── app.exclusions.tsx         排除规则
│   │   ├── app.statement.tsx          Statement 配置（Starter+）
│   │   ├── app.audit.tsx              快照 / 历史 / 导出
│   │   ├── app.settings.tsx
│   │   ├── s.$token.tsx               ★ 公开可打印声明页（无登录）
│   │   ├── api.webhooks.tsx            统一 webhook 入口
│   │   └── auth.$.tsx
│   ├── domain/                        ★ 纯函数，不依赖 Shopify
│   │   ├── eligibility.server.ts      validateGaranEligibility（唯一真相）
│   │   ├── exclusion.server.ts        排除规则判定
│   │   ├── garan-svg.server.ts        官方 SVG 三字段替换
│   │   ├── statement.server.ts        C1–C5 组装
│   │   ├── consistency.server.ts      validateSnapshotConsistency（B0-6）
│   │   ├── audit.server.ts            事件写入
│   │   └── token.server.ts            HMAC 签名/验证
│   ├── i18n/
│   │   └── c1-statements.ts           C1 固定文案（多语言，见 7.3）
│   └── shopify.server.ts
├── extensions/
│   ├── eu-notice/                     app embed（全站 / 购物车）
│   └── eu-garan/                      app block（商品页）
├── extensions/customer-account/       声明交付（order-status.block.render）
├── prisma/schema.prisma
├── assets/garan/                      ★ 官方 GARAN SVG（单一版本）
└── docs/
```

**关键约束**：`app/domain/` 里**不允许 import** `@shopify/*`。
所有校验必须是可直接单测的纯函数，Shopify 相关 IO 全部在 route 层。
这条是为了让 T3/T4c/T5b 的测试不依赖 mock Shopify。

---

## 2. 数据模型

### 2.1 核心设计：DB 是真相，metafield 是渲染缓存

```
        商家操作
           ↓
      [Prisma 写入]  ← 唯一真相（可审计、可回溯）
           ↓
   [发布时投影到 metafield]  ← 渲染缓存（Liquid 零延迟读）
           ↓
   店面 app embed / app block 读取
```

**为什么不全放 metafield**（像 EU Warranty / Pandectes 那样）：

| 需求                               | 只放 metafield    | DB + metafield |
| ---------------------------------- | ----------------- | -------------- |
| 变更历史（谁/何时/改了什么）       | ❌ 只能存最后一份 | ✅             |
| 配置版本化（PDF 快照）             | ❌                | ✅             |
| 被拒尝试留痕（D-4）                | ❌                | ✅             |
| Statement 配置版本（签名链接引用） | ❌                | ✅             |
| 店面读取延迟                       | ✅ 0              | ✅ 0（读投影） |

**为什么不全靠 app proxy 读 DB**：多一次网络往返，直接违反 CLS/LCP 预算（T8）。

**投影时机**：任何写入提交后，在同一事务提交后异步执行 `publishProjection(shop)`。
若投影失败，标记 `dirty` 并在下次访问后台时重试；店面继续用上一版（可用 > 一致但坏）。

### 2.2 Prisma 模型

```prisma
model Shop {
  id                String   @id @default(cuid())
  domain            String   @unique
  primaryLocale     String   @default("en")
  enabledLocales    String[] @default([])
  hasEuMarket       Boolean  @default(false)

  noticeFooter      Boolean  @default(true)
  noticeProduct     Boolean  @default(false)
  noticeCartPage    Boolean  @default(false)
  noticeCartDrawer  Boolean  @default(false)
  noticeDisplay     NoticeDisplay @default(FULL)   // FULL | COLLAPSED

  plan              Plan     @default(FREE)         // FREE | STARTER | PRO
  trialEndsAt       DateTime?
  projectionDirty   Boolean  @default(true)
  projectionVersion Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  products          ProductConfig[]
  exclusionRules    ExclusionRule[]
  statements        StatementVersion[]
  auditEvents       AuditEvent[]
  garanLabels       GaranLabel[]
}

enum NoticeDisplay { FULL, COLLAPSED }
enum Plan          { FREE, STARTER, PRO }

/// 每个商品的资格事实（UX-FLOWS 5.2 的"三条事实"）
model ProductConfig {
  id                    String  @id @default(cuid())
  shopId                String
  productGid            String            // gid://shopify/Product/123
  productTitle          String            // 快照，用于列表与声明渲染
  variantCount          Int     @default(1)

  // 排除判定（由 exclusion.server.ts 计算，缓存结果）
  isExcluded            Boolean @default(false)
  exclusionReason       String?           // DIGITAL | GIFT_CARD | B2B_TAG | CUSTOM_TAG | MANUAL | PARTIAL

  // 法定前提（B0-1/2/3）
  guaranteeFreeOfCharge Boolean?
  coverage              Coverage?
  years                 Int?

  // 标签字段（B9–B11）
  brand                 String?
  model                 String?

  // 派生状态（冗余，便于查询与列表过滤）
  state                 GaranState @default(NOT_REVIEWED)

  shop                  Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([shopId, productGid])
  @@index([shopId, state])
}

enum Coverage   { WHOLE, PARTIAL }
enum GaranState { EXCLUDED, NOT_REVIEWED, ELIGIBLE_UNLABELLED, LABELLED }

model GaranLabel {
  id             String   @id @default(cuid())
  shopId         String
  productGid     String
  brand          String
  model          String
  years          Int
  publishedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([shopId, productGid])
}

model ExclusionRule {
  id        String      @id @default(cuid())
  shopId    String
  type      RuleType    // B2B_TAG | CUSTOM_TAG | MANUAL_PRODUCT
  value     String      // tag 名，或 productGid
  enabled   Boolean     @default(true)
  createdAt DateTime    @default(now())

  shop      Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  @@unique([shopId, type, value])
}

enum RuleType { B2B_TAG, CUSTOM_TAG, MANUAL_PRODUCT }

/// 配置快照（D1）：每次发布生成一版，不可变
model ConfigSnapshot {
  id            String   @id @default(cuid())
  shopId        String
  version       Int
  payload       Json     // 完整配置投影（见 2.4）
  checksum      String   // payload 的 sha256
  createdBy     String?  // staff 标识（不含个人信息）
  createdAt     DateTime @default(now())

  @@unique([shopId, version])
}

/// 商业保证声明（C1–C5），版本化
model StatementVersion {
  id            String   @id @default(cuid())
  shopId        String
  version       Int
  producerName  String
  producerAddr  String
  claimSteps    Json     // string[]，C3
  terms         String   // C5，富文本 → 存净化后的 HTML
  c1Locale      String   @default("en")
  isActive      Boolean  @default(false)
  createdAt     DateTime @default(now())

  shop          Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  @@unique([shopId, version])
}

model AuditEvent {
  id         String   @id @default(cuid())
  shopId     String
  kind       AuditKind
  actor      String?          // staff id，不含姓名/邮箱
  targetType String?          // PRODUCT | CONFIG | STATEMENT
  targetId   String?
  summary    String           // 人类可读: "GARAN label set to 3 years"
  detail     Json?
  rejectedReasons String[]    @default([])   // D-4: 被拒原因
  createdAt  DateTime @default(now())

  shop       Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  @@index([shopId, createdAt])
}

/// 被拒尝试单独建表：数量可能远大于正常变更，且要能快速统计
model RejectedAttempt {
  id         String   @id @default(cuid())
  shopId     String
  productGid String?
  reasons    String[]
  source     String   // UI | BULK | CSV | API | EXPORT
  createdAt  DateTime @default(now())

  @@index([shopId, createdAt])
}

enum AuditKind { CONFIG_CHANGED, LABEL_ADDED, LABEL_REMOVED, EXCLUSION_CHANGED,
                 STATEMENT_PUBLISHED, SNAPSHOT_CREATED, REJECTED, EXPORT_BLOCKED }
```

**没有 `Order` / `Customer` 模型。** 这是刻意的：不存任何买家数据，
是"不需要 PCD Level 2"的物理保证，而不是承诺（见 `SECURITY-PCD.md`）。

### 2.3 GARAN 命名的唯一性约束

`@@unique([shopId, productGid])` on `GaranLabel` 保证一商品一标签。
竞品允许同一商品在"排除态"下仍有 label（缺陷 1）——**数据库层面就禁止**：
`GaranLabel` 存在 ⇒ `ProductConfig.state` 必须为 `LABELLED`，
由 `validateGaranEligibility` 在写入时强制，并由 `consistency.server.ts` 定期核对。

### 2.4 投影到 metafield

| metafield        | 归属        | 内容                                              | 大小预算 |
| ---------------- | ----------- | ------------------------------------------------- | -------- |
| `$app:eu.config` | shop        | 位置开关、显示形态、语言集、版本号、排除 tag 列表 | < 4 KB   |
| `$app:eu.garan`  | **product** | `{brand, model, years, version}`                  | < 300 B  |

**必须使用 `$app` 命名空间**：Shopify 在应用卸载时自动删除 app-owned metafields
（这是"卸载零残留"T9 的实现基础，不依赖我们的清理代码跑成功）。

投影 payload（`$app:eu.config`）：

```json
{
  "v": 12,
  "loc": ["de", "fr", "pl"],
  "primary": "en",
  "positions": {
    "footer": true,
    "product": true,
    "cart": true,
    "drawer": false
  },
  "display": "full",
  "excludedTags": ["b2b", "wholesale", "trade-only"],
  "statement": { "active": true, "version": 3 }
}
```

**不投影商品清单**。商品级数据在 product metafield 上，
以 `product.metafields.app.eu.garan` 直接读取 —— 这样商品数增长不会撑爆 shop metafield。

---

## 3. Theme App Extension

### 3.1 两个扩展，而不是一个

| 扩展        | 类型          | 宿主                   | 用途                       |
| ----------- | ------------- | ---------------------- | -------------------------- |
| `eu-notice` | app embed     | `head` / `body` 注入   | 全站页脚条 + 购物车页/抽屉 |
| `eu-garan`  | **app block** | 商品页模板（商家放置） | GARAN 标签 + 商品页 notice |

**为什么分开**：app embed 是全局常驻（每页都渲染），app block 是商家可选放置。
合成一个扩展会导致(app embed 内含 block 逻辑)无法在主题编辑器里单独控制位置。

### 3.2 app embed 的渲染形态

```liquid
{% comment %} extensions/eu-notice/blocks/notice.liquid {% endcomment %}
{% assign cfg = shop.metafields.app.eu.config.value %}

{% if cfg.positions.footer or cfg.positions.cart %}
  {% assign locale = request.locale.iso_code | slice: 0, 2 | downcase %}
  {% unless cfg.loc contains locale %}{% assign locale = cfg.primary %}{% endunless %}

  <div class="eu-notice" data-locale="{{ locale }}"
       data-display="{{ cfg.display }}"
       data-version="{{ cfg.v }}">
    {% render 'eu-notice-artwork', locale: locale, display: cfg.display %}
  </div>

  {{ 'eu-notice.css' | asset_url | stylesheet_tag }}
  <script src="{{ 'eu-notice.js' | asset_url }}" defer></script>
{% endif %}
```

**关键点**：

1. **渲染决策在 Liquid 里完成**，不需要 JS 判断是否显示 → 无 CLS、无闪烁。
2. 语言判定：`request.locale` → 白名单 → `cfg.primary`。
   **不用 `Accept-Language`**（与 Consentico 不同）：服务端无法可靠获取，
   客户端判定会导致首屏闪变（CLS）。这一条牺牲了一点点准确性换取 T8。
3. `data-version` 用于客户端检测配置是否过期（见 3.5）。

### 3.3 24 语言 artwork 的加载策略（T8 的核心）

> **2026-10-22 实测修正**（见 `../../market-research/21-asset-verification.md`）。
> 本节 v1.0 基于 raw 体积，结论偏差较大，已重写。

**实测数据（24 语言彩色 notice SVG）**：

| 指标            | 值                                    |
| --------------- | ------------------------------------- |
| raw             | 485 KB – 686 KB（单个）               |
| **gzip**        | **54 KB – 79 KB（单个，平均 62 KB）** |
| 24 个 raw 之和  | ~14 MB（**这不是传输量**）            |
| 24 个 gzip 之和 | ~1.5 MB（但单页只加载 1 个）          |

**因此"14 MB 不可加载"的说法是错的**——真实单次传输约 **60 KB**，
与 WebP 目标（50–80 KB）**同一量级**。

| 方案                             | 首次传输                               | 印刷质量         | 判定                    |
| -------------------------------- | -------------------------------------- | ---------------- | ----------------------- |
| 24 个 SVG 全内联到 HTML          | gzip 后 ~60 KB（**只内联一个语言的**） | 矢量             | ✅ 可行                 |
| **单 SVG + `<img src>`（gzip）** | **~60 KB**                             | **矢量**         | ✅ **采用**             |
| 预渲染 WebP                      | ~50–80 KB                              | 位图，打印需另备 | ⚠️ **收益极小，不采用** |
| 预渲染 PNG                       | ~120 KB                                | 位图             | ❌ 更差                 |

**决策：直接分发官方 SVG 原件（gzip/brotli），不预渲染。**

```
extensions/eu-notice/assets/notice-{locale}.svg     # 24 个，raw 0.5–0.7 MB，gzip ~60 KB
assets/print/notice-{locale}.svg                    # 同一份，供打印页复用
```

- **不需要 @2x/@3x**：矢量天然无限分辨率。
- `loading="lazy"` 用在购物车/页脚（可能首屏外）；商品页 block 用 `eager`。
- **必须确保 CDN/服务器对 `.svg` 启用 gzip 或 brotli。**
  若 Shopify Theme App Extension 的 asset CDN 不压缩 SVG（**需实测确认**），
  则退回"构建期预生成 WebP + 单独打印用 SVG"的混合方案。

**意外收获**：官方 notice SVG 的 viewBox 是 **`0 0 595.28 841.89`，即 A4 尺寸（pt）**。
这意味着**同一份文件既用于屏幕也用于 A4 打印**，`18` A8 自动满足，
不需要单独的印刷版资源（原 P2 项可去掉）。

> **⚠️ 必修前置项（A1）**：官方 SVG **未内嵌字体**（`@font-face` = 0，
> `font-family: Inter-ExtraBold, Inter`）。直接分发会导致访客浏览器回退到系统
> sans-serif，**字形与官方设计不符**，可能被视为篡改官方 artwork（违反 `18` A4 / B1）。
>
> **处理方案（M1 评审决定）**：
>
> - **方案 A**：app 自带 Inter WOFF2（subset，~20–40 KB），页面 `@font-face` 声明，
>   配合内联 SVG 使用。**推荐**（保住矢量 + 可打印）。
> - **方案 B**：构建期把固定文案的 `<text>` 转 `<path>`（需 fonttools），
>   彻底摆脱字体依赖。更彻底但工具链更重。
> - **方案 C**：忽略（用系统字体）。**不可接受**——等于改变官方设计。
>
> 注意 `notice.zip` 的 PNG/JPG 版本不依赖字体，但**无矢量、且已知缺英语**。

### 3.4 GARAN 标签：内联 SVG（与其他资产相反）

> **2026-10-22 实测修正**：体积与文本结构均有新数据。

GARAN 标签**必须内联**，不能 `<img>`：

| 原因               | 说明                                         |
| ------------------ | -------------------------------------------- |
| 字段必须实时替换   | `<img>` 无法注入 `brand` / `model` / `years` |
| 需要精确的边界控制 | 长 brand 名需要裁剪或拒绝（见 3.4.2）        |
| 实测体积可接受     | raw **294 KB** / **gzip 27 KB**（`21` 2.2）  |

**两种官方尺寸，用途不同**（`21` 5.1）：

| 文件                             | viewBox                       | 可编辑点                 | gzip       | 用途                      |
| -------------------------------- | ----------------------------- | ------------------------ | ---------- | ------------------------- |
| `GARAN Label_colour.svg`         | `269.29 × 283.46`（近正方形） | 3 个 text                | 27 KB      | **完整标签**（FULL 形态） |
| `GARAN Label_nested display.svg` | `368.5 × 56.69`（长条）       | **1 个 text（仅 `XX`）** | **3.3 KB** | **折叠态**（COLLAPSED）   |

→ **折叠态只显示年数，不显示 brand/model。**
`COLLAPSED` 应使用嵌套版（3.3 KB），而不是把完整版缩小。

#### 3.4.1 字段替换（服务端完成，不在客户端）

> **⚠️ 重要修正（A2）**：`21` 2.3 的源码分析显示，3 个 `<text>` 中
> **只有 1 个是值，另外 2 个是字段名标签**：
>
> | #   | 内容                                 | 性质                     |
> | --- | ------------------------------------ | ------------------------ |
> | 1   | `Brand/Trademark`（拆成 3 个 tspan） | **字段名标签**，不可替换 |
> | 2   | `Model identifier`                   | **字段名标签**，不可替换 |
> | 3   | `XX`                                 | **值**（年数）           |
>
> 因此 `17` 附录 B 的"3 个 text = 恰好对应三个可编辑字段"**是错的**。
> **brand / model 的实际填写位置尚未确认**（`21` 第六节第 1 项）。
>
> 这条直接决定实现方式：
>
> - 若是"替换 text"→ 需先在 SVG 里找到对应空位
> - 若是"叠加层"→ 需计算文本基线、字号、对齐，并在容器上做裁剪
>
> **M3 前必须先解决**（对比 `A2-18` 已填写截图与本空白模板的差异）。

```ts
// app/domain/garan-svg.server.ts
export function renderGaranSvg(
  template: string, // 官方 SVG 原文，构建期加载
  { brand, model, years }: GaranFields,
): string {
  // 已知：year 替换第 3 个 <text> 的 tspan 内容（"XX" → 数字）
  // 待定：brand / model 的写入位置与方式
  // 必须：全部转义 < & " '，并断言 <text> 数量与预期一致（不平衡则抛错）
}
```

**替换必须在服务端**。若在客户端做，商家可用 devtools 改成任意值（T2 失败），
且会暴露"这是可编辑的"信号。

#### 3.4.2 长文本与语言膨胀

| 字段    | 上限       | 超限处理                     |
| ------- | ---------- | ---------------------------- |
| `brand` | 60 字符    | 拒绝保存（不截断，避免误导） |
| `model` | 40 字符    | 拒绝保存                     |
| `years` | 整数，3–99 | 拒绝保存                     |

**为什么是拒绝而不是截断**：标签上的 brand/model 是可识别的法律主体与型号，
截断会造成错误标识。竞品把 `2.5` 直接渲染进 `XX` 位（`17` 3A.4），
本质是"宁可渲染错的也不报错"——我们反过来。

`years` 上限设 99 **已有几何证据**（`21` 2.5）：

- `XX` 文本起点 `x=5.07`，同排右侧第一个图形元素（日历图标）在 `x=121.47`
- **可用宽度 ≈ 116.4 units**，字号 80px
- 实测字形宽度：`99` ≈ 89.0（可容）、**`100` / `999` ≈ 133.5（必然溢出）**

→ **三位数在几何上不可行，上限 99 是硬约束**（原"需设计稿确认"已解决）。

> **注意**：上限 99 意味着"100 年保证"无法录入。这在实务上不构成限制，
> 但 UI 错误文案必须说清"最大 99 年"，而不是笼统的"数值无效"。

#### 3.4.3 block 输出

```liquid
{% comment %} extensions/eu-garan/blocks/garan.liquid {% endcomment %}
{% assign g = product.metafields.app.eu.garan.value %}
{% assign cfg = shop.metafields.app.eu.config.value %}

{% if g and g.years %}
  {% render 'eu-garan', fields: g, locale: request.locale.iso_code %}
{% elsif cfg.positions.product %}
  {% render 'eu-notice-artwork', locale: request.locale.iso_code, display: 'full' %}
{% endif %}
```

**逻辑**：有 GARAN → 只显示 GARAN；无 GARAN 但开了商品页 notice → 显示 notice。
两者同时显示是 Consentico 与 EU Warranty 的现状（`17` 4.1 缺陷 4），
但我们认为这是合理的（notice 是法定，GARAN 是自愿，**两者本应并列**）。
**所以这一条不是缺陷，不需要"修"** —— 需要修的是"被排除商品也显示"。

### 3.5 配置新鲜度

Liquid 读 metafield 是静态的；若后台改了配置，投影完成后店面才更新（秒级）。
不需要客户端轮询。`data-version` 仅用于调试与自检页比对。

### 3.6 CSS 隔离与可覆盖性

- 所有 class 前缀 `eu-`，不使用全局选择器。
- 提供 `--eu-*` CSS 变量供商家微调**外围**（卡片背景、间距、链接颜色）。
- **不提供**任何修改 artwork 内部元素的能力（`18` B1–B7、T2）。
- `[设计判断]` 不提供自定义 CSS 输入框（Consentico Business 给了，但它同时也说"官方部分不可改"，
  两者在实现上必然冲突）。

---

## 4. Customer Account UI Extension（声明交付）

### 4.1 目标与目标选择

| 目标                                         | 用途                                            |
| -------------------------------------------- | ----------------------------------------------- |
| `customer-account.order-status.block.render` | 在订单状态页插入"Your commercial guarantee"卡片 |

**只注册这一个 target。** `cart-line-item.render-after` 不用（那是订单行级，太碎）。

### 4.2 数据来源（关键：不读 PII）

```
Extension 运行在买家浏览器
   ↓ 通过 Order Status API 拿到 order.lineItems[].merchandise.product.id
   ↓ 只取 product id（不取任何客户姓名/地址/邮箱）
   ↓ 调用 app backend /api/statement?ids=...&locale=...
   ↓ backend 返回 C1–C5 内容（来自 StatementVersion + GaranLabel）
```

**买家身份校验**：customer account extension 使用 Session Token API（JWT）。
后端用 `@shopify/shopify-app-react-router` 的 `authenticate.public.customerAccount`
验证 token，从中取 `shop` 与 `customerId`（**只用于校验，不落库**）。

### 4.2.1 订单状态页的三种认证态

> **来源**：前身项目 `../../ReorderFlow/.planning/research/ARCHITECTURE.md` 第 57–70 行，
> 依据官方文档 `order-status-page` 与 `session-token-api`（API 2026-07，检索 2026-09-29，**置信度高**）。
>
> **适用性限定**：该研究针对 `order.action.*` target；本项目的 `block.render` 尚未实测。
> 下表中标 `[待验证]` 的推断必须在 M3 首日于真实店确认，不得当作已实现结论。

| 认证态         | 平台行为（官方已证实）                                   | 对本项目的含义                                                                                 |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 匿名（未登录） | 订单状态页**完全公开**，且**不支持扩展**                 | 与 4.4"平台行为"表述一致，**已证实**，无需额外代码                                             |
| 预认证         | 可查看当前订单，但**没有 customer ID**，不能访问其他订单 | 🔴 `[待验证]` `block.render` 是否在预认证态渲染？若渲染则**无 `sub`**，后端身份校验必然失败     |
| 完全认证       | 有 `sub`，可访问该客户的其他订单                         | 4.2 的 `authenticate.public.customerAccount` 正常路径                                          |

**三条设计约束（由上表推出）**：

1. **不得把匿名 order-status 的 URL 或 token 当作授权凭证**（官方明确）。
2. `sub` 只存在于**完全登录**态。后端**不能**假定"拿到 session token ⇒ 拿到 customerId"。
3. `[待验证]` M3 首日必须实测预认证态：`block.render` 是否渲染、`sessionToken` 是否可取得、`sub` 是否为空。
   三种结果对应三条代码路径，不得靠假设实现。

### 4.3 组件结构

```tsx
// extensions/customer-account/src/OrderStatusBlock.tsx
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

export default async () => {
  render(<GuaranteeCard />, document.body);
};

function GuaranteeCard() {
  // 1. 取 order line item 的 product gid
  // 2. fetch /api/statement
  // 3. 渲染 s-banner + 字段 + 可打印链接
}
```

使用的 Polaris web components（全部为 2026-07 可用）：

| 组件                       | 用途                                                  |
| -------------------------- | ----------------------------------------------------- |
| `<s-banner tone="info">`   | 顶部"这不是你的法定保证"提示（C1）                    |
| `<s-section heading>`      | 分块（Guaranteed by / Covers / How to claim / Terms） |
| `<s-details><s-summary>`   | Terms 折叠（C5 可能很长）                             |
| `<s-link href>`            | 打开可打印页（新标签）                                |
| `<s-text>` / `<s-heading>` | 正文                                                  |

### 4.4 降级

| 情况                        | 表现                                                       |
| --------------------------- | ---------------------------------------------------------- |
| 订单内无 LABELLED 商品      | **不渲染**（不显示空卡片）                                 |
| Statement 未配置 / 非付费档 | 不渲染                                                     |
| 后端超时                    | `<s-banner tone="warning">` + 重试按钮                     |
| 匿名（未登录）              | extension 本身不渲染（**官方已证实**，见 4.2.1）           |
| 预认证（有订单无 customer） | `[待验证]` 取不到 `sub` → **不渲染**，不得显示错误卡片     |
| Session token 校验失败      | **不渲染**；记录到错误追踪（S5），不向买家暴露后端细节     |

**原则**：声明是"锦上添花"的信息，**任何异常都选择不渲染**，而不是让买家看到报错。
这与 §5 公开打印页的失败策略相反（那里必须给出明确错误，因为买家是主动来取文档的）。

### 4.5 扩展运行时约束（必须写进 CI 与验收）

> **来源**：前身项目 `../../ReorderFlow/.planning/research/PITFALLS.md` 第 2、10 条 + `ARCHITECTURE.md` 第 36、70 行，
> 依据官方 `customer-account-ui-extensions` 文档（API 2026-07，**置信度高**）。
> 标 `[待验证]` 的具体数值须在 M3 构建时实测，不写入对外承诺。

| 约束               | 要求                                                                     | 本项目影响                                              |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `network_access`   | 调用自有后端**必须**声明该 capability，扩展运行在 sandbox/Web Worker     | 🔴 本项目 F7 **必然需要**（4.2 要 fetch `/api/statement`） |
| CORS               | 后端必须返回 `Access-Control-Allow-Origin: *`（worker 的 origin 为 `null`） | 不能按来源白名单收紧；**授权仍靠 Bearer token**      |
| Bundle 体积上限    | `[待验证]` 官方文档口径为普通扩展 64 KB / full-page 128 KB               | F7 只渲染静态卡片，远低于上限；CI 仍需断言             |
| Preact + Web Components | 2026-07 官方脚手架推荐 Preact，`s-*` 原生组件                        | 与本设计 4.3 一致                                       |
| 网络/异步错误      | 超时、GraphQL errors、未授权、Worker runtime 错误均需覆盖                | 已列入 §4.4 + `QA-PLAN.md` L3                           |

**CORS 放宽 ≠ 授权**：这是一条容易被审核质疑的点。在本项目中，放宽 CORS 只用于让扩展
能读到**已公开的 C1–C5 文案**（与商品页 notice 同源公开数据），不暴露任何订单或客户数据。
这一点必须写进 App Store 审核说明与 `SECURITY-PCD.md`。

### 4.6 Session token 的语义（三个常见误用）

> **来源**：前身项目 `../../ReorderFlow/.planning/research/ARCHITECTURE.md` 第 57–70 行，官方 `session-token-api`（**置信度中高**，
> 官方页面索引更新日期未披露，实现时须复核 claims）。

| 字段  | 真实语义                                                       | ❌ 误用                                    |
| ----- | -------------------------------------------------------------- | ------------------------------------------ |
| `dest` | 店铺归属的**唯一可信来源**（规范化 shop domain）              | 用前端传来的 `shopId` 建租户上下文         |
| `sub`  | 客户身份**线索**，仅完全登录时存在，**不是授权凭证**           | 用 `sub` 直接授权任意 `orderId`            |
| `exp` / `nbf` / `aud` | 必须全部验证                                       | 只验签名不验时效                            |

**本项目的具体落法**：后端从 `dest` 得出 `shopId` → 用 `shopId` 查 `StatementVersion`
→ 用请求里的 product gid 列表查 `GaranLabel`。**全程不需要 `customerId`**，
`sub` 存在与否都不影响业务逻辑，只影响"是否渲染"（4.4）。这正是 §2"零 PII"设计的技术基础。

---

## 5. 公开可打印页（无登录）

### 5.1 签名 token

```
GET /s/<token>

token = base64url(payload) + "." + base64url(HMAC-SHA256(payload, APP_SECRET))

payload = {
  s:  "<shopId>",            // 内部 id，非域名（避免枚举）
  v:  3,                     // StatementVersion.version
  cv: 12,                    // ConfigSnapshot.version
  p:  ["gid://shopify/Product/1", "..."],   // 该订单内的 LABELLED 商品
  l:  "de",                  // 语言
  iat: 1761177600,
  exp: 2076758400            // 10 年
}
```

| 属性     | 要求                            | 理由                                   |
| -------- | ------------------------------- | -------------------------------------- |
| 无登录   | ✅                              | T7                                     |
| 长期有效 | `exp` = 签发 + 10 年            | T7 要求 1 年后仍可回访                 |
| 不可枚举 | 用 `shopId`（cuid）而非域名     | 防止扫店                               |
| 不可篡改 | HMAC-SHA256，常数时间比较       | —                                      |
| 不含 PII | payload 无姓名/邮箱/地址/订单号 | `SECURITY-PCD.md`                      |
| 可撤销   | 换 `APP_SECRET` 或加 `cv` 作废  | 配置变更后旧链接仍应可读（历史正确性） |

**`exp` 10 年的取舍**：法规要求"可留存"，不是"永久"。
10 年覆盖大多数成员国时效，同时限制泄露面。`[待确认]` 是否需更长。

**为什么 payload 里放 product gid 列表而不是 orderId**：
放 orderId 就要查订单（需要 orders scope + PCD）。放商品清单只需要我们自己的数据。

### 5.2 渲染

服务端渲染 HTML（不走 React SPA）：

- 打印友好（`@media print` 去掉导航与按钮）
- 无 JS 依赖 → 十年后仍能打开
- 内联官方 notice SVG（矢量，印刷质量）

```html
<main class="eu-print">
  <h1>Commercial guarantee</h1>
  <!-- C1 固定段落，不可编辑 -->
  <!-- C2 生产者名称与地址 -->
  <!-- C4 覆盖商品表：title / brand / model / years -->
  <!-- C3 索赔步骤（有序列表） -->
  <!-- C5 条款（净化后的 HTML） -->
  <footer>Issued <time>…</time> · Not legal advice.</footer>
</main>
```

### 5.3 已知边界（必须写进文档与 listing）

**订单确认邮件里的链接（P2，v1 不做）**：
Liquid 无法生成 HMAC，所以邮件路径需要：

- 方案 A：加 `read_orders` scope → 触发 PCD 评估 → **与"无 PII"定位冲突**
- 方案 B：商家把**商品级**声明页链接（非订单级）粘进邮件 → 语义弱于订单级

**v1 决策：只做登录态内的订单级链接。** 在 Statement 配置页明说这一点，
不承诺"会自动出现在买家的订单邮件里"。

---

## 6. 校验的单一实现（P3 / D-1..D-4）

### 6.1 `validateGaranEligibility`（纯函数）

```ts
// app/domain/eligibility.server.ts
export type GaranInput = {
  guaranteeFreeOfCharge: boolean | null;
  coverage: "WHOLE" | "PARTIAL" | null;
  years: number | null;
  brand: string | null;
  model: string | null;
};

export type RejectReason =
  | "NOT_FREE_OF_CHARGE"
  | "COVERAGE_PARTIAL"
  | "YEARS_NOT_INTEGER"
  | "YEARS_NOT_GT_2"
  | "YEARS_OUT_OF_RANGE"
  | "BRAND_MISSING"
  | "BRAND_TOO_LONG"
  | "MODEL_MISSING"
  | "MODEL_TOO_LONG"
  | "PRODUCT_EXCLUDED";

export function validateGaranEligibility(
  isExcluded: boolean,
  input: GaranInput,
): { ok: true } | { ok: false; reasons: RejectReason[] };
```

**规则**：

| 检查                             | 失败原因             |
| -------------------------------- | -------------------- |
| `isExcluded`                     | `PRODUCT_EXCLUDED`   |
| `guaranteeFreeOfCharge !== true` | `NOT_FREE_OF_CHARGE` |
| `coverage !== "WHOLE"`           | `COVERAGE_PARTIAL`   |
| `!Number.isInteger(years)`       | `YEARS_NOT_INTEGER`  |
| `years! <= 2`                    | `YEARS_NOT_GT_2`     |
| `years! < 3 \|\| years! > 99`    | `YEARS_OUT_OF_RANGE` |
| `!brand`                         | `BRAND_MISSING`      |
| `brand.length > 60`              | `BRAND_TOO_LONG`     |
| `!model`                         | `MODEL_MISSING`      |
| `model.length > 40`              | `MODEL_TOO_LONG`     |

**注意 `Number.isInteger(2.5) === false`**，所以 `2.5` 自然被拒。
但**必须同时拒绝字符串 `"2.5"` 被 `parseInt` 成 `2` 的隐患**：
输入层用 `Number(raw)` 而非 `parseInt(raw)`，且 `Number("2.5") = 2.5` → 被 `isInteger` 拒。

### 6.2 所有调用点

| 调用点     | 文件                                      | 失败行为                                  |
| ---------- | ----------------------------------------- | ----------------------------------------- |
| 单条保存   | `app.garan.$id.tsx` action                | 返回 422 + reasons，写 `RejectedAttempt`  |
| 批量保存   | （P1）`app.garan.tsx` action              | 全部校验，任一失败 → 整批 422（T5d）      |
| CSV 导入   | （P1）`app.garan.import.tsx`              | 逐行校验，整批中若有失败则不写入任何行    |
| 商品选择器 | `app.garan.tsx` loader                    | **查询层过滤 `state != EXCLUDED`**（D-2） |
| 导出 / PDF | `app.audit.tsx` + `consistency.server.ts` | 阻止 + 列冲突（T5e）                      |

### 6.3 `validateSnapshotConsistency`（B0-6）

```ts
export function validateSnapshotConsistency(
  snapshot: SnapshotPayload,
): { ok: true } | { ok: false; conflicts: Conflict[] };
```

检查五项（每一对应一个实测到的竞品错误）：

| #   | 检查                                        | 对标竞品错误        |
| --- | ------------------------------------------- | ------------------- |
| 1   | 不存在"同时 excluded 且 labelled"的商品     | Consentico `28.png` |
| 2   | 所有 labelled 商品的 `years` 是 3–99 的整数 | `2.5 years`         |
| 3   | Statement 引用的商品全部存在且为 LABELLED   | —                   |
| 4   | GARAN 数量与 `GaranLabel` 行数一致          | —                   |
| 5   | 排除 tag 列表与 `ExclusionRule` 一致        | —                   |

**导出与 PDF 生成前必须调用。** 这是 T5e 的实现。

### 6.4 审计写入

| 事件          | `AuditEvent.kind`              | 归属              |
| ------------- | ------------------------------ | ----------------- |
| 位置开关变更  | `CONFIG_CHANGED`               | —                 |
| 新增/修改标签 | `LABEL_ADDED`                  | product           |
| 删除标签      | `LABEL_REMOVED`                | product           |
| 排除规则变更  | `EXCLUSION_CHANGED`            | —                 |
| 声明发布      | `STATEMENT_PUBLISHED`          | statement version |
| 配置快照      | `SNAPSHOT_CREATED`             | version           |
| 被拒          | `REJECTED` + `RejectedAttempt` | product（若已知） |
| 导出被阻止    | `EXPORT_BLOCKED`               | —                 |

**`actor` 不含个人信息**：存 staff id，不存姓名/邮箱（`SECURITY-PCD.md` 第 4 节）。

---

## 7. 多语言

### 7.1 资产语言（notice / GARAN）

**必须来自欧盟委员会官方文件**（`18` 2.2），不自行翻译。
构建期脚本：

```bash
scripts/build-artwork.ts
  # 输入: assets/garan/source/*.svg   （24 语言 × 彩色/黑白）
  # 输出: extensions/eu-notice/assets/notice-{locale}.webp
  #       extensions/eu-notice/assets/notice-{locale}@3x.webp
  #       assets/print/notice-{locale}.svg  （打印用原件）
```

**已知坑（`17` 附录 B）**：PNG 包缺英语 → 若走 PNG 路线会缺英文店。
我们用 SVG 源，**不受影响**。这条要写进构建脚本的注释，防止将来有人换源。

### 7.2 界面语言（后台）

后台 UI 跟随 Shopify 账号语言（`shopify-app-react-router` 自带）。
v1 只做 **en + zh-CN**，其余回退英文。`[设计判断]` 商家是欧洲人为主，
但英文是 Shopify 后台的默认工作语言，优先级低于店面文案。

### 7.3 C1 固定文案（法规要求，必须翻译）

C1 是声明里唯一"不能由商家自由编辑"的段落（UX-FLOWS 6.1）。
v1 提供 **6 种语言**：en / de / fr / es / it / nl。

| 语言                   | 来源                                           | 备注               |
| ---------------------- | ---------------------------------------------- | ------------------ |
| en                     | 自译，基于 Directive 2011/83/EU Art. 6(2) 措辞 | 基准版             |
| de / fr / es / it / nl | 自译 + 人工复核                                | **不声称官方译文** |
| 其他 18 种             | 回退英文 + 明示 `English version prevails`     | —                  |

**`[待确认]`**：自译的法务风险。缓解方式：

1. 文案只陈述法规已有内容（"you have a legal guarantee free of charge"），不做解释
2. 页面显示"这不是法律意见"
3. 在 Settings 提供"查看英文原版"入口

**这条必须在 M1 评审时决定**：若不接受自译，则 v1 只做英文 + 让商家自行填写本地语言版本
（但那会让 C1 变成可编辑，与法规冲突）。

---

## 8. 性能预算（T8）

| 指标             | 预算                     | 测量方式                    | 超标动作                                       |
| ---------------- | ------------------------ | --------------------------- | ---------------------------------------------- |
| **CLS**          | **0**                    | Lighthouse（商品页 + 首页） | artwork 容器必须有固定 `aspect-ratio`          |
| **LCP 影响**     | 不进入前 3 个 LCP 候选   | Lighthouse                  | 商品页 block 用 `loading="eager"` 但尺寸已占位 |
| **新增 JS**      | **< 20 KB**（gzip）      | `du -h` bundle              | 取消客户端 JS，纯 CSS 折叠                     |
| **新增 CSS**     | < 12 KB（gzip）          | 同上                        | —                                              |
| **首屏新增请求** | ≤ 2（notice webp + css） | DevTools Network            | 合并 CSS 到 inline                             |
| **artwork 单张** | ≤ 80 KB（@1x）           | —                           | 调 WebP 质量                                   |

### 8.1 折叠交互不引入 JS

`COLLAPSED` 形态用 `<details>` / `<summary>` 实现：

```html
<details class="eu-notice-collapsed">
  <summary>Legal guarantee</summary>
  <img src="notice-de.webp" width="..." height="..." alt="..." />
</details>
```

**为什么**：折叠是唯一的交互，用原生元素可做到 **0 KB JS**。
Consentico 与 Pandectes 都用了 JS（`17` 3B.2 的实时预览是后台，不影响店面）。
**这一条是我们的隐性优势，可写进 listing（"no JavaScript added to your storefront"）。**

`[设计判断]`：`<details>` 的无障碍行为由浏览器保证，比自研 div+aria 更稳。

### 8.2 为什么 CLS 必须是 0

notice 在页脚，通常不在首屏 → 对 LCP 无影响。
但**商品页 block 在价格下方**，属于首屏 → 尺寸抖动会直接反映在 CLS。
因此所有 artwork 必须带 `width` / `height` 属性 + CSS `aspect-ratio` 兜底。

---

## 9. 计费

| 档位        | Shopify Billing plan | 试用 |
| ----------- | -------------------- | ---- |
| Free        | 无                   | —    |
| Starter $12 | `recurring` monthly  | 7 天 |
| Pro $24     | `recurring` monthly  | 7 天 |

**门禁位置**（必须在服务端，不能只在前端隐藏）：

| 能力                    | 检查点                                           |
| ----------------------- | ------------------------------------------------ |
| Statement 配置          | `app.statement.tsx` loader/action                |
| Statement 渲染（API）   | `/api/statement`                                 |
| 可打印页                | `/s/$token`（token 内含版本，仍需校验当前 plan） |
| 逐变体 / 批量 CSV（P1） | 对应 action                                      |
| 审计导出                | `app.audit.tsx` action                           |

**降级行为**：从 Starter 降回 Free 时，**不删除**已配置的 Statement，
只是停止渲染并在后台显示"升级以继续交付"。删数据是最坏的体验。

---

## 10. 未决项（M1 评审要回答）

> **2026-10-22 更新**：D1/D2/D3 已由 `../../market-research/21-asset-verification.md` 实测解决或改写。
> 新增 A1/A2 两项高优先级风险。

| #      | 未决                                                                                              | 状态           | 结论 / 建议                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| ~~D1~~ | ~~WebP 压缩是否导致文字模糊~~                                                                     | **已撤销**     | 不再预渲染 WebP。直接分发 gzip SVG（~60 KB）。见 3.3                                                                                             |
| ~~D2~~ | ~~`years` 三位数是否溢出~~                                                                        | ✅ **已解决**  | 几何实测：可用 116.4 units，三位数 133.5 溢出。**上限 99**（`21` 2.5）                                                                           |
| ~~D3~~ | ~~GARAN SVG 实际体积~~                                                                            | ✅ **已解决**  | raw 294 KB / **gzip 27 KB**，可内联（`21` 2.2）                                                                                                  |
| **A1** | **官方 SVG 未内嵌字体，访客回退系统 sans-serif → 字形不符**                                       | 🔴 **阻塞 M3** | 三选一：① 自带 Inter WOFF2（推荐）② 构建期 text→path ③ 用 PNG 位图。**必须 M1 决定**（`21` 2.4、3.3）                                            |
| **A2** | **`Brand/Trademark` / `Model identifier` 是字段名标签，不是可替换值；brand/model 的填写位置未知** | 🔴 **阻塞 M3** | 需对比 `A2-18`（已填 `Nordlicht` / `NWT-240`）与本空白模板，确定是"替换 text"还是"叠加层"。**直接决定 `renderGaranSvg` 实现**（`21` 2.3、3.4.1） |
| A3     | Shopify Theme App Extension 的 asset CDN 是否压缩 SVG                                             | 🟡 需实测      | 若不压缩 → 退回 WebP 混合方案（3.3）                                                                                                             |
| A4     | Inter 字体再分发许可                                                                              | 🟢 低风险      | Inter 为 SIL OFL，允许再分发；仍需确认版本（`21` 六.3）                                                                                          |
| D4     | C1 自译的法务可接受性                                                                             | 🟡 评审        | 不接受则 v1 只做英文（7.3）                                                                                                                      |
| D5     | 签名 token `exp` 是否需 > 10 年                                                                   | 🟡 评审        | —                                                                                                                                                |
| D6     | 邮件链接路径是否值得触发 PCD                                                                      | 🟢 建议不做    | 与"零 PII"定位冲突（5.3）                                                                                                                        |
| D7     | `<details>` 在 Shopify 主题 CSS 下是否被覆盖                                                      | 🟡 需实测      | Dawn / Sense / Refresh 三个主题                                                                                                                  |
| **A5** | **`block.render` 在预认证态是否渲染？`sub` 是否为空？**                                          | 🟡 **M3 首日** | 三种结果对应三条代码路径（4.2.1）。不阻塞评审，但**必须在写 F7 的第一小时确认**                                                                  |
| **A6** | **`network_access` capability 的声明与审核流程**                                                  | 🟡 评审        | F7 必然需要（4.5）。需确认是否额外审核、是否影响上架时间                                                                                         |
| A7     | 扩展 bundle 体积上限的当前官方数值                                                                | 🟢 低风险      | 前身研究记录为 64 KB / full-page 128 KB，实现时复核（4.5）                                                                                       |

**M1 评审必须拍板的是 A1 与 A2**——它们改变 3.3 / 3.4 的实现方式，
且在解决前 M3 无法开工（不是"优化项"，是"能否做"）。

---

## 11. 折叠态的实现修正（`21` 5.1 补充）

原 3.6 未提到：官方提供**嵌套版 GARAN**（`368.5 × 56.69`，仅 1 个 `<text>`）。

| 形态        | 用哪个文件                       | 显示内容                         | 体积（gzip） |
| ----------- | -------------------------------- | -------------------------------- | ------------ |
| `FULL`      | `GARAN Label_colour.svg`         | brand + model + years + 完整说明 | 27 KB        |
| `COLLAPSED` | `GARAN Label_nested display.svg` | **仅 years**                     | **3.3 KB**   |

→ 折叠态**不显示 brand/model**（官方设计如此，不是我们的取舍）。
→ 折叠态体积仅为完整版 1/8，对性能有利。

**对 UX 的影响**：`UX-FLOWS.md` 5.4 的折叠说明需要补充"折叠时不显示 brand/model"，
避免商家误以为折叠态信息缺失是 bug。

---

最后更新：**2026-10-23，v1.2**（前身项目研究回填 + 复用表纠错）。
下一步：M1 评审，优先解决 A1（字体）与 A2（brand/model 写入位置）。
