# Phase 6 架构清理详细分析报告

> 版本: 1.0
> 日期: 2026-02-23
> 状态: 分析完成

## 一、执行摘要

本报告详细分析了 `bridge.ts` 和 `legacy/` 目录的依赖关系，识别可安全移除的模块，并制定分阶段移除计划。

### 核心发现

| 指标               | 数值    |
| ------------------ | ------- |
| bridge.ts 导出函数 | 18个    |
| bridge.ts 调用点   | 8个文件 |
| legacy模块数量     | 8个     |
| 可立即移除         | 0个     |
| 需迁移后移除       | 8个     |

### 风险评估

| 风险等级  | 模块数 | 说明                                                  |
| --------- | ------ | ----------------------------------------------------- |
| 🔴 高风险 | 3      | data.js, calculator.js, iconLoader.js                 |
| 🟡 中风险 | 3      | storageManager.js, settingsHelper.js, recipeHelper.js |
| 🟢 低风险 | 2      | configData.js, blueprint.js                           |

---

## 二、bridge.ts 依赖分析

### 2.1 导出函数清单

| 函数名                           | 调用位置                                 | 功能描述                           | 迁移状态  |
| -------------------------------- | ---------------------------------------- | ---------------------------------- | --------- |
| `initLegacyBridge`               | main.ts:83                               | 初始化遗留桥接，设置window全局变量 | ⏳ 待迁移 |
| `loadLegacyModules`              | main.ts:43                               | 加载遗留模块                       | ⏳ 待迁移 |
| `syncStateToLegacy`              | stores/blueprint.ts:134                  | 同步状态到遗留代码                 | ⏳ 待迁移 |
| `isGameDataLoaded`               | App.vue:182,227, stores/blueprint.ts:198 | 检查游戏数据是否加载               | ⏳ 待迁移 |
| `isLegacyDataLoaded`             | App.vue:227, AddItemDialog.vue:166       | 检查遗留数据是否加载               | ⏳ 待迁移 |
| `waitForLegacyData`              | App.vue:153, AddItemDialog.vue:167       | 等待遗留数据加载                   | ⏳ 待迁移 |
| `notifyRecipeIndexReady`         | legacy/data.js:210                       | 通知配方索引就绪                   | ⏳ 待迁移 |
| `isRecipeIndexReady`             | bridge.ts内部                            | 检查配方索引是否就绪               | ⏳ 待迁移 |
| `generateBlueprintFromStoreData` | BlueprintGenerator.vue:53                | 从Store数据生成蓝图                | ⏳ 待迁移 |
| `legacyUpdateMachineSettings`    | ConfigPanel.vue:333                      | 更新机器设置                       | ⏳ 待迁移 |
| `legacyGetMachineSettings`       | ConfigPanel.vue:333                      | 获取机器设置                       | ⏳ 待迁移 |
| `legacyUpdateConfig`             | ConfigPanel.vue:333                      | 更新配置                           | ⏳ 待迁移 |
| `legacyUpdateSpeedSettings`      | ConfigPanel.vue:333                      | 更新速度设置                       | ⏳ 待迁移 |
| `legacyUpdateLogisticsSettings`  | ConfigPanel.vue:333                      | 更新物流设置                       | ⏳ 待迁移 |
| `legacySetProductionSettings`    | ControlPanel.vue:89                      | 设置生产设置                       | ⏳ 待迁移 |
| `getSelectableItemsWithIcons`    | AddItemDialog.vue:129                    | 获取可选物品（带图标）             | ⏳ 待迁移 |
| `getIconData`                    | 未直接使用                               | 获取图标数据                       | ✅ 可移除 |
| `getSelectableItems`             | 未直接使用                               | 获取可选物品                       | ✅ 可移除 |

### 2.2 调用链分析

#### 2.2.1 初始化流程

