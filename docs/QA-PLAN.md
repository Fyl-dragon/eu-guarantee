# QA-PLAN — EU Guarantee & Warranty

> 版本：**v1.1**（2026-10-23）
> 上游：`../../market-research/18-requirement-matrix.md` 第八节（T1–T12）、
> `TECH-DESIGN.md` v1.2、`UX-FLOWS.md` v1.0、`SECURITY-PCD.md` v1.0
> 状态：**待评审**
>
> **v1.1 变更**：§4.4 新增 S10–S14（预认证态 / 匿名 / `network_access` / 后端失败 / 跨店），
> 对应 `TECH-DESIGN.md` 新增的 §4.2.1、§4.5、§4.6。总数 L3 从 32 → 37 项。
>
> 本文件的用例分三层：
>
> - **L1 单元**（Vitest）：纯函数，不依赖 Shopify，必须 100% 覆盖校验逻辑
> - **L2 集成**（Vitest + Prisma testcontainer 或 SQLite）：写入路径与事务
> - **L3 E2E**（Playwright + dev store）：真实店面渲染与人工核对
>
> **"错了就是法务事故"的用例（T3/T4/T4b/T4c/T5b/T5c/T5d/T5e/T6/T10）必须 L1+L2+L3 三层全过。**

---

## 1. 测试环境

| 项           | 要求                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| Dev store    | 与竞品实测同一个（`quote-forge`）或新建专用店                                    |
| 主题         | **3 个**：Dawn（默认）、Sense、Refresh。用于验证 `<details>` 不被覆盖（TECH D7） |
| 商品 fixture | 6 个（见 1.1）                                                                   |
| 语言         | store 默认 `en`；另开 `de` / `fr` / `mt` 三个 locale                             |
| 数据重置     | 每个 E2E 用例前清空 `ProductConfig` 并重跑 seed                                  |

### 1.1 商品 fixture

| #   | 用途             | 关键属性                                                |
| --- | ---------------- | ------------------------------------------------------- |
| P1  | 普通实物，应合格 | `requiresShipping=true`, `isGiftCard=false`, 无排除 tag |
| P2  | 数字商品         | `requiresShipping=false`                                |
| P3  | 礼品卡           | `isGiftCard=true`                                       |
| P4  | B2B              | tag `b2b`                                               |
| P5  | 多 variant       | 3 个 variant                                            |
| P6  | 归档/草稿        | `status=DRAFT`                                          |

---

## 2. L1 单元测试（纯函数，必须最快最全）

### 2.1 `validateGaranEligibility`

| #   | 输入                          | 期望                               | 对应用例             |
| --- | ----------------------------- | ---------------------------------- | -------------------- |
| U1  | `isExcluded=true`，其余全合法 | `PRODUCT_EXCLUDED`                 | T4b                  |
| U2  | `coverage=PARTIAL`            | `COVERAGE_PARTIAL`                 | T4                   |
| U3  | `guaranteeFreeOfCharge=false` | `NOT_FREE_OF_CHARGE`               | T4c                  |
| U4  | `guaranteeFreeOfCharge=null`  | `NOT_FREE_OF_CHARGE`               | T4c                  |
| U5  | `years=null`                  | `YEARS_NOT_INTEGER`                | T3                   |
| U6  | `years=2.5`                   | `YEARS_NOT_INTEGER`                | T3                   |
| U7  | `years="2.5"`（字符串）       | `YEARS_NOT_INTEGER`                | T3                   |
| U8  | `years=2`                     | `YEARS_NOT_GT_2`                   | T3                   |
| U9  | `years=1`                     | `YEARS_NOT_GT_2`                   | T3                   |
| U10 | `years=0`                     | `YEARS_NOT_GT_2`                   | T3                   |
| U11 | `years=-1`                    | `YEARS_NOT_GT_2`                   | T3                   |
| U12 | `years=3`                     | ok                                 | —                    |
| U13 | `years=99`                    | ok（上限）                         | —                    |
| U14 | `years=100`                   | `YEARS_OUT_OF_RANGE`               | —                    |
| U15 | `years=NaN`                   | `YEARS_NOT_INTEGER`                | T3                   |
| U16 | `years=Infinity`              | `YEARS_NOT_INTEGER`                | T3                   |
| U17 | `brand=""`                    | `BRAND_MISSING`                    | —                    |
| U18 | `brand` 61 字符               | `BRAND_TOO_LONG`                   | —                    |
| U19 | `model=""`                    | `MODEL_MISSING`                    | —                    |
| U20 | `model` 41 字符               | `MODEL_TOO_LONG`                   | —                    |
| U21 | 多个违规同时存在              | 返回**全部** reasons（不是第一个） | T5d 需要列出全部原因 |

