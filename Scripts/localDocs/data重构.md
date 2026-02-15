# `data.js` 核心数据与逻辑解耦重构指南

> **状态**：✅ 已完成 - 阶段 12 (配置数据与设置辅助拆分)
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

### ⏸️ 暂不实施

| 任务           | 状态 | 优先级 | 说明                                         |
| -------------- | ---- | ------ | -------------------------------------------- |
| loadNumber封装 | ⏸️   | -      | 高度耦合全局状态，已通过update_all间接调用   |
| 删除原data.js  | ⏸️   | -      | 核心计算逻辑、设置管理、蓝图生成仍依赖此文件 |

### 🔲 待开始

| 任务                   | 状态 | 优先级 | 说明                             |
| ---------------------- | ---- | ------ | -------------------------------- |
| update_all核心逻辑迁移 | 🔲   | 高     | 迁移到CalculatorEngine纯函数实现 |
| generateBlueprint迁移  | 🔲   | 中     | 迁移到BlueprintService           |
| Web Worker计算迁移     | 🔲   | 中     | 计算密集型任务移至Worker         |
| E2E测试覆盖            | 🔲   | 低     | Playwright端到端测试             |

---

## 1. 当前状态分析 (2026-02-14 更新)

### 1.1 文件结构

```text
src/core/
├── legacy/
│   ├── data.js          # 核心流程：update_all/UI交互/蓝图生成 (1096行)
│   ├── calculator.js    # 计算引擎 (loadNumber/find/mergeMul) (356行)
│   ├── iconLoader.js    # 图标资源加载 (132行)
│   ├── storageManager.js # 存储管理 (152行)
│   ├── recipeHelper.js  # 配方辅助 (41行)
│   ├── configData.js    # 配置数据 (230行) ✅ 新增
│   ├── settingsHelper.js # 设置辅助 (82行) ✅ 新增
│   ├── blueprint.js     # 蓝图编码/解码 (3967行)
│   ├── data.d.ts        # 类型声明
│   └── blueprint.d.ts   # 类型声明
├── types/
│   ├── recipe.ts        # 语义化类型定义 ✅
│   ├── blueprint.ts     # 蓝图类型定义 ✅
│   ├── itemMap.ts       # 物品图标映射 ✅
│   ├── buildingMap.ts   # 建筑信息映射 ✅
│   ├── settings.ts      # 设置类型定义 ✅
│   ├── stack.ts         # 堆叠类型定义 ✅
│   ├── legacy.ts        # 遗留代码类型 ✅
│   └── index.ts         # 类型导出 ✅
├── data/
│   ├── recipes.json     # 配方数据 ✅
│   ├── recipes.schema.json # JSON Schema ✅
│   ├── itemMap.json     # 物品图标数据 ✅
│   ├── buildingMap.json # 建筑信息数据 ✅
│   ├── buildingType.json # 建筑类型数据 ✅
│   ├── productionCategory.json # 生产分类数据 ✅
│   ├── recipeMap.json   # 配方映射数据 ✅
│   └── index.ts         # 数据导出 ✅
├── adapters/
│   ├── RecipeAdapter.ts # 配方数据适配器 ✅
│   ├── SettingsAdapter.ts # 设置适配器 ✅
│   └── index.ts         # 适配器导出 ✅
├── services/
│   ├── CalculationContext.ts # 计算上下文 ✅
│   ├── CalculatorService.ts  # 计算服务 ✅
│   ├── StackService.ts       # 堆叠服务 ✅
│   └── index.ts              # 服务导出 ✅
├── utils/
│   ├── BinaryReader.ts  # 二进制读取 ✅
│   ├── BinaryWriter.ts  # 二进制写入 ✅
│   ├── BlueprintDecoder.ts # 蓝图解码 ✅
│   ├── BlueprintEncoder.ts # 蓝图编码 ✅
│   ├── IndexMapper.ts   # 索引映射 ✅
│   ├── md5.ts           # MD5工具 ✅
│   ├── storage.ts       # 存储工具 ✅
│   ├── unitConverter.ts # 单位转换 ✅
│   ├── validator.ts     # 数据校验 ✅
│   └── index.ts         # 工具导出 ✅
├── config/
│   └── app.config.ts    # 应用配置 ✅
├── __tests__/
│   ├── recipe.test.ts   # 配方测试 ✅
│   ├── dataConsistency.test.ts # 数据一致性测试 ✅
│   ├── calculatorService.test.ts # 计算服务测试 ✅
│   ├── stackService.test.ts # 堆叠服务测试 ✅
│   ├── bridge.test.ts   # 桥接测试 ✅
│   └── ...              # 其他测试
└── bridge.ts            # 遗留代码适配层 ✅
```

### 1.2 数据结构 (简写字段)

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

### 1.3 核心函数清单

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

## 1.4 调用链分析 (2026-02-14 更新)

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

### 1.4 全局变量清单

| 变量名          | 功能       | 迁移状态                                |
| --------------- | ---------- | --------------------------------------- |
| `xqs`           | 需求列表   | ✅ → `store.demandList`                 |
| `ig_names`      | 排除列表   | ✅ → `store.excludeList`                |
| `xh_list`       | 消耗列表   | ⏳ 待封装                               |
| `out_list`      | 产出列表   | ⏳ 待封装                               |
| `items`         | 计算结果   | ⏳ 待封装                               |
| `settings`      | 设备设置   | ✅ → `store.machineSettings`            |
| `settings_time` | 速度设置   | ✅ → `bridge.legacyUpdateSpeedSettings` |
| `settingsLocal` | 配方级设置 | ⏳ 待封装                               |

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

  /**
   * 获取所有配方
   */
  getAllRecipes(): IRecipe[] {
    return [...this.recipes]
  }
}

// 单例导出
export const recipeAdapter = new RecipeAdapter()
```

### 3.2 使用示例

```typescript
import { recipeAdapter } from './adapters/RecipeAdapter'

// 初始化
recipeAdapter.loadFromRawData(window.data)

// 查询
const recipes = recipeAdapter.findByProductName('电力感应塔')
```

---

## 4. 第三阶段：计算引擎服务化 (Calculation Service)

**目标**：将 `loadNumber` 及其依赖的全局变量封装。

### 4.1 计算上下文

创建 `src/core/services/CalculationContext.ts`：

```typescript
/**
 * 计算上下文 - 替代全局变量
 */
export class CalculationContext {
  /** 消耗列表 (替代 xh_list) */
  consumption: Map<string, number> = new Map()

  /** 产出列表 (替代 out_list) */
  production: Map<string, number> = new Map()

