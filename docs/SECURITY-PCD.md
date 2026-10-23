# SECURITY & PCD — EU Guarantee & Warranty

> 版本：**v1.0**（2026-10-22）
> 上游：`PRD.md` v1.2、`TECH-DESIGN.md` v1.0
> 状态：**待评审**
>
> 本文件回答三个问题：
>
> 1. 我们申请哪些权限，为什么**不能再少**
> 2. 我们存哪些数据，为什么**不需要 PCD 审批**
> 3. 出问题时**怎么删、怎么查、怎么限权**

---

## 1. 结论先行

| 问题                                     | 结论                                                               |
| ---------------------------------------- | ------------------------------------------------------------------ |
| 需要 Protected Customer Data (PCD) 吗？  | **不需要**。不申请任何 customer / order scope，不存任何买家标识    |
| 需要 PCD Level 1 审批吗？                | **不需要**。Level 1 也要求审批流程，我们完全绕开                   |
| 需要 `read_themes` / `write_themes` 吗？ | **不需要**（对比 EU Warranty、Pandectes 都申请了）                 |
| 需要 `write_files` 吗？                  | **不需要**（对比 Pandectes 申请了，用于托管图片）                  |
| 需要 `read_orders` 吗？                  | **不需要**（v1）。这是"不做邮件链接"的直接代价，已在 TECH 5.3 说明 |
| 最小 scope 集合                          | **`write_products`**（含 app-owned metafield 读写）                |
| GDPR 强制 webhook                        | 3 个全部实现（虽然不存 PII，但 Shopify 要求所有 app 实现）         |

**一句话**：这个 app 的权限面是四个竞品里最窄的，且不是营销话术，是架构决定的
（没有 order、没有 customer、没有 theme、没有 files）。

---

## 2. 权限清单与逐项论证

### 2.1 申请

| Scope                | 用途                                                                         | 为什么不能更少                                                                             | 关联功能   |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| **`write_products`** | 读商品列表（判断数字商品/礼品卡/变体）；写 `$app:eu.garan` product metafield | 商品级 GARAN 数据必须落在 product 上才能被 Liquid 零延迟读取（TECH 2.4）；只读或只写都不够 | F3、F5、F6 |

**就这一个。** 没有 `read_products` 单独申请，因为 `write_products` 已包含读。

### 2.2 明确不申请（附竞品对照）

| 不申请                           | 竞品谁申请了                                                         | 我们为什么不需要                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `read_customers` / `read_orders` | —                                                                    | 声明在买家登录态下由 **Customer Account UI Extension 在浏览器端**取订单行商品 id，服务端只接收 product gid（TECH 4.2）。整个链路没有买家标识 |
| `read_themes`                    | **EU Warranty**、**Pandectes**                                       | 它们靠读模板判断 block 是否放置。我们改为「商家手动确认 + 深链主题编辑器」（UX-FLOWS 4.3），**用一个交互降级换掉一个权限**                   |
| `write_themes`                   | —（无人申请）                                                        | 我们从不改主题源码                                                                                                                           |
| `write_files`                    | **Pandectes**                                                        | 它把标签图片写进商家 Files。我们用 Theme App Extension 自带的 CDN asset（TECH 3.3），**卸载后不留文件**                                      |
| `read_locales` / `read_markets`  | **EU Warranty**（区域设置）、**Pandectes**（Markets 设置）           | 我们从 `shop.primaryLocale` 与 app 安装上下文取主语言；多语言判定在 Liquid 用 `request.locale`。不需要完整 market 配置                       |
| `read_staff`（员工数据）         | **EU Warranty**、**Pandectes**（安装页均要求"查看员工和协作者数据"） | 审计只需要 `actor` 标识。v1 用 Shopify 提供的 staff id 哈希，**不读姓名/邮箱/电话/地址**                                                     |

> **可写进 listing 的对比**：
> "Unlike other EU guarantee apps, we don't ask for access to your staff data,
> your theme files, or your store's file storage."

### 2.3 权限变更流程

新增任何 scope 必须：