```
index.html
    │
    ▼
main.ts
    │
    ├── initLegacyBridge() ──────────────────────────────────────┐
    │       │                                                     │
    │       ├── 设置 window.version                               │
    │       ├── 设置 window.xqs, window.ig_names                  │
    │       ├── 设置 window.settings, window.settings_time        │
    │       └── 设置 window.cocoMessage, window.notifyRecipeIndexReady
    │                                                             │
    ├── createApp(App)                                            │
    │                                                             │
    └── loadLegacyModules() ──────────────────────────────────────┤
            │                                                     │
            ├── import('./legacy/data')                           │
            ├── import('./legacy/calculator')                     │
            ├── import('./legacy/iconLoader')                     │
            ├── import('./legacy/storageManager')                 │
            ├── import('./legacy/recipeHelper')                   │
            ├── import('./legacy/configData')                     │
            └── import('./legacy/settingsHelper')                 │
                                                                  │
            ▼                                                     │
        legacy/data.js                                            │
            │                                                     │
            ├── window.data = recipes.json                        │
            ├── f_initData() → 构建索引                            │
            │       └── window.recipeIndexByProduct               │
            │       └── window.recipeIndexByMaterial              │
            │                                                     │
            └── notifyRecipeIndexReady() ─────────────────────────┘
                        │
                        ▼
                bridge.ts: recipeIndexReady = true
                        │
                        ▼
                App.vue: waitForLegacyData() resolve
```

#### 2.2.2 计算流程

```
App.vue: runCalculation()
    │
    ├── store.demandList
    ├── store.excludeList
    │
    ▼
CalculatorService.calculateWithOptions()
    │
    ├── recipeAdapter.initialize() ──────────────────────────────┐
    │       │                                                     │
    │       └── RecipeDataService.getRecipes()                    │
    │               └── recipes.json (独立加载)                   │
    │                                                             │
    ├── settingsAdapter.getRecipeSettings() ──────────────────────┤
    │       │                                                     │
    │       └── localStorage (独立存储)                           │
    │                                                             │
    └── updateAllService.updateAll() ─────────────────────────────┘
            │
            ├── RecipeCalculator.loadNumber()
            │
            └── 返回结果
                    ├── xh_list (消耗列表)
                    └── out_list (产出列表)
```

#### 2.2.3 设置同步流程

```
ConfigPanel.vue
    │
    ├── legacyUpdateMachineSettings(config)
    │       │
    │       └── bridge.ts → window.settings, window.settingsLocal
    │
    ├── legacyUpdateSpeedSettings(speeds)
    │       │
    │       └── bridge.ts → window.settings_time
    │
    └── legacyUpdateLogisticsSettings(logistics)
            │
            └── bridge.ts → window.logisticsSettings
```

### 2.3 window全局变量依赖

| 变量名                         | 设置位置                     | 读取位置                         | 用途           |
| ------------------------------ | ---------------------------- | -------------------------------- | -------------- |
| `window.data`                  | legacy/data.js:54            | recipeHelper.js, calculator.js   | 配方数据       |
| `window.recipeIndexByProduct`  | legacy/data.js:71            | recipeHelper.js                  | 产物索引       |
| `window.recipeIndexByMaterial` | legacy/data.js:72            | recipeHelper.js                  | 原料索引       |
| `window.xqs`                   | bridge.ts, legacy/data.js    | legacy/calculator.js             | 需求列表       |
| `window.ig_names`              | bridge.ts, legacy/data.js    | legacy/calculator.js             | 排除列表       |
| `window.settings`              | bridge.ts, storageManager.js | settingsHelper.js, calculator.js | 配方设置       |
| `window.settings_time`         | bridge.ts, storageManager.js | settingsHelper.js, calculator.js | 速度设置       |
| `window.settings_pf`           | bridge.ts, storageManager.js | calculator.js                    | 增产剂设置     |
| `window.settingsLocal`         | settingsHelper.js:19         | settingsHelper.js                | 本地设置缓存   |
| `window.game_data`             | iconLoader.js                | bridge.ts                        | 游戏资源数据   |
| `window.icons`                 | iconLoader.js                | bridge.ts                        | 图标映射       |
| `window.isDataLoaded`          | iconLoader.js                | bridge.ts                        | 数据加载标志   |
| `window.find`                  | legacy/data.js:797           | settingsHelper.js                | 配方查找       |
| `window.loadNumber`            | legacy/data.js:792           | bridge.ts                        | 计算函数       |
| `window.defaultAccType`        | bridge.ts, legacy/data.js    | calculator.js                    | 默认增产剂类型 |
| `window.defaultAccValue`       | bridge.ts, legacy/data.js    | calculator.js                    | 默认增产剂效果 |

---

## 三、legacy目录模块分析