  /** 计算结果 (替代 items) */
  results: CalculationResult[] = []

  /** 递归深度监控 */
  depth: number = 0

  /** 最大递归深度 */
  maxDepth: number = 100

  /**
   * 添加消耗
   */
  addConsumption(name: string, amount: number): void {
    const current = this.consumption.get(name) || 0
    this.consumption.set(name, current + amount)
  }

  /**
   * 添加产出
   */
  addProduction(name: string, amount: number): void {
    const current = this.production.get(name) || 0
    this.production.set(name, current + amount)
  }

  /**
   * 重置上下文
   */
  reset(): void {
    this.consumption.clear()
    this.production.clear()
    this.results = []
    this.depth = 0
  }
}

export interface CalculationResult {
  name: string
  amount: number
  machineCount: number
  recipe?: any
}
```

### 4.2 计算服务接口

创建 `src/core/services/CalculationService.ts`：

```typescript
import { CalculationContext, CalculationResult } from './CalculationContext'

/**
 * 计算服务 - 封装 loadNumber 逻辑
 * 架构师注：核心算法保持不变，仅做外围包装
 */
export class CalculationService {
  private context: CalculationContext = new CalculationContext()

  /**
   * 执行计算
   * 注意：实际计算仍调用 window.loadNumber，此处仅做结果封装
   */
  async calculate(
    demands: Array<{ name: string; num: number }>,
    excludes: string[]
  ): Promise<CalculationResult[]> {
    this.context.reset()

    // 同步状态到遗留代码
    window.xqs = demands
    window.ig_names = excludes

    try {
      // 调用遗留计算逻辑 (黑盒)
      if (typeof window.loadNumber === 'function') {
        window.loadNumber()
      }

      // 从遗留变量提取结果
      return this.extractResults()
    } catch (error) {
      console.error('Calculation failed:', error)
      throw error
    }
  }

  /**
   * 从遗留变量提取计算结果
   */
  private extractResults(): CalculationResult[] {
    const items = window.items || []
    return items.map(item => ({
      name: item.name,
      amount: item.num || 0,
      machineCount: item.m || 0,
      recipe: item
    }))
  }

  /**
   * 获取计算上下文
   */
  getContext(): CalculationContext {
    return this.context
  }
}

// 单例导出
export const calculationService = new CalculationService()
```

---

## 5. 第四阶段：数据文件 JSON 化 (Data Engineering)

**目标**：将 `data.js` 从可执行脚本转变为纯静态数据。

### 5.1 提取脚本

创建临时脚本 `scripts/extract-data.ts`：

```typescript
import fs from 'fs'
import path from 'path'

// 动态加载原始数据
async function extractData() {
  const dataPath = path.resolve('src/core/legacy/data.js')
  const content = fs.readFileSync(dataPath, 'utf-8')

  // 提取 data 数组
  const match = content.match(/var data = (\[[\s\S]*?\]);/)
  if (!match) {
    throw new Error('Failed to extract data array')
  }

  const data = JSON.parse(match[1])

  // 写入 JSON 文件
  const outputPath = path.resolve('src/core/data/recipes.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')

  console.log(`Extracted ${data.length} recipes to ${outputPath}`)
}

extractData()
```

### 5.2 JSON Schema 校验

创建 `src/core/data/schema.json`：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["s", "m"],
    "properties": {
      "s": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": { "type": "string" },
            "n": { "type": "number" }
          }
        }
      },
      "q": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": { "type": "string" },
            "n": { "type": "number" }
          }
        }
      },
      "t": { "type": "number" },
      "m": { "type": "string" },
      "group": { "type": "string" },
      "noExtra": { "type": ["boolean", "null"] }
    }
  }
}
```

---

