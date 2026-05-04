# legacy 运行时清单与迁移边界

日期：2026-04-24  
适用范围：当前 `main.js` 启动链、`Scripts/` 目录、`index.html`

## 1. 文档目的

本文件用于冻结当前 legacy 运行时事实，明确：

1. 现有启动顺序
2. 当前全局状态与关键函数
3. 本轮允许新增的桥接边界
4. 当前严禁跨越的迁移红线

## 2. 当前启动链

### 2.1 页面入口

1. `index.html` 通过 `<script type="module" src="./main.js"></script>` 启动
2. `main.js` 当前负责：
   - 导入 `./Scripts/style.css`
   - 顺序注入 legacy 脚本
   - 通过 `window.__DSQLegacyBootstrapPromise` 保护只初始化一次

### 2.2 legacy 脚本顺序

```text
error-monitor.js
i18n.js
dom.legacy.js
cocoMessage.js
calc-core.js
data.state.js
domain.dictionary.js
app.services.js
data.storage.js
data.js
data.recipe-init.js
data.recipe.js
data.recipe-ui.js
data.blueprint.js
ui.panel-controller.js
data.ui-bindings.js
data.bootstrap.js
index.events.js
```

### 2.3 启动关键链路

1. `data.bootstrap.js` 负责加载 `Scripts/data.json`
2. 数据加载完成后触发 `f_init()`
3. `f_init()` 在 `data.ui-bindings.js` 中完成 legacy 设置加载、数值初始化与首轮重算
4. `#result` 由 Vue 3 组件通过 Teleport 接管渲染，legacy 仅保留兼容命令与控制区职责
5. 大多数业务刷新仍通过 `scheduleUpdateAll() -> update_all()` 兼容入口触发，但真实计算与结果写回已进入 Store/TS 主链

## 3. 当前全局状态清单

以下状态仍挂在全局对象上，是后续迁移重点：

1. `version`
2. `pointLength`
3. `settingsLocal`
4. `settings`
5. `global_settings`
6. `settings_time`
7. `settings_pf`
8. `projects`
9. `currentItem`
10. `currentCalculationResult`
11. `xqs`
12. `singleMake`
13. `xqss`
14. `game_data`
15. `isDataLoaded`
16. `app`

## 4. 当前全局函数/入口清单

以下接口仍被页面和 legacy 代码直接使用：

1. `f_init`
2. `update_all`
3. `scheduleUpdateAll`
4. `f_add`
5. `f_reset`
6. `f_save`
7. `generateBlueprint`
8. `selectM`
9. `selectAccType`
10. `selectAccValue`
11. `selectPf`
12. `saveSetting* / loadSetting*`

结论：这些接口短期内不能粗暴删除，只能通过桥接层逐步收口。

## 5. 当前持久化边界

### 5.1 localStorage / cookie 兼容

当前持久化仍通过 `data.storage.js` 提供的 global API 完成，关键键包括：

1. `machine_settings${version}`
2. `global_settings${version}`
3. `machine_settings_time${version}`
4. `machine_settings_pf${version}`
5. `settings_projects${version}`

### 5.2 迁移要求

1. 新架构不得直接从 UI 组件访问 `localStorage`
2. 所有存储读写必须进入 `src/services/` 层
3. legacy 键格式在迁移完成前保持兼容

## 6. 当前关键 DOM 契约

下列 DOM ID 在早期重构阶段视为稳定契约，不允许擅自修改：

1. `txtnumber`
2. `selmaince`
3. `btnSetting`
4. `btnAddRequirement`
5. `btnGenerateBlueprint`
6. `langSwitcher`
7. `UIselector`
8. `Split`
9. `MoreSetting`
10. `result`
11. `main-content`
12. `canonicalLink`
13. `schemaWebApplication`
14. `schemaBreadcrumbList`
15. `schemaFAQPage`

## 7. 当前一方依赖现状

关键 legacy 依赖如下：

1. `jquery.tips`
2. `cocoMessage`
3. `pako`

补记（2026-05-04）：

1. `Scripts/jquery-2.2.4.min.js` 已从仓库删除
2. `Scripts/jquery.cookie.min.js` 已从仓库删除
3. `Scripts/vue.min.js` 已从首页主链与仓库中删除，结果区改由 Vue 3 接管
4. 首页继续通过 `npm run jquery:check` 防止 jQuery 运行时回流

迁移优先级：

1. `jquery.tips` 为高优先退场对象
2. `cocoMessage` 先封装后替换
3. `pako` 可暂时保留

## 8. 本轮允许新增的桥接边界

本轮仅允许新增以下桥接能力：

1. `src/main.ts` 作为新运行时入口
2. `src/app/bootstrap.ts` 统一调度新旧运行时
3. `src/legacy-adapters/` 读取 legacy 全局状态、封装 legacy 命令调用
4. `src/stores/` 接收 legacy 状态快照，但不反向写入新全局

## 9. 本轮严禁事项

1. 不得直接大规模改写 `Scripts/data.js`
2. 不得删除 `main.js` 入口
3. 不得改变 `index.html` 主体结构与关键 DOM ID
4. 不得直接删除 `data.ui-bindings.js`、`data.bootstrap.js`、`index.events.js`
5. 不得覆盖用户已修改的：
   - `Scripts/data.recipe.js`
   - `localDev/node-scripts/e2e.mjs`
   - `localDev/tests/global-settings-recipe.test.mjs`

## 10. 迁移边界结论

现阶段正确的迁移策略是：

1. 先在 `src/` 中建立新入口、新状态容器和新类型系统
2. 再通过桥接层读取 legacy 运行时事实
3. 最后才逐块下线 legacy UI 与全局状态

如果跳过这条路径，直接改动 `data.ui-bindings.js` 或替换 `index.html`，极易造成时序回归和测试雪崩。
