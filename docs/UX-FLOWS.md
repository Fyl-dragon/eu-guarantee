# UX-FLOWS — EU Guarantee & Warranty

> 版本：**v1.0**（2026-10-22）
> 依据：`../../market-research/18-requirement-matrix.md` v1.1（法规与用例）、
> `../../market-research/17-competitor-teardown.md`（四家实测，73 张截图）
> 上游：`PRD.md` v1.2
> 状态：**待评审**。本文件通过评审前不写功能代码。
>
> **本文件的每一个流程都必须能追溯到具体证据编号**（`17` 的章节号或 `18` 的用例号）。
> 没有证据支撑的交互，标注 `[设计判断]` 并说明理由。

---

## 0. 一句话

商家装完后**三步见到效果**，且**没有任何路径能进入自相矛盾的合规状态**。

---

## 1. 从实测得出的六条设计原则

这六条不是审美偏好，每一条都对应一个实测到的竞品失误。

| #   | 原则                               | 依据                                                                    | 反面教材                                                   |
| --- | ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1  | **状态即事实，不是勾选**           | `28.png`：Consentico 的 PDF 同时写"已排除礼品卡"和"礼品卡有 2.5 年标签" | 竞品用**临时勾选框**记录法定前提，勾完即丢，无法与审计一致 |
| P2  | **不合法的入口不存在，而不是变灰** | `17` 4.3：EU Warranty 入口有勾选门槛，但**批量选择器仍列出礼品卡**      | 变灰仍会给"也许能绕过"的暗示；不渲染才没有歧义             |
| P3  | **所有写入走同一条路径**           | `17` 4.1 缺陷 1、6：单条有校验、批量没有                                | EU Warranty 单条拦、批量放                                 |
| P4  | **反馈与写入原子**                 | `17` 4.1 缺陷 6：EU Warranty toast 报 `Saved 7` 后页面 404              | 先渲染再写库 / 写库后渲染失败未处理                        |
| P5  | **不打断配置，事后提示升级**       | `17` 3B.4：Pandectes 把付费项做成常驻灰行，压迫感强                     | 安装即弹窗、配置中弹窗                                     |
| P6  | **每一步有完成检测**               | `17` 3B.2：Pandectes 三步 wizard 每步显示已完成/未完成                  | Consentico 的 checklist 有检测；EU Warranty 的 7 步过长    |

---

## 2. 信息架构

### 2.1 后台导航（左侧菜单）

```
EU Guarantee & Warranty
├── Home            ← 激活状态 + 覆盖概览（P6）
├── Legal notice    ← 四处位置配置（F1/F2）
├── GARAN labels    ← 商品标签管理（F3/F4）
├── Exclusions      ← 排除规则（F5）
├── Statement       ← 商业保证声明（F7，Starter+）
├── Audit           ← 快照 / 变更 / 导出（F8）
└── Settings        ← 店铺信息、语言策略、卸载说明
```

**与三家的对照**：

| 家          | 导航结构                                                                               | 我们的取舍                                                    |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Consentico  | Home / GARAN labels / Bulk / Audit log / Settings / Plan                               | 我们**加 Exclusions 与 Statement 一级入口**，因为它们是差异化 |
| EU Warranty | Self-check / Legal guarantee / GARAN label / Order email / Checkout / Plans / Settings | 它的 7 个一级项里 3 个是"放置位置"，我们合并到 Legal notice   |
| Pandectes   | 单页 + tabs                                                                            | 单页在功能变多后会失控                                        |

`[设计判断]`：v1 不做 Plan 一级入口，改为 Settings 内的区块 + Home 的升级卡片（P5）。

### 2.2 首屏（Home）必须回答的四个问题

对齐 Pandectes 的三行状态（`17` 3B.4，四家里信息密度最高），但补上第四项：

| 行  | 状态                               | 未完成时的动作                                                      |
| --- | ---------------------------------- | ------------------------------------------------------------------- |
| 1   | **Notice 是否上线**                | `Enable the app embed`（深链到主题编辑器）                          |
| 2   | **Notice 在哪些位置**              | `Add product block` / `Turn on cart notice`                         |
| 3   | **GARAN 覆盖进度**                 | `Labelled 12 / Eligible 15 / Not eligible 3` + `Review remaining 3` |
| 4   | **Statement 是否配置**（Starter+） | `Complete your guarantee statement`                                 |