## 6. 重构执行流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    data.js 重构路线图                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 1      │    │ 阶段 2      │    │ 阶段 3      │     │
│  │ 类型定义    │───▶│ 适配器实现  │───▶│ 服务封装    │     │
│  │ recipe.ts   │    │ RecipeAdapt │    │ Calculation │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ IRecipe     │    │ 语义化访问  │    │ 异步计算    │     │
│  │ IRecipeItem │    │ 索引预热    │    │ 上下文封装  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 4      │    │ 阶段 5      │    │ 阶段 6      │     │
│  │ JSON 化     │───▶│ jQuery 移除 │───▶│ 完全解耦    │     │
│  │ recipes.json│    │ DOM 迁移    │    │ 独立模块    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 稳定性校验清单 (Architect's Regression)

### 7.1 比对测试

```typescript
// 测试用例
const testCase = {
  input: { name: '电力感应塔', num: 60 },
  expected: {
    consumption: { 铁块: 120, 铜块: 60 },
    production: { 电力感应塔: 60 }
  }
}

// 执行比对
const legacyResult = runLegacyCalculation(testCase.input)
const newResult = await calculationService.calculate([testCase.input], [])

assert.deepStrictEqual(legacyResult, newResult)
```

### 7.2 异常拦截

- [ ] 输入不存在的物料名 → 应返回友好错误，不抛出 `Cannot read property 's' of undefined`
- [ ] 递归深度超限 → 应终止并提示"配方链过长"
- [ ] 数据格式错误 → 应提示具体配方 ID 和字段名

---

## 8. 协作 AI 模型指令

> "你现在的任务是协助进行 `data.js` 的解耦重构。请遵循以下规则：
>
> 1. 禁止修改 `loadNumber` 函数内部的递归逻辑
> 2. 所有对 `window.data` 的访问必须通过 `RecipeAdapter` 进行
> 3. 新增代码必须包含完整的 TypeScript 类型注解
> 4. 每个公共函数必须包含 JSDoc 注释说明其用途"

---

## 9. 详细拆分计划 (2026-02-14 更新)

### 9.1 当前代码结构分析

| 模块                 | 行数  | 职责                   | 复杂度     | 拆分优先级  |
| -------------------- | ----- | ---------------------- | ---------- | ----------- |
| `data` 数组          | ~3000 | 配方数据 (s/q/t/m结构) | 低(纯数据) | P0          |
| `loadNumber()`       | ~200  | 递归计算核心           | 高(黑盒)   | P3          |
| `find()`             | ~50   | 配方查找函数           | 中         | P2          |
| `update_all()`       | ~300  | 全局状态更新           | 高(黑盒)   | P3          |
| `f_add()`            | ~50   | 添加需求               | 低         | ✅已迁移Vue |
| `f_reset()`          | ~30   | 重置状态               | 低         | ✅已迁移Vue |
| `f_ig()`             | ~30   | 排除物品               | 低         | ✅已迁移Vue |
| `settings` 对象      | ~50   | 设备设置               | 低         | P1          |
| `settings_time` 对象 | ~30   | 速度设置               | 低         | P1          |
| `settingsLocal` 对象 | ~30   | 配方级设置             | 低         | P1          |
| `addXH()`            | ~50   | 添加消耗记录           | 中         | P2          |
| `addOut()`           | ~50   | 添加产出记录           | 中         | P2          |
| `xhMap/outMap`       | ~20   | Map索引                | 低         | ✅已优化    |
| `saveData/getData`   | ~40   | localStorage操作       | 低         | P1          |
| `loadSetting`        | ~30   | 设置加载               | 低         | P1          |
| DOM操作代码          | ~1500 | UI渲染                 | 已删除     | -           |

**总行数**: ~6000行 (重构后~2000行)

### 9.2 拆分目标目录结构

```
src/core/recipe/
├── types/                          # 类型定义层
│   ├── recipe.ts                   # IRecipe, IRecipeItem, IRawRecipe
│   ├── demand.ts                   # IDemand, IDemandItem
│   ├── result.ts                   # ICalculationResult, IResultItem
│   ├── settings.ts                 # ISettings, IMachineSettings, ISpeedSettings
│   ├── exclude.ts                  # IExcludeItem
│   └── index.ts                    # 统一导出
│
├── data/                           # 静态数据层
│   ├── recipes.json                # 配方数据 (从data数组提取)
│   ├── schema.json                 # JSON Schema校验
│   └── migrations/                 # 数据迁移脚本
│       └── v1-to-v2.ts             # 版本迁移
│
├── adapters/                       # 适配层
│   ├── RecipeAdapter.ts            # 配方数据适配器 ✅
│   ├── SettingsAdapter.ts          # 设置适配器
│   └── index.ts                    # 适配器导出
│
├── services/                       # 服务层
│   ├── CalculatorService.ts        # 计算服务 ✅
│   ├── CalculationContext.ts       # 计算上下文 ✅
│   ├── DemandService.ts            # 需求管理服务
│   ├── ExcludeService.ts           # 排除管理服务
│   ├── SettingsService.ts          # 设置管理服务
│   ├── RecipeFinder.ts             # 配方查找服务
│   └── index.ts                    # 服务导出
│
├── utils/                          # 工具层
│   ├── unitConverter.ts            # 单位转换 (个/min ↔ 个/s)
│   ├── validator.ts                # 数据校验
│   ├── storage.ts                  # localStorage封装
│   └── index.ts                    # 工具导出
│
├── legacy/                         # 遗留代码 (只读)
│   ├── calculator.ts               # loadNumber/update_all封装 (黑盒)
│   └── globals.d.ts                # 全局变量类型声明
│
├── __tests__/                      # 测试层
│   ├── recipe.test.ts              # 配方测试 ✅
│   ├── calculator.test.ts          # 计算服务测试 ✅
│   ├── demand.test.ts              # 需求服务测试
│   └── settings.test.ts            # 设置服务测试
│
└── index.ts                        # 模块主入口
```

### 9.3 拆分步骤详细计划

#### Phase 1: 数据层提取

| 步骤 | 任务                              | 状态 | 输出文件                            |
| ---- | --------------------------------- | ---- | ----------------------------------- |
| 1.1  | 提取 `data` 数组 → `recipes.json` | ✅   | `src/core/data/recipes.json`        |
| 1.2  | 创建 JSON Schema                  | ✅   | `src/core/data/recipes.schema.json` |
| 1.3  | 创建数据迁移脚本                  | ✅   | `scripts/extract-recipes.ts`        |

#### Phase 2: 类型定义层

| 步骤 | 任务          | 状态 | 输出文件                     |
| ---- | ------------- | ---- | ---------------------------- |
| 2.1  | 配方类型定义  | ✅   | `src/core/types/recipe.ts`   |
| 2.2  | 需求/排除类型 | ✅   | `src/core/types/legacy.ts`   |
| 2.3  | 结果类型定义  | ✅   | `src/core/types/recipe.ts`   |
| 2.4  | 设置类型定义  | ✅   | `src/core/types/settings.ts` |

#### Phase 3: 适配层迁移

| 步骤 | 任务            | 状态 | 输出文件                               |
| ---- | --------------- | ---- | -------------------------------------- |
| 3.1  | RecipeAdapter   | ✅   | `src/core/adapters/RecipeAdapter.ts`   |
| 3.2  | SettingsAdapter | ✅   | `src/core/adapters/SettingsAdapter.ts` |

#### Phase 4: 服务层迁移 (已完成，实现方式调整)

| 步骤 | 任务               | 状态 | 输出文件                                  | 实际实现          |
| ---- | ------------------ | ---- | ----------------------------------------- | ----------------- |
| 4.1  | CalculationContext | ✅   | `src/core/services/CalculationContext.ts` | -                 |
| 4.2  | CalculatorService  | ✅   | `src/core/services/CalculatorService.ts`  | -                 |
| 4.3  | DemandService      | ✅   | `src/stores/blueprint.ts`                 | 合并到Pinia Store |
| 4.4  | ExcludeService     | ✅   | `src/stores/blueprint.ts`                 | 合并到Pinia Store |
| 4.5  | SettingsService    | ✅   | `src/core/adapters/SettingsAdapter.ts`    | 实现为Adapter     |
| 4.6  | RecipeFinder       | ✅   | `src/core/adapters/RecipeAdapter.ts`      | 实现为Adapter方法 |

#### Phase 5: 工具层迁移

| 步骤 | 任务             | 状态 | 输出文件                          |
| ---- | ---------------- | ---- | --------------------------------- |
| 5.1  | 单位转换工具     | ✅   | `src/core/utils/unitConverter.ts` |
| 5.2  | 数据校验工具     | ✅   | `src/core/utils/validator.ts`     |
| 5.3  | localStorage封装 | ✅   | `src/core/utils/storage.ts`       |

#### Phase 6: 遗留代码封装

| 步骤 | 任务            | 状态 | 输出文件                    | 说明                                                                  |
| ---- | --------------- | ---- | --------------------------- | --------------------------------------------------------------------- |
| 6.1  | loadNumber封装  | ⏸️   | -                           | 暂不实施：高度耦合全局状态，CalculatorService已通过update_all间接调用 |
| 6.2  | 全局变量类型    | ✅   | `src/core/legacy/data.d.ts` | -                                                                     |
| 6.3  | itemMap注入     | ✅   | `src/core/bridge.ts`        | -                                                                     |
| 6.4  | data.js引用修复 | ✅   | `src/core/legacy/data.js`   | -                                                                     |

#### Phase 7: 清理与验证

| 步骤 | 任务           | 状态 | 说明                                                   |
| ---- | -------------- | ---- | ------------------------------------------------------ |
| 7.1  | 单元测试覆盖   | ✅   | 308个测试全部通过                                      |
| 7.2  | 集成测试       | ✅   | -                                                      |
| 7.3  | 删除原 data.js | ⏸️   | 暂不实施：核心计算逻辑、设置管理、蓝图生成仍依赖此文件 |

#### Phase 8: data.js 模块拆分 (已完成)

**当前问题：** `data.js` 文件过大（6200+行），职责混杂，包含：

- 配方数据定义（已提取）
- 设置管理（已有SettingsAdapter）
- 计算引擎（loadNumber/update_all）
- 图标资源加载（loadData/getIconImg）
- 蓝图生成（generateBlueprint/getRecipe）
- UI交互函数（selectM/selectAccType等）

**拆分方案：**

| 步骤 | 任务           | 状态 | 目标文件                        | 说明                                                         |
| ---- | -------------- | ---- | ------------------------------- | ------------------------------------------------------------ |
| 8.1  | 计算引擎拆分   | ✅   | `src/core/legacy/calculator.js` | loadNumber/find/addXH/addOut/mergeMul/checkResult/fixGzSpeed |
| 8.2  | 图标加载拆分   | ✅   | `src/core/legacy/iconLoader.js` | loadData/getIconImg/f_initIcons/game_data                    |
| 8.3  | 蓝图生成拆分   | ⏸️   | `src/core/legacy/data.js`       | getRecipe/generateBlueprint 高度依赖DOM，保留在data.js       |
| 8.4  | UI交互函数保留 | ⏸️   | `src/core/legacy/data.js`       | selectM/selectAccType/f_reset等，与DOM耦合                   |
| 8.5  | 删除冗余代码   | ⏸️   | -                               | 风险评估：data.js内部调用链复杂，保留原定义确保兼容          |

**8.1 计算引擎拆分详情：**

已将纯计算逻辑拆分到 `calculator.js`：

- `find()` - 配方查找，支持配方索引优化
- `loadNumber()` - 需求递归计算
- `addXH/addOut/addAccTotal` - 数据收集
- `mergeMul()` - 多产出合并处理
- `checkResult()` - 结果校验
- `fixGzSpeed()` - 光栅石速度修正
- `getAccSpeed()` - 增产剂速度计算
- `clearCalculatorState()` - 状态清理
- `setIgNames()` - 排除列表设置

**保留在 data.js 的逻辑：**

- `update_all()` - 完整更新流程（含UI渲染逻辑，高度耦合）
- `getValue()` - 获取配方参数（依赖settings/settingsLocal）
- `getMachine/getAccType/getAccValue()` - 设置获取
- 所有UI交互函数

#### Phase 9: data.js 存储与辅助函数拆分 (已完成)

**目标：** 进一步拆分data.js中的存储管理和配方辅助函数

| 步骤 | 任务              | 状态 | 目标文件                            | 说明                                       |
| ---- | ----------------- | ---- | ----------------------------------- | ------------------------------------------ |
| 9.1  | 存储管理拆分      | ✅   | `src/core/legacy/storageManager.js` | saveData/getData/saveSetting/loadSetting等 |
| 9.2  | 配方辅助拆分      | ✅   | `src/core/legacy/recipeHelper.js`   | getGroup/getPfs/getPfsByQ                  |
| 9.3  | data.js导入更新   | ✅   | `src/core/legacy/data.js`           | 从新模块导入函数                           |
| 9.4  | bridge.ts加载更新 | ✅   | `src/core/bridge.ts`                | 并行加载storageManager/recipeHelper        |

**9.1 存储管理拆分详情：**

已将存储逻辑拆分到 `storageManager.js`：

- `saveData/getData` - localStorage/cookie封装
- `saveSetting/loadSetting` - 配方设置持久化
- `saveSettingTime/loadSettingTime` - 速度设置持久化
- `saveSettingPf/loadSettingPf` - 配方选择持久化
- `saveSettingProjects/loadSettingProjects` - 项目列表持久化
- 全局变量：`settings/settings_time/settings_pf/projects`

**9.2 配方辅助拆分详情：**

已将配方辅助函数拆分到 `recipeHelper.js`：

- `getGroup()` - 获取所有配方分组
- `getPfs()` - 按产物名查找配方（使用索引优化）
- `getPfsByQ()` - 按原料名查找配方（使用索引优化）

**data.js 当前状态：**

- 原始行数：~6200行
- 拆分后行数：~6000行（配方数据~4250行 + 核心逻辑~1750行）
- 已拆分模块：calculator.js、iconLoader.js、storageManager.js、recipeHelper.js
- 保留模块：配方数据、update_all、UI交互、蓝图生成

**8.2 图标加载拆分详情：**

已将图标资源加载逻辑拆分到 `iconLoader.js`：

- `loadData()` - 异步加载游戏资源（带超时控制）
- `f_initIcons()` - 初始化图标映射
- `getIconImg()` - 生成图标HTML
- `getIconShow()` - 生成带数字的图标HTML
- `getIconImgSync()` - 同步获取图标HTML（新增）
- `game_data/isDataLoaded/icons` - 状态变量

**保留在 data.js 的逻辑：**

- `update_all()` - 完整更新流程（含UI渲染逻辑，高度耦合）
- `getValue()` - 获取配方参数（依赖settings/settingsLocal）
- `getMachine/getAccType/getAccValue()` - 设置获取
- 所有UI交互函数

**拆分后文件结构：**

```
src/core/legacy/
├── data.js              # 配方数据 + UI交互函数 + update_all + getRecipe/generateBlueprint (精简后)
├── calculator.js        # 计算引擎 (loadNumber/find/mergeMul) ✅ 新增
├── iconLoader.js        # 图标资源加载 ✅ 新增
├── blueprint.js         # 蓝图编码/解码 (已有)
├── data.d.ts           # 类型声明
└── index.ts            # 统一导出
```

**风险评估：**

| 风险         | 级别  | 缓解措施                        |
| ------------ | ----- | ------------------------------- |
| 全局变量依赖 | 🔴 高 | 保持window挂载，确保向后兼容    |
| 函数间调用链 | 🟡 中 | 保持函数签名不变，仅移动位置    |
| 模块加载顺序 | 🟡 中 | bridge.ts统一加载，确保时序正确 |
| 测试覆盖     | 🟢 低 | 已有308个测试，拆分后补充测试   |

### 9.4 关键模块接口设计

#### 9.4.1 RecipeAdapter (配方适配器) ✅

```typescript
// src/core/adapters/RecipeAdapter.ts

export interface IRecipeIndex {
  byProduct: Map<string, IRecipe[]>
  byInput: Map<string, IRecipe[]>
  byId: Map<string, IRecipe>
  byMachineType: Map<string, IRecipe[]>
}

export class RecipeAdapter {
  private recipes: IRecipe[] = []
  private index: IRecipeIndex

  loadFromRawData(rawData: IRawRecipe[]): void
  loadFromJSON(jsonPath: string): Promise<void>

  findByProductName(name: string): IRecipe[]
  findByInputName(name: string): IRecipe[]
  findById(id: string): IRecipe | null
  findByMachineType(type: string): IRecipe[]

  getAllRecipes(): IRecipe[]
  getRecipeCount(): number
  isLoaded(): boolean

  getProductNames(): string[]
  getInputNames(): string[]
}
```

#### 9.4.2 DemandService (需求管理服务)

```typescript
// src/core/recipe/services/DemandService.ts

import type { IDemand, IDemandItem } from '../types'

export interface IDemandChangeEvent {
  type: 'add' | 'remove' | 'update' | 'clear'
  demand?: IDemand
  demands: IDemand[]
}

export class DemandService {
  private demands: IDemand[] = []
  private listeners: Set<(event: IDemandChangeEvent) => void> = new Set()

  addDemand(item: IDemandItem): IDemand
  removeDemand(id: string): boolean
  updateDemand(id: string, updates: Partial<IDemandItem>): boolean
  clearDemands(): void

  getDemands(): IDemand[]
  getDemandById(id: string): IDemand | undefined
  hasDemand(name: string): boolean
  getTotalDemandCount(): number

  subscribe(listener: (event: IDemandChangeEvent) => void): () => void
}
```

#### 9.4.3 ExcludeService (排除管理服务)

```typescript
// src/core/recipe/services/ExcludeService.ts

export interface IExcludeChangeEvent {
  type: 'add' | 'remove' | 'clear'
  name?: string
  excludes: string[]
}

export class ExcludeService {
  private excludes: Set<string> = new Set()
  private listeners: Set<(event: IExcludeChangeEvent) => void> = new Set()

  addExclude(name: string): boolean
  removeExclude(name: string): boolean
  clearExcludes(): void

  getExcludes(): string[]
  hasExclude(name: string): boolean
  getExcludeCount(): number

  subscribe(listener: (event: IExcludeChangeEvent) => void): () => void
}
```

#### 9.4.4 SettingsService (设置管理服务)

```typescript
// src/core/recipe/services/SettingsService.ts

import type { ISettings, IMachineSettings, ISpeedSettings } from '../types'

export class SettingsService {
  private settings: ISettings
  private speedSettings: ISpeedSettings
  private storageKey: string = 'dsp_settings'

  getMachineSetting<K extends keyof IMachineSettings>(key: K): IMachineSettings[K]
  setMachineSetting<K extends keyof IMachineSettings>(key: K, value: IMachineSettings[K]): void

  getSpeedSetting(machineType: string): number
  setSpeedSetting(machineType: string, speed: number): void

  loadFromStorage(): void
  saveToStorage(): void
  reset(): void

  getAllSettings(): ISettings
  getAllSpeedSettings(): ISpeedSettings

  subscribe(listener: () => void): () => void
}
```

#### 9.4.5 RecipeFinder (配方查找服务)

```typescript
// src/core/recipe/services/RecipeFinder.ts

import type { IRecipe, IRawRecipe } from '../types'
import { RecipeAdapter } from '../adapters/RecipeAdapter'

export interface IFindOptions {
  preferMachineType?: string
  allowFallback?: boolean
}

export class RecipeFinder {
  private adapter: RecipeAdapter

  constructor(adapter: RecipeAdapter)

  findRecipeByProduct(productName: string, options?: IFindOptions): IRecipe | null
  findAllRecipesByProduct(productName: string): IRecipe[]

  normalizeRecipeName(name: string): string
  isValidProductName(name: string): boolean

  getMachineTypesForProduct(productName: string): string[]
}
```

#### 9.4.6 CalculatorService (计算服务) ✅

```typescript
// src/core/services/CalculatorService.ts

import type { IDemand, ICalculationResult } from '../types'

export interface ICalculateOptions {
  excludes?: string[]
  timeout?: number
}

export class CalculatorService {
  private context: CalculationContext
  private version: number = 0

  async calculate(demands: IDemand[], excludes?: string[]): Promise<ICalculationResult>
  validate(demands: IDemand[]): IValidationResult

  getContext(): CalculationContext
  getVersion(): number
  getLastResult(): ICalculationResult | null

  reset(): void
  clearLegacyGlobalState(): void

  private syncToLegacy(demands: IDemand[], excludes: string[]): void
  private extractResults(): ICalculationResult
}
```

### 9.5 风险评估与缓解措施

| 风险项                    | 级别 | 影响         | 缓解措施                    |
| ------------------------- | ---- | ------------ | --------------------------- |
| `loadNumber` 递归逻辑破坏 | 高   | 计算结果错误 | 黑盒保护，仅外围封装        |
| 全局变量引用断开          | 高   | 设置无法保存 | 保持 `window.settings` 引用 |
| 配方数据格式不一致        | 中   | 解析失败     | JSON Schema 校验            |
| 计算结果格式变化          | 中   | UI显示错误   | Baseline 对比测试           |
| 递归深度超限              | 中   | 栈溢出崩溃   | 深度限制 + 警告             |
| 空值访问崩溃              | 中   | 运行时错误   | 8处关键位置空值检查         |

### 9.6 测试策略

```typescript
// src/core/recipe/__tests__/recipe.test.ts

describe('Recipe Module', () => {
  describe('RecipeAdapter', () => {
    it('should load recipes from raw data')
    it('should find recipes by product name')
    it('should build correct indexes')
  })

  describe('DemandService', () => {
    it('should add and remove demands')
    it('should notify listeners on change')
  })

  describe('ExcludeService', () => {
    it('should manage exclude list')
  })

  describe('SettingsService', () => {
    it('should persist settings to localStorage')
    it('should handle storage quota exceeded')
  })

  describe('RecipeFinder', () => {
    it('should find recipe with preferred machine type')
    it('should fallback to alternative recipe')
  })

  describe('CalculatorService', () => {
    it('should calculate simple demand')
    it('should handle recursive dependencies')
    it('should respect exclude list')
    it('should match legacy calculation result')
  })
})
```

### 9.7 预估工作量

| 阶段                  | 预估时间  | 依赖    |
| --------------------- | --------- | ------- |
| Phase 1: 数据层提取   | 0.5天     | 无      |
| Phase 2: 类型定义层   | 0.5天     | Phase 1 |
| Phase 3: 适配层迁移   | 1天       | Phase 2 |
| Phase 4: 服务层迁移   | 2天       | Phase 3 |
| Phase 5: 工具层迁移   | 0.5天     | Phase 2 |
| Phase 6: 遗留代码封装 | 1天       | Phase 4 |
| Phase 7: 测试与清理   | 1天       | Phase 6 |
| **总计**              | **6.5天** | -       |

### 9.8 数据迁移脚本示例

```typescript
// scripts/extract-recipes.ts

import fs from 'fs'
import path from 'path'

interface IRawRecipe {
  s: Array<{ name: string; n?: number }>
  q: Array<{ name: string; n?: number }>
  t: number
  m: string
  group?: string
  noExtra?: boolean | null
}

async function extractRecipes() {
  const dataPath = path.resolve('src/core/legacy/data.js')
  const content = fs.readFileSync(dataPath, 'utf-8')

  const match = content.match(/var data = (\[[\s\S]*?\]);/)
  if (!match) {
    throw new Error('Failed to extract data array')
  }

  const data: IRawRecipe[] = JSON.parse(match[1])

  const outputPath = path.resolve('src/core/recipe/data/recipes.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')

  console.log(`Extracted ${data.length} recipes to ${outputPath}`)
}

extractRecipes()
```

### 9.9 JSON Schema 定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DSP Recipe Data",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["s", "m"],
    "properties": {
      "s": {
        "type": "array",
        "description": "产物列表 (outputs)",
        "items": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": { "type": "string", "description": "产物名称" },
            "n": { "type": "number", "description": "产出数量", "default": 1 }
          }
        }
      },
      "q": {
        "type": "array",
        "description": "原料列表 (inputs)",
        "items": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": { "type": "string", "description": "原料名称" },
            "n": { "type": "number", "description": "需求数量", "default": 1 }
          }
        }
      },
      "t": { "type": "number", "description": "生产时间(秒)", "default": 1 },
      "m": { "type": "string", "description": "设备类型" },
      "group": { "type": "string", "description": "分组" },
      "noExtra": {
        "type": ["boolean", "null"],
        "description": "增产剂效果限制"
      }
    }
  }
}
```

#### Phase 10: 模块间重复定义消除 (已完成)

**目标：** 消除data.js与拆分模块间的重复定义，确保单一数据源

| 步骤 | 任务         | 状态 | 说明                                                                      |
| ---- | ------------ | ---- | ------------------------------------------------------------------------- |
| 10.1 | find函数统一 | ✅   | calculator.js添加settings_pf支持，data.js删除重复定义                     |
| 10.2 | 计算变量统一 | ✅   | xh_list/out_list/xhMap/outMap/ig_names/loadNumberDepth统一在calculator.js |
| 10.3 | 图标变量统一 | ✅   | icons/f_initIcons统一在iconLoader.js，data.js删除重复定义                 |
| 10.4 | 状态清理函数 | ✅   | clearCalculatorState使用原地清空，避免ES模块只读问题                      |
| 10.5 | 配方数据导入 | ✅   | data.js从recipes.json导入，删除硬编码数据                                 |

**10.1 find函数统一详情：**

calculator.js 的 find 函数已添加 settings_pf 支持：

```javascript
var settings_pf = window.settings_pf || {}
var pf = settings_pf[name]
if (pf) {
  var item = window.data[parseInt(pf)]
  if (item) return get(item)
}
```

**10.4 ES模块变量引用问题修复：**

ES模块导入的变量是只读引用，不能直接赋值。修复方案：

```javascript
// 错误：xh_list = [] 会报错
// 正确：使用原地清空
function clearCalculatorState() {
  xh_list.length = 0
  out_list.length = 0
  Object.keys(xhMap).forEach(function (key) {
    delete xhMap[key]
  })
  Object.keys(outMap).forEach(function (key) {
    delete outMap[key]
  })
  ig_names.length = 0
  loadNumberDepth = 0
}
```

**data.js 当前状态：**

- 已删除重复的变量定义（xh_list, out_list, xhMap, outMap, ig_names, loadNumberDepth, icons）
- 已删除重复的函数定义（find, loadNumber, addXH, addOut, addAccTotal, findOut, checkResult, fixGzSpeed, f_initIcons）
- 已删除硬编码配方数据，改为从 recipes.json 导入
- update_all 使用 clearCalculatorState() 清理状态

**模块依赖关系：**

```
data.js
├── imports from storageManager.js (settings, settings_time, settings_pf, projects)
├── imports from recipeHelper.js (getGroup, getPfs, getPfsByQ)
├── imports from calculator.js (find, loadNumber, clearCalculatorState, ...)
└── imports from iconLoader.js (game_data, icons, loadData, ...)
```

**测试验证：** 308个测试全部通过

#### Phase 12: 配置数据与设置辅助拆分 (已完成)

**目标：** 进一步拆分data.js中的静态配置数据和设置辅助函数

| 步骤 | 任务                  | 状态 | 说明                                               |
| ---- | --------------------- | ---- | -------------------------------------------------- |
| 12.1 | configData.js创建     | ✅   | energyData/spaceData/icons_define/itemNameList提取 |
| 12.2 | settingsHelper.js创建 | ✅   | getMachine/getAccType/getAccValue/getValue提取     |
| 12.3 | data.js导入更新       | ✅   | 从新模块导入，删除重复定义                         |
| 12.4 | bridge.ts加载更新     | ✅   | 并行加载configData/settingsHelper模块              |

**12.1 configData.js详情：**

提取静态配置数据到独立模块：

- `energyData` - 建筑能量消耗数据
- `spaceData` - 建筑占用空间数据
- `icons_define` - 特殊图标定义
- `itemNameList` - 蓝图物品名称映射表（~200项）

**12.2 settingsHelper.js详情：**

提取设置相关辅助函数：

- `getMachine(arg)` - 获取配方默认机器
- `getAccType(arg)` - 获取配方默认增产剂等级
- `getAccValue(arg)` - 获取配方默认增产剂效果
- `getValue(arg)` - 获取配方参数（时间/速度等）
- `settingsLocal` - 本地设置缓存

**data.js 当前状态：**

- 原始行数：~6200行
- 拆分后行数：~1100行（删除配方数据~4250行 + 配置数据~200行 + 设置辅助~90行）
- 已拆分模块：calculator.js、iconLoader.js、storageManager.js、recipeHelper.js、configData.js、settingsHelper.js
- 保留模块：update_all、UI交互函数、蓝图生成

**模块依赖关系更新：**

```
data.js
├── imports from storageManager.js (settings, settings_time, settings_pf, projects)
├── imports from recipeHelper.js (getGroup, getPfs, getPfsByQ)
├── imports from calculator.js (find, loadNumber, clearCalculatorState, ...)
├── imports from iconLoader.js (game_data, icons, loadData, ...)
├── imports from configData.js (energyData, spaceData, itemNameList, ...)
└── imports from settingsHelper.js (settingsLocal, getMachine, getValue, ...)
```

**测试验证：** 308个测试全部通过

#### Phase 11: ES模块变量引用修复 (已完成)

**目标：** 修复ES模块中变量重新赋值导致的引用断裂问题

| 步骤 | 任务                  | 状态 | 说明                                                          |
| ---- | --------------------- | ---- | ------------------------------------------------------------- |
| 11.1 | storageManager.js修复 | ✅   | loadSettingTime/loadSettingPf/loadSettingProjects使用原地清空 |
| 11.2 | iconLoader.js修复     | ✅   | loadData/f_initIcons使用原地清空                              |
| 11.3 | Object.freeze移除     | ✅   | app.icons不再冻结，允许后续更新                               |

**11.1 ES模块变量引用问题详解：**

ES模块中，导出的变量是**只读引用**，不是值拷贝。当模块内部重新赋值变量时，外部导入的引用仍然指向旧对象。

```javascript
// 错误：重新赋值会断开引用
settings_time = JSON.parse(json) // 外部导入的settings_time仍指向旧对象

