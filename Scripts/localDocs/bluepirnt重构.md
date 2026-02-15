# `blueprint.js` 协议层解耦与重构详细实施方案

> **状态**：✅ 阶段 5B 完成 - 生成器迁移完成
>
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md) | [堆叠流程重构.md](./堆叠流程重构.md)

## 0. 架构师禁令：红线原则

- **严禁重写算法**：禁止尝试用"更优雅"的数学公式重写现有的位运算逻辑。
- **严禁格式化 MD5**：原文件末尾的 MD5 逻辑包含大量"魔数"，严禁对其进行变量重命名或逻辑重构。
- **字节对齐强制要求**：DSP 蓝图协议严格遵守 **小端序 (Little-Endian)**。重构后的读写器必须显式声明处理顺序。
- **二进制兼容性**：生成的蓝图字符串必须与原逻辑完全一致，任何字节差异都可能导致游戏无法识别。

---

## 0.1 重构进度追踪 (2026-02-15 更新)

### ✅ 已完成

| 任务                                                 | 状态 | 优先级     | 说明                                       |
| ---------------------------------------------------- | ---- | ---------- | ------------------------------------------ |
| 数据层解耦 (`src/core/data/*.json`)                  | ✅   | 高         | itemMap, buildingMap, recipeMap 等静态数据 |
| 类型定义 (`src/core/types/blueprint.ts`)             | ✅   | 高         | IBlueprintBuilding, IBlueprintData 等接口  |
| 二进制写入器 (`src/core/utils/BinaryWriter.ts`)      | ✅   | 高         | 小端序写入，Float32 精度保证               |
| 二进制读取器 (`src/core/utils/BinaryReader.ts`)      | ✅   | 高         | 小端序读取，单元测试覆盖                   |
| MD5 工具 (`src/core/utils/md5.ts`)                   | ✅   | 中         | 从 blueprint.js 迁移，单元测试覆盖         |
| 编码器 (`src/core/utils/BlueprintEncoder.ts`)        | ✅   | 高         | 蓝图数据编码，单元测试覆盖                 |
| 解码器 (`src/core/utils/BlueprintDecoder.ts`)        | ✅   | 高         | 蓝图字符串解析，单元测试覆盖               |
| 堆叠类型定义 (`src/core/types/stack.ts`)             | ✅   | 高         | IStackConfig, ICloneFilter, ICloneResult   |
| Index重映射 (`src/core/utils/IndexMapper.ts`)        | ✅   | 高         | buildIndexMap, cloneBuildingWithRemap      |
| 堆叠服务 (`src/core/services/StackService.ts`)       | ✅   | 高         | Phase 1/3/4 完整实现                       |
| 蓝图适配器 (`src/core/adapters/BlueprintAdapter.ts`) | ✅   | 高         | 2026-02-15 适配层迁移完成                  |
| pako统一加载 (`getPakoImpl()`)                       | ✅   | 中         | 解决ESM/CJS模块加载差异                    |
| URI解码容错 (`safeDecodeURIComponent`)               | ✅   | 中         | 处理特殊字符解码异常                       |
| pako API兼容修复                                     | ✅   | 2026-02-14 | 使用inflate/deflate替代ungzip/gzip         |
| Baseline 测试                                        | ✅   | 高         | 359个单元测试全部通过                      |

### ⏳ 进行中

| 任务                  | 状态 | 优先级 | 说明                                   |
| --------------------- | ---- | ------ | -------------------------------------- |
| Blueprint类深度拆分   | ⏳   | 高     | Phase 5C-5G: 按建筑类型/功能点细化拆分 |
| BuildingGenerator细化 | 🔲   | 高     | Phase 5C: 按建筑类型拆分生成器         |
| SorterGenerator细化   | 🔲   | 高     | Phase 5D: 按建筑类型拆分位置计算       |
| ConveyorGenerator细化 | 🔲   | 高     | Phase 5E: 节点/连接/喷涂机分离         |

### 🔲 待开始

| 任务                | 状态 | 优先级 | 说明           |
| ------------------- | ---- | ------ | -------------- |
| 集成测试与验证      | 🔲   | 高     | Phase 5G       |
| ParameterParser迁移 | 🔲   | 低     | 建筑参数解析器 |
| RecipeParser迁移    | 🔲   | 低     | 配方解析器     |
| 删除原 blueprint.js | 🔲   | 低     | 验证完成后移除 |

### 前置依赖

- [x] data.js 核心逻辑解耦完成 (阶段 4B)
- [x] 堆叠模块服务化设计完成 (阶段 5A)

---

## 1. 当前状态分析 (2026-02-15 更新)

### 1.1 文件结构

```text
src/core/
├── legacy/
│   └── blueprint.js           # 蓝图生成逻辑 (3967行) - 待迁移
├── types/
│   ├── blueprint.ts           # ✅ 蓝图类型定义 (93行)
│   ├── stack.ts               # ✅ 堆叠类型定义 (54行)
│   ├── itemMap.ts             # ✅ 物品映射 (28行)
│   └── buildingMap.ts         # ✅ 建筑映射 (52行)
├── data/
│   ├── itemMap.json           # ✅ 物品映射数据
│   ├── buildingMap.json       # ✅ 建筑映射数据
│   ├── recipeMap.json         # ✅ 配方映射数据
│   ├── buildingType.json      # ✅ 建筑类型
│   └── productionCategory.json # ✅ 生产分类
├── utils/
│   ├── BinaryReader.ts        # ✅ 二进制读取器 (82行)
│   ├── BinaryWriter.ts        # ✅ 二进制写入器 (68行)
│   ├── BlueprintDecoder.ts    # ✅ 蓝图解码器 (384行)
│   ├── BlueprintEncoder.ts    # ✅ 蓝图编码器 (414行)
│   ├── IndexMapper.ts         # ✅ 索引重映射 (78行)
│   └── md5.ts                 # ✅ MD5工具 (109行)
├── services/
│   └── StackService.ts        # ✅ 堆叠服务 (217行)
├── adapters/
│   └── BlueprintAdapter.ts    # ✅ 蓝图适配器 (150行) - 2026-02-15新增
└── __tests__/
    ├── blueprint.test.ts      # ✅ 编解码测试 (363行)
    ├── binary.test.ts         # ✅ 二进制测试 (228行)
    ├── md5.test.ts            # ✅ MD5测试 (128行)
    ├── indexMapper.test.ts    # ✅ 索引映射测试 (159行)
    └── stackService.test.ts   # ✅ 堆叠服务测试 (384行)
```

