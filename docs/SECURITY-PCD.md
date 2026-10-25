# SECURITY & PCD — EU Guarantee & Warranty

> 版本：**v1.2**（2026-10-25，App 计费退款、工单与附件数据边界）
> 上游：`PRD.md` v1.4、`TECH-DESIGN.md` v1.4、`ADMIN-PRD.md` v0.2（内部管理端边界）
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

0. **先区分权限域**：Shop Admin scope 与 Partner API client 权限不是一回事。App 计费/事件使用
   Partner organization 级凭据与 `Manage apps`/必要的 `View financials`，不等于获得买家订单权限。
1. 在 `shopify.app.toml` 注释里写明用途与替代方案（`rfq-v1` 已有此惯例）
2. 更新本文件第 2 节
3. 重新走 App Store 审核（scope 变更会触发重新授权弹窗）
4. Partner token 只在服务端保管、可轮换、不下发浏览器；权限申请与实际可用性见 §10 S8/S9。
   Partner 交易信息仅用于分析，不作正式会计/财务报告。

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
| App 订阅/Charge/Earning/Credit 摘要 | `AppSubscriptionSnapshot` / `AppBillingEvent`（设计） | 商家商业/财务信息，不是买家订单 | **待评审**，按对账/争议最小必要 | 按 S9 去标识或删除；不默认永久保留 |
| App 退款申请、审批、执行与复核    | `RefundRequest` / `RefundExecution` / `RefundReview`（设计） | 可能含商家联系人/财务信息 | **待评审**，按明确依据和最小字段 | 同上；在途争议按 S10 处理 |
| 商家工单、公开回复、内部备注、需求 | `SupportTicket` / `TicketMessage` / `FeatureTriage`（设计） | 可能含商家/员工个人信息 | **待评审**，按支持与需求跟进目的 | 卸载/redact 按 S10 删除或去标识 |
| 商家联系人（若工单需要）          | 商家账号/工单联系信息（设计）            | **可能是**，区别于买家 PII | 仅服务所需最短期限 | 同上 |
| 附件/单据元数据与内容             | `Attachment` + 私有对象存储（设计）       | **可能是**，上传者提供 | **待评审**，独立于会话且不长期默认保存 | 内容/扫描副本/缓存/元数据一并处理 |
| 内部员工账号、角色、财务操作人    | 内部身份源 / `InternalAuditEvent`（设计） | **可能是**（员工信息） | 按员工管理/安全审计期限，非买家规则 | 离职回收 + 保留期到期删除/去标识 |
| 站内查看游标                      | `ReadCursor`（设计）                     | 可能是（商家/员工行为） | 最小必要，期限见 S11 | 同上；仅证明查看 |
| **买家姓名 / 邮箱 / 电话 / 地址** | —                                       | —                            | **从不主动收集/存储**；上传提示禁止 | 疑似夹带按 S11 隔离删除 |
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
| 计费/退款/工单/附件/内部审计 | **分别评审**，不照搬上面期限                              | 财务对账、争议、支持、安全调查与最小化各不相同；未定前不得永久保留全部数据    |

**新增数据类型的特殊规则**：

- `AppBillingEvent` / refund 记录不是买家订单；不能为对账引入买家 Order/Customer、订单号或买家联系方式。
- 退款申请、审批、执行、复核分别保留必要事实与人员；凭证正文留在受控对象中，不复制到普通日志/内部审计。
- 工单 PUBLIC/INTERNAL 分离；内部备注、内部 triage 与员工私有字段不对商家或外部渠道暴露。
- 附件按独立期限保存；删除必须覆盖对象、扫描副本、缓存、缩略图、下载 URL 与备份策略。
- 站内查看游标只保留最少必要主体/对象/时间，避免演变为员工或商家行为监控。

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
| 服务端任务 → Shopify Partner API    | 当前订阅、历史 App/Charge/Earning/Credit 事件 | Partner org token 仅服务端、最小权限、可轮换、响应白名单落库 |
| 商家/员工 ↔ 工单服务                | 公开/内部消息、退款申请、元数据     | 分离认证受众；逐请求店铺/权限校验；内部字段不公域返回 |
| 商家/员工 ↔ 私有附件存储/扫描       | 文件内容、元数据、扫描结果          | 私有桶、短时授权、扫描前禁下载、危险内容不内联、区域/处理方待定 |

