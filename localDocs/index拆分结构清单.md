# index 拆分结构清单（收口版）

日期：2026-04-04  
适用文件：`index.html`、`Scripts/data.ui-bindings.js`、`Scripts/index.events.js`、`Scripts/data.bootstrap.js`

## 1. 本轮结论

1. `IX-01 ~ IX-14` 已完成，`index` 结构治理与 jQuery 运行时迁移目标闭环。
2. 页面入口已从“jQuery 主链路”切换为“原生 DOM + Vue2 + DSQDom 轻量兼容层”。
3. 当前瓶颈从“是否完成拆分”转为“单文件职责仍重（尤其 `data.ui-bindings.js`）”。

---

## 2. 当前结构快照（2026-04-04 实测）

| 指标 | 当前值 | 说明 |
| ---- | ---- | ---- |
| `index.html` 行数 | 472 | 单入口体量可控 |
| `<script src>` 数量 | 17 | 已移除 3 个 jQuery 相关脚本 |
| `data-layout-section` 锚点 | 6 处 | `head/main-shell/control/dialog/result/footer` 在位 |
| `style=` 内联样式 | 0 | 维持清零 |
| `data.ui-bindings.js` 行数 | 1681 | 仍需进一步拆分 |
| `scheduleUpdateAll()` 调用 | 高频入口 | 统一重算调度已生效 |
| 一方脚本 jQuery 关键词 | 0 | 由 `jquery:check` 持续守护 |

---

## 3. 已完成任务归档

| 编号 | 状态 | 落地摘要 |
| ---- | ---- | ---- |
| IX-01 | 已完成 | `index` 分区锚点建立并稳定使用 |
| IX-02 | 已完成 | `UIselector/Split/MoreSetting` 统一接入 panel controller |
| IX-03 | 已完成 | 对话框语义、焦点陷阱、Esc、回焦闭环 |
| IX-04 | 已完成 | `MoreSetting` 状态驱动开合与 `aria` 同步 |
| IX-05 | 已完成 | 内联样式清零 |
| IX-06 | 已完成 | 弹层键盘路径 E2E 覆盖 |
| IX-07 | 已完成 | `update_all` 调度收敛到统一入口 |
| IX-08 | 已完成 | `UIselector` 懒初始化与蓝图链路按需加载 |
| IX-09 | 已完成 | 样式分层文件固化（`base/a11y/layout/components`） |
| IX-10R | 已完成 | a11y 对比度阻塞修复 |
| IX-10F | 已完成 | 格式门禁恢复 |
| IX-11A | 已完成 | `$.ajax -> fetch`（`data.bootstrap.js`） |
| IX-11B | 已完成 | `$.cookie` 下线，改 `localStorage + legacy 迁移` |
| IX-11C | 已完成 | `$(...).load -> fetch + innerHTML` |
| IX-12~IX-14 | 已完成 | 控制区/结果区核心交互迁移并维持行为一致 |

---

## 4. 现行初始化与调用链（index 视角）

1. 加载阶段：`index.html` 顺序加载监控、i18n、`dom.legacy`、数据与 UI 逻辑脚本。
2. 启动阶段：`data.bootstrap.js` 触发数据加载与 `f_init()`；`index.events.js` 负责说明区块加载和全局行为绑定。
3. 交互阶段：控制区变更 -> `scheduleUpdateAll()` -> `update_all()` -> Vue 结果区刷新。
4. 输出阶段：结果区动作触发蓝图生成/复制链路，保持既有业务语义。

---

## 5. 下一阶段任务（建议）

### IX-15（P0）交互文件解耦

1. `data.ui-bindings.js` 按职责拆分为控制区、结果区、弹层适配三个模块。
2. 拆分过程中保持现有 DOM ID 与全局函数对外契约不变。

### IX-16（P0）初始化契约文档化

1. 明确依赖 `game_data` 的函数清单和 ready 条件。
2. 形成可执行的初始化顺序检查脚本（防时序回归）。

### IX-17（P1）结果区行为测试补强

1. 新增更多“配置切换 -> 行内 machine 变化”断言。
2. 增加异常路径测试（加载失败、蓝图失败、tooltip 清理）。

### IX-18（P1）模块化构建预备

1. 在保持 Vue2 前提下，定义可打包边界和全局变量收敛顺序。
2. 为后续 Vite 深度接管做最小侵入准备。

---

## 6. 本轮 DoD（已满足）

1. `ci:check` 全绿。
2. `index.html` 无 jQuery 相关脚本。
3. 一方脚本 jQuery 运行时依赖清零。
4. 初始化与核心交互链路经 `e2e/integration/a11y` 验证通过。