### 1.2 遗留代码分析 (blueprint.js)

| 模块                                              | 行数  | 状态      | 说明                                         |
| ------------------------------------------------- | ----- | --------- | -------------------------------------------- |
| `itemMap`                                         | ~200  | ✅ 已迁移 | → `src/core/data/itemMap.json`               |
| `buildingMap`                                     | ~150  | ✅ 已迁移 | → `src/core/data/buildingMap.json`           |
| `productionCategory`                              | ~10   | ✅ 已迁移 | → `src/core/data/productionCategory.json`    |
| `buildingType`                                    | ~10   | ✅ 已迁移 | → `src/core/data/buildingType.json`          |
| `recipeMap`                                       | ~200  | ✅ 已迁移 | → `src/core/data/recipeMap.json`             |
| `Blueprint` 类                                    | ~1500 | ⏳ 待迁移 | init/generateBuildings/generateConveyorBelts |
| `Blueprint.init()`                                | ~200  | ⏳ 待迁移 | 缩减设备数量                                 |
| `Blueprint.generateBuildings()`                   | ~400  | ⏳ 待迁移 | 生成建筑布局                                 |
| `Blueprint.generateConveyorBelts()`               | ~400  | ⏳ 待迁移 | 生成传送带连接                               |
| `Blueprint.generateConveyorBeltsForSprayCoater()` | ~100  | ⏳ 待迁移 | 喷涂机传送带                                 |
| `Blueprint.cloneToStackLayers()`                  | ~150  | ✅ 已迁移 | → `StackService.cloneToStackLayers`          |
| `Blueprint.toStr()`                               | ~300  | ✅ 已迁移 | → `BlueprintEncoder.encode`                  |
| `Blueprint.parse()`                               | ~300  | ✅ 已迁移 | → `BlueprintDecoder.decode`                  |
| MD5 实现                                          | ~300  | ✅ 已迁移 | → `src/core/utils/md5.ts`                    |
| 二进制读写                                        | ~400  | ✅ 已迁移 | → `BinaryReader/BinaryWriter`                |

**总行数**: 3967行

### 1.3 核心函数清单

| 函数名                              | 功能               | 状态                  |
| ----------------------------------- | ------------------ | --------------------- |
| `Blueprint.parse(str)`              | 解析蓝图字符串     | ✅ → BlueprintDecoder |
| `Blueprint.toStr()`                 | 生成蓝图字符串     | ✅ → BlueprintEncoder |
| `Blueprint.init()`                  | 初始化蓝图布局     | ⏳ 待迁移             |
| `Blueprint.generateBuildings()`     | 生成建筑布局       | ⏳ 待迁移             |
| `Blueprint.generateConveyorBelts()` | 生成传送带         | ⏳ 待迁移             |
| `Blueprint.cloneToStackLayers()`    | 堆叠克隆           | ✅ → StackService     |
| `generateBlueprint()`               | 从计算结果生成蓝图 | ⏳ 待迁移             |
| `md5(string)`                       | MD5 哈希计算       | ✅ → md5.ts           |

### 1.4 依赖关系

```
blueprint.js
    ├── pako.js (Gzip 压缩/解压) ✅ 已封装
    ├── md5() (内置 MD5 实现) ✅ 已迁移
    └── window.data (配方数据) ✅ 已迁移
```

---

## 2. 已完成模块详解

### 2.1 二进制读写器

**文件**: `src/core/utils/BinaryReader.ts` / `BinaryWriter.ts`

```typescript
// BinaryWriter - 小端序写入
export class BinaryWriter {
  writeByte(value: number): void
  writeInt16(value: number): void
  writeInt32(value: number): void
  writeFloat32(value: number): void
  writeString(str: string): void
  getBuffer(): Uint8Array
}

// BinaryReader - 小端序读取
export class BinaryReader {
  readByte(): number
  readInt16(): number
  readInt32(): number
  readFloat32(): number
  readString(length: number): string
}
```

### 2.2 蓝图编解码器

**文件**: `src/core/utils/BlueprintEncoder.ts` / `BlueprintDecoder.ts`

```typescript
// BlueprintEncoder - 编码为蓝图字符串
export function encodeBlueprint(data: IBlueprintData): string {
  // 1. 写入二进制数据
  // 2. 计算 MD5 签名
  // 3. Gzip 压缩
  // 4. Base64 编码
  // 5. 添加 BLUEPRINT: 前缀
}

// BlueprintDecoder - 解析蓝图字符串
export function decodeBlueprint(blueprintStr: string): IBlueprintData {
  // 1. 移除 BLUEPRINT: 前缀
  // 2. Base64 解码
  // 3. Gzip 解压
  // 4. 验证 MD5 签名
  // 5. 解析二进制数据
}
```

### 2.3 堆叠服务

**文件**: `src/core/services/StackService.ts`

```typescript
export class StackService {
  constructor(config: Partial<IStackConfig>)

  // 核心方法
  cloneToStackLayers(buildings: IBlueprintBuilding[], layers: number): ICloneResult
  createFoundationBuildings(zOffset: number, count: number): IBlueprintBuilding[]

  // 辅助方法
  getItemSummary(buildings: IBlueprintBuilding[]): IItemSummary
  getSorterMap(buildings: IBlueprintBuilding[]): ISorterMap
}
```

### 2.4 索引重映射

**文件**: `src/core/utils/IndexMapper.ts`

```typescript
// 构建建筑索引映射
export function buildIndexMap(buildings: IBlueprintBuilding[]): Map<number, number>

// 克隆建筑并重映射索引
export function cloneBuildingWithRemap(
  building: IBlueprintBuilding,
  indexMap: Map<number, number>,
  indexOffset: number,
  zOffset: number
): IBlueprintBuilding
```

---

## 3. 待迁移模块详解

### 3.1 Blueprint 类核心方法

#### 3.1.1 `init()` - 初始化蓝图布局

```javascript
// blueprint.js:2048
init() {
  // 1. 遍历 recipe.subRecipes
  // 2. 调用 mapRecipeID() 映射配方ID
  // 3. 计算建筑数量
  // 4. 初始化布局参数
}
```

**迁移目标**: `BuildingGenerator.initLayout()`

#### 3.1.2 `generateBuildings()` - 生成建筑布局

