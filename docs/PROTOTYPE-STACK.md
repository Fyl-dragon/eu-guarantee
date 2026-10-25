# 原型技术选型与实现方案

> 日期：**2026-10-24**。状态：**已建完并验证（16/16 交互断言通过，0 运行时错误）**
> 目的：为 `UX-FLOWS.md` 的交互流程做**可点击原型**，数据全部 mock，不连后端、不连 Shopify。
> 上游约束：`TECH-DESIGN.md` §1.1（技术栈）、`UX-FLOWS.md`（交互口径）、`PRD.md` §6.4（付费墙时机）
>
> **原型代码与运行说明见 `../prototype/README.md`。**

---

## 0. 结论先行

**不用纯 HTML，用 Vite + React 18 + Polaris 13 的轻量前端项目。**

| 维度 | 纯 HTML（手写 CSS/JS） | **Vite + React + Polaris（选中）** |
| --- | --- | --- |
| 与竞品的交互保真度 | ❌ 需自己实现弹窗、状态机、表单校验 | ✅ 直接复用生产组件 |
| 与最终产品的视觉一致性 | ❌ 手写 CSS 永远对不上 Polaris | ✅ **同源组件**，零偏差 |
| 迁移到真实 App 的成本 | ⚠️ 全部重写 | ✅ **组件代码可直接搬进 `eu-guarantee`** |
| "状态即事实"这类交互 | ⚠️ 手写状态管理易漂移 | ✅ 同一套数据推导五个状态 |
| 无后端 / mock 数据 | ✅ 最简单 | ✅ 同样简单（数据层隔离在一个文件） |
| 启动成本 | 0 | 一个 `npm install`（已装好） |
| 构建产物体积 | 极小 | 340 KB JS + 445 KB CSS（原型可接受） |

**唯一让纯 HTML 有吸引力的是"简单"**，但这个项目的原型要验证的是
**状态机、批量原子性、付费墙时机、排除全链路**——这些恰恰是手写 JS 最容易走样、
而 React 状态管理最擅长的地方。**简单不是目标，交互保真才是。**

---

## 1. 为什么不用纯 HTML

具体到本项目要验证的 6 条设计原则（`UX-FLOWS.md` §1）：

| 原则 | 纯 HTML 的实现难度 | Polaris + React |
| --- | --- | --- |
| P1 状态即事实，不是勾选 | 手写 reducer，五个状态易漂移 | 一个 `derivedState(product)` 纯函数 |
| P2 不合法入口不渲染（不是变灰） | 手写 DOM 增删，批量/单条两处逻辑 | 同一个 `<FilteredProductPicker>` 组件 |
| P3 所有写入走同一路径 | 两处校验函数必然分叉 | 一个 `validateGaran()` 被三个入口调用 |
| P4 反馈与写入原子 | 手写 async + 回滚 | promise 链 + 单一 mutation |
| P5 不打断配置，事后提示 | 手写 toast/弹窗时序 | Polaris `<Toast>` / `<Modal>` 自带时序 |
| P6 每一步有完成检测 | 手写状态聚合 | 派生 selector |

**P2 / P3 是本项目差异化的核心**（N-1 排除全链路）。如果原型用纯 HTML 手写，
"批量入口也过滤"这件事会变成两段独立代码——**而这两段代码正是竞品写错的地方**。
用组件化实现，才可能在原型阶段就暴露出"两处逻辑不一致"。

---

## 2. 技术栈

### 2.1 选定组合

| 层 | 选型 | 版本 | 理由 |
| --- | --- | --- | --- |
| 构建 | **Vite** | 5.4.21 | 秒级热更新；产物是纯静态，可直接部署 |
| 框架 | **React** | 18.3 | 与 `TECH-DESIGN.md` §1.1 生产栈一致（React Router 7 基于 React 18） |
| 组件库 | **@shopify/polaris** | 13.9.5 | **与最终后台 UI 同源**，不引入第二套设计语言 |
| 样式 | Polaris 自带 `styles.css` | — | 不写自定义 CSS（除非原型专用的"店面预览"区域） |
| 路由 | **手写 state 切换** | — | 原型只有 7 个页面，引入 React Router 是过度设计 |
| 数据 | **`src/mock/` 单一数据源** | — | 全部内存态，刷新即重置 |

### 2.2 已完成的实测验证

```
✓ npm install react@18 react-dom@18 @shopify/polaris@13  → 20 packages, 3s
✓ npm install -D vite@5 @vitejs/plugin-react@4           → 7 packages
✓ vite build                                             → 1094 modules transformed
  dist/assets/index.css  445.01 kB │ gzip: 52.41 kB
  dist/assets/index.js   339.53 kB │ gzip: 84.24 kB
```