**第 4 行是我们的差异**：三家都没有"声明是否完成"这个状态，因为三家都没有声明。
它是付费墙的自然入口，而不是弹窗。

---

## 3. 首次安装与激活（Onboarding）

### 3.1 目标

**从安装到"店铺页真的出现 notice" ≤ 3 步**（与 Consentico 持平；Pandectes 也是 3 步）。
`18` A7 要求"一次配置全店生效"，所以第 1 步必须是全站 embed，而不是商品 block。

### 3.2 流程

```
[安装完成]
   ↓
Step 1/3  Detect store & languages        （自动，无需操作）
   · 读取 shop locale + 已启用的 locales
   · 判定是否有 EU market
   · 展示：Primary English · EU markets: DE, FR, PL · Notice artwork: 24 languages available
   · 若未检测到 EU market → 顶部黄条（见 11.1），仍允许继续
   ↓ [Next]
Step 2/3  Turn on the site-wide notice     （一个开关）
   · 卡片：`EU Guarantee (site-wide)` — App embed
   · 按钮：`Turn on`（调用 Theme App Extension 的 embed 启用，或深链主题编辑器）
   · 右侧实时预览：用真实 store 名 + 当前 locale 的官方 artwork
   ↓ [Next]
Step 3/3  Preview & finish
   · 三处预览：Product page / Cart / Footer strip
   · 提示：`GARAN labels are separate. You can add them next.`（不拦截）
   · `Activate now` / `Later`
   ↓
[Home]  第 1 行变绿：`Notice is live · 3 locations`
```

**关键差异**：

- **Step 1 不做语言选择**。Consentico 与 EU Warranty 都在向导里让商家选语言，
  但 24 种是免费全给的（我们也是），**选语言是伪任务**。
  我们只展示检测结果，把"手动覆盖某语言"放到 Settings。
- **Step 3 不要求配 GARAN**。GARAN 是条件触发（仅提供自愿保证的生产者），
  在向导里强推会让 90% 的商家困惑。
  EU Warranty 把它放进 7 步 checklist（第 7 步，标 Optional）——**我们的处理与之一致**。

**证据**：`17` 3A.2（EU Warranty Step 1 检测语言）、`17` 3B.2（Pandectes 三步含状态检测）。

### 3.3 允许跳过的条件

| 步骤   | 可跳过     | 后果                                |
| ------ | ---------- | ----------------------------------- |
| Step 1 | — 自动     | —                                   |
| Step 2 | ✅ `Later` | Home 第 1 行保持黄色 `Not live yet` |
| Step 3 | ✅ `Later` | 同上                                |

**不允许"跳过但仍显示已激活"**——这是 P1 的直接应用（状态即事实）。

---

## 4. Legal notice：四处位置的配置

### 4.1 位置清单与优先级

`18` A7 要求"全站提醒"；F1 要求四处。但**四处不是四个平级开关**。

| #   | 位置                           | 载体               | 默认             | 优先级                   | 证据                                         |
| --- | ------------------------------ | ------------------ | ---------------- | ------------------------ | -------------------------------------------- |
| L1  | **全站页脚固定条**             | app embed          | **开**           | P0                       | `17` 3.1（Consentico `site-wide`）；`18` A7  |
| L2  | 商品页                         | app block          | 关（需商家放置） | P0                       | `17` 3.1 / 3A.2 / 3B.2                       |
| L3  | 购物车页                       | app embed          | 关               | P0                       | `17` 3.1                                     |
| L4  | 购物车抽屉                     | app embed（同 L3） | 关               | P0                       | `17` 3.1                                     |
| L5  | 订单状态页（customer account） | UI extension       | 关               | **P2**（与声明共用宿主） | `[设计判断]` 三家都没做；`18` 只要求"店铺层" |

> **口径说明**：Consentico 的"五处"包含**订单确认邮件**（需手粘 HTML）。
> 我们已把发邮件列为非目标（PRD 5.2），所以 v1 对标的是它的**核心四处**
> （全站 / 商品页 / 购物车页 / 抽屉）。**任何文案不得写"五处持平"。**

**为什么 L5 降为 P2**：法规要求 notice 在"店铺层醒目位置"，
订单状态页是**交易后**页面，不构成店铺层展示。做了是加分，不是必需。
**这避免了把 F1 的范围扩到无法在 2 周内完成。**

### 4.2 配置界面（Legal notice 页）

