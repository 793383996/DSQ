# `data.js` 核心数据与逻辑解耦重构指南

> **状态**：✅ 已完成 - 阶段 15 (闭包封装计算引擎)
>
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md)

## 0. 架构师准则：稳定性第一

- **严禁全局搜索替换**：严禁直接将 `s` 替换为 `outputs`，这会破坏 `loadNumber` 的递归链。
- **影子运行**：重构后的代码必须支持与旧逻辑并行运行，通过 Baseline 对比验证。
- **接口隔离**：新 UI 组件只能通过 `RecipeProvider` 接口访问数据，不得触碰底层原始对象。
- **黑盒保护**：`loadNumber` 递归逻辑视为黑盒，仅允许外围包装，禁止修改核心算法。

---

## 0.1 重构进度追踪 (2026-02-15 更新)

### ✅ 已完成

| 任务                                  | 状态 | 完成日期   | 说明                                               |
| ------------------------------------- | ---- | ---------- | -------------------------------------------------- |
| jQuery 依赖移除                       | ✅   | 2026-02-14 | `$.ajax` → `fetch`, `$.extend` → `structuredClone` |
| 遗留 UI 代码删除                      | ✅   | 2026-02-14 | 删除 L4523-L6040 死代码                            |
| 废弃文件清理                          | ✅   | 2026-02-14 | jquery-\*.js 已删除                                |
| 构建配置优化                          | ✅   | 2026-02-14 | Vite code splitting + esbuild                      |
| App.vue 迁移至 CalculatorService      | ✅   | 2026-02-14 | 主入口已切换至新服务层                             |
| 数据适配器 (`RecipeAdapter.ts`)       | ✅   | 2026-02-14 | 语义化访问，索引预热                               |
| 计算服务 (`CalculatorService.ts`)     | ✅   | 2026-02-14 | 封装 update_all，上下文管理                        |
| 计算上下文 (`CalculationContext.ts`)  | ✅   | 2026-02-14 | 替代全局变量，填充 xh_list/out_list                |
| 类型定义 (`src/core/types/recipe.ts`) | ✅   | 2026-02-14 | IRecipe, IRecipeItem, ICalculationResult           |
| Baseline 测试                         | ✅   | 2026-02-14 | 新旧实现对比验证                                   |
| 图标缓存统一管理                      | ✅   | 2026-02-14 | ResultTable 使用 useIconProvider                   |
| v-memo 性能优化                       | ✅   | 2026-02-14 | ResultTable 列表渲染优化                           |
| 日志环境控制                          | ✅   | 2026-02-14 | 新增 logger.ts，生产环境静默                       |
| 搜索防抖优化                          | ✅   | 2026-02-14 | AddItemDialog 搜索延迟 150ms                       |
| addXH/addOut Map 优化                 | ✅   | 2026-02-14 | O(n) → O(1) 查找                                   |
| find() 空值检查                       | ✅   | 2026-02-14 | 8处空值安全检查                                    |
| loadNumber 递归深度限制               | ✅   | 2026-02-14 | max=200 防栈溢出                                   |
| localStorage 异常保护                 | ✅   | 2026-02-14 | 隐私模式兼容                                       |
| settings 引用保持                     | ✅   | 2026-02-14 | 避免 window.settings 断开                          |
| 状态同步机制                          | ✅   | 2026-02-14 | demandVersion + 快照验证                           |
| xhMap/outMap清理                      | ✅   | 2026-02-14 | CalculatorService.clearLegacyGlobalState           |
| fetch超时机制                         | ✅   | 2026-02-14 | AbortController 30秒超时                           |
| update_all异常重置                    | ✅   | 2026-02-14 | try-catch包裹，异常时重置全局状态                  |
| 初始化时序修复                        | ✅   | 2026-02-14 | loadSetting在update_all之前执行                    |
| SettingsAdapter适配器                 | ✅   | 2026-02-14 | 配方/速度/增产剂设置管理                           |
| 索引引用修复                          | ✅   | 2026-02-14 | f_initData重新挂载索引到window                     |
| 配方数据JSON化                        | ✅   | 2026-02-14 | recipes.json + schema                              |
| 工具函数                              | ✅   | 2026-02-14 | storage/unitConverter/validator                    |
| SettingsAdapter引用同步               | ✅   | 2026-02-14 | init()确保引用window对象                           |
| 计算状态同步重试机制                  | ✅   | 2026-02-14 | StateChangedDuringCalculationError + 3次重试       |
| 类型定义修复                          | ✅   | 2026-02-14 | IMachineSettings→IRecipeSettings                   |
| 配置持久化修复                        | ✅   | 2026-02-14 | legacyUpdateMachineSettings同时写入两个对象        |
| 版本号统一管理                        | ✅   | 2026-02-14 | APP_CONFIG统一版本号和存储键                       |
| itemMap提取                           | ✅   | 2026-02-14 | 迁移到types/itemMap.ts                             |
| buildingMap提取                       | ✅   | 2026-02-14 | 迁移到types/buildingMap.ts                         |
| useIconProvider引用更新               | ✅   | 2026-02-14 | 从legacy/blueprint切换到types/itemMap              |
| 数据源统一(itemMap/buildingMap)       | ✅   | 2026-02-14 | 统一使用JSON作为唯一数据源                         |
| 类型定义统一(IItemInfo/IItemData)     | ✅   | 2026-02-14 | 使用类型别名消除重复                               |
| 数据一致性测试                        | ✅   | 2026-02-14 | dataConsistency.test.ts验证数据完整性              |
| JSON重复加载修复                      | ✅   | 2026-02-14 | data/index.ts改为重导出，消除重复加载              |
| PRODUCTION_CATEGORY/BUILDING_TYPE统一 | ✅   | 2026-02-14 | 从JSON导入替代硬编码                               |
| StackService数据源统一                | ✅   | 2026-02-14 | 从types/buildingMap导入替代直接JSON导入            |
| legacy itemMap注入                    | ✅   | 2026-02-14 | bridge.ts注入itemMap到window供legacy使用           |
| data.js itemMap引用修复               | ✅   | 2026-02-14 | 使用window.itemMap替代未定义变量                   |
| calculator.js计算引擎拆分             | ✅   | 2026-02-15 | 纯计算逻辑拆分到独立模块                           |
| iconLoader.js图标加载拆分             | ✅   | 2026-02-15 | 图标资源加载逻辑拆分到独立模块                     |
| bridge.ts模块加载更新                 | ✅   | 2026-02-15 | 并行加载calculator/iconLoader模块                  |
| storageManager.js存储管理拆分         | ✅   | 2026-02-15 | localStorage/cookie封装拆分到独立模块              |
| recipeHelper.js配方辅助拆分           | ✅   | 2026-02-15 | getGroup/getPfs配方查找辅助函数                    |
| 配方数据JSON导入                      | ✅   | 2026-02-15 | data.js从recipes.json导入，删除硬编码              |
| 模块间重复定义消除                    | ✅   | 2026-02-15 | 统一find/计算变量/图标变量到对应模块               |
| ES模块变量引用修复                    | ✅   | 2026-02-15 | clearCalculatorState使用原地清空                   |
| storageManager变量引用修复            | ✅   | 2026-02-15 | loadSettingTime/Pf/Projects使用原地清空            |
| iconLoader变量引用修复                | ✅   | 2026-02-15 | loadData/f_initIcons使用原地清空                   |
| Object.freeze移除                     | ✅   | 2026-02-15 | app.icons不再冻结，允许后续更新                    |
| configData.js配置数据拆分             | ✅   | 2026-02-15 | energyData/spaceData/itemNameList提取到独立模块    |
| settingsHelper.js设置辅助拆分         | ✅   | 2026-02-15 | getMachine/getAccType/getAccValue/getValue提取     |
| Phase 15A: 上下文对象设计             | ✅   | 2026-02-15 | ICalculationContext接口和CalculationContext类实现  |
| Phase 15B: 闭包封装实现               | ✅   | 2026-02-15 | createCalculator工厂函数，状态隔离                 |
| Phase 15C: 结果处理迁移               | ✅   | 2026-02-15 | calculate方法封装完整计算流程                      |
| Phase 15D: 适配器层更新               | ✅   | 2026-02-15 | calculateWithEngine方法，双引擎支持                |
| Phase 15E: 遗留代码清理               | ✅   | 2026-02-15 | @deprecated标记，迁移指南，流程分析文档            |

