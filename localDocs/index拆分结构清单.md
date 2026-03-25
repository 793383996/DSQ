# index 拆分结构清单（刷新版）

日期：2026-03-25  
适用文件：`index.html`、`Scripts/style.css`、`Scripts/data.ui-bindings.js`

## 1. 刷新结论（当前阶段）

1. `IX-01 ~ IX-06` 已完成，`index` 分区、弹层控制器、键盘可访问性、开合状态机与 E2E 回归已落地。  
2. `IX-05`（内联样式收敛）已完成：`index.html` 内联 `style=` 已清零，样式集中到 `Scripts/style.css`。  
3. 当前“可维护性主瓶颈”已从弹层交互转移到：
- 首屏仍有同步脚本加载链（`index.html` 中 `<script src>` 26 个）
- 交互层仍有较强 jQuery 绑定耦合（`Scripts/data.ui-bindings.js` 中 `$(...)` 105 次）
- 蓝图链路尚未分级加载（未点击生成时仍会提前加载相关脚本）

## 2. 当前状态快照（以代码实测为准）

| 指标 | 当前值 | 说明 |
| ---- | ---- | ---- |
| `index.html` 行数 | 472 | 结构分区已清晰，但仍是单入口大文件 |
| `<script src>` 数量 | 26 | 仍为同步加载链，首屏阻塞风险仍在 |
| `style=` 内联样式 | 0 | 已完成样式抽离 |
| `data-layout-section` 锚点 | 6 处 | `head/main-shell/control/dialog/result/footer` 均在位 |
| `data.ui-bindings.js` 行数 | 1533 | 已加入调度层与 UIselector 懒初始化逻辑 |
| `update_all()` 显式调用 | 8 次 | 仅保留初始化/需立即重算路径 |
| `scheduleUpdateAll()` 调用 | 37 次 | 高频交互已统一走调度入口 |
| `$(...)` 使用次数 | 105 次 | Vue 组件化前的主要耦合点 |

## 3. 已完成项归档（IX-01 ~ IX-08A）

| 编号 | 状态 | 落地摘要 | 主要文件 |
| ---- | ---- | ---- | ---- |
| IX-01 | 已完成 | 建立 `layout-head/control/dialog/result/footer` 稳定锚点 | `index.html` |
| IX-02A/IX-02B | 已完成 | 三面板统一接入 `DSQPanelController`，旧入口保留并转发 | `Scripts/ui.panel-controller.js`、`Scripts/data.ui-bindings.js` |
| IX-03A/IX-03B | 已完成 | `UIselector/Split` 对话框语义 + 焦点陷阱 + `Esc` + 回焦 | `index.html`、`Scripts/ui.panel-controller.js` |
| IX-04A/IX-04B | 已完成 | `MoreSetting` 状态驱动开合，`aria` 与视觉状态同步 | `Scripts/data.ui-bindings.js`、`Scripts/style.css` |
| IX-05 | 已完成 | `index.html` 内联样式抽离到 `Scripts/style.css`（含注释内旧样式清理） | `index.html`、`Scripts/style.css` |
| IX-06 | 已完成 | 新增弹层键盘路径与面板开合联动 E2E 回归用例 | `localDev/node-scripts/e2e.mjs` |
| IX-07A | 已完成 | 新增 `scheduleUpdateAll/flushScheduledUpdateAll`，建立统一调度入口并保留 `update_all` 兼容行为 | `Scripts/data.ui-bindings.js` |
| IX-07B | 已完成 | 高频 `.change/.click` 与行内配置切换改走调度入口，减少重复重算 | `Scripts/data.ui-bindings.js`、`Scripts/data.recipe-ui.js` |
| IX-08A | 已完成 | `UIselector` 改为首开懒初始化；图标映射提前加载，弹层 DOM 延后构建 | `Scripts/data.ui-bindings.js`、`Scripts/data.bootstrap.js` |

## 4. 下一阶段任务（执行建议）

## 4.1 优先级与顺序

| 优先级 | 编号 | 任务 | 目标 |
| ---- | ---- | ---- | ---- |
| P0 | IX-08B | 蓝图链路脚本分级加载 | 将非首屏必需逻辑延后到首次生成蓝图 |
| P1 | IX-09 | 样式分层拆分 | 将 `style.css` 拆成 `base/layout/component/a11y` 分层文件 |
| P2 | IX-10 | Vue 组件化试点 | 先组件化 `layout-control` 与 `layout-result` 的低耦合片段 |

## 4.2 任务拆分（可直接开工）

| 阶段 | 编号 | 关键动作 | 预计改动文件 | 验收标准 |
| ---- | ---- | ---- | ---- | ---- |
| A | IX-08B | 蓝图相关非关键脚本改为“首点生成时加载并缓存” | `index.html`、`Scripts/data.blueprint.js`、`Scripts/blueprint.facade.js` | 不点击“生成蓝图”时不加载蓝图重链路 |
| B | IX-09 | 样式按模块拆分并建立引入顺序约定 | `Scripts/style.css`、`Scripts/styles/*`（新增） | 视觉无回归，样式文件职责明确 |
| C | IX-10 | 以桥接方式引入 Vue 组件（不改关键业务 ID） | `src/components/*`（或 `Scripts/vue-bridge/*`） | 组件化部分可独立迭代且不破坏旧链路 |

## 4.3 风险与规避

1. 风险：调度收敛后出现“更新滞后”体感。  
规避：调度仅合并同帧重复触发，关键提交动作仍可走立即刷新。

2. 风险：脚本分级加载导致依赖时序错误。  
规避：建立显式加载器与“已加载缓存标记”，首个调用前强校验依赖。

3. 风险：样式拆分造成覆盖顺序变化。  
规避：先按现有顺序拆分，不改变选择器优先级；拆分后补一次视觉回归。

4. 风险：Vue 试点与 jQuery 事件并存冲突。  
规避：组件仅接管明确子树，跨边界通过桥接 API 交互，不双向抢 DOM。

## 5. 下一步建议（本周可执行）

1. 先做 `IX-08B`：蓝图链路脚本分级加载（单独一个 commit）。  
2. 再做 `IX-09`：样式分层拆分（第二个 commit）。  
3. 然后做 `IX-10`：组件化试点（第三个 commit）。  
4. 每步完成后都补一次 E2E/集成回归并刷新本清单状态。

## 6. 本轮完成定义（DoD）

1. `update_all` 不再被大量散点直接调用，形成统一调度入口。  
2. 首屏路径不再加载非必要重链路（至少完成 `UIselector` 或蓝图其一的懒加载）。  
3. 关键路径回归通过：新增需求、参数切换、语言切换、生成蓝图。  
4. 文档与代码状态一致，后续任务可按编号继续推进。
