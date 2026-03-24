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