### 3.1 模块依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           legacy 模块依赖关系                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   data.js   │ ←─────────────────────────────────────────────────────────┐│
│   │  (核心模块)  │                                                          ││
│   └──────┬──────┘                                                          ││
│          │                                                                 ││
│          ├── 导入 ──→ storageManager.js (settings, settings_time)          ││
│          ├── 导入 ──→ recipeHelper.js (getGroup, getPfs, getPfsByQ)        ││
│          ├── 导入 ──→ calculator.js (find, loadNumber, getXhList...)       ││
│          ├── 导入 ──→ iconLoader.js (game_data, isDataLoaded, icons)       ││
│          ├── 导入 ──→ configData.js (energyData, spaceData)                ││
│          └── 导入 ──→ settingsHelper.js (settingsLocal, getMachine...)     ││
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │ storageManager.js│ ←── settingsHelper.js                               │
│   │   (存储管理)      │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            └── 导出 ──→ settings, settings_time, settings_pf               │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │ settingsHelper.js│ ←── data.js                                         │
│   │   (设置辅助)      │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ├── 导入 ──→ storageManager.js (settings, settings_time)        │
│            └── 导入 ──→ calculator.js (find)                                │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  calculator.js   │ ←── data.js, settingsHelper.js                      │
│   │   (计算引擎)      │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            └── 依赖 ──→ window.data, window.ig_names, window.xqs           │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  recipeHelper.js │ ←── data.js                                         │
│   │   (配方辅助)      │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            └── 依赖 ──→ window.data, window.recipeIndexByProduct           │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  iconLoader.js   │ ←── data.js                                         │
│   │   (图标加载)      │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            └── 加载 ──→ Scripts/data.json                                   │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  configData.js   │ ←── data.js                                         │
│   │   (静态配置)      │                                                      │
│   └──────────────────┘                                                      │
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  blueprint.js    │ (独立模块，已被BlueprintService替代)                 │
│   │   (蓝图生成)      │                                                      │
│   └──────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 各模块详细分析

#### 3.2.1 data.js (核心模块) 🔴 高风险

**文件位置**: `src/core/legacy/data.js`

**功能**:

- 加载配方数据 (`recipes.json`)
- 构建产物/原料索引
- 提供 `update_all` 计算入口
- 导出 `window.find`, `window.loadNumber`

**依赖关系**:

```javascript
import { saveData, getData, saveSetting, loadSetting, ... } from './storageManager.js'
import { getGroup, getPfs, getPfsByQ } from './recipeHelper.js'
import { getXhList, getOutList, find, loadNumber, ... } from './calculator.js'
import { game_data, isDataLoaded, icons, loadData, ... } from './iconLoader.js'
import { energyData, spaceData, icons_define, itemNameList } from './configData.js'
import { settingsLocal, getMachine, getAccType, getAccValue, getValue } from './settingsHelper.js'
```

**全局变量设置**:

```javascript
window.data = data // 配方数据
window.recipeIndexByProduct = recipeIndexByProduct // 产物索引
window.recipeIndexByMaterial = recipeIndexByMaterial // 原料索引
window.loadNumber = loadNumber // 计算函数
window.find = find // 查找函数
window.xqs = xqs // 需求列表
```

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| 配方数据加载 | RecipeDataService | ✅ 已实现 |
| 索引构建 | RecipeDataService | ✅ 已实现 |
| update_all计算 | UpdateAllService + RecipeCalculator | ✅ 已实现 |
| window.find | RecipeAdapter.findByProductName | ✅ 已实现 |

**迁移风险**:

- 🔴 高风险：`update_all` 函数包含复杂的递归逻辑
- 🔴 高风险：多个模块依赖 `window.data`
- 🟡 中风险：`notifyRecipeIndexReady` 通知机制需要重新设计

#### 3.2.2 calculator.js (计算引擎) 🔴 高风险

**文件位置**: `src/core/legacy/calculator.js`

**功能**:

- 核心计算逻辑 (`loadNumber`)
- 配方查找 (`find`)
- 状态管理 (`getXhList`, `getOutList`, `getXhMap`, `getOutMap`)
- 多产出处理 (`mergeMul`)

**全局变量依赖**:

```javascript
window.xh_list // 消耗列表
window.out_list // 产出列表
window.xhMap // 消耗映射
window.outMap // 产出映射
window.ig_names // 排除列表
```

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| loadNumber | RecipeCalculator.loadNumber | ✅ 已实现 |
| find | RecipeAdapter.find | ✅ 已实现 |
| 状态管理 | CalculationContext | ✅ 已实现 |