**必须断言**：`U21` 的 reasons 数组长度 ≥ 2，且顺序稳定（便于前端展示）。

### 2.2 `validateSnapshotConsistency`

| #   | 场景                            | 期望                              |
| --- | ------------------------------- | --------------------------------- |
| C1  | 某商品同时 excluded 且 labelled | `conflicts` 含该商品（B0-6 核心） |
| C2  | labelled 但 `years=2.5`         | conflict                          |
| C3  | statement 引用不存在的商品      | conflict                          |
| C4  | GARAN 计数与行数不一致          | conflict                          |
| C5  | 全一致                          | ok                                |

### 2.3 `renderGaranSvg`

| #   | 输入                     | 期望                                                               |
| --- | ------------------------ | ------------------------------------------------------------------ |
| S1  | `brand="A&B"`            | 输出含 `A&amp;B`，不含裸 `&`                                       |
| S2  | `brand="<script>"`       | 输出被转义，不含 `<script>`                                        |
| S3  | `years=3`                | **第 3 个 `<text>`** 的 `XX` 被替换为 `3`；`<path>` 数量与原文一致 |
| S4  | 原文 `<text>` 数量 ≠ 3   | **抛错**（防止官方文件改版后静默错位）                             |
| S5  | `years=99`               | ok（几何上限）                                                     |
| S6  | `years=100`              | **被 2.1 的 `YEARS_OUT_OF_RANGE` 拦截，不到达此处**                |
| S7  | `brand` / `model` 的写入 | **待 A2 解决后补充断言**（当前未知是替换 text 还是叠加层）         |

**S4 很重要**：`17` 附录 B 记录官方 SVG 恰好 3 个 `<text>`，实测确认（`21` 2.3）。
但**三个 text 中只有 `XX` 是值，另两个是字段名标签**——
所以"三字段 = 三 text"的实现假设是错的，见 `TECH-DESIGN.md` 3.4.1 与 A2。

**S5/S6 的几何依据**（`21` 2.5）：`XX` 可用宽度 116.4 units，
`99` ≈ 89.0（可容），`100` ≈ 133.5（溢出）。

### 2.4 `token`

| #   | 场景           | 期望                       |
| --- | -------------- | -------------------------- |
| K1  | 生成 → 验证    | ok，payload 一致           |
| K2  | 改一字节       | 验证失败                   |
| K3  | 换 secret      | 验证失败                   |
| K4  | 过期           | 验证失败                   |
| K5  | payload 缺字段 | 验证失败（不抛未捕获异常） |

### 2.5 `exclusion` 判定

| #   | 商品                           | 期望原因                                             |
| --- | ------------------------------ | ---------------------------------------------------- |
| X1  | P2（`requiresShipping=false`） | `DIGITAL`                                            |
| X2  | P3（`isGiftCard`）             | `GIFT_CARD`                                          |
| X3  | P4（tag `b2b`）                | `B2B_TAG`                                            |
| X4  | 自定义 tag 命中                | `CUSTOM_TAG`                                         |
| X5  | 手动排除                       | `MANUAL`                                             |
| X6  | `coverage=PARTIAL`             | `PARTIAL`（注意：这是状态不是规则，但 GARAN 不可用） |
| X7  | P1 无任何命中                  | 不排除                                               |
| X8  | 同时命中 DIGITAL 与 B2B        | **按固定优先级返回一个**（避免列表文案抖动）         |

---

## 3. L2 集成测试（写入路径）