```javascript
// blueprint.js:2662
generateBuildings() {
  // 1. 遍历 subRecipes
  // 2. 根据建筑类型生成对应建筑
  // 3. 设置坐标、配方ID、参数
  // 4. 添加到 buildings 数组
}
```

**迁移目标**: `BuildingGenerator.generate()`

#### 3.1.3 `generateConveyorBelts()` - 生成传送带连接

```javascript
// blueprint.js:2252
generateConveyorBelts() {
  // 1. 分析建筑间的物料流向
  // 2. 生成传送带连接
  // 3. 生成分拣器连接
  // 4. 设置输入输出索引
}
```

**迁移目标**: `ConveyorGenerator.generate()`

### 3.2 迁移目标结构

```
src/core/blueprint/
├── generators/
│   ├── BuildingGenerator.ts    # ⏳ 待实现
│   ├── ConveyorGenerator.ts    # ⏳ 待实现
│   └── index.ts
├── services/
│   ├── BlueprintService.ts     # ⏳ 待实现
│   └── index.ts
└── index.ts
```

---

## 4. 接口设计

### 4.1 BuildingGenerator

```typescript
// src/core/blueprint/generators/BuildingGenerator.ts

export interface IBuildingGeneratorConfig {
  conveyorBeltStackLayer: number
  onlyConveyorBeltMk3: boolean
  onlySorterMk3: boolean
  useSorterMk4: boolean
  selfSpray: boolean
  generateTeslaTower: boolean
  teslaTowerInterval: number
  teslaTowerLineInterval: number
}

export class BuildingGenerator {
  private buildings: IBlueprintBuilding[] = []
  private config: IBuildingGeneratorConfig
  private indexCounter: number = 0

  constructor(config: IBuildingGeneratorConfig)

  initLayout(recipes: ISubRecipe[]): void
  generateFromRecipe(recipe: ISubRecipe, position: ICoordinate): IBlueprintBuilding[]
  generateAssemblingMachine(recipe: ISubRecipe, pos: ICoordinate): IBlueprintBuilding
  generateSmelter(recipe: ISubRecipe, pos: ICoordinate): IBlueprintBuilding
  generateLab(recipe: ISubRecipe, pos: ICoordinate): IBlueprintBuilding
  generateMiningMachine(recipe: ISubRecipe, pos: ICoordinate): IBlueprintBuilding
  generateRefinery(recipe: ISubRecipe, pos: ICoordinate): IBlueprintBuilding

  getBuildings(): IBlueprintBuilding[]
  getNextIndex(): number
  reset(): void
}
```

### 4.2 ConveyorGenerator

```typescript
// src/core/blueprint/generators/ConveyorGenerator.ts

export interface IConveyorGeneratorConfig {
  transportSpeed: number
  stackLayer: number
  maxSorterNumOneBelt: number
  onlyConveyorBeltMk3: boolean
}

export class ConveyorGenerator {
  private buildings: IBlueprintBuilding[] = []
  private config: IConveyorGeneratorConfig

  constructor(config: IConveyorGeneratorConfig)

  generateBelt(segment: IBeltSegment): IBlueprintBuilding[]
  connectBuildings(source: IBlueprintBuilding, target: IBlueprintBuilding): void
  optimizeLayout(): void

  getBuildings(): IBlueprintBuilding[]
  reset(): void
}
```

### 4.3 BlueprintService

```typescript
// src/core/blueprint/services/BlueprintService.ts

export interface IBlueprintGenerateOptions {
  title: string
  icons: number[]
  description?: string
  stackConfig?: IStackConfig
}

export class BlueprintService {
  private buildingGenerator: BuildingGenerator
  private conveyorGenerator: ConveyorGenerator
  private stackService: StackService

  constructor()

  generate(recipes: ISubRecipe[], options: IBlueprintGenerateOptions): string
  parse(blueprintStr: string): IBlueprintData
  validate(blueprintStr: string): boolean

  private initFromRecipes(recipes: ISubRecipe[]): void
  private generateBuildings(): void
  private generateConveyors(): void
  private applyStacking(config: IStackConfig): void
  private encode(): string
}
```

---

## 5. 重构执行流程图

```
┌─────────────────────────────────────────────────────────────┐
│                  blueprint.js 重构路线图                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 1      │    │ 阶段 2      │    │ 阶段 3      │     │
│  │ 类型定义    │───▶│ 依赖提取    │───▶│ 编解码封装  │     │
│  │ types.ts    │    │ md5.ts      │    │ Encoder/Dec │     │
│  │ ✅ 已完成   │    │ ✅ 已完成   │    │ ✅ 已完成   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 4      │    │ 阶段 5      │    │ 阶段 6      │     │
│  │ 堆叠服务    │───▶│ 生成器迁移  │───▶│ 完全解耦    │     │
│  │ StackService│    │ BuildingGen │    │ 独立模块    │     │
│  │ ✅ 已完成   │    │ ⏳ 进行中   │    │ 🔲 待开始   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 风险预警

### 6.1 Pako 兼容性

```typescript
// ✅ 正确的 ESM 引入方式 (已在 Encoder/Decoder 中实现)
function getPakoImpl(): PakoModule {
  const pakoModule = (pako as unknown as { default?: PakoModule }).default || pako
  return {
    ...pakoModule,
    gzip: pakoModule.deflate, // 兼容性封装
    ungzip: pakoModule.inflate // 兼容性封装
  } as PakoModule
}
```

### 6.2 浮点数精度

蓝图中的坐标 (X, Y, Z) 是 `Float32`。在 JS 中处理时要小心 64 位浮点数转换导致的微小误差：

```typescript
// ⚠️ 潜在问题
const x = 123.45678901234567 // JS 64位浮点
buffer.writeFloat32(x) // 截断为 32位
const read = buffer.readFloat32() // 123.456787109375 (精度损失)

// ✅ 正确做法
const tolerance = 0.0001
if (Math.abs(read - expected) > tolerance) {
  console.warn('Float32 precision loss detected')
}
```

### 6.3 性能瓶颈

大型蓝图 (几千个建筑) 的生成过程非常耗时：

```typescript
// ⚠️ 阻塞主线程
const blueprint = generateBlueprint(largeData) // 可能 > 100ms