```
┌─ Where the notice appears ─────────────────────────────┐
│  ✅ Site-wide footer strip          [Live]   [Off]     │
│     一条细条，固定在页脚上方，所有页面可见              │
│                                                        │
│  ⚠️  Product page block             [Not placed]       │
│     Add the block in your theme editor                 │
│     [Open theme editor]  [Check again]                 │
│                                                        │
│  ○  Cart page                       [Off]              │
│  ○  Cart drawer                     [Off]              │
│     (这两个共用同一个 embed)                            │
└────────────────────────────────────────────────────────┘
┌─ Appearance ───────────────────────────────────────────┐
│  Display:  (•) Full  ( ) Collapsed                     │
│            官方 artwork 不可修改（标题/二维码/配色）      │
│  位置微调: 页脚 / 顶部条                                │
│  语言: 跟随 shopper 语言 · 24 种官方 artwork            │
│        [Advanced: override per language]               │
│  右侧：实时预览（真实 store 名 + 当前 locale）           │
└────────────────────────────────────────────────────────┘
```

> **GARAN 折叠态的说明**（2026-10-22 实测补充）：
> 官方提供**两种尺寸**的 GARAN 标签 —— 完整版（近正方形）与**嵌套版**（长条，仅含年数）。
> 折叠态使用嵌套版，**只显示年数，不显示 brand / model**。
> 这是官方设计，不是信息缺失。UI 提示文案必须写清：
> `Collapsed shows the guarantee period only. Expand to see brand and model.`
> 详见 `TECH-DESIGN.md` 第 11 节。

### 4.3 "Check again" 的实现要求

**不能靠读主题模板**（EU Warranty 为此申请了 `read_themes`；Pandectes 也申请了）。
我们的做法：

1. app block 渲染时向前端发一个 `window.Shopify.analytics.publish` 事件，
   或写一个 `localStorage` 标记 + 后端心跳。
2. `[设计判断]` **v1 最简方案**：不检测，只给一次性 `Open theme editor` 深链 +
   手动勾选 `I have added the block`（写进审计）。
   理由：检测需要额外 scope 或前端事件，而 block 放置本身有 theme editor 的即时视觉反馈。
   **若 V1 商家反馈"不知道加没加成功"，再升级为前端事件检测。**

> 这条体现一个取舍：**为了少申请一个权限，接受一个交互降级**。
> 与 Pandectes（写文件）、EU Warranty（读模板）形成对比，可写进 listing 的隐私卖点。

### 4.4 语言策略

| 场景                   | 行为                                                   | 依据                            |
| ---------------------- | ------------------------------------------------------ | ------------------------------- |
| shopper locale ∈ 24 种 | 显示对应官方 artwork                                   | `18` A5                         |
| shopper locale ∉ 24 种 | 回退到 store 主语言；若主语言也 ∉ 24 → `en`            | `17` 3A.7（EU Warranty 回退链） |
| 商家手动覆盖某语言     | 该语言固定用覆盖文案（**仅限周边文案，不改 artwork**） | `17` 3.3、3A.5                  |

**硬约束**：artwork 本身**不允许**任何文案替换（`18` A4 / B1–B6）。

---

## 5. GARAN labels：编辑流程与状态机（本文件的核心）

### 5.1 v1 是商品级，不是变体级

`18` 把"逐变体"列为 P1。因此 v1 的 GARAN 数据**挂在 product 上**，
不挂在 variant 上。UI 里**不出现**变体层级的选择器。

> 注意：Consentico 有三层变体粒度（`17` 3.2），看起来强，但它是缺陷的来源之一。
> 我们 v1 不做，反而更少歧义。

### 5.2 状态机的四个状态

状态由**三个持久化事实**推导，不由勾选框决定（P1）。

#### 事实（每商品三条，可审计）

| 字段                    | 类型                   | 含义                  | 来源          |
| ----------------------- | ---------------------- | --------------------- | ------------- |
| `guaranteeFreeOfCharge` | `bool`                 | 对消费者不额外收费    | `18` B0-1     |
| `coverage`              | `'whole' \| 'partial'` | 覆盖整机 / 仅部分部件 | `18` B0-2     |
| `years`                 | `int`                  | 保证年数              | `18` B0-3、B9 |
| `brand`                 | `string`               | 生产者名称            | `18` B10      |
| `model`                 | `string`               | 型号                  | `18` B11      |

**`coverage` 是单一真相**：它同时回答 PRD 开放问题 Q4（"仅覆盖部分部件如何声明"）
与 B0-2。不需要两个开关互相矛盾。