**结论：Polaris 13 可以完全脱离 Shopify iframe / App Bridge 独立运行。**
这是选型成立的前提——Polaris 设计上是给 iframe 内用的，但并未强依赖 App Bridge
（只有 `@shopify/app-bridge-react` 的 Modal/Toast 才需要，我们不用它）。

### 2.3 明确不用什么

| 不用 | 原因 |
| --- | --- |
| ❌ `@shopify/app-bridge-react` | 需要真实 Shopify 宿主，原型无宿主 |
| ❌ React Router 7 | 7 个页面用 `useState` 切就够；引入后增加 mock 复杂度 |
| ❌ Prisma / 任何数据库 | 明确不连后端 |
| ❌ TypeScript | 原型阶段类型收益低于成本；**但数据模型形状必须严格对齐 `TECH-DESIGN.md` §2** |
| ❌ Tailwind / 自定义设计系统 | 会与 Polaris 打架，且让"视觉保真"这个目的失效 |
| ❌ Storybook | 原型要的是"走得通的流程"，不是组件文档 |

---

## 3. 官方素材接入（已实测，含一个必须绕开的坑）

### 3.1 素材已落地

```
prototype/public/assets/notice/   24 个 SVG（24 语言，仅彩色版）
prototype/public/assets/garan/    3 个 SVG（colour / black&white / nested display）
```

来源：`/tmp/eu-art/`（`21-asset-verification.md` 的实测原件），非重新下载。

> **为什么只放 24 个而不是 48 个**：官方 24 语言各有彩色/黑白两份。
> `18` A2 要求线上**必须彩色（RGB）**，黑白版只用于印刷（`18` B7，属 P2）。
> 全量放入会让 `public/` 从 13MB 涨到 27MB，对原型无收益。
> 生产环境按语言懒加载，单文件 raw 约 0.5–0.7MB、gzip 约 60KB（`21` §2.1）。

### 3.2 ⚠️ GARAN SVG 的字段结构有坑，原型按 `21` 的真实结论实现

`17` 附录 B 曾写"3 个 `<text>` = 恰好三个可编辑字段"。**`21` §2.3 已推翻**：

| # | `<text>` 内容 | 真实含义 |
| --- | --- | --- |
| 1 | `Brand/Trademark` | **字段名标签**，不是要填的值 |
| 2 | `Model identifier` | **字段名标签** |
| 3 | `XX` | **只有年数是占位符** |

→ **brand / model 的实际填写位置至今未确认**（`21` §六 第 1 项，标注"最紧急"）。

**原型处理（不阻塞交互验证）**：
GARAN 预览用**自绘的近似标签**，排布严格按官方几何
（`viewBox 0 0 269.29 283.46`，年数位置 `translate(5.07 150.57)`），
品牌/型号按字段名下方叠加并标 `[待确认位置]` 水印。
**不假装这就是官方渲染**——原型里用一枚灰色角标明示。

> 这条本身就是原型的价值：把"我们还没搞清 brand/model 怎么填"这件事
> 变成屏幕上看得见的东西，而不是埋在文档里。

### 3.3 notice 素材无此问题

48 个 SVG 可直接 `<img src>`。但注意 `21` §2.4：**SVG 未内嵌字体，依赖系统 Inter**。
原型阶段接受字体回退（与真实运行环境一致），不做栅格化。

---

## 4. 目录结构

```
prototype/
├── index.html
├── vite.config.js
├── package.json
├── public/assets/
│   ├── notice/          24 个官方 SVG
│   └── garan/           3 个官方 SVG
└── src/
    ├── main.jsx         入口 + AppProvider
    ├── App.jsx          页面切换、共享 mock 状态与审计事件
    ├── mock/
    │   ├── store.js     店铺、语言、plan、声明配置
    │   ├── products.js  17 个商品（含礼品卡/数字/B2B/仅部分部件）
    │   └── rules.js     排除规则
    ├── domain/
    │   └── garan.js     ★ 五状态推导 + 写入/快照校验（唯一真相）
    ├── components/
    │   └── GaranPreview.jsx  明示非官方的 GARAN 近似预览
    └── pages/
        ├── Home.jsx / LegalNotice.jsx / GaranLabels.jsx
        ├── Exclusions.jsx / Statement.jsx / Audit.jsx
        └── Settings.jsx
```

**`domain/garan.js` 是整个原型的心脏**。它必须导出：