// ✅ 推荐方案：Web Worker (待实现)
const worker = new Worker('blueprint-worker.js')
worker.postMessage({ type: 'generate', data: largeData })
worker.onmessage = e => {
  if (e.data.type === 'generated') {
    console.log('Blueprint:', e.data.result)
  }
}
```

---

## 7. 测试策略

```typescript
// src/core/__tests__/blueprint.test.ts

describe('Blueprint Module', () => {
  describe('BlueprintEncoder', () => {
    it('should encode blueprint data correctly')
    it('should handle empty buildings')
    it('should handle large blueprints')
  })

  describe('BlueprintDecoder', () => {
    it('should decode blueprint string correctly')
    it('should handle invalid input')
    it('should validate MD5 signature')
  })

  describe('Round-trip', () => {
    it('should parse and encode identically')
    it('should preserve all building properties')
    it('should preserve coordinates precision')
  })

  describe('StackService', () => {
    it('should clone buildings to multiple layers')
    it('should remap indices correctly')
    it('should create foundation buildings')
  })
})
```

---

## 8. 预估工作量

| 阶段                | 预估时间 | 状态      |
| ------------------- | -------- | --------- |
| Phase 1-3: 协议层   | 3天      | ✅ 已完成 |
| Phase 4: 堆叠服务   | 1天      | ✅ 已完成 |
| Phase 5: 生成器迁移 | 3天      | ⏳ 进行中 |
| Phase 6: 测试与清理 | 2天      | 🔲 待开始 |
| **总计**            | **9天**  | **56%**   |

---

## 9. 协作 AI 模型指令

> "你现在的任务是协助进行 `blueprint.js` 的协议层解耦重构。请遵循以下规则：
>
> 1. 禁止修改 MD5 函数中的任何位运算魔数
> 2. 所有二进制读写必须使用 `BinaryReader/BinaryWriter` 类
> 3. 严格遵守小端序 (Little-Endian)
> 4. 每次修改后必须运行 Baseline 测试确保二进制兼容性
> 5. 新增代码必须包含完整的 TypeScript 类型注解"

---

## 10. 阶段 5B 详细任务拆分 (2026-02-15)

> **状态**: 🟡 进行中 (核心实现完成，测试待补充)

### 10.1 任务总览

```
┌─────────────────────────────────────────────────────────────────┐
│                阶段 5B: 生成器迁移任务拆分                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5B-1: BuildingGenerator 服务                                   │
│  ├── 5B-1.1: 类型定义与接口设计                                 │
│  ├── 5B-1.2: 建筑模板生成器                                     │
│  ├── 5B-1.3: 布局计算器                                         │
│  ├── 5B-1.4: 分拣器生成器                                       │
│  └── 5B-1.5: 单元测试                                           │
│                                                                 │
│  5B-2: ConveyorGenerator 服务                                   │
│  ├── 5B-2.1: 物料统计计算器                                     │
│  ├── 5B-2.2: 传送带节点生成器                                   │
│  ├── 5B-2.3: 连接关系建立器                                     │
│  └── 5B-2.4: 单元测试                                           │
│                                                                 │
│  5B-3: BlueprintService 整合                                    │
│  ├── 5B-3.1: 服务接口设计                                       │
│  ├── 5B-3.2: 流程编排实现                                       │
│  ├── 5B-3.3: 适配层迁移                                         │
│  └── 5B-3.4: 集成测试                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 BuildingGenerator 任务详情

#### 10.2.1 类型定义与接口设计 (预估: 2h) ✅ 已完成

**目标文件**: `src/core/blueprint/types/buildingGenerator.ts`

**任务清单**:

- [x] 定义 `IBuildingGeneratorConfig` 配置接口
- [x] 定义 `IBuildingLayout` 布局信息接口
- [x] 定义 `ISorterInfo` 分拣器信息接口
- [x] 定义 `IBuildingGenerateResult` 生成结果接口

---

## 11. Blueprint类深度拆分分析 (2026-02-16)

> **背景**: 现有 `blueprint.js` (3967行) 职责过重，已迁移模块仍需进一步细化

### 11.1 职责矩阵分析

| 模块名称                        | 原始行数 | 当前状态  | 拆分目标                   |
| ------------------------------- | -------- | --------- | -------------------------- |
| itemMap/buildingMap/recipeMap   | ~600     | ✅ 已迁移 | JSON数据文件               |
| Blueprint模板初始化             | ~100     | ⏳ 待迁移 | BlueprintTemplateService   |
| mapRecipeID()                   | ~50      | ⏳ 待迁移 | RecipeMapper               |
| 建筑生成(newProductionBuilding) | ~500     | ⏳ 待迁移 | BuildingGenerator          |
| 建筑面积计算                    | ~100     | ⏳ 待迁移 | LayoutCalculator           |
| 分拣器位置计算                  | ~400     | ⏳ 待迁移 | SorterPositionCalculator   |
| 分拣器生成                      | ~200     | ⏳ 待迁移 | SorterGenerator            |
| 传送带节点生成                  | ~200     | ⏳ 待迁移 | ConveyorNodeBuilder        |
| 传送带连接生成                  | ~400     | ⏳ 待迁移 | ConveyorConnectionBuilder  |
| 喷涂机传送带                    | ~200     | ⏳ 待迁移 | SprayCoaterConveyorBuilder |
| 物料统计计算                    | ~200     | ⏳ 待迁移 | ItemSummaryCalculator      |
| 堆叠克隆                        | ~200     | ✅ 已迁移 | StackService               |
| 编解码(toStr/parse)             | ~800     | ✅ 已迁移 | Encoder/Decoder            |