#### 四个状态

| 状态                  | 判定条件                                          | UI 表现                                  | 可执行动作           |
| --------------------- | ------------------------------------------------- | ---------------------------------------- | -------------------- |
| `EXCLUDED`            | 命中任一排除规则（5.3）                           | 列表内**不显示**；仅在 Exclusions 页可见 | 无（入口不渲染，P2） |
| `NOT_REVIEWED`        | 未被排除，且 `guaranteeFreeOfCharge` 未设置       | 列表显示 `Not reviewed` 灰标             | `Review`             |
| `ELIGIBLE_UNLABELLED` | 未排除，前提满足，但 `brand`/`model`/`years` 不全 | `Qualifying · not labelled` 黄标         | `Add label`          |
| `LABELLED`            | 未排除，前提满足，三字段完整且合法                | `Labelled · N years` 绿标                | `Edit` / `Remove`    |

**没有第五个状态。** 竞品的"Labelled 但实际被排除"就是第五个状态，
是缺陷 1 的根源（`17` 4.3）。

#### 状态转换图

```
                    ┌───────────────────────┐
                    │      EXCLUDED         │  ← 入口不渲染，无动作
                    └───────────▲───────────┘
                                │ 命中排除规则
        ┌───────────────────────┴───────────────────────┐
        │                                               │
   [NOT_REVIEWED] ──Review──► [ELIGIBLE_UNLABELLED] ──Save──► [LABELLED]
        ▲                          ▲                            │
        │                          └────────Edit────────────────┘
        └────────── Remove ────────────────────────────────────┘
```

**关键规则**：

1. `EXCLUDED` 是**吸收态**（absorbing state）。进入后只能通过修改 Exclusions 离开。
   在 Exclusions 页把它移出排除时，回到 `NOT_REVIEWED`。
2. `LABELLED` → `EXCLUDED` 的转换**必须被阻止**。
   即：**不能把已被排除的商品改成合格并保存**（这就是缺陷 1）。
3. 若商家在 Exclusions 页把已 `LABELLED` 的商品加入排除：
   **先弹确认**：`This product has a GARAN label. Excluding it will remove the label.`
   → 确认后**同时删除 label 并写入审计**（一条记录，两个事实）。
   **不允许留下"标签还在、但已排除"的中间态**（P1 / B0-6）。

### 5.3 排除规则（决定 `EXCLUDED`）

| 类型       | 判定                                          | 默认  | 可改                      |
| ---------- | --------------------------------------------- | ----- | ------------------------- |
| 数字商品   | `product.requiresShipping === false` 且非实物 | ✅ 开 | 否（法规排除）            |
| 礼品卡     | `product.isGiftCard === true`                 | ✅ 开 | 否（法规排除）            |
| B2B        | tag ∈ `{b2b, wholesale, trade-only}`          | ✅ 开 | 是（tag 名单可增删）      |
| 自定义 tag | 商家指定                                      | 关    | 是                        |
| 手动       | 逐个商品                                      | —     | 是                        |
| 仅部分部件 | `coverage === 'partial'`                      | 关    | 是（在 GARAN 弹窗内设置） |

**注意**：Pandectes 把"自动排除"做成付费项（`17` 4.4），导致免费用户最容易违规。
**我们的排除规则全部免费**（`18` F5）。

### 5.4 GARAN 编辑弹窗（唯一的写入入口）

```
┌─ Add a GARAN label ────────────────────── [商品名 + 缩略图] ─┐
│                                                             │
│  Step 1 — Does this product qualify?                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ( ) The guarantee is free of charge                   │  │
│  │     → guaranteeFreeOfCharge = true                    │  │
│  │                                                       │  │
│  │ Coverage                                              │  │
│  │   (•) The whole product                               │  │
│  │   ( ) Only certain parts  ← 选中即不可用 GARAN         │  │
│  │                                                       │  │
│  │ Guarantee period (years)   [ 3 ] integer, > 2         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Step 2 — Label details（仅在 Step 1 全部合法后可编辑）      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Brand / Trademark  [ Snowboard Vendor      ]  required │  │
│  │ Model identifier   [ NWT-240               ]  required │  │
│  │ Years              [ 3 ]  (来自 Step 1，只读回显)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Label preview ──────────────────────────────────────┐   │
│  │  [官方 GARAN artwork，实时替换三个 <text> 字段]        │   │
│  │  其余元素固定：标题 / 勾号 / 二维码 / 日历 / 24 语言   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                            [Save label] (disabled)│
└─────────────────────────────────────────────────────────────┘
```