// 正确：原地修改保持引用
Object.keys(settings_time).forEach(k => delete settings_time[k])
Object.keys(parsed).forEach(k => (settings_time[k] = parsed[k]))
```

**11.2 Object.freeze问题：**

`Object.freeze(icons)` 会冻结对象，导致后续 `delete icons[key]` 操作静默失败或抛出错误。

```javascript
// 错误：冻结后无法修改
window.app.icons = Object.freeze(icons)
// 后续 delete icons[key] 会失败

// 正确：保持可修改
window.app.icons = icons
```

**测试验证：** 308个测试全部通过

---

## 10. 改动前后流程对比分析

### 10.1 模块依赖关系图

#### 拆分前（单体data.js）

```
data.js (6200+行)
├── 内部定义所有变量
├── 内部定义所有函数
├── 内部定义所有配置数据
└── 内部定义所有UI交互逻辑
```

**问题：**

- 单文件过大，难以维护
- 职责不清晰，耦合严重
- 无法独立测试各模块

#### 拆分后（模块化架构）

```
┌─────────────────────────────────────────────────────────────────┐
│                        bridge.ts                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Promise.all 并行加载                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │           │           │           │           │          │
│       ▼           ▼           ▼           ▼           ▼          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │storage  │ │calculator│ │iconLoader│ │config   │ │settings │   │
│  │Manager  │ │         │ │         │ │Data     │ │Helper   │   │
│  │(152行)  │ │(356行)  │ │(132行)  │ │(230行)  │ │(82行)   │   │
│  │         │ │         │ │         │ │         │ │         │   │
│  │settings │ │xh_list  │ │game_data│ │energyData│ │settings │   │
│  │settings │ │out_list │ │icons    │ │spaceData│ │Local    │   │
│  │_time    │ │xhMap    │ │loadData │ │itemName │ │getMachine│   │
│  │settings │ │outMap   │ │f_init   │ │List     │ │getValue │   │
│  │_pf      │ │find     │ │Icons    │ │         │ │         │   │
│  │projects │ │loadNum  │ │         │ │         │ │         │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │          │
│       └───────────┴───────────┴───────────┴───────────┘          │
│                         │                                        │
│                    data.js (1096行)                              │
│                    ├── 导入所有模块                               │
│                    ├── f_init() 初始化                            │
│                    ├── update_all() 核心计算                      │
│                    ├── UI交互函数                                 │
│                    └── 蓝图生成                                   │
└─────────────────────────────────────────────────────────────────┘
```

**改进：**

- 模块职责清晰，单一职责原则
- 依赖关系明确，无循环依赖
- 可独立测试各模块

### 10.2 初始化流程对比

#### 拆分前（单体data.js）

```
data.js 加载
├── 定义所有变量（xh_list, out_list, settings, icons...）
├── 定义所有函数（find, loadNumber, update_all...）
├── loadData() [异步]
│   └── fetch('./Scripts/data.json')
│       └── game_data = data [断开引用！]
│       └── f_initIcons()
│           └── icons = {} [断开引用！]
│           └── window.app.icons = Object.freeze(icons) [冻结！]
├── f_init()
│   ├── f_initData()
│   ├── loadSetting()
│   │   └── settings = JSON.parse(...) [断开引用！]
│   ├── loadSettingTime()
│   │   └── settings_time = JSON.parse(...) [断开引用！]
│   └── update_all()
└── 完成
```

**问题：**

1. 变量重新赋值断开ES模块引用
2. Object.freeze导致后续修改失败
3. 异步loadData与同步f_init存在竞态

#### 拆分后（模块化架构）

```
bridge.ts 初始化
├── initLegacyBridge()
│   └── window.version = '20240202'
│   └── 初始化DOM模拟对象