### 11.2 核心流程拆分

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Blueprint生成流程拆分图                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ RecipeInput     │                                                        │
│  │ (配方输入)       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ RecipeMapper    │────▶│ LayoutCalculator│                               │
│  │ 配方ID映射       │     │ 布局面积计算     │                               │
│  │ mapRecipeID()   │     │ calculateArea() │                               │
│  └────────┬────────┘     └────────┬────────┘                               │
│           │                       │                                         │
│           └───────────┬───────────┘                                         │
│                       ▼                                                     │
│           ┌─────────────────────┐                                           │
│           │ BuildingGenerator   │                                           │
│           │ 建筑生成核心         │                                           │
│           │ newProductionBuilding│                                          │
│           └──────────┬──────────┘                                           │
│                      │                                                      │
│          ┌───────────┼───────────┐                                          │
│          ▼           ▼           ▼                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                               │
│  │SmelterGen  │ │AssemblerGen│ │LabGen      │                               │
│  │熔炉生成器   │ │制造台生成器 │ │研究站生成器 │                               │
│  └────────────┘ └────────────┘ └────────────┘                               │
│          │           │           │                                          │
│          └───────────┼───────────┘                                          │
│                      ▼                                                      │
│           ┌─────────────────────┐                                           │
│           │ SorterGenerator     │                                           │
│           │ 分拣器生成           │                                           │
│           │ calculateOffset+Yaw │                                           │
│           └──────────┬──────────┘                                           │
│                      │                                                      │
│                      ▼                                                      │
│           ┌─────────────────────┐                                           │
│           │ ItemSummaryCalculator│                                          │
│           │ 物料统计计算         │                                           │
│           │ sortItemSummary     │                                           │
│           └──────────┬──────────┘                                           │
│                      │                                                      │
│                      ▼                                                      │
│           ┌─────────────────────┐                                           │
│           │ ConveyorGenerator   │                                           │
│           │ 传送带生成核心       │                                           │
│           │ generateConveyorBelts│                                          │
│           └──────────┬──────────┘                                           │
│                      │                                                      │
│          ┌───────────┼───────────┐                                          │
│          ▼           ▼           ▼                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                               │
│  │NodeBuilder │ │Connection  │ │SprayCoater │                               │
│  │节点生成器   │ │Builder     │ │Conveyor    │                               │
│  │            │ │连接建立器   │ │喷涂机传送带 │                               │
│  └────────────┘ └────────────┘ └────────────┘                               │
│                      │                                                      │
│                      ▼                                                      │
│           ┌─────────────────────┐                                           │
│           │ BlueprintEncoder    │                                           │
│           │ 蓝图编码输出         │                                           │
│           │ toStr()             │                                           │
│           └─────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 详细拆分任务清单

#### 11.3.1 Phase 5C: BuildingGenerator细化 (预估: 4h)

**当前状态**: BuildingGenerator.ts (106行) - 职责过重

**拆分目标**:

```
src/core/blueprint/generators/
├── BuildingGenerator.ts      # 主入口，编排子生成器
├── buildings/
│   ├── SmelterGenerator.ts   # 熔炉生成器 (arcSmelter, planeSmelter, 负熵熔炉)
│   ├── AssemblerGenerator.ts # 制造台生成器 (Mk1/2/3, 重组式)
│   ├── LabGenerator.ts       # 研究站生成器 (lab, 自演化研究站) - 含堆叠逻辑
│   ├── PlantGenerator.ts     # 化工厂生成器 (chemicalPlant, 量子化工厂)
│   ├── RefineryGenerator.ts  # 精炼厂生成器 (oilRefinery)
│   ├── ColliderGenerator.ts  # 对撞机生成器 (微型粒子对撞机)
│   └── index.ts
├── LayoutCalculator.ts       # 布局计算器 (calculateBuildingArea)
├── TeslaTowerGenerator.ts    # 电力感应塔生成器
└── index.ts
```

**关键代码映射**:

| 原函数                                     | 目标模块               | 行数   |
| ------------------------------------------ | ---------------------- | ------ |
| `calculateBuildingArea()`                  | LayoutCalculator.ts    | ~100行 |
| `calculateTeslaTowerOffset()`              | TeslaTowerGenerator.ts | ~50行  |
| `newProductionBuilding()` - smelter分支    | SmelterGenerator.ts    | ~80行  |
| `newProductionBuilding()` - assembling分支 | AssemblerGenerator.ts  | ~80行  |
| `newProductionBuilding()` - lab分支        | LabGenerator.ts        | ~150行 |
| `newProductionBuilding()` - plant分支      | PlantGenerator.ts      | ~80行  |
| `newProductionBuilding()` - refinery分支   | RefineryGenerator.ts   | ~80行  |
| `newProductionBuilding()` - collider分支   | ColliderGenerator.ts   | ~100行 |

#### 11.3.2 Phase 5D: SorterGenerator细化 (预估: 3h)

**当前状态**: SorterGenerator.ts (387行) - 位置计算逻辑复杂

**拆分目标**:

```
src/core/blueprint/generators/
├── SorterGenerator.ts           # 主入口，编排位置计算
├── sorters/
│   ├── SorterPositionCalculator.ts  # 分拣器位置计算核心
│   ├── SmelterSorterPositions.ts    # 熔炉分拣器位置 (slot 3-8)
│   ├── AssemblerSorterPositions.ts  # 制造台分拣器位置 (slot 3-8)
│   ├── LabSorterPositions.ts        # 研究站分拣器位置 (slot 3-11)
│   ├── PlantSorterPositions.ts      # 化工厂分拣器位置 (slot 0-6)
│   ├── RefinerySorterPositions.ts   # 精炼厂分拣器位置 (slot 0-8)
│   ├── ColliderSorterPositions.ts   # 对撞机分拣器位置 (slot 0-8)
│   └── index.ts
└── index.ts
```

**关键代码映射**:

| 原函数                                                | 目标模块                    | 行数  |
| ----------------------------------------------------- | --------------------------- | ----- |
| `calculateSorterLocalOffsetAndYaw()` - smelter分支    | SmelterSorterPositions.ts   | ~60行 |
| `calculateSorterLocalOffsetAndYaw()` - assembling分支 | AssemblerSorterPositions.ts | ~60行 |
| `calculateSorterLocalOffsetAndYaw()` - lab分支        | LabSorterPositions.ts       | ~80行 |
| `calculateSorterLocalOffsetAndYaw()` - plant分支      | PlantSorterPositions.ts     | ~70行 |
| `calculateSorterLocalOffsetAndYaw()` - refinery分支   | RefinerySorterPositions.ts  | ~80行 |
| `calculateSorterLocalOffsetAndYaw()` - collider分支   | ColliderSorterPositions.ts  | ~80行 |

#### 11.3.3 Phase 5E: ConveyorGenerator细化 (预估: 3h)

**当前状态**: ConveyorGenerator.ts (198行) - 连接逻辑复杂

**拆分目标**:

```
src/core/blueprint/generators/
├── ConveyorGenerator.ts          # 主入口，编排传送带生成
├── conveyors/
│   ├── ConveyorNodeBuilder.ts    # 传送带节点构建 (newConveyorNode)
│   ├── ConveyorConnectionBuilder.ts # 连接关系建立 (outputObjIdx/inputObjIdx)
│   ├── SprayCoaterConveyorBuilder.ts # 喷涂机传送带 (generateConveyorBeltsForSprayCoater)
│   └── index.ts
└── index.ts
```