**交互细则（全部对应验收用例）**：

| 规则                                                                                                                                           | 实现                              | 用例    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------- |
| Step 2 在 Step 1 合法前**不可编辑**（不是只变灰，是整块 disabled）                                                                             | —                                 | E1      |
| `coverage = partial` → 弹窗顶部出现红条 `GARAN cannot be used when coverage is partial.`，**Step 2 整块消失**                                  | —                                 | **T4**  |
| `years` 输入 **`2` / `1` / `0` / `2.5` / `3.0` / `-1` / `abc` / 空** → `Save` 保持 disabled + 行内错误 `Must be a whole number greater than 2` | 前端 + 服务端同函数               | **T3**  |
| `years` 用 `<input type="number" step="1" min="3">`，但**不能只靠 input 属性**：粘贴 `2.5` 必须被拒                                            | —                                 | T3      |
| `brand` / `model` 空 → `Save` disabled                                                                                                         | 必填                              | —       |
| `brand` 超过 60 字符 / `model` 超过 40 字符 → 拒绝（防止撑破 SVG 布局）                                                                        | `[设计判断]` 具体上限待设计稿确定 | —       |
| 保存成功后列表**同步刷新**，不做"先 toast 后请求"                                                                                              | 先 await 写入再 toast             | **T12** |
| 保存失败 → 弹窗**保持打开**并显示错误，不清空输入                                                                                              | —                                 | T12     |

**官方便签的渲染**：三个 `<text>` 块做字符串替换（`17` 附录 B）。
其余为固定 `<path>`。**渲染为内联 SVG，不提供任何 CSS 覆盖入口**（`18` B1–B7 / T2）。

### 5.5 服务端校验（唯一的防线，P3）

```
validateGaranEligibility(product, input) → Ok | Rejected(reasons[])
  1. product 是否命中排除规则 → EXCLUDED
  2. coverage === 'partial' → 拒绝
  3. guaranteeFreeOfCharge !== true → 拒绝
  4. !Number.isInteger(years) || years <= 2 → 拒绝
  5. brand / model 为空或超长 → 拒绝
```

**所有写入路径必须调用它**：

| 路径                  | 调用点                                |
| --------------------- | ------------------------------------- |
| 单条编辑（5.4 弹窗）  | server action                         |
| 批量表单（5.6）       | 逐个校验，**任一失败整批拒绝**（T5d） |
| CSV 导入（P1）        | 逐行校验，输出失败行报告              |
| API / webhook（若有） | service 层统一入口                    |
| PDF / 快照导出（F8）  | 导出前做一致性检查（B0-6 / T5e）      |

**被拒时**：写一条 `RejectedAttempt` 记录（`actor`, `productId`, `reasons[]`, `timestamp`）。
UI 上**不暴露**这条记录给买家侧，只在 Audit 页可见（D-4 / T5c）。

### 5.6 批量入口的额外规则（针对 EU Warranty 的缺陷 1）

**商品选择器（`Add products`）不得列出 `EXCLUDED` 商品。**
不是"列出但标灰"，是**查询层就过滤掉**（P2）。

```
selectableProducts = products.filter(p => p.garanState !== 'EXCLUDED')
```

**并且**：选择器提供 `Show excluded (N)` 的折叠区，展开后只显示原因、不可勾选。
理由：商家会问"我的礼品卡去哪了"，需要一个可解释的出口，但不能是可勾选的入口。

> 这条直接对应 `17` 3A.4 的截图 A2-8/A2-9：EU Warranty 的选择器列出了 Gift Card，
> 商家勾上、填 `2.5`、保存，得到 7 个 `Labelled · 2.5 years`。

### 5.7 列表页（GARAN labels）

```
┌─ Coverage ────────────────────────────────────────────────────┐
│  Labelled  12     Qualifying · not labelled  3     Not reviewed 5 │
│  Excluded  4  (not shown here)                                │
└───────────────────────────────────────────────────────────────┘

Filter: [All ▾]  Search products...

┌───────────────────────────────────────────────────────────────┐
│ The Collection Snowboard: Hydrogen                            │
│ ffd · dsd · 2.5 years            ← 不应出现（整数校验会挡住） │
│                                    [Edit]  [Remove]           │
└───────────────────────────────────────────────────────────────┘
```