**第三方边界（2026-10-25 修订）**：不接分析 SDK、不接错误追踪 SaaS（v1）不代表没有其他处理方。
Shopify/Partner API、托管数据库、私有附件存储、恶意文件扫描、基础设施日志及未来通知服务均需逐项
登记用途、区域、字段和保留。若新增处理方，必须更新本节、§8 和隐私政策；未评审前不得上线附件或通知。
Partner API 是平台同步路径，不等于增加 Shop Admin scope，也不授予买家订单访问。

---

## 4. 认证与授权

### 4.1 四条信任边界

| 边界       | 验证方式                                                    |
| ---------- | ----------------------------------------------------------- |
| 商家后台   | `authenticate.admin(request)`（`shopify-app-react-router`） |
| 买家侧 API | `authenticate.public.customerAccount(request)`              |
| 公开打印页 | **HMAC token**（无会话），`app/domain/token.server.ts`      |
| 内部管理端 | **独立员工身份与认证受众 + 服务端权限策略**（需求设计，未实现） |

内部管理端不能复用商家 session 作为员工身份，也不能因运营需要获得商家业务事实的默认写权限。
内部角色、跨店只读、敏感访问、受控任务重试和内部审计以 `ADMIN-PRD.md` §3、§5–§6 为需求事实源；
身份供应、MFA、会话回收及数据保留仍需按 §10 评审。

### 4.2 多租户隔离（最容易出错的地方）

**每一条数据访问都必须带 `shopId` 过滤。** 具体规则：

1. Prisma 查询**禁止**只按 `id` 查（如 `findUnique({ where: { id } })`）。
   唯一例外是 `Session` 与 `ConfigSnapshot.version` 的联合查询。
2. 所有业务查询必须形如 `where: { id, shopId }` 或 `where: { shopId, ... }`。
3. **代码评审检查项**：任何新增的 `prisma.*.find*` / `update*` / `delete*`
   都要能在同一行或上一行看到 `shopId`。
4. 打印页从 token 取 `shopId`，**不信任任何 URL query**。
5. 上述规则约束商家、买家及公开访问，不构成内部员工的跨店授权。内部聚合/跨店查询必须走
   独立的服务端权限策略与审计，且不得暴露给商家或买家端；详见 `ADMIN-PRD.md` §3、§8。

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
| 声明发布   | 只有当前 plan ≥ Growth 才允许（服务端校验，不靠 UI 隐藏）        |

### 4.5 工单、附件、计费退款与内部高风险写操作

| 操作 | 约束 |
| --- | --- |
| 商家工单/回复/附件 | 商家认证 + 本店 `shopId` + 对象归属；只能访问 PUBLIC 内容；不读取/提交买家订单或买家 PII |
| 内部公开回复/内部备注 | 独立员工身份与权限，PUBLIC/INTERNAL 不同写入路径；内部备注永不进入商家响应 |
| 附件上传/下载/删除 | 私有对象、真实类型/大小/数量校验、扫描前禁下载、短时授权、跨店 IDOR 拒绝、访问审计 |
| 退款审批 | `refund_approve`、申请人不可自批、二次确认、金额/币种/余额校验、并发版本与幂等、理由审计 |
| Partner 人工退款登记 | `refund_execute`；仅记录执行人声明，不等于退款成功；不保存 Partner 密码/完整响应 |
| 退款复核 | `refund_review`；执行人与复核人不同；独立证据/可靠平台记录核验；证据不足为未知 |
| 发 credit/取消订阅/改套餐 | 默认不开放；如未来增加，需独立高风险权限、审批、幂等和审计，不得作为 support 隐含能力 |
| 内部角色/权限变更 | 旧授权上下文失效；每个敏感动作前重查当前状态/权限版本；账号管理员不自动全权 |
| 日志检索/关联 | 分类白名单字段；不保存原始 webhook、密钥、完整 token、消息/凭证正文；无权限关联不泄露内容 |

完整角色和权限以 `ADMIN-PRD.md` §3 为准；Partner 组织级 token 与 Shop Admin token 分域管理。

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
  → 按已评审保留规则删除或去标识：AppSubscriptionSnapshot / AppBillingEvent /
              RefundRequest / RefundExecution / RefundReview / SupportTicket /
              TicketMessage / TicketResourceLink / FeatureTriage / ReadCursor /
              InternalAuditEvent（员工安全保留与店铺关联分开评审）
  → 删除附件对象、扫描副本、缓存/缩略图、元数据与短时下载引用
  → 删除 Session
  → 写一条 Sentry-free 日志（仅计数，无域名）
  → 200