**关键代码映射**:

| 原函数                                  | 目标模块                      | 行数   |
| --------------------------------------- | ----------------------------- | ------ |
| `newConveyorNode()`                     | ConveyorNodeBuilder.ts        | ~30行  |
| `newConveyor()`                         | ConveyorGenerator.ts          | ~150行 |
| `generateConveyorBelts()`               | ConveyorGenerator.ts          | ~400行 |
| `generateConveyorBeltsForSprayCoater()` | SprayCoaterConveyorBuilder.ts | ~200行 |

#### 11.3.4 Phase 5F: ItemSummaryCalculator独立 (预估: 1h)

**当前状态**: ItemSummaryCalculator.ts (157行) - 已实现

**优化目标**:

```
src/core/blueprint/services/
├── ItemSummaryCalculator.ts  # 物料统计计算
│   ├── calculateSummary()    # 主计算逻辑
│   ├── sortItemSummary()     # 排序逻辑
│   └── applyStackMultiplier() # 堆叠倍率
└── index.ts
```

### 11.4 拆分优先级与依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                    拆分依赖关系图                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 5C (BuildingGenerator)                                   │
│  ├── 依赖: LayoutCalculator                                     │
│  ├── 依赖: buildingMap.json                                     │
│  └── 产出: IBlueprintBuilding[]                                 │
│           │                                                     │
│           ▼                                                     │
│  Phase 5D (SorterGenerator)                                     │
│  ├── 依赖: Phase 5C 产出                                        │
│  ├── 依赖: SorterPositionCalculator                             │
│  └── 产出: IBlueprintBuilding[] (含分拣器)                      │
│           │                                                     │
│           ▼                                                     │
│  Phase 5F (ItemSummaryCalculator)                               │
│  ├── 依赖: Phase 5D 产出                                        │
│  └── 产出: IItemSummary                                         │
│           │                                                     │
│           ▼                                                     │
│  Phase 5E (ConveyorGenerator)                                   │
│  ├── 依赖: Phase 5D 产出                                        │
│  ├── 依赖: Phase 5F 产出                                        │
│  └── 产出: IBlueprintBuilding[] (含传送带)                      │
│           │                                                     │
│           ▼                                                     │
│  BlueprintService                                               │
│  └── 整合所有Phase产出，生成最终蓝图                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.5 测试覆盖要求

| 模块                       | 测试文件                           | 最少用例数  |
| -------------------------- | ---------------------------------- | ----------- |
| LayoutCalculator           | layoutCalculator.test.ts           | 20          |
| SmelterGenerator           | smelterGenerator.test.ts           | 15          |
| AssemblerGenerator         | assemblerGenerator.test.ts         | 15          |
| LabGenerator               | labGenerator.test.ts               | 20 (含堆叠) |
| PlantGenerator             | plantGenerator.test.ts             | 10          |
| RefineryGenerator          | refineryGenerator.test.ts          | 10          |
| ColliderGenerator          | colliderGenerator.test.ts          | 10          |
| SorterPositionCalculator   | sorterPositionCalculator.test.ts   | 30          |
| ConveyorNodeBuilder        | conveyorNodeBuilder.test.ts        | 15          |
| SprayCoaterConveyorBuilder | sprayCoaterConveyorBuilder.test.ts | 15          |

### 11.6 迁移风险评估

| 风险项         | 影响 | 缓解措施                    |
| -------------- | ---- | --------------------------- |
| 坐标精度丢失   | 高   | Float32精度测试，容差0.0001 |
| 建筑索引错位   | 高   | IndexMapper单元测试覆盖     |
| 分拣器槽位错误 | 中   | 每种建筑类型独立测试        |
| 传送带连接断裂 | 高   | 连接完整性验证测试          |
| 堆叠层数计算   | 中   | Lab堆叠专项测试             |

### 11.7 预估工作量汇总

| Phase    | 任务                      | 预估时间 | 状态      |
| -------- | ------------------------- | -------- | --------- |
| 5C       | BuildingGenerator细化     | 4h       | 🔲 待开始 |
| 5D       | SorterGenerator细化       | 3h       | 🔲 待开始 |
| 5E       | ConveyorGenerator细化     | 3h       | 🔲 待开始 |
| 5F       | ItemSummaryCalculator独立 | 1h       | ✅ 已完成 |
| 5G       | 集成测试与验证            | 2h       | 🔲 待开始 |
| **总计** |                           | **13h**  | **8%**    |

interface ISorterInfo {
index: number
rate: number
ownerObjIdx: number
ownerName: string
ownerOffset: ICoordinate
recipeID: number
}

````

#### 10.2.2 建筑模板生成器 (预估: 3h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/BuildingGenerator.ts`

**迁移源**: `blueprint.js:730-758` (`getBuildingTemplate`)

**任务清单**:

- [x] 实现 `getBuildingTemplate()` 方法
- [x] 实现 `newProductionBuilding()` 核心逻辑
- [x] 处理不同建筑类型的生成:
  - [x] 制造台 (assembling)
  - [x] 熔炉 (smelter)
  - [x] 研究站 (lab) - 含堆叠逻辑
  - [x] 精炼厂 (refinery)
  - [x] 化工厂 (plant)
  - [x] 对撞机 (collider)
  - [x] 采矿机 (mining)

**关键逻辑**:

```typescript
// 研究站堆叠处理 (blueprint.js:1619-1650)
if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
  // 堆叠处理研究站
  newBuilding.outputToSlot = 14
  newBuilding.inputFromSlot = 15
  newBuilding.outputFromSlot = 15
  newBuilding.inputToSlot = 14
  newBuilding.parameters.researchMode = 1
  // ... 堆叠层数循环
}
````

#### 10.2.3 布局计算器 (预估: 2h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/LayoutCalculator.ts`

**迁移源**:

- `blueprint.js:1034-1080` (`calculateBlueprintArea`)
- `blueprint.js:900-1030` (`calculateBuildingArea`)

**任务清单**:

- [x] 实现 `calculateBlueprintArea()` 方法
- [x] 实现 `calculateBuildingArea()` 方法
- [x] 实现占用区域跟踪 (`occupiedArea`)
- [x] 实现新行/当前行判断逻辑