**列表不显示 `EXCLUDED` 商品**，与 Pandectes 的做法一致（`17` 3B.5 的 `Not required`），
但我们的 `Not reviewed` 与 `Not eligible` 是**两个不同状态**，
Pandectes 把它们混成一个 `Not required`，无法区分"还没看"和"看了不合格"。

---

## 6. Statement：商业保证声明（F7，核心差异化）

### 6.1 商家侧配置流程

```
Statement（一级入口，Starter+ 才可用）
   ↓
Step 1  Producer identity
   · 生产者名称（默认读 shop name，可改）
   · 生产者地址（必填，明文说明：法规要求 C2）
   ↓
Step 2  What the guarantee covers
   · 自动列出 `LABELLED` 商品（C4）
   · 若 0 个 → 空状态：`You have no labelled products yet. Add GARAN labels first.`
   ↓
Step 3  How to claim（C3）
   · 有序步骤列表（至少 1 条）
   · 默认模板：[Contact us] → [Provide order number] → [Ship for repair]
   ↓
Step 4  Terms & exclusions（C5）
   · 富文本，必填
   · 空状态提示：`Describe what is not covered, e.g. accidental damage.`
   ↓
Step 5  Preview & activate
   · 预览：订单状态页的一段 + 可打印页
   · 固定段落（不可编辑，C1）：
     "You have a legal guarantee free of charge from the seller. This commercial
      guarantee is in addition to it and does not affect your legal rights."
```

**C1 是固定文案，不可编辑**——这是法规要求，也是我们与竞品 reminder 的最大差别。
`[设计判断]`：C1 需要多语言。v1 用官方英文 + 5 种主要语言（de/fr/es/it/nl），
其余语言回退英文并**明示**"English version prevails"。
`[待确认]` 这条需要在 V1 与商家确认可接受性。

### 6.2 买家侧交付流程

```
买家下单
   ↓
订单状态页（customer account · order-status.block.render）
   ↓
┌─ Your commercial guarantee ──────────────────────────────┐
│  ⚠️ This is not your legal guarantee                     │
│  You have a legal guarantee free of charge from the      │
│  seller. This commercial guarantee is in addition.       │
│                                                          │
│  Guaranteed by  Snowboard Vendor                         │
│                 Example GmbH, Musterstraße 1, 10115 Berlin│
│                                                          │
│  Covers         The Collection Snowboard: Hydrogen       │
│                 NWT-240 · 3 years                        │
│                                                          │
│  How to claim   1. Contact us at support@…               │
│                 2. Provide your order number             │
│                 3. Ship the product for repair           │
│                                                          │
│  Terms          [Expand]                                 │
│                                                          │
│  [Open printable version]  ← 新标签页，无登录要求         │
└──────────────────────────────────────────────────────────┘
```

**C6 的满足方式**：

- 订单状态页长期可回访（T7）
- 可打印页是**独立 URL + 签名 token**，不需要登录，30 天/1 年后仍有效（T7）
- 页面上提供 `Save as PDF`（浏览器打印）

**不声称这是唯一合法形式**（PRD Q2）。

### 6.3 技术边界的 UX 表达

`[设计判断]` Customer Account UI Extension 只在买家**登录**时可见。
未登录的访客看不到声明。

**因此必须提供第二条通道**：订单确认页/邮件里的链接 → 可打印页（带签名 token）。
`[待确认]` 我们不做邮件，所以这条通道需要商家自己把链接放进订单确认邮件模板
（类似 EU Warranty 的手动 snippet，`17` 3A.7）。

**v1 简化决策**：只做可打印页 + 在 Shopify 的 order status 页面外提供链接入口。
**在 Statement 配置页显式给出**：

> `Paste this link into your order confirmation email template so every buyer gets it.`
> `[Copy link template]`

这与竞品"手粘 snippet"的体验相同，但**我们粘的是一个 URL，不是一段 Liquid**——
商家不会改坏模板。这是可写的体验差异。

---

## 7. Audit：快照、变更与一致性（F8）

### 7.1 三个视图

| 视图              | 内容                                                                                 | 对应   |
| ----------------- | ------------------------------------------------------------------------------------ | ------ |
| **Current setup** | 当前快照：位置、语言集、排除规则、GARAN 清单（含 brand/model/years）、Statement 状态 | D1     |
| **History**       | 谁、何时、改了什么（含被拒尝试）                                                     | D2     |
| **Export**        | CSV（Pro）/ dated PDF（Pro）                                                         | D3、D4 |