| #   | 用例                            | 断言                                                       | 对应         |
| --- | ------------------------------- | ---------------------------------------------------------- | ------------ |
| I1  | 单条保存合法 → 读回             | `state=LABELLED`，metafield 投影已更新                     | —            |
| I2  | 单条保存非法（`years=2.5`）     | 422 + reasons；**数据库无变化**；`RejectedAttempt` 有 1 条 | T3 + T5c     |
| I3  | 被排除商品保存                  | 422 `PRODUCT_EXCLUDED`；无 `GaranLabel` 行                 | T4b + T5b    |
| I4  | 批量 10 个，第 5 个非法         | **整批回滚**，10 个都未写；reasons 指向第 5 个             | T5d          |
| I5  | 把已 LABELLED 商品加入排除      | **同一事务内**删除 label + 写审计 + `state=EXCLUDED`       | B0-6         |
| I6  | 排除后又移出                    | `state=NOT_REVIEWED`，label **不自动恢复**（需重新配置）   | —            |
| I7  | 导出时存在冲突                  | 403 + conflicts；`AuditEvent.EXPORT_BLOCKED`               | T5e          |
| I8  | 从 Starter 降回 Free            | statement 数据保留，`isActive=false`，API 返回 402         | —            |
| I9  | `shop/redact`                   | 所有表该 shop 行数 = 0                                     | 本文件 5.3   |
| I10 | 两个 shop 并发写同一 productGid | 各自独立，互不覆盖（多租户）                               | SECURITY 4.2 |

---

## 4. L3 E2E（真实店 + 人工核对）

### 4.1 安装与激活

| #   | 步骤                   | 期望                                               |
| --- | ---------------------- | -------------------------------------------------- |
| E1  | 全新安装               | 进入 Step 1/3，< 5 秒                              |
| E2  | 走完三步               | Home 第 1 行变绿；店面页脚出现 notice              |
| E3  | 点 `Later` 跳过 Step 2 | Home 保持黄色 `Not live yet`（**不得显示已激活**） |
| E4  | 关闭 app embed         | Home 变红 `Notice is off.`                         |

### 4.2 店面渲染（3 个主题 × 4 个位置）

| #   | 检查                  | 通过标准                                         |
| --- | --------------------- | ------------------------------------------------ |
| R1  | 页脚条                | 彩色、清晰、无裁切；`de` locale 显示德语版       |
| R2  | `mt` locale           | 显示马耳他语版（**T1**）                         |
| R3  | `xx` locale（未支持） | 回退主语言，不报错                               |
| R4  | 商品页 block          | 在价格下方；GARAN 与 notice 同时出现时**不重叠** |
| R5  | 购物车页 / 抽屉       | 各自独立开关生效                                 |
| R6  | **CLS**               | Lighthouse = **0**（T8）                         |
| R7  | 新增 JS               | ≤ 20 KB gzip（折叠用 `<details>`，应为 **0**）   |
| R8  | 二维码                | 扫码指向对应语言 Your Europe 页                  |
| R9  | 修改 CSS 变量         | 只影响外围，artwork 内部不变                     |

### 4.3 GARAN 编辑与硬拦截（最关键）

| #   | 步骤                              | 期望                                                              |
| --- | --------------------------------- | ----------------------------------------------------------------- |
| G1  | 打开 P1 弹窗                      | Step 1 可见，Step 2 disabled                                      |
| G2  | 勾免费 + 选 WHOLE + 填 3          | Step 2 解锁                                                       |
| G3  | 填 brand/model → Save             | 成功；列表显示 `Labelled · 3 years`（**T12**：无 404）            |
| G4  | `years` 填 `2.5`                  | Save disabled + 行内错误（**T3**）                                |
| G5  | 粘贴 `2.5` 到数字框               | 同上（不能只靠 `step` 属性）                                      |
| G6  | `years` 填 `2` / `1` / `0` / `-1` | 全部拒绝（**T3**）                                                |
| G7  | 选 `Only certain parts`           | 红条出现，**Step 2 整块消失**（**T4**）                           |
| G8  | 打开 P3（礼品卡）                 | **GARAN 入口不出现**；列表中不可见（**T4b**）                     |
| G9  | 批量选择器                        | **不列出 P3 / P4**；`Show excluded (2)` 展开后不可勾选（**T5b**） |
| G10 | 通过 `fetch` 直接 POST 被排除商品 | 422 + `RejectedAttempt`（**T5b / T5c**）                          |
| G11 | 批量 10 个含 1 个非法             | 整批失败，列出原因，无部分成功（**T5d**）                         |
| G12 | 保存后立即刷新                    | 状态一致，无 404（**T12**）                                       |
| G13 | 尝试 devtools 改 GARAN 文本       | 改后刷新即恢复（服务端渲染）                                      |
| G14 | 尝试 CSS 隐藏 GARAN               | 可隐藏（**技术上不可防**），但自检页提示"未检测到"                |