### ⏸️ 暂不实施

| 任务           | 状态 | 优先级 | 说明                                         |
| -------------- | ---- | ------ | -------------------------------------------- |
| loadNumber封装 | ⏸️   | -      | 高度耦合全局状态，已通过update_all间接调用   |
| 删除原data.js  | ⏸️   | -      | 核心计算逻辑、设置管理、蓝图生成仍依赖此文件 |

### 🔲 待开始

| 任务                  | 状态 | 优先级 | 说明                     |
| --------------------- | ---- | ------ | ------------------------ |
| generateBlueprint迁移 | 🔲   | 中     | 迁移到BlueprintService   |
| Web Worker计算迁移    | 🔲   | 中     | 计算密集型任务移至Worker |
| E2E测试覆盖           | 🔲   | 低     | Playwright端到端测试     |

---

## 1. 当前状态分析 (2026-02-15 更新)

### 1.1 文件结构

```text
src/core/
├── legacy/                        # 遗留代码模块 (6519行)
│   ├── data.js                    # 核心流程：update_all/UI交互 (1111行)
│   ├── calculator.js              # 计算引擎导出层 (358行)
│   ├── calculatorEngine.js        # 闭包封装计算引擎 (444行) ✅ 新增
│   ├── iconLoader.js              # 图标资源加载 (134行)
│   ├── storageManager.js          # 存储管理 (152行)
│   ├── recipeHelper.js            # 配方辅助 (41行)
│   ├── configData.js              # 配置数据 (230行)
│   ├── settingsHelper.js          # 设置辅助 (82行)
│   ├── blueprint.js               # 蓝图编码/解码 (3967行)
│   ├── data.d.ts                  # 类型声明
│   └── blueprint.d.ts             # 类型声明
├── types/                         # 类型定义 (9个文件, 714行)
│   ├── recipe.ts                  # ✅ 配方类型 (172行)
│   ├── blueprint.ts               # ✅ 蓝图类型 (93行)
│   ├── itemMap.ts                 # ✅ 物品图标映射 (28行)
│   ├── buildingMap.ts             # ✅ 建筑信息映射 (52行)
│   ├── settings.ts                # ✅ 设置类型 (109行)
│   ├── stack.ts                   # ✅ 堆叠类型 (54行)
│   ├── legacy.ts                  # ✅ 遗留代码类型 (121行)
│   ├── calculator.ts              # ✅ 计算器类型 (78行)
│   └── index.ts                   # 类型导出 (7行)
├── data/                          # 数据文件 (7个JSON)
│   ├── recipes.json               # ✅ 配方数据
│   ├── recipes.schema.json        # ✅ JSON Schema
│   ├── itemMap.json               # ✅ 物品图标数据
│   ├── buildingMap.json           # ✅ 建筑信息数据
│   ├── buildingType.json          # ✅ 建筑类型数据
│   ├── productionCategory.json    # ✅ 生产分类数据
│   ├── recipeMap.json             # ✅ 配方映射数据
│   └── index.ts                   # 数据导出
├── adapters/                      # 适配器层 (3个文件, 411行)
│   ├── RecipeAdapter.ts           # ✅ 配方数据适配器 (169行)
│   ├── SettingsAdapter.ts         # ✅ 设置适配器 (240行)
│   └── index.ts                   # 适配器导出 (2行)
├── services/                      # 服务层 (4个文件, 683行)
│   ├── CalculationContext.ts      # ✅ 计算上下文 (145行)
│   ├── CalculatorService.ts       # ✅ 计算服务 (318行)
│   ├── StackService.ts            # ✅ 堆叠服务 (217行)
│   └── index.ts                   # 服务导出 (3行)
├── utils/                         # 工具层 (10个文件, 1427行)
│   ├── BinaryReader.ts            # ✅ 二进制读取 (82行)
│   ├── BinaryWriter.ts            # ✅ 二进制写入 (68行)
│   ├── BlueprintDecoder.ts        # ✅ 蓝图解码 (384行)
│   ├── BlueprintEncoder.ts        # ✅ 蓝图编码 (414行)
│   ├── IndexMapper.ts             # ✅ 索引映射 (78行)
│   ├── md5.ts                     # ✅ MD5工具 (109行)
│   ├── storage.ts                 # ✅ 存储工具 (126行)
│   ├── unitConverter.ts           # ✅ 单位转换 (60行)
│   ├── validator.ts               # ✅ 数据校验 (92行)
│   └── index.ts                   # 工具导出 (14行)
├── config/
│   └── app.config.ts              # ✅ 应用配置
├── __tests__/                     # 测试文件 (12个文件, 3108行)
│   ├── recipe.test.ts             # ✅ 配方测试 (122行)
│   ├── dataConsistency.test.ts    # ✅ 数据一致性测试 (105行)
│   ├── calculatorService.test.ts  # ✅ 计算服务测试 (538行)
│   ├── calculatorEngine.test.ts   # ✅ 计算引擎测试 (228行)
│   ├── calculationContext.test.ts # ✅ 计算上下文测试 (170行)
│   ├── stackService.test.ts       # ✅ 堆叠服务测试 (384行)
│   ├── bridge.test.ts             # ✅ 桥接测试 (619行)
│   ├── blueprint.test.ts          # ✅ 蓝图测试 (363行)
│   ├── binary.test.ts             # ✅ 二进制测试 (228行)
│   ├── md5.test.ts                # ✅ MD5测试 (128行)
│   ├── indexMapper.test.ts        # ✅ 索引映射测试 (159行)
│   └── test-data.ts               # 测试数据 (64行)
└── bridge.ts                      # ✅ 遗留代码适配层
```