```js
export const GaranState = { EXCLUDED, NOT_REVIEWED, NOT_ELIGIBLE, ELIGIBLE_UNLABELLED, LABELLED }

export function checkExcluded(product, rules)     // 排除判定（单一真相）
export function deriveGaranState(product, rules)  // 五状态推导（EXCLUDED 不在 GARAN 列表展示）
export function validateGaran(product, draft, rules) // 唯一写入校验，返回 {ok, reasons[], yearsHalfUnits}
```

**规则**：单条、批量、排除与快照校验都调用领域函数，不允许出现第二套 if。
`GaranLabels.jsx` 内含单条与批量弹窗；实际文件结构以本节目录树为准。

---

## 5. Mock 数据设计（刻意包含所有边界）

17 个商品，覆盖**每一个状态和每一种排除原因**：

| # | 商品 | 类型 | 预期状态 | 用途 |
| --- | --- | --- | --- | --- |
| 1 | The Collection Snowboard: Hydrogen | 实体 | `LABELLED · 3 years` | 正常样本 |
| 2 | The Multi-managed Snowboard | 实体 | `LABELLED · 2,5 years` | **半整年 + 逗号渲染** |
| 3 | Selling Plans Ski Wax | 实体 | `LABELLED · 5 years` | 正常样本 |
| 4 | The Archived Snowboard | 实体 | `ELIGIBLE_UNLABELLED` | 待贴 |
| 5 | **Gift Card** | **礼品卡** | `EXCLUDED` | **N-1 核心证据** |
| 6 | Gift Card（4 个变体） | 礼品卡 | `EXCLUDED` | 批量选择器必须不出现 |
| 7 | Digital download | 数字 | `EXCLUDED` | 法规排除 |
| 8 | Wholesale pallet | B2B tag | `EXCLUDED` | tag 排除 |
| 9 | Spare parts kit | 实体 | `EXCLUDED`（手动） | 手动排除 |
| 10 | Hydraulic brake | 实体 | `NOT_REVIEWED` | 未审 |
| 11 | Frame only | 实体 | `NOT_REVIEWED`（`coverage=partial`） | **选中 partial → GARAN 入口消失** |
| 12–17 | 其余实体商品 | 实体 | 混合 | 凑够 17 个，其中 12 个合格 |

**关键**：`products.js` 里必须能一眼看出"哪 3 个被排除、为什么"，
且这 3 个在**批量选择器里根本不出现**。这就是 N-1 的可视化证据。

---

## 6. 页面范围（严格对齐 `UX-FLOWS.md`，不自行加页）

| 页面 | 对应 F | 原型要验证的交互 |
| --- | --- | --- |
| Home | F6 | 四行状态 + 每行"问题/原因/修复"（补第 4 行声明，三家都没有） |
| Legal notice | F1/F2/F10 | 四位置开关 + `Check again` + 折叠/完整 + 语言切换（真 SVG 换图） |
| GARAN labels | F3/F4 | 列表五状态 + 编辑弹窗（Step1 未过则 Step2 锁定） |
| Exclusions | F5 | 规则开关 + 排除后的即时影响（列表里消失） |
| Statement | F7 | C1–C5 表单 + **付费墙（Growth 解锁）** + 预览 |
| Audit | F8 | 快照/变更 + **导出一致性校验（不一致则阻止）** |
| Settings | — | 店铺信息、语言策略、卸载说明 |

**不做**：Onboarding 三步向导（`UX-FLOWS.md` §3）——它是首次安装流程，
原型默认"已安装已激活"，向导另做一轮。**这一点要在交付时写明，不能让人以为漏了。**

---

## 7. 运行方式

```bash
cd eu-guarantee/prototype
npm install          # 已完成
npm run dev          # → http://localhost:5180
npm run build        # → dist/（纯静态，可直接部署给他人看）
```

`npm run build` 后 `dist/` 是纯静态站点，**可以部署到任意静态托管**，
让对方不开本地环境就能点——这是纯 HTML 方案唯一的优势，用构建也能拿到。

---

## 8. 迁移路径（原型的真正价值）

原型不是一次性演示，而是**生产代码的草稿**：

| 原型文件 | 迁到 `eu-guarantee` 后 |
| --- | --- |
| `domain/garan.js` | → `app/lib/garan.server.ts`（改成服务端校验，加 TS 类型） |
| `components/GaranDialog.jsx` | → `app/routes/garan._index/GaranDialog.tsx`（加 action 提交） |
| `components/ProductPicker.jsx` | 同路径，改为读真实 product 接口 |
| `mock/*.js` | **丢弃**，换成 loader 数据 |
| `pages/*.jsx` | → `app/routes/*.tsx`，套 React Router |