**迁移风险**:

- 🔴 高风险：递归深度控制 (`loadNumberDepth`, `maxLoadNumberDepth`)
- 🔴 高风险：状态变量与window同步问题

#### 3.2.3 iconLoader.js (图标加载) 🔴 高风险

**文件位置**: `src/core/legacy/iconLoader.js`

**功能**:

- 异步加载游戏资源 (`loadData`)
- 图标初始化 (`f_initIcons`)
- 图标HTML生成 (`getIconImg`, `getIconShow`)

**全局变量设置**:

```javascript
window.game_data = game_data // 游戏资源数据
window.isDataLoaded = isDataLoaded // 加载标志
window.icons = icons // 图标映射
```

**数据源**: `Scripts/data.json`

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| 图标加载 | IconService (待创建) | ⏳ 待实现 |
| 图标映射 | IconService.getIcon | ⏳ 待实现 |

**迁移风险**:

- 🔴 高风险：异步加载时序问题
- 🟡 中风险：`gameDataLoaded` 事件机制

#### 3.2.4 storageManager.js (存储管理) 🟡 中风险

**文件位置**: `src/core/legacy/storageManager.js`

**功能**:

- localStorage/cookie 数据存储
- 配方设置持久化
- 项目列表管理

**全局变量设置**:

```javascript
window.settings = settings // 配方设置
window.settings_time = settings_time // 速度设置
window.settings_pf = settings_pf // 增产剂设置
window.saveSetting = saveSetting // 保存函数
window.loadSetting = loadSetting // 加载函数
```

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| 设置存储 | SettingsAdapter | ✅ 已实现 |
| 设置加载 | SettingsAdapter | ✅ 已实现 |

**迁移风险**:

- 🟢 低风险：SettingsAdapter 已完全替代核心功能
- 🟡 中风险：部分遗留代码仍依赖 `window.settings`

#### 3.2.5 settingsHelper.js (设置辅助) 🟡 中风险

**文件位置**: `src/core/legacy/settingsHelper.js`

**功能**:

- 获取配方默认机器 (`getMachine`)
- 获取增产剂设置 (`getAccType`, `getAccValue`)
- 获取配方参数 (`getValue`)

**依赖关系**:

```javascript
import { settings, settings_time } from './storageManager.js'
import { find } from './calculator.js'
```

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| getMachine | SettingsAdapter.getRecipeMachine | ✅ 已实现 |
| getAccType | SettingsAdapter.getRecipeAccType | ✅ 已实现 |
| getAccValue | SettingsAdapter.getRecipeAccValue | ✅ 已实现 |

**迁移风险**:

- 🟢 低风险：SettingsAdapter 已完全替代

#### 3.2.6 recipeHelper.js (配方辅助) 🟡 中风险

**文件位置**: `src/core/legacy/recipeHelper.js`

**功能**:

- 获取配方分组 (`getGroup`)
- 按产物查找配方 (`getPfs`)
- 按原料查找配方 (`getPfsByQ`)

**依赖关系**:

```javascript
// 依赖全局变量
window.data
window.recipeIndexByProduct
window.recipeIndexByMaterial
```

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| getGroup | RecipeAdapter.getGroups | ⏳ 待实现 |
| getPfs | RecipeAdapter.findByProductName | ✅ 已实现 |
| getPfsByQ | RecipeAdapter.findByInputName | ✅ 已实现 |

**迁移风险**:

- 🟢 低风险：RecipeAdapter 已实现大部分功能

#### 3.2.7 configData.js (静态配置) 🟢 低风险

**文件位置**: `src/core/legacy/configData.js`

**功能**:

- 能量消耗数据 (`energyData`)
- 占用空间数据 (`spaceData`)
- 图标名称映射 (`itemNameList`)

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| energyData | config/energyConfig.ts | ⏳ 待迁移 |
| spaceData | config/spaceConfig.ts | ⏳ 待迁移 |
| itemNameList | config/itemNameConfig.ts | ⏳ 待迁移 |

**迁移风险**:

- 🟢 低风险：纯静态数据，无业务逻辑

#### 3.2.8 blueprint.js (蓝图生成) 🟢 低风险