### 1.2 遗留代码行数统计

| 文件                | 行数     | 功能             | 状态      |
| ------------------- | -------- | ---------------- | --------- |
| data.js             | 1111     | 核心流程/UI交互  | ⏸️ 保留   |
| calculator.js       | 358      | 计算引擎导出层   | ✅ 已拆分 |
| calculatorEngine.js | 444      | 闭包封装计算引擎 | ✅ 新增   |
| iconLoader.js       | 134      | 图标资源加载     | ✅ 已拆分 |
| storageManager.js   | 152      | 存储管理         | ✅ 已拆分 |
| recipeHelper.js     | 41       | 配方辅助         | ✅ 已拆分 |
| configData.js       | 230      | 配置数据         | ✅ 已拆分 |
| settingsHelper.js   | 82       | 设置辅助         | ✅ 已拆分 |
| blueprint.js        | 3967     | 蓝图编码/解码    | ⏳ 进行中 |
| **总计**            | **6519** |                  |           |

### 1.3 新架构模块统计

| 目录       | 文件数 | 代码行数 | 说明       |
| ---------- | ------ | -------- | ---------- |
| types/     | 9      | 714      | 类型定义   |
| adapters/  | 3      | 411      | 数据适配器 |
| services/  | 4      | 683      | 业务服务   |
| utils/     | 10     | 1427     | 工具函数   |
| **tests**/ | 12     | 3108     | 单元测试   |
| **总计**   | **38** | **6343** | -          |

