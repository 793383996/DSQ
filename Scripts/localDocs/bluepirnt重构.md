# `blueprint.js` 协议层解耦与重构详细实施方案

> **状态**：⏳ 进行中 - 阶段 5 (协议层完成，生成器待迁移)
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

| 任务                                            | 状态 | 优先级     | 说明                                       |
| ----------------------------------------------- | ---- | ---------- | ------------------------------------------ |
| 数据层解耦 (`src/core/data/*.json`)             | ✅   | 高         | itemMap, buildingMap, recipeMap 等静态数据 |
| 类型定义 (`src/core/types/blueprint.ts`)        | ✅   | 高         | IBlueprintBuilding, IBlueprintData 等接口  |
| 二进制写入器 (`src/core/utils/BinaryWriter.ts`) | ✅   | 高         | 小端序写入，Float32 精度保证               |
| 二进制读取器 (`src/core/utils/BinaryReader.ts`) | ✅   | 高         | 小端序读取，单元测试覆盖                   |
| MD5 工具 (`src/core/utils/md5.ts`)              | ✅   | 中         | 从 blueprint.js 迁移，单元测试覆盖         |
| 编码器 (`src/core/utils/BlueprintEncoder.ts`)   | ✅   | 高         | 蓝图数据编码，单元测试覆盖                 |
| 解码器 (`src/core/utils/BlueprintDecoder.ts`)   | ✅   | 高         | 蓝图字符串解析，单元测试覆盖               |
| 堆叠类型定义 (`src/core/types/stack.ts`)        | ✅   | 高         | IStackConfig, ICloneFilter, ICloneResult   |
| Index重映射 (`src/core/utils/IndexMapper.ts`)   | ✅   | 高         | buildIndexMap, cloneBuildingWithRemap      |
| 堆叠服务 (`src/core/services/StackService.ts`)  | ✅   | 高         | Phase 1/3/4 完整实现                       |
| pako统一加载 (`getPakoImpl()`)                  | ✅   | 中         | 解决ESM/CJS模块加载差异                    |
| URI解码容错 (`safeDecodeURIComponent`)          | ✅   | 中         | 处理特殊字符解码异常                       |
| pako API兼容修复                                | ✅   | 2026-02-14 | 使用inflate/deflate替代ungzip/gzip         |
| Baseline 测试                                   | ✅   | 高         | 359个单元测试全部通过                      |

### ⏳ 进行中

| 任务                     | 状态 | 优先级 | 说明                                         |
| ------------------------ | ---- | ------ | -------------------------------------------- |
| Blueprint类生成逻辑迁移  | ⏳   | 高     | init/generateBuildings/generateConveyorBelts |
| BuildingGenerator服务    | ⏳   | 中     | 建筑生成器独立服务                           |
| ConveyorGenerator服务    | ⏳   | 中     | 传送带生成器独立服务                         |
| BlueprintService整合服务 | ⏳   | 中     | 蓝图生成统一入口                             |

### 🔲 待开始

| 任务                | 状态 | 优先级 | 说明           |
| ------------------- | ---- | ------ | -------------- |
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