**文件位置**: `src/core/legacy/blueprint.js`

**功能**:

- 蓝图JSON生成
- itemMap/buildingMap 映射

**替代方案**:
| 功能 | 替代模块 | 状态 |
|------|----------|------|
| 蓝图生成 | BlueprintService | ✅ 已实现 |
| itemMap | types/itemMap.ts | ✅ 已迁移 |
| buildingMap | types/buildingMap.ts | ✅ 已迁移 |

**迁移风险**:

- 🟢 低风险：BlueprintService 已完全替代

---

## 四、移除计划

### 4.1 分阶段移除策略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           移除阶段规划                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 6.1: 准备阶段 (1-2天)                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ 创建 IconService 替代 iconLoader.js                             │   │
│  │  ✅ 迁移 configData.js 到 TypeScript                                │   │
│  │  ✅ 验证 SettingsAdapter 完全替代 storageManager.js                 │   │
│  │  ✅ 验证 RecipeAdapter 完全替代 recipeHelper.js                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 6.2: 低风险模块移除 (2-3天)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🟢 移除 legacy/configData.js → 使用 TypeScript 配置                │   │
│  │  🟢 移除 legacy/blueprint.js → 使用 BlueprintService                │   │
│  │  🟢 移除 legacy/recipeHelper.js → 使用 RecipeAdapter                │   │
│  │  🟢 移除 legacy/settingsHelper.js → 使用 SettingsAdapter            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 6.3: 中风险模块移除 (3-5天)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🟡 移除 legacy/storageManager.js → 使用 SettingsAdapter            │   │
│  │  🟡 迁移 window.settings 依赖到 SettingsAdapter                     │   │
│  │  🟡 更新所有调用点使用新接口                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 6.4: 高风险模块移除 (5-7天)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔴 创建 IconService 替代 iconLoader.js                             │   │
│  │  🔴 移除 legacy/iconLoader.js                                       │   │
│  │  🔴 验证 RecipeCalculator 完全替代 calculator.js                    │   │
│  │  🔴 移除 legacy/calculator.js                                       │   │
│  │  🔴 移除 legacy/data.js → 使用 RecipeDataService                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 6.5: bridge.ts 清理 (2-3天)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📝 迁移所有 bridge.ts 导出函数到对应服务                            │   │
│  │  📝 更新所有调用点                                                   │   │
│  │  📝 移除 bridge.ts 文件                                              │   │
│  │  📝 清理 LegacyWindow 类型定义                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 6.6: 验证与测试 (2-3天)                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ 全量回归测试                                                     │   │
│  │  ✅ 性能基准测试                                                     │   │
│  │  ✅ 更新文档                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 详细任务清单

#### Phase 6.1: 准备阶段

| 任务ID | 任务描述                        | 优先级 | 预计时间 | 依赖   |
| ------ | ------------------------------- | ------ | -------- | ------ |
| P6.1.1 | 创建 IconService 接口定义       | 高     | 2h       | -      |
| P6.1.2 | 实现 IconService.loadData       | 高     | 4h       | P6.1.1 |
| P6.1.3 | 实现 IconService.getIcon        | 高     | 2h       | P6.1.2 |
| P6.1.4 | 迁移 energyData 到 TypeScript   | 中     | 1h       | -      |
| P6.1.5 | 迁移 spaceData 到 TypeScript    | 中     | 1h       | -      |
| P6.1.6 | 迁移 itemNameList 到 TypeScript | 中     | 1h       | -      |
| P6.1.7 | 验证 SettingsAdapter 功能完整性 | 高     | 2h       | -      |
| P6.1.8 | 验证 RecipeAdapter 功能完整性   | 高     | 2h       | -      |

#### Phase 6.2: 低风险模块移除

| 任务ID | 任务描述                         | 优先级 | 预计时间 | 依赖           |
| ------ | -------------------------------- | ------ | -------- | -------------- |
| P6.2.1 | 创建 config/energyConfig.ts      | 中     | 1h       | P6.1.4         |
| P6.2.2 | 创建 config/spaceConfig.ts       | 中     | 1h       | P6.1.5         |
| P6.2.3 | 更新 UpdateAllService 使用新配置 | 中     | 2h       | P6.2.1, P6.2.2 |
| P6.2.4 | 移除 legacy/configData.js        | 中     | 1h       | P6.2.3         |
| P6.2.5 | 验证 blueprint.js 无直接调用     | 低     | 1h       | -              |
| P6.2.6 | 移除 legacy/blueprint.js         | 低     | 1h       | P6.2.5         |
| P6.2.7 | 移除 legacy/recipeHelper.js      | 中     | 2h       | P6.1.8         |
| P6.2.8 | 移除 legacy/settingsHelper.js    | 中     | 2h       | P6.1.7         |