### 1.4 数据结构 (简写字段)

```javascript
// 配方数据结构
{
  s: [{ name: "产物名", n: 数量 }],    // s: outputs 产物
  q: [{ name: "原料名", n: 数量 }],    // q: inputs 原料
  t: 1,                                // t: time 生产时间(秒)
  m: "制作台",                         // m: machineType 设备类型
  group: "组件",                       // 分组
  noExtra: true,                       // 增产剂效果限制
}
```

### 1.5 核心函数清单

| 函数名                         | 功能         | 状态                        |
| ------------------------------ | ------------ | --------------------------- |
| `loadNumber(name, num)`        | 递归计算需求 | ⚠️ 黑盒，禁止修改           |
| `find(name, normalize_recipe)` | 查找配方     | ⚠️ 黑盒，禁止修改           |
| `update_all()`                 | 更新全局状态 | ⚠️ 黑盒，禁止修改           |
| `f_add()`                      | 添加需求     | ✅ 已迁移至 Vue             |
| `f_reset()`                    | 重置状态     | ✅ 已迁移至 Vue             |
| `f_ig()`                       | 排除物品     | ✅ 已迁移至 Vue             |
| `f_initIcons()`                | 初始化图标   | ✅ 已迁移至 useIconProvider |

---

## 1.6 调用链分析 (2026-02-15 更新)

### 新架构调用链