**关键逻辑**:

```typescript
// 布局判断 (blueprint.js:1556-1580)
if (this.blueprintSize.x - this.occupiedArea[...].x2 >= buildingArea.x / 2) {
  // 在当前行继续添加
  buildingX = this.occupiedArea[...].x2 + 1 + buildingArea.centerPoint[3]
  buildingY = this.occupiedArea[...].y2 + 1 + buildingArea.centerPoint[0]
} else {
  // 新的一行
  needNewLine = true
  // ... 新行布局计算
}
```

#### 10.2.4 分拣器生成器 (预估: 3h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/SorterGenerator.ts`

**迁移源**: `blueprint.js:1082-1480` (`calculateSorterLocalOffsetAndYaw`)

**任务清单**:

- [x] 实现 `calculateSorterLocalOffsetAndYaw()` 方法
- [x] 处理不同建筑类型的分拣器位置:
  - [x] 制造台/熔炉 (slot 3-8)
  - [x] 化工厂 (slot 0-6)
  - [x] 精炼厂 (slot 0-8)
  - [x] 对撞机 (slot 0-8)
  - [x] 研究站 (slot 3-11)
- [x] 实现分拣器朝向计算 (yaw)
- [x] 实现旋转逻辑 (rotate)

**关键逻辑**:

```typescript
// 分拣器类型选择 (blueprint.js:1708-1712)
let sorter = buildingMap.sorterMk1
if (this.config.useSorterMk4 || this.config.onlySorterMk3 || actual_rate > sorter.sortingSpeed) {
  sorter = this.config.useSorterMk4 ? buildingMap.sorterMk4 : buildingMap.sorterMk3
}
```

#### 10.2.5 单元测试 (预估: 2h)

**目标文件**: `src/core/__tests__/buildingGenerator.test.ts`

**测试用例**:

- [ ] 制造台生成测试
- [ ] 熔炉生成测试
- [ ] 研究站堆叠测试
- [ ] 分拣器生成测试
- [ ] 电力感应塔生成测试
- [ ] 布局计算测试

---

### 10.3 ConveyorGenerator 任务详情

#### 10.3.1 物料统计计算器 (预估: 2h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/ItemSummaryCalculator.ts`

**迁移源**: `blueprint.js:2252-2358` (`generateConveyorBelts` 前半部分)

**任务清单**:

- [x] 实现 `calculate()` 方法
- [x] 计算每个物料的产出速率
- [x] 计算 fromBuildingNum / toBuildingNum
- [x] 处理增产剂影响 (extra_rate)
- [x] 实现 `sortItemSummary()` 排序逻辑

**关键逻辑**:

```typescript
// 物料统计 (blueprint.js:2264-2290)
for (let outputItem of subRecipe.output) {
  let outputRate = outputItem.rate * productionSpeed * building.num * extra_rate
  itemSummary[outputItem.name] = {
    rate: outputRate,
    fromBuildingNum: fromBuildingNum,
    toBuildingNum: 0
  }
}
```

#### 10.3.2 传送带节点生成器 (预估: 3h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/ConveyorGenerator.ts`

**迁移源**: `blueprint.js:760-800` (`newConveyorNode`)

**任务清单**:

- [x] 实现 `newConveyorNode()` 方法
- [x] 实现传送带类型选择逻辑
- [x] 实现节点坐标计算
- [x] 实现参数设置 (iconId, count)

**关键逻辑**:

```typescript
// 传送带类型选择 (blueprint.js:2385-2395)
let conveyorBelt = buildingMap.conveyorBeltMk1
if (this.config.onlyConveyorBeltMk3) {
  conveyorBelt = buildingMap.conveyorBeltMK3
} else if (item.rate >= conveyorBelt.transportSpeed) {
  conveyorBelt = buildingMap.conveyorBeltMK3
}
```

#### 10.3.3 连接关系建立器 (预估: 4h) ✅ 已完成

**目标文件**: `src/core/blueprint/generators/ConnectionBuilder.ts`

**迁移源**: `blueprint.js:2400-2660` (连接逻辑)

**任务清单**:

- [x] 实现分拣器与传送带节点连接
- [x] 实现输入/输出数据结构
- [x] 处理原料传送带 (direction = -1)
- [x] 处理终产物传送带 (direction = 1)
- [x] 处理中间产物传送带
- [x] 实现堆叠模式下的传送带吞吐量放大

**关键逻辑**:

```typescript
// 堆叠模式处理 (blueprint.js:2360-2380)
const stackLayers = this.config.stackLayers || 1
if (stackLayers > 1) {
  for (let key in itemSummary) {
    itemSummary[key].rate *= stackLayers
  }
}
```

#### 10.3.4 单元测试 (预估: 2h)

**目标文件**: `src/core/__tests__/conveyorGenerator.test.ts`

**测试用例**:

- [ ] 物料统计计算测试
- [ ] 传送带节点生成测试
- [ ] 连接关系建立测试
- [ ] 堆叠模式测试
- [ ] 喷涂机传送带测试

---

### 10.4 BlueprintService 任务详情

#### 10.4.1 服务接口设计 (预估: 1h) ✅ 已完成

**目标文件**: `src/core/blueprint/services/BlueprintService.ts`

**任务清单**:

- [x] 定义 `IBlueprintServiceConfig` 接口
- [x] 定义 `IBlueprintGenerateOptions` 选项接口
- [x] 定义 `IBlueprintData` 返回类型

#### 10.4.2 流程编排实现 (预估: 3h) ✅ 已完成

**任务清单**:

- [x] 实现 `generate()` 主流程
- [x] 整合 init() 逻辑
- [x] 整合 generateBuildings() 逻辑
- [x] 整合 generateConveyorBelts() 逻辑
- [x] 整合 generateConveyorBeltsForSprayCoater() 逻辑
- [x] 调用 StackService 进行堆叠

**流程图**:

```
generate(recipes, options)
    │
    ├── 1. initLayout()
    │   ├── mapRecipeID()
    │   └── calculateBlueprintArea()
    │
    ├── 2. generateBuildings()
    │   ├── newProductionBuilding() × N
    │   └── 生成 sorters 映射
    │
    ├── 3. generateConveyors()
    │   ├── calculateItemSummary()
    │   ├── sortItemSummary()
    │   └── 连接分拣器与传送带
    │
    ├── 4. generateSprayCoaterConveyors()
    │   └── 自喷涂结构
    │
    ├── 5. applyStacking()
    │   └── StackService.cloneToStackLayers()
    │
    └── 6. encode()
        └── BlueprintEncoder.encode()
```