> **G14 的口径修正**：`18` T2 原文是"尝试用 CSS 隐藏/改写 → 必须无法生效"。
> **隐藏无法技术阻止**（任何 DOM 都能被 `display:none`）。
> 我们能做到的是：**改写无效**（服务端渲染）+ **隐藏可被发现**（自检）。
> 建议 `18` 的 T2 措辞改为"不得**改写或替换**"。

### 4.4 声明交付（F7）

| #   | 步骤                             | 期望                            |
| --- | -------------------------------- | ------------------------------- |
| S1  | Starter 档配置声明 4 步          | 保存成功，生成 version 1        |
| S2  | 买家登录 → 订单状态页            | 卡片出现，含 C1 提示            |
| S3  | 逐项断言 C1–C5                   | 五项全在（**T6**）              |
| S4  | 点"Open printable version"       | 新标签打开，**无需登录**        |
| S5  | 修改 URL 任一字符                | 403（签名失效）                 |
| S6  | 模拟 1 年后访问（改 `exp` 测试） | 仍可访问（**T7**）              |
| S7  | 订单内无 LABELLED 商品           | 卡片不渲染                      |
| S8  | Free 档用户访问                  | 402，不渲染                     |
| S9  | 页脚                             | 含"not legal advice"（**T10**） |
| S10 | **预认证态**（有订单、未完全登录） | 取不到 `sub` → **不渲染**、不报错（`TECH-DESIGN` 4.2.1/4.4；平台行为 `[待验证]`） |
| S11 | **匿名**订单状态页               | 扩展不加载（官方已证实）；页面正常，无 JS 报错 |
| S12 | **`network_access` 未声明**时访问后端 | 构建/部署期即暴露，不静默降级为空白卡片 |
| S13 | 后端 500 / 超时                  | 不渲染或 warning banner；**不得**向买家显示后端错误细节 |
| S14 | 跨店：A 店 token 请求 B 店数据   | 拒绝。`dest` 决定租户，不信任前端传入的 shop 参数（`TECH-DESIGN` 4.6） |

### 4.5 导出与一致性

| #   | 步骤                      | 期望                                                                |
| --- | ------------------------- | ------------------------------------------------------------------- |
| A1  | 正常导出 PDF              | 页首**不出现**"All required items in place"式的绝对断言；页脚有免责 |
| A2  | 制造冲突（DB 直改）后导出 | 403 + 冲突列表（**T5e**）                                           |
| A3  | CSV 导出                  | 列与 metafield 一致                                                 |

### 4.6 卸载与残留

| #   | 步骤                                  | 期望                                                  |
| --- | ------------------------------------- | ----------------------------------------------------- |
| D1  | 卸载                                  | 店面**立即**无 notice / GARAN（metafield 被平台清理） |
| D2  | 检查 product metafield                | `$app:eu.garan` 不存在                                |
| D3  | 检查 theme                            | 无 block / embed 残留                                 |
| D4  | 检查 Network                          | 无 404 请求（**T9**）                                 |
| D5  | 48 小时后（或手动触发 `shop/redact`） | DB 该 shop 行数 = 0                                   |
| D6  | 卸载后重装（48h 内）                  | 数据仍在，可恢复                                      |

---

## 5. 文案检查（自动化）

