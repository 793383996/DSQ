# index 拆分结构清单（IX-01）

日期：2026-03-25  
适用文件：`index.html`

## 1. 目标

本清单用于约束 `index.html` 后续拆分路径，确保结构改造与功能改造解耦：

1. 先固定页面分区边界，再推进弹层控制器收敛与可访问性修复。
2. 不改变现有业务 ID 与脚本调用入口，避免回归。
3. 为后续 Vue 组件化提供稳定挂载点。

## 2. 分区锚点

| 分区 | 锚点 ID | 包含范围 | 现阶段职责 |
| ---- | ---- | ---- | ---- |
| Head / SEO | `layout-head` | `header + breadcrumb` | 标题、语言切换、SEO 面包屑 |
| Control | `layout-control` | 两个 `.control-bar` | 输入需求与工艺配置 |
| Dialog | `layout-dialog` | `#UIselector/#Split/#MoreSetting` | 物品选择、多配方、参数弹层 |
| Result | `layout-result` | `#result` | Vue 计算结果与表格渲染 |
| Footer | `layout-footer` | 页脚链接区 | 合规链接与版权信息 |

## 3. 兼容性约束

1. 以下关键业务节点必须保持不变：
- `#result`
- `#UIselector`
- `#Split`
- `#MoreSetting`
- `#txtnumber`
- `#selmaince`

2. 允许变更：
- 在分区内新增包装层（wrapper）
- 在分区根节点新增 `data-layout-*` 标记

3. 禁止变更：
- 删除/改名上述关键 ID
- 修改现有事件绑定入口函数名（`f_add/f_split/f_ig/update_all` 等）

## 4. 后续阶段挂载建议

1. `IX-02`（弹层控制器）先收敛到 `layout-dialog`。
2. `IX-03`（UIselector 无障碍）在 `#UIselector` 内补 `role=dialog` 和焦点治理。
3. `IX-04`（MoreSetting 动画）在 `#MoreSetting` 内做状态驱动开合，不跨分区操作 DOM。

## 5. Vue 组件化映射（预留）

| 分区 | 推荐组件 |
| ---- | ---- |
| `layout-head` | `SeoHeaderBridge` |
| `layout-control` | `TopControlBar` + `ProcessControlBar` |
| `layout-dialog` | `ItemSelectorDialog` + `RecipeSplitDialog` + `SettingsPanel` |
| `layout-result` | `RequirementList` + `ResultTable` + `TotalSummary` |
| `layout-footer` | `FooterLinks` |

## 6. 下一阶段拆分计划（执行版）

## 6.1 执行目标（IX-02 ~ IX-04）

1. 收敛弹层控制逻辑，避免 `show/hide + setTimeout` 分散在多个函数中。  
2. 修复 `UIselector` 的键盘可用性与焦点管理，补齐可访问性闭环。  
3. 将 `MoreSetting` 改为状态驱动开合，保证动画与 `aria` 状态一致。

## 6.2 当前主要问题（对应代码现状）

1. `UIselector` 与 `MoreSetting` 的开合由多个入口直接操作 DOM，缺单一状态源。  
2. `UIselector` 当前没有完整焦点陷阱与焦点回退策略。  
3. `MoreSetting` 依赖延时器配合 class 切换，快速重复点击时易出现状态错位。  
4. 外层点击关闭逻辑分散，后续维护与回归成本高。

## 6.3 任务拆分与顺序

| 阶段 | 编号 | 目标 | 预计改动文件 | 输出 |
| ---- | ---- | ---- | ---- | ---- |
| A | IX-02A | 抽离统一弹层控制器（状态机） | `Scripts/ui.panel-controller.js`（新增）、`Scripts/data.ui-bindings.js`、`Scripts/index.events.js` | 统一 `open/close/toggle` API |
| A | IX-02B | 接入 `UIselector/Split/MoreSetting` | `Scripts/data.ui-bindings.js`、`index.html` | 旧入口函数改为调用控制器 |
| B | IX-03A | `UIselector` 对话框语义补齐 | `index.html`、`Scripts/data.ui-bindings.js` | `role/aria-modal/aria-labelledby` |
| B | IX-03B | 键盘焦点治理 | `Scripts/ui.panel-controller.js`、`Scripts/data.ui-bindings.js` | `Esc` 关闭、Tab 焦点陷阱、关闭后焦点回退 |
| C | IX-04A | `MoreSetting` 状态驱动开合 | `Scripts/data.ui-bindings.js`、`Scripts/style.css` | 去除延时器驱动，改为统一状态切换 |
| C | IX-04B | 动画与可访问性联动 | `index.html`、`Scripts/style.css` | `aria-expanded/aria-controls` 与视觉状态同步 |
| D | IX-06 | 回归自动化补强 | `localDev/node-scripts/e2e.mjs`、`test/*`（若有） | 覆盖键盘弹层路径与参数面板开合路径 |