```
App.vue
├── onMounted()
│   ├── initLegacyBridge()        → bridge.ts 初始化全局变量
│   └── syncStateToLegacy()       → 同步 Pinia → window.xqs/ig_names
│
└── runCalculation()
    ├── syncStateToLegacy()       → 同步状态
    └── calculatorService.calculate(demands, excludes)
        ├── 设置 window.xqs       → 需求列表
        ├── 设置 window.ig_names  → 排除列表
        ├── 调用 window.update_all() → data.js 执行计算
        ├── 从 window.app 提取结果
        └── 填充 CalculationContext
```

### 双引擎架构

```
CalculatorService
├── calculate()                   → 遗留引擎 (window.update_all)
│   └── 100%兼容现有行为
│
└── calculateWithEngine()         → 新引擎 (createCalculator)
    ├── 状态隔离
    ├── 支持并发计算
    └── 向后兼容接口
```

### 关键修复

原 `bridge.runCalculation()` 错误调用 `window.loadNumber()`，正确应为 `window.update_all()`。
`CalculatorService` 已修复此问题，并正确从 `window.app` 提取结果。

### 已修复问题 (2026-02-14)

| 问题                          | 严重程度 | 修复方案                                        |
| ----------------------------- | -------- | ----------------------------------------------- |
| `window.xqs` 格式读取错误     | 高       | App.vue 兼容 `{ item: { name }, number }` 格式  |
| `isLegacyDataLoaded` 检查错误 | 致命     | 检查 `update_all/find/data` 而非 `isDataLoaded` |

**关键发现**：

- `window.xqs` 格式为 `{ item: { name }, number }`，非 `{ name, number }`
- `window.data` (配方数据) 与 `window.game_data` (图标资源) 是两套独立数据
- `window.isDataLoaded` 仅表示图标加载完成，不代表计算引擎就绪

### 1.7 全局变量清单

| 变量名          | 功能       | 迁移状态                                |
| --------------- | ---------- | --------------------------------------- |
| `xqs`           | 需求列表   | ✅ → `store.demandList`                 |
| `ig_names`      | 排除列表   | ✅ → `store.excludeList`                |
| `xh_list`       | 消耗列表   | ✅ → `CalculationContext`               |
| `out_list`      | 产出列表   | ✅ → `CalculationContext`               |
| `items`         | 计算结果   | ✅ → `CalculationContext`               |
| `settings`      | 设备设置   | ✅ → `store.machineSettings`            |
| `settings_time` | 速度设置   | ✅ → `bridge.legacyUpdateSpeedSettings` |
| `settingsLocal` | 配方级设置 | ✅ → `SettingsAdapter`                  |

---

## 2. 第一阶段：定义标准语义化接口 (TypeScript 建模)

**目标**：消除 `s, q, n, t, m` 等命名带来的理解成本。

### 2.1 核心接口定义

创建 `src/core/types/recipe.ts`：

```typescript
/**
 * 配方产出/需求项
 */
export interface IRecipeItem {
  name: string // 物品名称
  n: number // 数量
}

/**
 * 配方定义 (语义化)
 */
export interface IRecipe {
  id: string // 配方唯一标识
  name: string // 配方显示名称
  outputs: IRecipeItem[] // 产物列表 (原 s)
  inputs: IRecipeItem[] // 原料列表 (原 q)
  time: number // 生产时间/秒 (原 t)
  machineType: string // 设备类型 (原 m)
  group?: string // 分组
  noExtra?: boolean | null // 增产剂效果限制
}

/**
 * 配方索引接口
 */
export interface IRecipeIndex {
  byProduct: Map<string, IRecipe[]> // 按产物索引
  byInput: Map<string, IRecipe[]> // 按原料索引
  byId: Map<string, IRecipe> // 按 ID 索引
}
```

### 2.2 字段映射表

| 简写 | 语义名        | 类型            | 说明         |
| ---- | ------------- | --------------- | ------------ |
| `s`  | `outputs`     | `IRecipeItem[]` | 产物列表     |
| `q`  | `inputs`      | `IRecipeItem[]` | 原料列表     |
| `t`  | `time`        | `number`        | 生产时间(秒) |
| `m`  | `machineType` | `string`        | 设备类型     |
| `n`  | `amount`      | `number`        | 数量         |

---

## 3. 第二阶段：开发"防腐层"适配器 (RecipeAdapter)

**目标**：在不修改原始数据文件的前提下，提供语义化访问能力。

### 3.1 适配器实现