#### Phase 6.3: 中风险模块移除

| 任务ID | 任务描述                                  | 优先级 | 预计时间 | 依赖           |
| ------ | ----------------------------------------- | ------ | -------- | -------------- |
| P6.3.1 | 分析 window.settings 所有读取点           | 高     | 2h       | -              |
| P6.3.2 | 迁移 bridge.ts 设置同步逻辑               | 高     | 4h       | P6.3.1         |
| P6.3.3 | 更新 ConfigPanel.vue 使用 SettingsAdapter | 高     | 3h       | P6.3.2         |
| P6.3.4 | 更新 App.vue 设置同步逻辑                 | 高     | 2h       | P6.3.2         |
| P6.3.5 | 移除 legacy/storageManager.js             | 高     | 2h       | P6.3.3, P6.3.4 |
| P6.3.6 | 回归测试                                  | 高     | 2h       | P6.3.5         |

#### Phase 6.4: 高风险模块移除

| 任务ID | 任务描述                                | 优先级 | 预计时间 | 依赖           |
| ------ | --------------------------------------- | ------ | -------- | -------------- |
| P6.4.1 | 完成 IconService 实现                   | 高     | 4h       | P6.1.3         |
| P6.4.2 | 更新 AddItemDialog.vue 使用 IconService | 高     | 3h       | P6.4.1         |
| P6.4.3 | 更新 App.vue 图标加载逻辑               | 高     | 2h       | P6.4.1         |
| P6.4.4 | 移除 legacy/iconLoader.js               | 高     | 2h       | P6.4.2, P6.4.3 |
| P6.4.5 | 验证 RecipeCalculator 功能完整性        | 高     | 4h       | -              |
| P6.4.6 | 移除 legacy/calculator.js               | 高     | 2h       | P6.4.5         |
| P6.4.7 | 移除 legacy/data.js                     | 高     | 4h       | P6.4.6         |
| P6.4.8 | 回归测试                                | 高     | 4h       | P6.4.7         |

#### Phase 6.5: bridge.ts 清理

| 任务ID | 任务描述                                                | 优先级 | 预计时间 | 依赖          |
| ------ | ------------------------------------------------------- | ------ | -------- | ------------- |
| P6.5.1 | 迁移 initLegacyBridge 到 AppInitializer                 | 高     | 3h       | P6.4.7        |
| P6.5.2 | 迁移 generateBlueprintFromStoreData 到 BlueprintService | 中     | 2h       | -             |
| P6.5.3 | 迁移设置相关函数到 SettingsService                      | 中     | 3h       | P6.3.5        |
| P6.5.4 | 迁移数据加载函数到 DataService                          | 高     | 3h       | P6.4.7        |
| P6.5.5 | 更新所有调用点                                          | 高     | 4h       | P6.5.1-P6.5.4 |
| P6.5.6 | 移除 bridge.ts                                          | 高     | 1h       | P6.5.5        |
| P6.5.7 | 清理 LegacyWindow 类型定义                              | 中     | 1h       | P6.5.6        |

#### Phase 6.6: 验证与测试

| 任务ID | 任务描述      | 优先级 | 预计时间 | 依赖   |
| ------ | ------------- | ------ | -------- | ------ |
| P6.6.1 | 单元测试更新  | 高     | 4h       | P6.5.6 |
| P6.6.2 | E2E测试更新   | 高     | 4h       | P6.5.6 |
| P6.6.3 | 性能基准测试  | 高     | 2h       | P6.6.2 |
| P6.6.4 | 内存泄漏检测  | 中     | 2h       | P6.6.2 |
| P6.6.5 | 更新架构文档  | 中     | 2h       | P6.5.6 |
| P6.6.6 | 更新 API 文档 | 低     | 2h       | P6.5.6 |

---

## 五、风险评估与缓解措施

### 5.1 高风险项

