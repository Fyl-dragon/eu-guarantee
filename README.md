# EU Guarantee & Warranty

> **状态：设计阶段（M1 评审中）。尚无生产代码；`prototype/` 为 mock 原型。**
> 设计文档评审通过前不写功能代码 —— 这是为了避免重演 `../quote-forge` 的
> "宣称 > 实现"。

帮在欧盟销售实物商品的 Shopify 商家**一次配置**展示法定的欧盟保证告知（notice）
与 GARAN 耐用性标签，并**真正把商业保证声明（C1–C5）交付给买家**。

---

## 为什么做这个方向

**时间窗口**：2026-09-27 起，向欧盟消费者销售消费品的卖家必须展示统一告知；
提供自愿耐用性保证（免费、整机、>2 年）的生产者必须使用 GARAN 标签，
并以可留存形式交付商业保证声明。

**当前竞品结论与差异化以 [`docs/PRD.md`](docs/PRD.md) §2.2–§2.3 为准。** 第二轮九家实测已修订“竞品没有声明交付”等早期判断；证据与表述边界见 [`../market-research/17-competitor-teardown.md`](../market-research/17-competitor-teardown.md) §3–§4。

---

## 文档

> **先读 [`docs/INDEX.md`](docs/INDEX.md)** —— 按任务路由，只读需要的章节；文档持续增长，不要默认整读。

| 文件                                           | 内容                                                        | 版本 |
| ---------------------------------------------- | ----------------------------------------------------------- | ---- |
| [`docs/INDEX.md`](docs/INDEX.md)               | **阅读路由表（唯一权威）**                                  | —    |
| [`docs/PRD.md`](docs/PRD.md)                   | 定位、ICP、JTBD、范围、定价、产品原则、风险、里程碑         | v1.4 |
| [`docs/UX-FLOWS.md`](docs/UX-FLOWS.md)         | 配置/声明交互、GARAN 状态机、工单与 App 退费申请、空/错状态 | v1.1 |
| [`docs/TECH-DESIGN.md`](docs/TECH-DESIGN.md)   | 数据模型、扩展、资产、App Pricing/Partner 同步、退款与附件设计 | v1.4 |
| [`docs/SECURITY-PCD.md`](docs/SECURITY-PCD.md) | 权限、数据清单、GDPR、内部信任边界、财务/工单/附件安全     | v1.2 |
| [`docs/QA-PLAN.md`](docs/QA-PLAN.md)           | L1/L2/L3 三层用例、性能测试、发布清单                       | v1.2 |
| [`docs/ADMIN-PRD.md`](docs/ADMIN-PRD.md)       | 内部后台八模块、25 项 ADM 功能、日志/计费退款/工单与验收    | v0.2（待评审） |
| [`.planning/STATE.md`](.planning/STATE.md)     | 当前阶段、硬性约束、Session Continuity                      | 实时 |

## 研究（仓库外）

| 位置                                              | 内容                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `../market-research/17-competitor-teardown.md`    | 两轮九家竞品实测、证据索引与差异/表述边界                        |
| `../market-research/18-requirement-matrix.md`     | 法规要求 → 可验收功能点，含 T1–T12 用例                                              |
| **`../market-research/21-asset-verification.md`** | **官方素材实测：体积 / 字体 / 几何 / 二维码。推翻两个原设计决策，新增 A1/A2 阻塞项** |
| `../market-research/10`–`16`                      | 评分模型 v2、方向重扫、决赛深挖、G6 分发验证                                         |
| `../截图/<竞品名>/`                               | 原始截图                                                                             |

---

## 技术栈（计划）

沿用 `../quote-forge`（`rfq-v1`）已验证的组合，减少脚手架风险：

- React Router 7 + `@shopify/shopify-app-react-router`
- Prisma 6 + PostgreSQL
- **Theme App Extension**（app embed + app block）→ 零主题侵入
- **Customer Account UI Extension** → 订单状态页交付声明，不需要读 orders
- **Shopify App Pricing + Partner API** → 当前订阅/历史计费事件；人工 App 退款复核（待目标组织验证）
- **私有附件与工单（设计）** → 操作问题、App 退费与意见反馈；不存买家订单/身份
- Vitest（单测，沿用 `rfq-v1`）；Playwright 需新装（`rfq-v1` 未使用）

**权限：Shop Admin scope 只申请 `write_products`。** 不读商家员工数据、不读主题文件、不写店铺文件、
不碰 customers / orders。App 计费使用独立 Partner API 凭据（不等于买家订单权限），详见
`docs/SECURITY-PCD.md` §2–§4 与 `docs/TECH-DESIGN.md` §9。

---

## 与旧项目的关系

`../quote-forge/` 是前身（QuoteForge / RFQ），**已判定红海并冻结**在 tag `rfq-v1`。
它现在只作为**可复用资产**存在（Shopify 模板、Prisma 会话、webhook 骨架、计费门禁结构参考）。
旧 `billing.request` 收费流程不作为新项目主路径；本项目**不修改它的任何代码**。

---

## 产品红线

禁止出现：

- "guaranteed compliant" / "legally compliant" / "保证合规"
- "we are the only app that..."（未经 V1 验证）
- 任何形式的"我们的声明具有法律效力"

必须出现：

> This app helps you display the EU legal guarantee notice and GARAN label, and
> deliver a commercial guarantee statement. It is a display and delivery tool,
> not legal advice.

---

## 下一步

1. 评审 `docs/TECH-DESIGN.md` §10 的当前未决项，优先解决阻塞 M3 的 A1/A2。
2. 评审 `docs/SECURITY-PCD.md` §10 的 S1–S11，以及 `docs/ADMIN-PRD.md` 的范围、权限和数据缺口；M5/F11 前关闭 `TECH-DESIGN.md` A8–A10。
3. 评审通过 → M3 编码（F1–F6 + F4 四项）
4. M3 完成 → 先跑 `docs/QA-PLAN.md` 的 T3–T5e + T12 → 再进 M4（声明）
