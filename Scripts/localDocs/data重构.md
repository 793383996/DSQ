# `data.js` 核心数据与逻辑解耦重构指南

> **状态**：✅ 已完成 - 阶段 4B
> 
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md)

## 0. 架构师准则：稳定性第一

* **严禁全局搜索替换**：严禁直接将 `s` 替换为 `outputs`，这会破坏 `loadNumber` 的递归链。
* **影子运行**：重构后的代码必须支持与旧逻辑并行运行，通过 Baseline 对比验证。
* **接口隔离**：新 UI 组件只能通过 `RecipeProvider` 接口访问数据，不得触碰底层原始对象。
* **黑盒保护**：`loadNumber` 递归逻辑视为黑盒，仅允许外围包装，禁止修改核心算法。

---

## 0.1 重构进度追踪 (2026-02-14 更新)

### ✅ 已完成

| 任务 | 状态 | 完成日期 | 说明 |
|------|------|----------|------|
| jQuery 依赖移除 | ✅ | 2026-02-14 | `$.ajax` → `fetch`, `$.extend` → `structuredClone` |
| 遗留 UI 代码删除 | ✅ | 2026-02-14 | 删除 L4523-L6040 死代码 |
| 废弃文件清理 | ✅ | 2026-02-14 | jquery-*.js 已删除 |
| 构建配置优化 | ✅ | 2026-02-14 | Vite code splitting + esbuild |
| App.vue 迁移至 CalculatorService | ✅ | 2026-02-14 | 主入口已切换至新服务层 |
| 数据适配器 (`RecipeAdapter.ts`) | ✅ | 2026-02-14 | 语义化访问，索引预热 |
| 计算服务 (`CalculatorService.ts`) | ✅ | 2026-02-14 | 封装 update_all，上下文管理 |
| 计算上下文 (`CalculationContext.ts`) | ✅ | 2026-02-14 | 替代全局变量，填充 xh_list/out_list |
| 类型定义 (`src/core/types/recipe.ts`) | ✅ | 2026-02-14 | IRecipe, IRecipeItem, ICalculationResult |
| Baseline 测试 | ✅ | 2026-02-14 | 新旧实现对比验证 |
| 图标缓存统一管理 | ✅ | 2026-02-14 | ResultTable 使用 useIconProvider |
| v-memo 性能优化 | ✅ | 2026-02-14 | ResultTable 列表渲染优化 |
| 日志环境控制 | ✅ | 2026-02-14 | 新增 logger.ts，生产环境静默 |
| 搜索防抖优化 | ✅ | 2026-02-14 | AddItemDialog 搜索延迟 150ms |

### 🔲 待开始

| 任务 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| 配方数据 JSON 化 | 🔲 | 中 | data.js → recipes.json |
| JSON Schema 校验 | 🔲 | 低 | 数据格式验证 |

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

| 函数名 | 功能 | 状态 |
|--------|------|------|
| `loadNumber(name, num)` | 递归计算需求 | ⚠️ 黑盒，禁止修改 |
| `find(name, normalize_recipe)` | 查找配方 | ⚠️ 黑盒，禁止修改 |
| `update_all()` | 更新全局状态 | ⚠️ 黑盒，禁止修改 |
| `f_add()` | 添加需求 | ✅ 已迁移至 Vue |
| `f_reset()` | 重置状态 | ✅ 已迁移至 Vue |
| `f_ig()` | 排除物品 | ✅ 已迁移至 Vue |
| `f_initIcons()` | 初始化图标 | ✅ 已迁移至 useIconProvider |

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

| 问题 | 严重程度 | 修复方案 |
|------|----------|----------|
| `window.xqs` 格式读取错误 | 高 | App.vue 兼容 `{ item: { name }, number }` 格式 |
| `isLegacyDataLoaded` 检查错误 | 致命 | 检查 `update_all/find/data` 而非 `isDataLoaded` |

**关键发现**：
- `window.xqs` 格式为 `{ item: { name }, number }`，非 `{ name, number }`
- `window.data` (配方数据) 与 `window.game_data` (图标资源) 是两套独立数据
- `window.isDataLoaded` 仅表示图标加载完成，不代表计算引擎就绪

### 1.4 全局变量清单

| 变量名 | 功能 | 迁移状态 |
|--------|------|----------|
| `xqs` | 需求列表 | ✅ → `store.demandList` |
| `ig_names` | 排除列表 | ✅ → `store.excludeList` |
| `xh_list` | 消耗列表 | ⏳ 待封装 |
| `out_list` | 产出列表 | ⏳ 待封装 |
| `items` | 计算结果 | ⏳ 待封装 |
| `settings` | 设备设置 | ✅ → `store.machineSettings` |
| `settings_time` | 速度设置 | ✅ → `bridge.legacyUpdateSpeedSettings` |
| `settingsLocal` | 配方级设置 | ⏳ 待封装 |

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
  name: string    // 物品名称
  n: number       // 数量
}

/**
 * 配方定义 (语义化)
 */
export interface IRecipe {
  id: string                      // 配方唯一标识
  name: string                    // 配方显示名称
  outputs: IRecipeItem[]          // 产物列表 (原 s)
  inputs: IRecipeItem[]           // 原料列表 (原 q)
  time: number                    // 生产时间/秒 (原 t)
  machineType: string             // 设备类型 (原 m)
  group?: string                  // 分组
  noExtra?: boolean | null        // 增产剂效果限制
}

/**
 * 配方索引接口
 */
export interface IRecipeIndex {
  byProduct: Map<string, IRecipe[]>    // 按产物索引
  byInput: Map<string, IRecipe[]>      // 按原料索引
  byId: Map<string, IRecipe>           // 按 ID 索引
}
```

### 2.2 字段映射表

| 简写 | 语义名 | 类型 | 说明 |
|------|--------|------|------|
| `s` | `outputs` | `IRecipeItem[]` | 产物列表 |
| `q` | `inputs` | `IRecipeItem[]` | 原料列表 |
| `t` | `time` | `number` | 生产时间(秒) |
| `m` | `machineType` | `string` | 设备类型 |
| `n` | `amount` | `number` | 数量 |

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
    consumption: { '铁块': 120, '铜块': 60 },
    production: { '电力感应塔': 60 }
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
> 1. 禁止修改 `loadNumber` 函数内部的递归逻辑
> 2. 所有对 `window.data` 的访问必须通过 `RecipeAdapter` 进行
> 3. 新增代码必须包含完整的 TypeScript 类型注解
> 4. 每个公共函数必须包含 JSDoc 注释说明其用途"