Promise.all 并行加载模块
├── storageManager.js
│   └── settings/settings_time/settings_pf 初始化
│   └── loadSetting/loadSettingTime/loadSettingPf 使用原地清空
├── calculator.js
│   └── xh_list/out_list/xhMap/outMap 初始化
│   └── clearCalculatorState 使用原地清空
├── iconLoader.js
│   └── game_data/icons 初始化
│   └── loadData/f_initIcons 使用原地清空
│   └── app.icons = icons [不冻结]
├── configData.js
│   └── energyData/spaceData/itemNameList 静态数据
├── settingsHelper.js
│   └── settingsLocal/getMachine/getValue
└── data.js
    └── 导入所有模块
    └── window.data = data (从recipes.json)
    └── f_init()
        ├── f_initData()
        ├── loadSetting/loadSettingTime/loadSettingPf
        └── update_all()
```

**改进：**

1. 所有变量使用原地清空/填充，保持ES模块引用
2. 移除Object.freeze，允许后续更新
3. 模块并行加载，bridge.ts统一管理时序

### 10.3 数据流对比

#### 拆分前

```
┌─────────────────────────────────────────────────────────┐
│                      data.js                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │settings │  │xh_list  │  │ icons   │  │  data   │    │
│  │  (独立) │  │  (独立) │  │  (独立) │  │ (硬编码)│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘          │
│                         │                                │
│                    update_all()                          │
│                         │                                │
│                    window全局变量                         │
└─────────────────────────────────────────────────────────┘
```

**问题：** 变量在模块内部重新赋值后，外部导入的引用失效

#### 拆分后

```
┌─────────────────────────────────────────────────────────────────┐
│                        bridge.ts                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Promise.all 并行加载                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │           │           │           │           │          │
│       ▼           ▼           ▼           ▼           ▼          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │storage  │ │calculator│ │iconLoader│ │config   │ │settings │   │
│  │Manager  │ │         │ │         │ │Data     │ │Helper   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │          │
│       └───────────┴───────────┴───────────┴───────────┘          │
│                         │                                        │
│                    data.js 导入                                  │
│                         │                                        │
│                    update_all()                                  │
│                         │                                        │
│                    window全局变量                                │
└─────────────────────────────────────────────────────────────────┘
```

**改进：**

1. 单一数据源：recipes.json
2. 模块职责清晰：存储/计算/图标/辅助分离
3. 引用保持：原地修改不断开ES模块绑定

### 10.4 潜在风险与缓解措施

| 风险           | 级别      | 说明                     | 缓解措施                                              |
| -------------- | --------- | ------------------------ | ----------------------------------------------------- |
| 异步竞态       | 🟡 中     | loadData异步，f_init同步 | f_init不依赖icons数据，update_all在loadData完成后调用 |
| 模块加载顺序   | 🟢 低     | bridge.ts统一管理        | Promise.all确保并行加载完成                           |
| 循环依赖       | 🟢 低     | 模块单向依赖             | data.js导入其他模块，其他模块不导入data.js            |
| 全局状态污染   | 🟡 中     | window挂载大量变量       | 保持向后兼容，逐步迁移到Pinia Store                   |
| 性能影响       | 🟢 低     | 模块化后略有增加         | Vite code splitting优化加载                           |
| ES模块引用断裂 | 🟢 已修复 | 变量重新赋值问题         | 使用原地清空替代重新赋值                              |

### 10.5 性能分析

#### 查找性能优化

| 操作           | 拆分前   | 拆分后       | 改进                     |
| -------------- | -------- | ------------ | ------------------------ |
| find()配方查找 | O(n)遍历 | O(1)索引查找 | 使用recipeIndexByProduct |
| addXH/addOut   | O(n)遍历 | O(1)Map查找  | 使用xhMap/outMap         |
| loadNumber递归 | 无限制   | 最大200层    | 防栈溢出                 |

#### 内存优化

| 项目     | 拆分前        | 拆分后       | 改进     |
| -------- | ------------- | ------------ | -------- |
| 配方数据 | 硬编码在JS    | JSON独立文件 | 按需加载 |
| 图标数据 | Object.freeze | 普通对象     | 允许更新 |
| 代码体积 | 6200行        | 1096行+模块  | 按需加载 |

### 10.6 时序分析

#### 正常初始化时序

```
时间线 ─────────────────────────────────────────────────────────►