**关键**：`domain/garan.js` 的三个函数签名设计成**纯函数、不依赖 React**，
所以能原样搬到服务端复用。**这是选 React 而不选纯 HTML 的第二重收益**——
纯 HTML 的状态逻辑写完就废了。

---

## 9. 已知限制（诚实清单）

| # | 限制 | 影响 | 何时解决 |
| --- | --- | --- | --- |
| 1 | **brand/model 在 GARAN SVG 的真实填写位置未确认** | 预览是近似图，非官方渲染 | 需对照 `A2-18` 截图做像素比对；另行安排 |
| 2 | 无 Onboarding 向导 | 看不到首次安装流程 | 第二轮原型 |
| 3 | 无真实店面（Theme App Extension） | notice 用 `<img>` 模拟，非真实 Liquid 渲染 | 不在原型范围 |
| 4 | 刷新即重置 | 无法保存演示状态 | 可加 `localStorage`，暂不做 |
| 5 | 字体回退（SVG 依赖 Inter） | 字形与官方不完全一致 | 与真实运行环境一致，非原型缺陷 |
| 6 | 付费墙只做 UI 拦截 | 无服务端校验（原型无后端） | 生产必须在服务端（`SECURITY-PCD.md` §6） |

---

## 10. 交付状态（2026-10-24 完成）

### 10.1 已实现

| 项 | 状态 |
| --- | --- |
| 骨架（Vite + React 18 + Polaris 13） | ✅ |
| `domain/garan.js`（5 个纯函数） | ✅ 全部单测通过 |
| 7 个页面 | ✅ 全部渲染，0 运行时错误 |
| 官方素材接入（24 notice SVG + 3 GARAN SVG） | ✅ 真实 artwork |
| 侧栏 plan 切换器（演示付费墙） | ✅ |
| Playwright 验证脚本（77 项断言：flows 17 + fixes 11 + audit 14 + enhancements 35） | ✅ 77/77 |

### 10.2 实测通过的验收用例

| 用例 | 断言 | 结果 |
| --- | --- | --- |
| **T5b** 被排除商品不进批量选择器 | 礼品卡/数字/B2B/部分覆盖 4 类均不出现 | ✅ |
| **T5d** 批量原子性 | 填 `2` → "Nothing was saved" + 逐条原因 | ✅ |
| **T4** 部分覆盖 → 禁止 GARAN | Save 按钮禁用 + 显示原因 | ✅ |
| **T3b** 年份 `.5` 接受并渲染逗号 | `2.5`/`2,5` 接受，列表显示 `2,5` | ✅ |
| **T3** 非法年份拒绝 | `2`/`2.1`/`4,1`/`3.0`/`abc`/空 全拒 | ✅ |
| **T5e** 导出一致性 | 注入矛盾后检出 + 阻止导出 | ✅ |
| 付费墙 | Free 锁定 → Growth 解锁 C1–C5 | ✅ |
| 排除规则免费 | 全部规则无付费标记 | ✅ |

### 10.3 待做

| # | 事项 |
| --- | --- |
| 1 | Onboarding 三步向导（`UX-FLOWS.md` §3）——本轮明确不做 |
| 2 | GARAN 官方几何还原（依赖 `21` §六 第 1 项未决） |
| 3 | 移动端适配（后台原型按桌面设计） |

---

## 11. 下一步

1. ~~搭骨架~~ ✅
2. ~~先写 `domain/garan.js`~~ ✅
3. ~~Home → GARAN 列表 → 编辑弹窗~~ ✅
4. ~~Exclusions → 验证批量选择器过滤~~ ✅
5. ~~Legal notice → Statement → Audit~~ ✅
6. **待定**：`npm run build` 后部署静态站；补 Onboarding 向导

---

## 12. 汉化（2026-10-25）

界面改为**纯简体中文**（需求方评审语言）。范围与边界：

| 项 | 处理 |
| --- | --- |
| 7 个页面 + 侧栏 + toast + 审计 detail | 全部中文（约 420 条文案） |
| Mock 数据（17 个商品名、店铺名、声明 C1–C5 示例） | 中文；**brand / model / tag 值保留原样**（品牌编码与 Shopify 标签是数据标识） |
| Polaris 内置文案 | `main.jsx` 改用 `locales/zh-CN.json` |
| `index.html` | `lang="zh-CN"`，标题「EU 保证与耐久性标签 — 原型」 |
| **GARAN 标签预览内的官方文字** | **保留英文**（`COMMERCIAL GUARANTEE OF DURABILITY` 等是官方 artwork 文字，法规上不可翻译） |
| 24 个 notice SVG | 不动（各语言官方素材） |
| 测试断言 | 同步汉化；导航选择器改为 `data-testid`（语言无关） |

