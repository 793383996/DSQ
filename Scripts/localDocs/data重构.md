# `data.js` 核心数据与逻辑解耦重构指南

> **状态**：✅ 已完成 - 阶段 4C
>
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md)

## 0. 架构师准则：稳定性第一

- **严禁全局搜索替换**：严禁直接将 `s` 替换为 `outputs`，这会破坏 `loadNumber` 的递归链。
- **影子运行**：重构后的代码必须支持与旧逻辑并行运行，通过 Baseline 对比验证。
- **接口隔离**：新 UI 组件只能通过 `RecipeProvider` 接口访问数据，不得触碰底层原始对象。
- **黑盒保护**：`loadNumber` 递归逻辑视为黑盒，仅允许外围包装，禁止修改核心算法。

---

## 0.1 重构进度追踪 (2026-02-14 更新)

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

### 🔲 待开始

| 任务             | 状态 | 优先级 | 说明                   |
| ---------------- | ---- | ------ | ---------------------- |
| 配方数据 JSON 化 | 🔲   | 中     | data.js → recipes.json |
| JSON Schema 校验 | 🔲   | 低     | 数据格式验证           |

---

## 1. 当前状态分析 (2026-02-14 更新)

### 1.1 文件结构

```text
src/core/
├── legacy/
│   ├── data.js          # 配方数据 + 计算逻辑 (jQuery 已移除) ✅
│   └── data.d.ts        # 类型声明
├── types/
│   ├── recipe.ts        # 语义化类型定义 ✅
│   └── index.ts         # 类型导出 ✅
├── adapters/
│   ├── RecipeAdapter.ts # 配方数据适配器 ✅
│   └── index.ts         # 适配器导出 ✅
├── services/
│   ├── CalculationContext.ts # 计算上下文 ✅
│   ├── CalculatorService.ts  # 计算服务 ✅
│   └── index.ts              # 服务导出 ✅
├── __tests__/
│   └── recipe.test.ts   # Baseline 测试 ✅
└── bridge.ts            # 遗留代码适配层
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
| 1.1  | 提取 `data` 数组 → `recipes.json` | 🔲   | `src/core/recipe/data/recipes.json` |
| 1.2  | 创建 JSON Schema                  | 🔲   | `src/core/recipe/data/schema.json`  |
| 1.3  | 创建数据迁移脚本                  | 🔲   | `scripts/extract-recipes.ts`        |

#### Phase 2: 类型定义层 (部分完成)

| 步骤 | 任务          | 状态 | 输出文件                            |
| ---- | ------------- | ---- | ----------------------------------- |
| 2.1  | 配方类型定义  | ✅   | `src/core/types/recipe.ts`          |
| 2.2  | 需求/排除类型 | 🔲   | `src/core/recipe/types/demand.ts`   |
| 2.3  | 结果类型定义  | 🔲   | `src/core/recipe/types/result.ts`   |
| 2.4  | 设置类型定义  | 🔲   | `src/core/recipe/types/settings.ts` |

#### Phase 3: 适配层迁移 (部分完成)

| 步骤 | 任务            | 状态 | 输出文件                                      |
| ---- | --------------- | ---- | --------------------------------------------- |
| 3.1  | RecipeAdapter   | ✅   | `src/core/adapters/RecipeAdapter.ts`          |
| 3.2  | SettingsAdapter | 🔲   | `src/core/recipe/adapters/SettingsAdapter.ts` |

#### Phase 4: 服务层迁移 (部分完成)

| 步骤 | 任务               | 状态 | 输出文件                                      |
| ---- | ------------------ | ---- | --------------------------------------------- |
| 4.1  | CalculationContext | ✅   | `src/core/services/CalculationContext.ts`     |
| 4.2  | CalculatorService  | ✅   | `src/core/services/CalculatorService.ts`      |
| 4.3  | DemandService      | 🔲   | `src/core/recipe/services/DemandService.ts`   |
| 4.4  | ExcludeService     | 🔲   | `src/core/recipe/services/ExcludeService.ts`  |
| 4.5  | SettingsService    | 🔲   | `src/core/recipe/services/SettingsService.ts` |
| 4.6  | RecipeFinder       | 🔲   | `src/core/recipe/services/RecipeFinder.ts`    |

#### Phase 5: 工具层迁移

| 步骤 | 任务             | 状态 | 输出文件                                 |
| ---- | ---------------- | ---- | ---------------------------------------- |
| 5.1  | 单位转换工具     | 🔲   | `src/core/recipe/utils/unitConverter.ts` |
| 5.2  | 数据校验工具     | 🔲   | `src/core/recipe/utils/validator.ts`     |
| 5.3  | localStorage封装 | 🔲   | `src/core/recipe/utils/storage.ts`       |

#### Phase 6: 遗留代码封装

| 步骤 | 任务           | 状态 | 输出文件                               |
| ---- | -------------- | ---- | -------------------------------------- |
| 6.1  | loadNumber封装 | 🔲   | `src/core/recipe/legacy/calculator.ts` |
| 6.2  | 全局变量类型   | 🔲   | `src/core/recipe/legacy/globals.d.ts`  |

#### Phase 7: 清理与验证

| 步骤 | 任务           | 状态 |
| ---- | -------------- | ---- |
| 7.1  | 单元测试覆盖   | 🔲   |
| 7.2  | 集成测试       | 🔲   |
| 7.3  | 删除原 data.js | 🔲   |

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