1. 在 `shopify.app.toml` 注释里写明用途与替代方案（`rfq-v1` 已有此惯例）
2. 更新本文件第 2 节
3. 重新走 App Store 审核（scope 变更会触发重新授权弹窗）

**当前 `shopify.app.toml` 的 scopes 行必须从 RFQ 的旧值改掉**：

```toml
# 旧（RFQ，已废弃）：
# scopes = "read_products,write_draft_orders,read_draft_orders"

scopes = "write_products"
```

---

## 3. 数据清单（Data Inventory）

### 3.1 我们存什么

| 数据                              | 表                                      | 是否个人信息                 | 保留                     | 删除时机             |
| --------------------------------- | --------------------------------------- | ---------------------------- | ------------------------ | -------------------- |
| 店铺域名                          | `Shop.domain`                           | 否（商家公开信息）           | 服务期                   | 卸载 + `shop/redact` |
| 语言偏好                          | `Shop.primaryLocale` / `enabledLocales` | 否                           | 服务期                   | 同上                 |
| 位置开关                          | `Shop.notice*`                          | 否                           | 服务期                   | 同上                 |
| 商品 id / 标题 / 变体数           | `ProductConfig`                         | 否（商品数据，非个人信息）   | 服务期                   | 同上                 |
| GARAN 字段（brand/model/years）   | `GaranLabel`                            | 否（生产者信息，商业主体）   | 服务期                   | 同上                 |
| 排除 tag                          | `ExclusionRule`                         | 否                           | 服务期                   | 同上                 |
| 声明文本（生产者名称/地址）       | `StatementVersion`                      | **否**（企业信息，非自然人） | 服务期 + 10 年（见 3.3） | 同上                 |
| 审计事件 `actor`                  | `AuditEvent`                            | 否（staff id 哈希）          | 服务期                   | 同上                 |
| **买家姓名 / 邮箱 / 电话 / 地址** | —                                       | —                            | **从不存储**             | —                    |
| **订单号 / 订单金额 / 订单状态**  | —                                       | —                            | **从不存储**             | —                    |
| **客户 id**                       | —                                       | —                            | **从不存储**             | —                    |

### 3.2 为什么"声明里的生产者名称与地址"不算个人信息

法规 C2 要求声明包含**生产者**（producer / manufacturer）的名称与地址。
这是**商业主体**信息，属于企业公开信息，不是 GDPR 意义上的 data subject 个人数据。

**边界情况**：如果商家是个人独资（sole trader），生产者地址可能指向自然人住所。
处理：

- 该字段由**商家自己填写**，填写时的提示为
  `Use your business address. This will be shown to your customers.`
- 我们不推断、不补全、不校验其为商业地址
- `[待确认]` 是否需要在商家是 sole trader 时给出额外提示（M1 评审）

### 3.3 保留期限

| 数据                         | 保留                                                      | 依据                                                                       |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| 运行数据（配置、商品、标签） | 服务期内                                                  | 提供服务必需                                                               |
| `ConfigSnapshot`             | **服务期内全量**                                          | 商家可能需要在 1 年后证明"当时展示的是什么"（D1）                          |
| `StatementVersion`           | **服务期内全量**，且已签发的 token 在其版本被删后仍需可读 | 已交付给买家的声明是**合同内容**，不能因为商家改配置就让买家手里的链接失效 |
| `AuditEvent`                 | 服务期内（最长 24 个月滚动）                              | 超过 24 个月的价值低，且增加泄露面                                         |
| `RejectedAttempt`            | **90 天**                                                 | 只用于近期排障与"我防住了"的证明                                           |
| `Session`                    | Shopify 会话生命周期                                      | 平台要求                                                                   |

**`StatementVersion` 的特殊规则**（重要）：
买家手里的可打印页链接引用 `version`。**永不自 hard delete 已被引用过的版本**，
只标记 `archived`。这与"数据最小化"有张力——解决方式：

- 只保留 `producerName` / `producerAddr` / `claimSteps` / `terms` / `c1Locale`
- 不保留任何与该版本相关的买家或订单信息（本来就没有）