### 12.1 一并修正的耦合缺陷

汉化前 `domain/garan.js` 的错误消息是**英文文案并且被逻辑比较**，直接翻译会静默破坏逻辑。改为「稳定枚举 + 显示文本」双轨：

| 位置 | 原实现 | 现实现 |
| --- | --- | --- |
| `checkExcluded` | 返回 `reason` 字符串，`Exclusions.jsx` 用 `reason === 'Excluded manually'` 判断 | 新增 `ExclusionKind`（`manual`/`gift_card`/…），UI 判断 `kind`；`reason` 仅显示 |
| `parseYears` | 返回 `why` 文本，`GaranLabels.jsx` 用 `startsWith('Guarantee period')` 匹配 | 新增 `YearErrorCode`，UI 按 `code` 匹配 |
| `validateGaran` | `reasons` 是字符串数组 | `reasons` 为 `[{ code, text }]`，`ValidationCode` 供逻辑判断 |
| `validateSnapshotConsistency` | `type` 字符串 | 增 `typeCode`（`excluded_but_labelled`/`invalid_label`） |

**易漏联动点**：批量失败渲染从 `reasons.join(' / ')` 改为 `reasons.map(r => r.text).join('；')`，否则界面会显示 `[object Object]`。

### 12.2 汉化附带修正

- `model` 输入框 `maxLength` 由 60 改为 **40**（`TECH-DESIGN` §3.4.2 与 `UX-FLOWS` §5.4 双处要求；此前遗漏）
- 批量提示中的计数空格由 JSX 换行吞掉（渲染成「1个」）→ 改整句模板字符串

### 12.3 验证

`npm run build` 通过（1109 modules）；`verify-flows` 17/17、`verify-fixes` 11/11、`verify-audit` 14/14，
0 运行时错误；12 张截图重生成。残留英文仅白名单项（GARAN、B2B、CSV/PDF、品牌型号、tag 值）。
**F5 断言调整**：`maxLength` 生效后输入被截断到 40，超长校验在 UI 层不可达，故改为断言
`maxlength="40"` + 输入 45 字符后实际长度为 40。

### 12.4 审计快照补齐（2026-10-25，对照 Consentico `12.png`）

原 Audit 的「当前设置快照」只有商品计数与已贴标清单，不满足 `UX-FLOWS.md` §7.1。
现按竞品证据结构补齐，但保留我们的 B0-6 一致性约束：

- 店铺域名、演示检查时间、配置版本与「事实记录，不是法律意见」声明。
- 四个告知位置**逐项记录开启/关闭**、展示方式、受众、24 种官方语言（可展开）与店铺市场。
- 声明发布/草稿/未启用状态；GARAN 五状态覆盖与逐商品 brand/model/years 清单。
- 数字商品、礼品卡、B2B、自定义标签、手动排除的规则与实际商品明细。
- 历史使用 Polaris `Tabs` 切换：全部 / 设置 / GARAN 标签 / 导出，不使用下拉选择。
- 不复制竞品的静态 `Completed`：快照徽标由 `validateSnapshotConsistency()` 决定；
  发现矛盾时显示「需先修复」，仍阻止导出。

### 12.5 提交前一致性复核（2026-10-25）

- 商品持久化字段改为 `yearsHalfUnits`（半年单位整数），输入与展示仍使用 `2,5` 形式。
- 快照校验检查“排除后残留标签数据”与“当前标签非法/不完整”两类原型可构造的矛盾；
  历史 `GARAN_REJECTED` 只作留痕，合法重试后不再阻止导出。生产设计的 Statement 引用、
  聚合计数等完整五项检查仍以 `TECH-DESIGN.md` §6.3 为准，不在 mock 原型中冒充完成。
- 统一 `npm test`；断言失败或页面运行时错误返回非零退出码。可用 `PROTOTYPE_URL` 指定独立预览。
- 最新验证：构建通过；flows 33 + fixes 11 + audit 14 + enhancements 35，共 **93/93** 通过。
  12.4 的 77/77 与更早日期的数字仅为当时历史记录。
- 截图脚本可复现 `screenshots/` 的 15 个关键状态；本次已按当前源码重新生成。

此前的历史验证记录：12.4 为 flows 17 + fixes 11 + audit 14 + enhancements 35，共 77/77。