| 风险ID | 风险描述                    | 影响 | 概率 | 缓解措施                   |
| ------ | --------------------------- | ---- | ---- | -------------------------- |
| R1     | update_all 递归逻辑迁移错误 | 严重 | 中   | 保持算法不变，仅做外围包装 |
| R2     | window.data 依赖断裂        | 严重 | 中   | 分阶段迁移，保留兼容层     |
| R3     | 图标加载时序问题            | 高   | 中   | 使用 Promise 链确保顺序    |
| R4     | 设置同步丢失                | 高   | 低   | 双写机制，迁移期间保持同步 |

### 5.2 中风险项

| 风险ID | 风险描述            | 影响 | 概率 | 缓解措施             |
| ------ | ------------------- | ---- | ---- | -------------------- |
| R5     | localStorage 兼容性 | 中   | 低   | 保留 cookie 降级方案 |
| R6     | 类型定义不完整      | 中   | 中   | 逐步完善类型定义     |
| R7     | 测试覆盖不足        | 中   | 中   | 增加集成测试         |

### 5.3 回滚计划

每个阶段完成后创建 Git 标签，便于快速回滚：

```bash
# Phase 6.1 完成后
git tag -a phase-6.1-complete -m "Phase 6.1: 准备阶段完成"

# Phase 6.2 完成后
git tag -a phase-6.2-complete -m "Phase 6.2: 低风险模块移除完成"

# 以此类推...
```

---

## 六、验收标准

### 6.1 功能验收

- [ ] 所有计算结果与迁移前一致
- [ ] 设置持久化正常工作
- [ ] 图标显示正常
- [ ] 蓝图生成功能正常
- [ ] 无 console 错误或警告

### 6.2 性能验收

- [ ] 初始化时间 ≤ 100ms
- [ ] 计算响应时间 ≤ 100ms
- [ ] 内存占用 ≤ 30MB
- [ ] 无内存泄漏

### 6.3 代码质量验收

- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 无遗留 `// TODO` 或 `// FIXME`

### 6.4 文档验收

- [ ] 架构文档已更新
- [ ] API 文档已更新
- [ ] 迁移指南已编写

---

## 七、附录

### A. 文件变更清单

| 操作 | 文件路径                                                 | 说明                 |
| ---- | -------------------------------------------------------- | -------------------- |
| 删除 | src/core/bridge.ts                                       | 移除桥接模块         |
| 删除 | src/core/legacy/data.js                                  | 移除遗留数据模块     |
| 删除 | src/core/legacy/calculator.js                            | 移除遗留计算模块     |
| 删除 | src/core/legacy/iconLoader.js                            | 移除遗留图标模块     |
| 删除 | src/core/legacy/storageManager.js                        | 移除遗留存储模块     |
| 删除 | src/core/legacy/recipeHelper.js                          | 移除遗留配方辅助模块 |
| 删除 | src/core/legacy/settingsHelper.js                        | 移除遗留设置辅助模块 |
| 删除 | src/core/legacy/configData.js                            | 移除遗留配置模块     |
| 删除 | src/core/legacy/blueprint.js                             | 移除遗留蓝图模块     |
| 新增 | src/core/services/IconService.ts                         | 图标服务             |
| 新增 | src/core/config/energyConfig.ts                          | 能量配置             |
| 新增 | src/core/config/spaceConfig.ts                           | 空间配置             |
| 修改 | src/main.ts                                              | 移除 bridge 导入     |
| 修改 | src/App.vue                                              | 移除 bridge 依赖     |
| 修改 | src/stores/blueprint.ts                                  | 移除 bridge 依赖     |
| 修改 | src/components/ConfigPanel/ConfigPanel.vue               | 使用新服务           |
| 修改 | src/components/ControlPanel/ControlPanel.vue             | 使用新服务           |
| 修改 | src/components/AddItemDialog/AddItemDialog.vue           | 使用新服务           |
| 修改 | src/components/BlueprintGenerator/BlueprintGenerator.vue | 使用新服务           |

### B. 相关文档

- [遗留代码依赖详细分析报告](./遗留代码依赖详细分析报告.md)
- [新旧代码详细对比分析报告](./新旧代码详细对比分析报告.md)
- [下一阶段开发任务分解方案](./下一阶段开发任务分解方案.md)
- [Worker流程全面技术分析报告](./Worker流程全面技术分析报告.md)