### 3.4 数据传输

| 链路                                 | 内容                               | 保护                                       |
| ------------------------------------ | ---------------------------------- | ------------------------------------------ |
| 浏览器 → app（后台）                 | Shopify session token              | App Bridge + 平台鉴权                      |
| 买家浏览器 → app（`/api/statement`） | Session Token (JWT) + product gids | `authenticate.public.customerAccount` 验证 |
| app → Shopify Admin API              | product 查询、metafield 写入       | 离线 access token，仅存于 `Session` 表     |
| app → 打印页                         | 无 API 调用                        | 纯本地渲染                                 |

**没有第三方**:不接分析 SDK、不接错误追踪 SaaS（v1）。若后续接入，
必须更新本文件并披露在隐私政策。

---

## 4. 认证与授权

### 4.1 三条信任边界

| 边界       | 验证方式                                                    |
| ---------- | ----------------------------------------------------------- |
| 商家后台   | `authenticate.admin(request)`（`shopify-app-react-router`） |
| 买家侧 API | `authenticate.public.customerAccount(request)`              |
| 公开打印页 | **HMAC token**（无会话），`app/domain/token.server.ts`      |

### 4.2 多租户隔离（最容易出错的地方）

**每一条数据访问都必须带 `shopId` 过滤。** 具体规则：

1. Prisma 查询**禁止**只按 `id` 查（如 `findUnique({ where: { id } })`）。
   唯一例外是 `Session` 与 `ConfigSnapshot.version` 的联合查询。
2. 所有业务查询必须形如 `where: { id, shopId }` 或 `where: { shopId, ... }`。
3. **代码评审检查项**：任何新增的 `prisma.*.find*` / `update*` / `delete*`
   都要能在同一行或上一行看到 `shopId`。
4. 打印页从 token 取 `shopId`，**不信任任何 URL query**。

```ts
// ✅ 正确
await prisma.garanLabel.findFirst({ where: { productGid, shopId } });

// ❌ 危险（跨租户）
await prisma.garanLabel.findUnique({ where: { id } });
```

### 4.3 打印页 token 的攻击面

| 攻击           | 防御                                                       |
| -------------- | ---------------------------------------------------------- |
| 伪造 token     | HMAC-SHA256 + `crypto.timingSafeEqual`                     |
| 枚举其他店铺   | payload 用不可枚举的 `shopId`（cuid），不含域名            |
| 篡改商品清单   | 签名覆盖整个 payload                                       |
| 重放           | 不需要防重放（只读、幂等）                                 |
| 长期泄露       | `exp` 10 年；可通过轮换 `APP_SECRET` 全量失效              |
| 泄露到搜索引擎 | `X-Robots-Tag: noindex, nofollow` + `robots.txt` 禁 `/s/`  |
| 被爬虫批量抓取 | 无 rate limit 的只读页风险低；但加 IP 级限流（60 req/min） |

### 4.4 后台写操作的额外约束

| 操作       | 约束                                                              |
| ---------- | ----------------------------------------------------------------- |
| GARAN 写入 | 服务端二次校验（TECH 6.1），**不信任前端传的 `isExcluded`**，重算 |
| 批量保存   | 整批事务，任一失败回滚（T5d）                                     |
| 导出       | 先跑一致性校验，失败则 403 + 原因（T5e）                          |
| 声明发布   | 只有当前 plan ≥ Starter 才允许（服务端校验，不靠 UI 隐藏）        |

---

## 5. GDPR Webhooks（三个，必须）

即使我们**不存任何买家数据**，Shopify 对所有 app 强制要求这三个 webhook。
它们是 App Store 审核的硬门槛。

### 5.1 `customers/data_request`

**Shopify 的语义**：商家收到买家查阅请求后，要求 app 提供该买家在该 app 内的数据。

**我们的处理**：

```ts
// app/routes/webhooks.customers-data-request.tsx
// 我们没有任何以 customer id 为键的数据
return json({ ok: true }, 200);
```

**但必须做两件事，不能只是 200**：