### 7.2 导出一致性校验（B0-6 / T5e）

导出前必须执行 `validateSnapshotConsistency()`：

```
1. 若某商品在 excluded 列表 且 在 labelled 列表 → 阻止导出，提示：
   "Inconsistent state found for 1 product. Fix it before exporting."
2. 若 statement 引用了已排除商品 → 阻止。
3. 若 GARAN years 非整数 → 阻止（理论上不可能，作为兜底）。
```

> 这一条直接来自 `28.png`：Consentico 的 PDF 顶部写 `All required items in place`，
> 表内同时列 `Gifts cards: Excluded` 和 `Gift Card · 2.5 years`。
> **我们的 PDF 永远不能出现这种自证违规。**

### 7.3 PDF 的固定声明

页脚必须包含（与 Consentico 一致的诚实表述，且更强）：

> `This record states how the app is configured on this store. It is a factual
record, not legal advice. Generated <timestamp> from configuration version <n>.`

---

## 8. Exclusions 页

```
┌─ Automatically excluded ────────────────────────────────┐
│  ✅ Digital products        (requiresShipping = false)  │
│  ✅ Gift cards              (isGiftCard = true)         │
│  ✅ B2B tags                b2b, wholesale, trade-only  │
│     [+ Add tag]                                         │
│  ○  Custom tags             [none]                      │
└─────────────────────────────────────────────────────────┘
┌─ Manually excluded (2) ─────────────────────────────────┐
│  Gift Card $10        Gift card · automatic             │
│  The Archived Snowboard   Manual · added by you         │
│                                            [Remove]     │
└─────────────────────────────────────────────────────────┘
```

**交互约束**：

- 关闭 `Digital products` 或 `Gift cards` 需要**二次确认**，文案：
  `The EU notice does not apply to these products. Turning this off may show it where it should not appear.`
- `[设计判断]` 允许关闭（不硬锁），因为不同成员国的执行细则有差异，
  且拒绝给商家开关会让"我们懂法"变成"我们替你决定"。**但要留痕**（写入 History）。

---

## 9. 空状态清单（必须逐条实现）

空状态是竞品最弱的地方（四家里只有 Pandectes 在 Exclusions 有空状态文案）。
每一条都要有**主文案 + 一个动作**，不能只有一句"暂无数据"。

| #   | 场景                         | 文案                                                                                           | 动作                                  |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| E1  | 未安装任何位置               | `Your notice is not showing yet.`                                                              | `Turn on the site-wide notice`        |
| E2  | 无 EU market                 | `We didn't detect an EU market. The notice may still be required if you sell to EU customers.` | `Continue anyway` / `Review settings` |
| E3  | GARAN 列表为空（全部未审核） | `No products reviewed yet. 18 products may qualify.`                                           | `Start reviewing`                     |
| E4  | GARAN 列表：全部被排除       | `All your products are excluded. Gift cards and digital goods don't need a GARAN label.`       | `Review exclusions`                   |
| E5  | 某商品合格但缺字段           | `Qualifying — add brand, model and years.`                                                     | `Add label`                           |
| E6  | Statement 无已贴标签商品     | `You have no labelled products yet.`                                                           | `Add GARAN labels`                    |
| E7  | Statement 未配置（Starter+） | `Your customers don't receive a guarantee statement yet.`                                      | `Set it up`                           |
| E8  | Audit 无历史                 | `No changes recorded yet.`                                                                     | —（无需动作）                         |
| E9  | 搜索无结果                   | `No products match "xyz".`                                                                     | `Clear search`                        |

---

## 10. 错误态清单

| #   | 场景                           | 处理                                                                                      | 依据     |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------- | -------- |
| ER1 | 保存 GARAN 失败（网络/服务端） | 弹窗保持打开、输入不清空、显示可重试错误                                                  | T12 / P4 |
| ER2 | 保存成功但列表刷新失败         | toast `Saved` + 列表顶部条 `Couldn't refresh. [Reload]`，**不显示 404**                   | 缺陷 6   |
| ER3 | 批量保存部分失败               | **整批回滚**，列出每个失败商品及原因                                                      | T5d      |
| ER4 | CSV 导入有非法行               | 导入前预览：`42 rows ok · 3 rows will be rejected` + 下载失败行 CSV                       | P3       |
| ER5 | 导出一致性失败                 | 阻止 + 列出冲突商品 + 深链到修复位置                                                      | T5e      |
| ER6 | Statement 引用的商品被删除     | Statement 页顶部黄条 `1 product in your statement no longer exists.` + `Remove reference` | —        |
| ER7 | app embed 被商家关闭           | Home 第 1 行变红 `Notice is off.` + `Turn on`                                             | P1       |
| ER8 | 主题不支持 app block           | 提示 + `Use the footer strip instead`（降级方案）                                         | —        |