```

Prisma schema 已用 `onDelete: Cascade`（TECH 2.2），删除 `Shop` 即级联。
**但 `ConfigSnapshot` / `RejectedAttempt` 没有外键到 `Shop`**，需要显式删除。
新增逻辑对象同样必须在物理 schema 中显式定义 `shopId` 关系和删除/去标识策略，不能默认 cascade
覆盖对象存储、扫描副本、缓存或备份。财务/争议记录若确有保留依据，仅保留经 S9/S10 评审批次的
最小字段，不默认长期保留 shop domain、完整凭证或内部备注。

### 5.4 `app/uninstalled`

| 动作                         | 时机                       |
| ---------------------------- | -------------------------- |
| 标记 `Shop.uninstalledAt`    | 立即                       |
| 删除 `Session`               | 立即（否则无法再调 API）   |
| **保留业务数据 48 小时**     | 给"误卸载后重装"留恢复窗口 |
| 停止新工单回复/上传/退款执行 | 立即；在途事项按 S10 受限处理，不自动宣称完成 |

卸载后依赖 Shop Admin 凭据的同步不得继续重试。在途退款、争议或未结工单不能因卸载被静默标为成功，
其删除/去标识与法定保留按 §10 评审；Partner 历史数据只读对账也须受目的和权限限制。
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
- [ ] Partner API token 按组织级密钥管理、加密、轮换和访问审计；不落日志、前端或普通审计
- [ ] 附件私有存储、传输/静态加密、真实类型/大小/数量校验、扫描前隔离、短时授权下载
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

1. **收集什么**：店铺域名、商品 id 与标题、GARAN 字段、配置、审计事件（staff id 哈希）；以及按实际启用功能收集的 App 计费摘要、退款申请/复核、商家工单/联系人、附件、内部员工与查看记录（详见 §3）
2. **不主动收集什么**：买家姓名/邮箱/电话/地址、订单、客户 id —— 明确列出；工单附件若误含此类信息，按隔离/删除流程处理
3. **为什么需要 `write_products`**：写 app-owned metafield（数据落在商家自己的商品上）
4. **数据存放**：PostgreSQL（地区：待定，`[待确认]` 建议 EU 区域以满足欧盟商家预期）；私有附件存储/扫描区域与处理方另列
5. **保留期限**：见本文件 3.3；财务/工单/附件/内部员工按各自依据，不永久保存全部数据
6. **删除**：卸载 48 小时后自动删除；可邮件请求立即删除；在途退款/争议按 S10 最小化与去标识处理
7. **第三方/处理方**：逐项列出 Shopify/Partner API、托管数据库、附件存储/扫描、基础设施日志及未来通知服务；无则写无，不笼统承诺“没有第三方”
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
| S6  | 内部身份供应、MFA、会话/离职回收与紧急访问              | 内部跨店访问安全   | 独立身份源；开发前评审 `ADMIN-PRD` A-01/A-02 |
| S7  | 内部员工账号、内部审计、匿名交付记录与删除回执的保留期  | 数据最小化 vs 排障/审计 | 分用途评审，不照搬商家期限；见 `ADMIN-PRD` §7–§8、A-05/A-06 |
| S8  | Partner org 的 App Pricing、API client、Manage apps/View financials 可用性与凭据管理 | 计费查询/财务边界 | 目标组织实测；组织级 token 仅服务端，阻塞见 `TECH-DESIGN` A8 |
| S9  | App 计费/退款事实、执行凭证、复核记录的保留依据、期限与去标识 | 对账/争议 vs 数据最小化 | 不作正式会计报告；逐字段评审，不默认永久保留 domain 或完整 payload |
| S10 | 卸载/redact 时在途退款、争议、未结工单与需求公开进度的删除/受限处理 | 完成义务 vs 删除义务 | 不自动宣称完成；仅保留有依据的最小字段，财务/隐私联合评审 |
| S11 | 附件存储/扫描处理方、疑似买家 PII 隔离删除、查看记录粒度 | 支持/凭证 vs 隐私与员工监控 | 上传提示 + 扫描隔离；存储区域和保留未决前不上线附件 |

---

最后更新：2026-10-25，v1.2。新增 App 计费/退款、工单、私有附件与 Partner 凭据边界，S8–S11 待评审。
下一步：`QA-PLAN.md` 已完成 → **M1 评审**（需拍板第 10 节 S1–S11）。