1. **写入审计**：`AuditEvent.kind = DATA_REQUEST_RECEIVED`，
   记录 `shop_id` + 时间（**不记录 customer id / 邮箱**，
   因为记录它就等于开始存个人信息）。
   > 权衡：无法记录"查的是谁"会削弱审计价值。
   > 我们的选择：**宁可审计弱一点，也不引入 PII**。
   > `[待确认]` 是否记录 customer id 的**单向哈希**（不可逆、不可关联）作为折中。
2. **回复 Shopify 的 payload 里明确写 empty**（不是抛错）。

```json
{ "customer_data": [], "note": "This app does not store customer data." }
```

### 5.2 `customers/redact`

同样：无数据可删，返回 200 + 审计事件。

### 5.3 `shop/redact`

**这个是唯一有实际删除动作的**（发生在卸载 48 小时后）。

```
shop/redact(shopDomain)
  → 按 domain 找到 Shop
  → 级联删除：ProductConfig / GaranLabel / ExclusionRule /
              StatementVersion / ConfigSnapshot / AuditEvent / RejectedAttempt
  → 删除 Session
  → 写一条 Sentry-free 日志（仅计数，无域名）
  → 200
```

Prisma schema 已用 `onDelete: Cascade`（TECH 2.2），删除 `Shop` 即级联。
**但 `ConfigSnapshot` / `RejectedAttempt` 没有外键到 `Shop`**，需要显式删除。

### 5.4 `app/uninstalled`

| 动作                         | 时机                       |
| ---------------------------- | -------------------------- |
| 标记 `Shop.uninstalledAt`    | 立即                       |
| 删除 `Session`               | 立即（否则无法再调 API）   |
| **保留业务数据 48 小时**     | 给"误卸载后重装"留恢复窗口 |
| 48 小时后 `shop/redact` 全删 | 平台触发                   |

**`$app` metafield 由 Shopify 自动清理**（TECH 2.4）——这是"零残留"的物理保证，
不依赖我们的代码跑成功。

---

## 6. 安全设计清单（实现时逐条勾）

### 6.1 输入

- [ ] 所有 `years` 用 `Number()` 解析，不用 `parseInt`（防 `"2.5"` → `2`）
- [ ] `brand` / `model` 长度上限在**服务端**校验（前端只做即时反馈）
- [ ] CSV 导入（P1）限制文件大小（≤ 2 MB）与行数（≤ 5000）
- [ ] 声明 `terms` 字段做 HTML 净化（白名单标签，去掉 `script` / `on*` / `iframe`）
- [ ] 打印页对所有动态文本做 HTML 转义

### 6.2 输出

- [ ] GARAN SVG 由服务端生成，**不把用户输入拼进 SVG 属性**（只替换文本节点，且转义 `<` `&` `"`）
- [ ] 打印页设置 `Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`
- [ ] 后台 iframe 遵循 Shopify 的 `frame-ancestors` 要求（由库处理）

### 6.3 存储

- [ ] `Session.accessToken` 加密存储（Prisma 字段级加密或平台默认）
- [ ] 数据库备份加密（部署侧）
- [ ] 无 `.env` 中的密钥进入 git（`.gitignore` 已含）

### 6.4 依赖

- [ ] `npm audit` 在 CI 中跑，high/critical 阻断
- [ ] 锁定 `@shopify/*` 主版本，升级需人工评审

---

## 7. App Store 审核要点（合规声明相关的风险）

App Store 审核对"合规类"app 特别敏感。我们的防守：

| 审核可能问              | 我们的回答                                       | 落地位置               |
| ----------------------- | ------------------------------------------------ | ---------------------- |
| 你是否声称保证合规？    | 不。listing 与 app 内均写明是展示与交付工具      | PRD 第 9 节            |
| 你凭什么生成官方标签？  | 使用欧盟委员会发布的官方 vector 文件，不自行绘制 | `17` 附录 B            |
| 你是否提供法律意见？    | 不。打印页页脚与 PDF 页脚均声明                  | TECH 5.2、UX-FLOWS 7.3 |
| 你存买家数据吗？        | 不存。Privacy policy 明列"从不存储"              | 本文件 3.1             |
| GDPR webhook 实现了吗？ | 三个全实现                                       | 本文件 5               |
| 卸载后是否残留？        | `$app` metafield 由平台自动清理 + 数据全删       | 本文件 5.4             |