---

## 11. 升级与付费墙时机（P5）

| 时机                 | 表现                                         | 依据                            |
| -------------------- | -------------------------------------------- | ------------------------------- |
| 安装时               | **不弹窗**                                   | `17` 3B.4：Pandectes 灰行压迫感 |
| 配置第 3 个 GARAN 后 | 不提示（免费无限）                           | 我们的免费档不卡数量            |
| 首次点开 `Statement` | 页内说明 + `Start 7-day trial`，不拦截       | —                               |
| 首次点 `Export PDF`  | 页内说明 + 试用入口                          | —                               |
| Home 第 4 行未完成   | 常驻卡片 `Complete your guarantee statement` | —                               |

**禁止**：

- ❌ 全屏升级弹窗
- ❌ 在 GARAN 编辑流程中打断
- ❌ 把合规必需的排除规则锁在付费墙后（Pandectes 的做法，`17` 4.4）

---

## 12. 与验收用例的映射

| 用例                     | 落在本文件的位置                                            |
| ------------------------ | ----------------------------------------------------------- |
| T1 马耳他语              | 4.4 语言策略                                                |
| T2 CSS 无法改写 GARAN    | 5.4「内联 SVG，不提供任何 CSS 覆盖入口」                    |
| **T3 整数年份**          | 5.4 交互细则 + 5.5 校验第 4 条                              |
| **T4 部分部件**          | 5.2 `coverage` 单一真相 + 5.4 `Step 2 整块消失`             |
| **T4b 礼品卡/数字/B2B**  | 5.2 `EXCLUDED` 吸收态                                       |
| **T4c 未勾免费+整机**    | 5.5 校验第 2、3 条                                          |
| T5 数字商品不展示 notice | 5.3 排除规则                                                |
| **T5b 批量/CSV 绕过**    | 5.6 选择器过滤 + 5.5 全路径校验                             |
| **T5c 拒绝留痕**         | 5.5 `RejectedAttempt`                                       |
| **T5d 批量原子性**       | 10 ER3                                                      |
| **T5e 导出一致性**       | 7.2 `validateSnapshotConsistency()`                         |
| T6 声明含 C1–C5          | 6.1 Step 1–4 + 6.2 渲染区块                                 |
| T7 声明长期可回访        | 6.2 可打印页签名 token                                      |
| T9 卸载零残留            | 全流程只用 Theme App Extension + customer account extension |
| T10 文案红线             | 7.3 PDF 声明 + 0 节的定位表述                               |
| T11 免费档全功能         | 4/5/8 全部免费；仅 6、7 的导出、以及 P1 功能付费            |
| **T12 保存后 404**       | 10 ER2                                                      |

---

## 13. 本文件明确**没有**回答的问题

诚实边界，避免下游误以为已定：

| #   | 未定项                                                            | 何时定                               |
| --- | ----------------------------------------------------------------- | ------------------------------------ |
| U1  | GARAN SVG 内联渲染的**具体 DOM 结构与 CSS 隔离方案**              | `TECH-DESIGN.md`                     |
| U2  | 官方 SVG 0.5–0.7MB 的**加载策略**（内联 / `<img>` / 预渲染 WebP） | `TECH-DESIGN.md`                     |
| U3  | 可打印页的**签名 token 方案**与有效期                             | `TECH-DESIGN.md` + `SECURITY-PCD.md` |
| U4  | C1 固定文案的**多语言来源**（自译还是官方文件）                   | 设计评审时定                         |
| U5  | 商品数上限是否引入免费档                                          | V1 验证后（PRD Q7）                  |
| U6  | `[设计判断]` 全部条目的取舍是否需要商家验证                       | V1 对话                              |

---

最后更新：2026-10-22，v1.0。
上游变更时需同步：`PRD.md`（差异化表述）、`18-requirement-matrix.md`（用例）、
`TECH-DESIGN.md`（U1–U3）。