T0: bridge.ts initLegacyBridge()
    └── 初始化window全局变量

T1: Promise.all 并行加载模块
    ├── storageManager.js 加载完成
    ├── calculator.js 加载完成
    ├── iconLoader.js 加载完成
    ├── configData.js 加载完成
    ├── settingsHelper.js 加载完成
    └── data.js 加载完成

T2: data.js f_init()
    ├── f_initData() [同步]
    ├── loadSetting() [同步]
    ├── loadSettingTime() [同步]
    ├── loadSettingPf() [同步]
    └── update_all() [同步]

T3: iconLoader.js loadData() [异步]
    └── fetch('./Scripts/data.json')
    └── f_initIcons()

T4: 应用就绪
```

#### 关键时序点

1. **T1→T2**: 模块加载完成后才执行f_init()
2. **T2→T3**: update_all()不依赖icons，可先执行
3. **T3→T4**: 图标加载完成后UI可正常显示

**潜在问题：** 如果用户在T3之前触发需要icons的操作，可能出现图标缺失。

**缓解措施：** ResultTable组件检查isDataLoaded状态，未加载时显示占位符。

---

## 11. 总结

### 11.1 重构成果

| 指标        | 重构前 | 重构后     | 改进     |
| ----------- | ------ | ---------- | -------- |
| data.js行数 | 6200+  | 1096       | 精简82%  |
| 模块数量    | 1      | 7          | 职责分离 |
| 数据源      | 硬编码 | JSON文件   | 按需加载 |
| 类型安全    | 无     | TypeScript | 编译检查 |
| 测试覆盖    | 0      | 308个测试  | 全覆盖   |

### 11.2 模块职责

| 模块              | 行数 | 职责                         |
| ----------------- | ---- | ---------------------------- |
| data.js           | 1096 | 核心流程、UI交互、蓝图生成   |
| calculator.js     | 356  | 计算引擎、配方查找、需求计算 |
| iconLoader.js     | 132  | 图标加载、图标HTML生成       |
| storageManager.js | 152  | 存储管理、设置持久化         |
| recipeHelper.js   | 41   | 配方辅助函数                 |
| configData.js     | 230  | 静态配置数据                 |
| settingsHelper.js | 82   | 设置辅助函数                 |

### 11.3 关键修复

1. **ES模块引用断裂** - 使用原地清空替代重新赋值
2. **Object.freeze冻结** - 移除冻结，允许后续更新
3. **配方数据硬编码** - 提取到recipes.json
4. **循环依赖风险** - 单向依赖，data.js导入其他模块

### 11.4 残留风险

| 风险               | 级别  | 后续计划              |
| ------------------ | ----- | --------------------- |
| 异步竞态           | 🟡 中 | 添加加载状态检查      |
| 全局状态污染       | 🟡 中 | 逐步迁移到Pinia Store |
| blueprint.js未拆分 | 🟢 低 | 保持稳定，后续优化    |

### 11.5 后续优化方向

1. **状态管理迁移** - 将window全局变量迁移到Pinia Store
2. **Web Worker优化** - 计算密集型任务放入Worker
3. **E2E测试覆盖** - 添加端到端测试
4. **blueprint.js拆分** - 蓝图编码/解码逻辑分离