## 6.4 每阶段提交建议（可直接按 commit 执行）

1. `commit-1`：新增 `ui.panel-controller` 与最小接入（不改交互表现）。  
2. `commit-2`：`UIselector` a11y + 键盘焦点治理。  
3. `commit-3`：`MoreSetting` 状态驱动开合与动画优化。  
4. `commit-4`：E2E/a11y 回归用例与文档同步。

## 6.5 验收清单（阶段完成判定）

1. 鼠标路径：打开/关闭 `UIselector`、`Split`、`MoreSetting` 均行为一致。  
2. 键盘路径：`UIselector` 可 `Enter/Tab/Esc` 完成“打开-选择-关闭-回焦”。  
3. 可访问性：面板开合时 `aria-expanded`、`aria-hidden`、焦点顺序正确。  
4. 回归：新增需求、切换参数、生成蓝图、切语言不退化。

## 6.6 风险与规避

1. 风险：控制器接管后可能打破旧函数依赖。  
规避：保留旧函数名，内部转发到新控制器，分阶段切换。

2. 风险：键盘事件全局监听影响输入框。  
规避：仅在弹层打开时启用监听，且排除输入控件上下文。

3. 风险：动画改造导致首帧闪烁。  
规避：统一初始 class/`hidden` 状态，并在 `transitionend` 后收口。

## 6.7 下一个可立即开工的子任务

1. 创建 `Scripts/ui.panel-controller.js`，先实现 `UIselector` 的 `open/close/toggle` 与外部点击关闭。  
2. 将 `f_add/openUISelector/closeUISelector` 改为调用控制器，并保留原函数签名。  
3. 同步加一个最小 E2E 检查：点击“添加”后弹层可见，再点击外部可关闭。

## 7. IX-02A ~ IX-06 完成记录（2026-03-25）

| 编号 | 状态 | 落地摘要 | 主要文件 |
| ---- | ---- | ---- | ---- |
| IX-02A | 已完成 | 新增统一弹层控制器 `open/close/toggle/isOpen/closeAll`，统一管理弹层状态、外部点击、Esc、焦点陷阱、焦点回退。 | `Scripts/ui.panel-controller.js` |
| IX-02B | 已完成 | `UIselector/Split/MoreSetting` 全部接入控制器；保留 `f_add/openUISelector/closeUISelector/f_split` 旧入口函数并转发。 | `Scripts/data.ui-bindings.js`、`index.html` |
| IX-03A | 已完成 | `UIselector` 与 `Split` 补齐对话框语义（`role="dialog"`、`aria-modal`、`aria-hidden`、`tabindex`）；新增面板可访问性文案键。 | `index.html`、`locales/zh-CN.json`、`locales/en-US.json` |
| IX-03B | 已完成 | `UIselector/Split` 实现键盘闭环：`Tab` 焦点陷阱、`Esc` 关闭、关闭后焦点回到触发器。 | `Scripts/ui.panel-controller.js`、`Scripts/data.ui-bindings.js` |
| IX-04A | 已完成 | `MoreSetting` 去除 `setTimeout` 驱动，改为控制器状态驱动开合。 | `Scripts/data.ui-bindings.js`、`Scripts/style.css` |
| IX-04B | 已完成 | `aria-expanded/aria-hidden` 与开合状态统一；`hidden + is-open` 作为唯一视觉状态源，动画由 CSS 过渡驱动。 | `index.html`、`Scripts/style.css` |
| IX-06 | 已完成 | E2E 新增 `UIselector` 键盘路径与 `MoreSetting` 开合/ARIA 联动回归用例。 | `localDev/node-scripts/e2e.mjs` |

### 7.1 验收结果

1. 三个面板已由统一控制器管理，不再散落 `show/hide + setTimeout`。  
2. `UIselector` 键盘路径已具备“打开 -> Tab -> Esc -> 回焦”闭环。  
3. `MoreSetting` 快速开合时状态与 ARIA 不再错位。  
4. 自动化回归已补齐对应用例，后续回归可由 CI 自动拦截。