创建 `src/core/adapters/RecipeAdapter.ts`：

```typescript
import type { IRecipe, IRecipeItem, IRecipeIndex } from '../types/recipe'

/**
 * 配方适配器 - 将简写数据转换为语义化接口
 * 架构师注：此类为只读适配器，不修改原始数据
 */
export class RecipeAdapter {
  private recipes: IRecipe[] = []
  private index: IRecipeIndex = {
    byProduct: new Map(),
    byInput: new Map(),
    byId: new Map()
  }

  /**
   * 从原始数据加载配方
   * @param rawData 原始简写格式数据
   */
  loadFromRawData(rawData: any[]): void {
    this.recipes = rawData.map((item, idx) => this.transformRecipe(item, idx))
    this.buildIndex()
  }

  /**
   * 转换单个配方
   */
  private transformRecipe(raw: any, idx: number): IRecipe {
    return {
      id: `recipe_${idx}`,
      name: raw.s?.[0]?.name || `未知配方_${idx}`,
      outputs: this.transformItems(raw.s || []),
      inputs: this.transformItems(raw.q || []),
      time: raw.t || 1,
      machineType: raw.m || '未知设备',
      group: raw.group,
      noExtra: raw.noExtra
    }
  }

  /**
   * 转换物品列表
   */
  private transformItems(items: any[]): IRecipeItem[] {
    return items.map(item => ({
      name: item.name,
      n: item.n ?? 1
    }))
  }

  /**
   * 构建索引 - 预热查询性能
   */
  private buildIndex(): void {
    this.recipes.forEach(recipe => {
      // 按产物索引
      recipe.outputs.forEach(output => {
        const list = this.index.byProduct.get(output.name) || []
        list.push(recipe)
        this.index.byProduct.set(output.name, list)
      })

      // 按原料索引
      recipe.inputs.forEach(input => {
        const list = this.index.byInput.get(input.name) || []
        list.push(input)
        this.index.byInput.set(input.name, list)
      })

      // 按 ID 索引
      this.index.byId.set(recipe.id, recipe)
    })
  }

  /**
   * 按产物名称查找配方
   */
  findByProductName(name: string): IRecipe[] {
    return this.index.byProduct.get(name) || []
  }
}
```

---

## 4. 第三阶段：封装计算服务 (CalculatorService)

**目标**：将 `update_all` 封装为可测试的服务层。

### 4.1 服务实现

创建 `src/core/services/CalculatorService.ts`：

```typescript
import type { ICalculationResult, IDemand } from '../types/recipe'
import { CalculationContext } from './CalculationContext'

export class CalculatorService {
  private context: CalculationContext = new CalculationContext()

  /**
   * 执行计算
   * @param demands 需求列表
   * @param excludes 排除列表
   */
  calculate(demands: IDemand[], excludes: string[]): ICalculationResult {
    // 1. 同步状态到遗留层
    this.syncToLegacy(demands, excludes)

    // 2. 调用遗留计算函数
    const win = window as any
    win.update_all()

    // 3. 提取结果
    return this.extractResult()
  }

  private syncToLegacy(demands: IDemand[], excludes: string[]): void {
    const win = window as any
    win.xqs = demands.map(d => ({
      item: { name: d.name },
      number: d.amount
    }))
    win.ig_names = [...excludes]
  }

  private extractResult(): ICalculationResult {
    const win = window as any
    return {
      consumption: win.xh_list || [],
      output: win.out_list || [],
      items: win.items || [],
      total: win.total || []
    }
  }
}
```

---

## 5. 第四阶段：闭包封装计算引擎 (Phase 15)

**目标**：实现状态隔离的计算引擎，支持多实例并发计算。

### 5.1 设计原则

1. **闭包封装**：使用工厂函数创建独立状态空间
2. **黑盒保护**：`loadNumber` 递归逻辑保持不变
3. **向后兼容**：支持遗留代码调用方式

### 5.2 实现架构