用脚本扫描所有用户可见文案（后台 `locales/*.json` + listing 草稿 + 打印页模板）：

```bash
grep -riE "guaranteed compliant|legally compliant|保证合规|only app that|no other app" \
  app/ extensions/ docs/listing/
```

**期望输出为空（除本文件与 PRD 的"禁止列表"外）**。**T10**

同时检查**必须存在**的免责声明：

```bash
grep -c "not legal advice" app/routes/s.\$token.tsx
# 期望 >= 1
```

---

## 6. 性能测试（T8）

| 项                 | 方法                                          | 预算                                           |
| ------------------ | --------------------------------------------- | ---------------------------------------------- |
| CLS                | Lighthouse mobile，商品页 + 首页 × 3 主题     | **0**                                          |
| LCP                | 同上                                          | 不劣于安装前基线 + 0.1s                        |
| 新增 JS            | `du -b dist/client/assets/*.js`               | ≤ 20 KB gzip（折叠用 `<details>`，预期 **0**） |
| **notice artwork** | DevTools Network（**确认 gzip/brotli 生效**） | **≤ 80 KB**（实测 gzip 54–79 KB，`21` 2.1）    |
| **GARAN artwork**  | 同上（内联时算入 HTML）                       | **≤ 30 KB**（实测 gzip 27 KB，`21` 2.2）       |
| **GARAN 折叠态**   | 同上                                          | **≤ 5 KB**（嵌套版 3.3 KB）                    |
| 首屏请求数         | DevTools                                      | +≤ 2                                           |

**必须额外验证（`21` 新增）**：

| #   | 检查                   | 判据                                                                         |
| --- | ---------------------- | ---------------------------------------------------------------------------- |
| P1  | `.svg` 是否被 CDN 压缩 | `Content-Encoding: gzip` 或 `br`。**若为 identity，退 3.3 的 WebP 备用方案** |
| P2  | **字体渲染**           | notice 文字字形与官方 PDF 一致（非系统 sans-serif）。这是 **A1** 的验收      |
| P3  | 折叠态内容             | 仅显示年数，不显示 brand/model（`TECH` 11）                                  |
| P4  | 打印                   | A4 打印 notice 清晰；GARAN 二维码可扫（498px @120pt，`21` 2.6）              |

**基线采集**：安装前在 3 个主题上各跑一次 Lighthouse，记录 LCP/CLS。
若基线本身 CLS > 0（主题问题），记录并排除。

---

## 7. 发布前清单（M6）

- [ ] 上述 L1 全部通过，覆盖率 ≥ 90%（`app/domain/`）
- [ ] L2 全部通过（含 I4 批量回滚、I5 排除一致性）
- [ ] L3 全部通过（3 主题）
- [ ] 文案扫描为空
- [ ] Lighthouse CLS = 0
- [ ] 三个 GDPR webhook 在 dev store 实测触发成功
- [ ] 卸载测试 D1–D6
- [ ] 隐私政策上线（`SECURITY-PCD.md` 第 8 节 8 项全覆盖）
- [ ] listing 文案通过"禁止/必须"检查
- [ ] 截图：notice 三位置 + GARAN + 声明卡片 + 打印页（5 张起）
- [ ] 演示店已配置完整的 6 个 fixture 商品

---

## 8. 已知未覆盖（诚实）

| #   | 未覆盖                     | 原因              | 风险                     |
| --- | -------------------------- | ----------------- | ------------------------ |
| N1  | Shopify Plus 结算页 block  | 我们没有 Plus 店  | 低（我们不做结算块）     |
| N2  | 真实监管审查               | 无法模拟          | 中（文案红线是唯一防线） |
| N3  | 大规模商品（>5000）性能    | fixture 只有 6 个 | 中（列表分页需实测）     |
| N4  | 所有成员国语言的二维码落地 | 只测 en/de/fr/mt  | 低（官方文件保证）       |
| N5  | 竞品后续版本               | 数据 30 天失效    | 中（PRD 已记录）         |

---

最后更新：2026-10-22，v1.0。
上游变更时需同步：`18` 第八节的用例编号。