#### 10.4.3 适配层迁移 (预估: 2h) ✅ 已完成

**目标文件**: `src/core/adapters/BlueprintAdapter.ts`

**任务清单**:

- [x] 创建 `BlueprintAdapter.ts` 适配器
- [x] 实现 `generateBlueprintWithNewService()` 方法
- [x] 实现 `isBlueprintServiceAvailable()` 检查
- [x] 更新 `bridge.ts` 添加 `generateBlueprintWithAdapter()`
- [x] 更新 `BlueprintGenerator.vue` 调用新适配器
- [x] 保持向后兼容性 (失败时回退到遗留代码)

#### 10.4.4 集成测试 (预估: 2h) ✅ 已完成

**目标文件**: `src/core/blueprint/__tests__/`

**任务清单**:

- [x] BuildingGenerator 单元测试 (37个测试)
- [x] ConveyorGenerator 单元测试 (33个测试)
- [x] BlueprintService 集成测试 (21个测试)
- [x] 全部测试通过 (450个测试)

**测试覆盖**:

```
 Test Files  18 passed (18)
      Tests  450 passed (450)
   Duration  2.55s
```

---

## 11. 阶段 5B 完成总结 (2026-02-15)

### 11.1 已完成任务

| 任务                               | 状态 | 测试数 |
| ---------------------------------- | ---- | ------ |
| 5B-1.1: 类型定义与接口设计         | ✅   | -      |
| 5B-1.2: 建筑模板生成器             | ✅   | -      |
| 5B-1.3: 布局计算器                 | ✅   | 13     |
| 5B-1.4: 分拣器生成器               | ✅   | 15     |
| 5B-1.5: BuildingGenerator 单元测试 | ✅   | 37     |
| 5B-2.1: 物料统计计算器             | ✅   | 14     |
| 5B-2.2: 传送带节点生成器           | ✅   | 19     |
| 5B-2.3: 连接关系建立器             | ✅   | 9      |
| 5B-2.4: ConveyorGenerator 单元测试 | ✅   | 33     |
| 5B-3.1: BlueprintService 接口设计  | ✅   | -      |
| 5B-3.2: 流程编排实现               | ✅   | -      |
| 5B-3.3: 适配层迁移                 | ✅   | -      |
| 5B-3.4: 集成测试                   | ✅   | 21     |

### 11.2 新增文件

| 文件                                                     | 行数 | 说明           |
| -------------------------------------------------------- | ---- | -------------- |
| `src/core/blueprint/generators/BuildingGenerator.ts`     | 124  | 建筑生成器     |
| `src/core/blueprint/generators/LayoutCalculator.ts`      | 135  | 布局计算器     |
| `src/core/blueprint/generators/SorterGenerator.ts`       | 397  | 分拣器生成器   |
| `src/core/blueprint/generators/ConveyorGenerator.ts`     | 230  | 传送带生成器   |
| `src/core/blueprint/generators/ItemSummaryCalculator.ts` | 181  | 物料统计计算器 |
| `src/core/blueprint/generators/ConnectionBuilder.ts`     | 169  | 连接建立器     |
| `src/core/blueprint/services/BlueprintService.ts`        | 271  | 蓝图服务       |
| `src/core/blueprint/types/buildingGenerator.ts`          | ~100 | 类型定义       |
| `src/core/blueprint/types/conveyorGenerator.ts`          | 85   | 类型定义       |
| `src/core/adapters/BlueprintAdapter.ts`                  | 150  | 蓝图适配器     |
| `src/core/blueprint/__tests__/buildingGenerator.test.ts` | ~350 | 单元测试       |
| `src/core/blueprint/__tests__/conveyorGenerator.test.ts` | ~300 | 单元测试       |
| `src/core/blueprint/__tests__/blueprintService.test.ts`  | ~280 | 集成测试       |

### 11.3 架构改进

1. **服务化架构**: 将蓝图生成逻辑拆分为独立服务
2. **适配层模式**: 通过 BlueprintAdapter 实现新旧代码兼容
3. **向后兼容**: 失败时自动回退到遗留代码
4. **完整测试覆盖**: 450个测试全部通过

---

### 10.5 风险与依赖

#### 10.5.1 技术风险

| 风险项                           | 影响 | 缓解措施                 |
| -------------------------------- | ---- | ------------------------ |
| `generateConveyorBelts` 逻辑复杂 | 高   | 分步迁移，保留原代码注释 |
| 堆叠模式计算精度                 | 中   | 单元测试覆盖边界情况     |
| 分拣器坐标计算                   | 中   | 提取为独立函数，便于测试 |
| 喷涂机传送带布局                 | 低   | 最后迁移，依赖主流程完成 |

#### 10.5.2 依赖关系

```
BuildingGenerator
    ├── buildingMap.json ✅
    ├── itemMap.json ✅
    └── productionCategory.json ✅

ConveyorGenerator
    ├── BuildingGenerator.sorters
    ├── buildingMap.json ✅
    └── itemMap.json ✅

BlueprintService
    ├── BuildingGenerator
    ├── ConveyorGenerator
    ├── StackService ✅
    ├── BlueprintEncoder ✅
    └── BlueprintDecoder ✅
```

---

### 10.6 工时估算

| 任务              | 预估工时 | 优先级 |
| ----------------- | -------- | ------ |
| 5B-1.1 类型定义   | 2h       | P0     |
| 5B-1.2 建筑模板   | 3h       | P0     |
| 5B-1.3 布局计算   | 2h       | P0     |
| 5B-1.4 分拣器生成 | 3h       | P0     |
| 5B-1.5 单元测试   | 2h       | P1     |
| 5B-2.1 物料统计   | 2h       | P0     |
| 5B-2.2 传送带节点 | 3h       | P0     |
| 5B-2.3 连接关系   | 4h       | P0     |
| 5B-2.4 单元测试   | 2h       | P1     |
| 5B-3.1 接口设计   | 1h       | P0     |
| 5B-3.2 流程编排   | 3h       | P0     |
| 5B-3.3 适配层     | 2h       | P1     |
| 5B-3.4 集成测试   | 2h       | P1     |
| **总计**          | **31h**  | -      |

**建议排期**: 4 个工作日 (每天 8h)