```javascript
// calculatorEngine.js
function createCalculator(options) {
  // 闭包内独立状态
  var xh_list = []
  var out_list = []
  var xhMap = {}
  var outMap = {}
  var ig_names = []
  var loadNumberDepth = 0

  // 核心计算函数（保持原逻辑）
  function loadNumber(name, num) {
    /* ... */
  }
  function find(name, normalize_recipe) {
    /* ... */
  }

  // 公开接口
  return {
    calculate: function (demands, excludes) {
      // 重置状态
      xh_list = []
      out_list = []
      xhMap = {}
      outMap = {}
      ig_names = excludes.slice()
      loadNumberDepth = 0

      // 执行计算
      demands.forEach(function (d) {
        loadNumber(d.name, d.amount)
      })

      return {
        xh_list: xh_list,
        out_list: out_list,
        xhMap: xhMap,
        outMap: outMap
      }
    },
    getState: function () {
      return { xh_list, out_list, xhMap, outMap }
    }
  }
}
```

### 5.3 双引擎支持

```typescript
// CalculatorService.ts
export class CalculatorService {
  calculate(demands: IDemand[], excludes: string[]): ICalculationResult {
    // 遗留引擎
    return this.calculateWithLegacyEngine(demands, excludes)
  }

  calculateWithEngine(demands: IDemand[], excludes: string[]): IEngineCalculationResult {
    // 新引擎（状态隔离）
    const engine = createCalculator({
      maxDepth: 200,
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    })
    return engine.calculate(demands, excludes)
  }
}
```

---

## 6. 测试覆盖

### 6.1 测试文件清单

| 文件                       | 测试内容       |
| -------------------------- | -------------- |
| recipe.test.ts             | 配方适配器测试 |
| calculatorService.test.ts  | 计算服务测试   |
| calculatorEngine.test.ts   | 计算引擎测试   |
| calculationContext.test.ts | 计算上下文测试 |
| dataConsistency.test.ts    | 数据一致性测试 |
| bridge.test.ts             | 桥接层测试     |
| stackService.test.ts       | 堆叠服务测试   |
| blueprint.test.ts          | 蓝图编解码测试 |
| binary.test.ts             | 二进制读写测试 |
| md5.test.ts                | MD5工具测试    |
| indexMapper.test.ts        | 索引映射测试   |

### 6.2 测试状态

```
Test Files  15 passed (15)
Tests       359 passed (359)
Duration    1.91s
```

---

## 7. 风险预警

### 7.1 loadNumber 递归深度

```javascript
// ⚠️ 潜在栈溢出
loadNumber('铁板', 1000000) // 深度可能 > 200

// ✅ 已添加深度限制
if (loadNumberDepth > maxLoadNumberDepth) {
  console.warn('[calculator] Max recursion depth exceeded')
  return
}
```

### 7.2 全局状态污染

```javascript
// ⚠️ 并发计算风险
window.xh_list = [] // 全局状态被覆盖

// ✅ 使用闭包引擎
const engine = createCalculator()
engine.calculate(demands, excludes) // 独立状态空间
```

### 7.3 异步状态竞争

```typescript
// ⚠️ 计算期间状态被修改
async function runCalculation() {
  syncStateToLegacy()
  await delay(100) // 危险：期间状态可能被修改
  window.update_all()
}

// ✅ 状态快照验证
function calculate(demands: IDemand[], excludes: string[]) {
  const snapshot = captureStateSnapshot()
  window.update_all()
  if (!validateState(snapshot)) {
    throw new StateChangedDuringCalculationError()
  }
}
```

---

## 8. 预估工作量

| 阶段                   | 预估时间 | 状态      |
| ---------------------- | -------- | --------- |
| Phase 1-3: 类型/适配器 | 2天      | ✅ 已完成 |
| Phase 4-6: 服务层封装  | 3天      | ✅ 已完成 |
| Phase 7-10: 数据迁移   | 2天      | ✅ 已完成 |
| Phase 11-14: 性能优化  | 2天      | ✅ 已完成 |
| Phase 15: 闭包引擎     | 2天      | ✅ 已完成 |
| **总计**               | **11天** | **100%**  |

---

## 9. 协作 AI 模型指令

> "你现在的任务是协助进行 `data.js` 的核心逻辑解耦重构。请遵循以下规则：
>
> 1. 禁止修改 `loadNumber` 函数内部的任何递归逻辑
> 2. 所有新代码必须通过 `RecipeAdapter` 访问配方数据
> 3. 全局变量访问必须通过 `bridge.ts` 中转
> 4. 每次修改后必须运行 Baseline 测试确保计算结果一致
> 5. 新增代码必须包含完整的 TypeScript 类型注解"