**listing 中禁止**：

- "guaranteed compliant" / "legally compliant"
- "the only app that..."（除非 V1 已确认，见 PRD 第 9 节）

**listing 中必须**：

> This app helps you display the EU legal guarantee notice and GARAN label, and
> deliver a commercial guarantee statement. It is a display and delivery tool,
> not legal advice.

---

## 8. 隐私政策要点（M6 上架前写全文）

必须覆盖：

1. **收集什么**：店铺域名、商品 id 与标题、GARAN 字段、配置、审计事件（staff id 哈希）
2. **不收集什么**：买家姓名/邮箱/电话/地址、订单、客户 id —— **明确列出**
3. **为什么需要 `write_products`**：写 app-owned metafield（数据落在商家自己的商品上）
4. **数据存放**：PostgreSQL（地区：待定，`[待确认]` 建议 EU 区域以满足欧盟商家预期）
5. **保留期限**：见本文件 3.3
6. **删除**：卸载 48 小时后自动删除；可邮件请求立即删除
7. **第三方**：无
8. **联系**：待定

`[待确认]` **数据库区域**：如果目标客户是欧盟商家，把 DB 放在 EU 区域
（如 Fly.io `fra` / Neon `eu-central-1`）是一个可写进 listing 的信任点，
也简化 GDPR 的跨境传输论证。建议 M1 评审时定。

---

## 9. 与四个竞品的权限对比（可用的差异化证据）

| 权限                            | Consentico     | EU Warranty | Pandectes | **我们**                  |
| ------------------------------- | -------------- | ----------- | --------- | ------------------------- |
| 员工数据（姓名/邮箱/电话/地址） | 未在安装页列出 | ✅ 申请     | ✅ 申请   | ❌                        |
| 读主题模板                      | ✅ 申请        | ✅ 申请     | ✅ 申请   | ❌                        |
| 写后台文件                      | ❌             | ❌          | ✅ 申请   | ❌                        |
| 读 Markets / 区域设置           | 未列出         | ✅ 申请     | ✅ 申请   | ❌                        |
| 读/写 customers                 | ❌             | ❌          | ❌        | ❌                        |
| 读 orders                       | ❌             | ❌          | ❌        | ❌                        |
| **合计申请项**                  | 1（读模板）    | **4**       | **5**     | **1**（`write_products`） |

证据见 `../../market-research/17-competitor-teardown.md`
3A.1（EU Warranty 安装页）、3B.1（Pandectes 安装页）、A2-1、A3-1。

**注意措辞**：不要说"我们最安全"（不可证），
说"我们只申请 `write_products`，不读取员工数据、主题文件或店铺文件"（可证）。

---

## 10. 未决项

| #   | 未决                                                     | 影响               | 建议                                   |
| --- | -------------------------------------------------------- | ------------------ | -------------------------------------- |
| S1  | `customers/data_request` 是否记录 customer id 的单向哈希 | 审计价值 vs PII    | 建议不记录，保持"零 PII"的绝对性       |
| S2  | 数据库区域是否放 EU                                      | 隐私政策与 listing | 建议 EU（目标客户在欧盟）              |
| S3  | sole trader 的生产者地址提示                             | C2 填写体验        | 建议加一句提示，不做强制               |
| S4  | `StatementVersion` 永不硬删除是否符合"数据最小化"        | 合规张力           | 已用"只保留合同必要字段"缓解；评审确认 |
| S5  | 是否接入错误追踪（Sentry 等）                            | 排障能力 vs 第三方 | v1 不接；若接必须披露并做 PII 脱敏     |

---

最后更新：2026-10-22，v1.0。
下一步：`QA-PLAN.md` 已完成 → **M1 评审**（需拍板第 10 节 S1–S5）。
