# `blueprint.js` 协议层解耦与重构详细实施方案

> **状态**：⏳ 进行中 - 阶段 5
> 
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md) | [堆叠流程重构.md](./堆叠流程重构.md)

## 0. 架构师禁令：红线原则

* **严禁重写算法**：禁止尝试用"更优雅"的数学公式重写现有的位运算逻辑。
* **严禁格式化 MD5**：原文件末尾的 MD5 逻辑包含大量"魔数"，严禁对其进行变量重命名或逻辑重构。
* **字节对齐强制要求**：DSP 蓝图协议严格遵守 **小端序 (Little-Endian)**。重构后的读写器必须显式声明处理顺序。
* **二进制兼容性**：生成的蓝图字符串必须与原逻辑完全一致，任何字节差异都可能导致游戏无法识别。

---

## 0.1 重构进度追踪 (2026-02-14 更新)

### ✅ 已完成

| 任务 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| 数据层解耦 (`src/core/data/*.json`) | ✅ | 高 | itemMap, buildingMap, recipeMap 等静态数据 |
| 类型定义 (`src/core/types/blueprint.ts`) | ✅ | 高 | IBlueprintBuilding, IBlueprintData 等接口 |
| 二进制写入器 (`src/core/utils/BinaryWriter.ts`) | ✅ | 高 | 小端序写入，Float32 精度保证 |
| 二进制读取器 (`src/core/utils/BinaryReader.ts`) | ✅ | 高 | 小端序读取，单元测试覆盖 |
| MD5 工具 (`src/core/utils/md5.ts`) | ✅ | 中 | 从 blueprint.js 迁移，单元测试覆盖 |
| 编码器 (`src/core/utils/BlueprintEncoder.ts`) | ✅ | 高 | 蓝图数据编码，单元测试覆盖 |
| 解码器 (`src/core/utils/BlueprintDecoder.ts`) | ✅ | 高 | 蓝图字符串解析，单元测试覆盖 |

### ⏳ 进行中

| 任务 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| Baseline 测试 | 🔲 | 高 | 字节级对比验证 |

### 前置依赖

- [x] data.js 核心逻辑解耦完成 (阶段 4B)
- [ ] 堆叠模块服务化设计完成

---

## 1. 当前状态分析 (2026-02-14 更新)

### 1.1 文件结构

```text
Scripts/
├── blueprint.js       # 蓝图生成逻辑 (~4000 行)
├── localDocs/
│   ├── 堆叠模块说明.md  # 堆叠功能文档
│   └── 堆叠流程重构.md  # 堆叠模块重构方案
```

### 1.2 核心数据结构

```javascript
// 物品映射表
const itemMap = {
  ironOre: { name: "ironOre", iconId: 1001, remark: "铁矿" },
  copperOre: { name: "copperOre", iconId: 1002, remark: "铜矿" },
  // ... 更多物品
}

// 建筑属性
const building = {
  itemId: number,      // 建筑ID
  index: number,       // 建筑序号
  localOffset: [{ x, y, z }, { x, y, z }],  // 坐标
  recipeId: number,    // 配方ID
  filterId: number,    // 过滤器ID
  inputObjIdx: number, // 输入对象索引
  outputObjIdx: number, // 输出对象索引
}
```

### 1.3 核心函数清单

| 函数名 | 功能 | 状态 |
|--------|------|------|
| `Blueprint.parse(str)` | 解析蓝图字符串 | ⚠️ 黑盒，禁止修改 |
| `Blueprint.toStr()` | 生成蓝图字符串 | ⚠️ 黑盒，禁止修改 |
| `generateBlueprint()` | 从计算结果生成蓝图 | ✅ 已通过 bridge 封装 |
| `md5(string)` | MD5 哈希计算 | ⚠️ 黑盒，禁止修改 |

### 1.4 依赖关系

```
blueprint.js
    ├── pako.js (Gzip 压缩/解压)
    ├── md5() (内置 MD5 实现)
    └── window.data (配方数据)
```

---

## 2. 第一阶段：协议数据模型化 (Type Modeling)

**目标**：将二进制流中的偏移量转化为语义化的 TypeScript 接口。

### 2.1 蓝图元数据接口

创建 `src/core/blueprint/types.ts`：

```typescript
/**
 * 蓝图建筑属性映射
 * 架构师注：字段顺序必须与二进制读取顺序一致
 */
export interface IBlueprintBuilding {
  itemId: number       // 建筑ID (对应 itemMap 中的 iconId)
  index: number        // 建筑序号 (从 0 开始)
  localOffset: ICoordinate[] | null  // 坐标数组
  yaw: number[]        // 旋转向量
  recipeId: number     // 配方ID (0 表示无配方)
  filterId: number     // 过滤器设置 (0 表示无过滤)
  inputObjIdx: number  // 输入对象索引
  outputObjIdx: number // 输出对象索引
  parameters: IBlueprintParameters | null  // 参数
}

/**
 * 坐标接口
 */
export interface ICoordinate {
  x: number
  y: number
  z: number
}

/**
 * 蓝图参数
 */
export interface IBlueprintParameters {
  iconId?: number      // 图标ID
  count?: string       // 数量
}

/**
 * 蓝图图标信息
 */
export interface IBlueprintIcon {
  index: number        // 图标位置索引
  itemId: number       // 物品ID
}

/**
 * 蓝图数据结构
 */
export interface IBlueprintData {
  version: number      // 协议版本 (目前固定为 0)
  layout: number       // 布局信息
  icons: IBlueprintIcon[]   // 蓝图图标列表
  buildings: IBlueprintBuilding[]  // 建筑列表
}

/**
 * 蓝图元信息
 */
export interface IBlueprintMeta {
  title: string        // 蓝图标题
  description: string  // 蓝图描述
  time: number         // 创建时间戳
  gameVersion: string  // 游戏版本
}
```

### 2.2 物品映射接口

```typescript
/**
 * 物品映射项
 */
export interface IItemMapping {
  name: string         // 内部名称 (如 "ironOre")
  iconId: number       // 图标ID
  remark: string       // 中文备注
  extra_rate?: number  // 增产剂额外产出率
  accelerate?: number  // 增产剂加速率
}

/**
 * 物品映射表
 */
export type ItemMap = Record<string, IItemMapping>
```

### 2.3 建筑映射接口

```typescript
/**
 * 建筑分类
 */
export enum ProductionCategory {
  smelter = 0,     // 熔炉
  assembling = 1,  // 制造台
  plant = 2,       // 化工厂
  refinery = 3,    // 精炼厂
  collider = 4,    // 对撞机
  lab = 5          // 研究站
}

/**
 * 建筑类型
 */
export enum BuildingType {
  production = 0,  // 生产建筑
  sorter = 1,      // 分拣器
  conveyor = 2     // 传送带
}

/**
 * 建筑映射项
 */
export interface IBuildingMapping {
  name: string
  itemId: number
  modelIndex: number
  remark: string
  productionSpeed?: number
  sortingSpeed?: number
  transportSpeed?: number
  size?: { x: number; y: number }
  type: BuildingType
  category?: ProductionCategory
  slotMaxIndex?: number
  height?: number
}

/**
 * 建筑映射表
 */
export type BuildingMap = Record<string, IBuildingMapping>
```

---

## 3. 第二阶段：核心依赖提取 (Dependency Isolation)

**目标**：将 MD5 和二进制工具类从业务逻辑中抽离。

### 3.1 MD5 算法静态化

创建 `src/core/utils/Crypto.ts`：

```typescript
/**
 * MD5 哈希计算
 * 架构师注：此实现为蓝图协议专用，严禁修改任何位运算魔数
 * 
 * @param input 输入字符串
 * @returns 32位小写十六进制哈希值
 */
export function md5(input: string): string {
  // 从 blueprint.js 完整迁移 MD5 实现
  // 保持原函数的输入输出类型 (String in, String out)
  // ... (原 MD5 逻辑保持不变)
  
  // 注意：不要尝试将其改为 ArrayBuffer 操作
  // 除非有完整的单元测试覆盖
}
```

### 3.2 二进制读写器封装

创建 `src/core/blueprint/BlueprintBuffer.ts`：

```typescript
/**
 * 蓝图二进制缓冲区
 * 架构师注：严格遵守小端序 (Little-Endian)
 */
export class BlueprintBuffer {
  private buffer: Uint8Array
  private view: DataView
  private offset: number = 0
  
  constructor(size: number) {
    this.buffer = new Uint8Array(size)
    this.view = new DataView(this.buffer.buffer)
  }
  
  static fromBase64(base64: string): BlueprintBuffer {
    const binary = atob(base64)
    const buffer = new BlueprintBuffer(binary.length)
    for (let i = 0; i < binary.length; i++) {
      buffer.buffer[i] = binary.charCodeAt(i)
    }
    return buffer
  }
  
  toBase64(): string {
    let binary = ''
    for (let i = 0; i < this.buffer.length; i++) {
      binary += String.fromCharCode(this.buffer[i])
    }
    return btoa(binary)
  }
  
  // ===== 读取方法 (小端序) =====
  
  readInt32(): number {
    const value = this.view.getInt32(this.offset, true)
    this.offset += 4
    return value
  }
  
  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true)
    this.offset += 4
    return value
  }
  
  readInt16(): number {
    const value = this.view.getInt16(this.offset, true)
    this.offset += 2
    return value
  }
  
  readByte(): number {
    return this.buffer[this.offset++]
  }
  
  // ===== 写入方法 (小端序) =====
  
  writeInt32(value: number): void {
    this.view.setInt32(this.offset, value, true)
    this.offset += 4
  }
  
  writeFloat32(value: number): void {
    this.view.setFloat32(this.offset, value, true)
    this.offset += 4
  }
  
  writeInt16(value: number): void {
    this.view.setInt16(this.offset, value, true)
    this.offset += 2
  }
  
  writeByte(value: number): void {
    this.buffer[this.offset++] = value & 0xFF
  }
  
  // ===== 工具方法 =====
  
  getLength(): number {
    return this.buffer.length
  }
  
  getOffset(): number {
    return this.offset
  }
  
  getBuffer(): Uint8Array {
    return this.buffer
  }
}
```

---

## 4. 第三阶段：解析与生成逻辑重构 (Service Wrapping)

**目标**：将全局 `Blueprint` 对象转化为无状态的服务类。

### 4.1 蓝图解析器

创建 `src/core/blueprint/BlueprintParser.ts`：

```typescript
import pako from 'pako'
import { BlueprintBuffer } from './BlueprintBuffer'
import type { IBlueprintData, IBlueprintBuilding, IBlueprintIcon } from './types'

/**
 * 蓝图解析器
 * 架构师注：解析逻辑必须与原 blueprint.js 完全一致
 */
export class BlueprintParser {
  /**
   * 解析蓝图字符串
   * @param blueprintStr 蓝图字符串 (以 "BLUEPRINT:" 开头)
   */
  static parse(blueprintStr: string): IBlueprintData {
    if (!blueprintStr.startsWith('BLUEPRINT:')) {
      throw new Error('Invalid blueprint format: missing BLUEPRINT: prefix')
    }
    
    const parts = blueprintStr.substring(10).split(',')
    const version = parseInt(parts[0])
    const base64Data = parts.slice(1).join(',')
    
    const buffer = BlueprintBuffer.fromBase64(base64Data)
    const decompressed = pako.ungzip(buffer.getBuffer())
    
    return this.parseBinary(decompressed)
  }
  
  /**
   * 解析二进制数据
   * 架构师注：字段读取顺序必须与原逻辑一致
   */
  private static parseBinary(data: Uint8Array): IBlueprintData {
    const buffer = new BlueprintBuffer(data.length)
    // ... 复制原 parse 方法的循环结构
    
    const version = buffer.readByte()
    const layout = buffer.readInt16()
    
    const iconCount = buffer.readInt16()
    const icons: IBlueprintIcon[] = []
    for (let i = 0; i < iconCount; i++) {
      icons.push({
        index: buffer.readInt16(),
        itemId: buffer.readInt32()
      })
    }
    
    const buildingCount = buffer.readInt32()
    const buildings: IBlueprintBuilding[] = []
    for (let i = 0; i < buildingCount; i++) {
      buildings.push({
        itemId: buffer.readInt32(),
        index: buffer.readInt32(),
        localOffset: [
          { x: buffer.readFloat32(), y: buffer.readFloat32(), z: buffer.readFloat32() },
          { x: buffer.readFloat32(), y: buffer.readFloat32(), z: buffer.readFloat32() }
        ],
        yaw: [buffer.readInt16(), buffer.readInt16()],
        recipeId: buffer.readInt32(),
        filterId: buffer.readInt32(),
        inputObjIdx: buffer.readInt32(),
        outputObjIdx: buffer.readInt32()
      })
    }
    
    return { version, layout, icons, buildings }
  }
}
```

### 4.2 蓝图编码器

创建 `src/core/blueprint/BlueprintEncoder.ts`：

```typescript
import pako from 'pako'
import { md5 } from '../utils/Crypto'
import { BlueprintBuffer } from './BlueprintBuffer'
import type { IBlueprintData } from './types'

/**
 * 蓝图编码器
 * 架构师注：MD5 签名必须在 Gzip 压缩之前计算
 */
export class BlueprintEncoder {
  /**
   * 生成蓝图字符串
   * @param data 蓝图数据
   */
  static encode(data: IBlueprintData): string {
    const binaryData = this.writeBinary(data)
    const signature = md5(this.arrayBufferToString(binaryData))
    const compressed = pako.gzip(binaryData)
    const base64 = this.arrayToBase64(compressed)
    
    return `BLUEPRINT:${data.version},${base64}`
  }
  
  /**
   * 写入二进制数据
   * 架构师注：字段写入顺序必须与解析顺序一致
   */
  private static writeBinary(data: IBlueprintData): Uint8Array {
    // 计算所需缓冲区大小
    let size = 1 + 2 // version + layout
    size += 2 + data.icons.length * 6 // iconCount + icons
    size += 4 + data.buildings.length * 44 // buildingCount + buildings
    
    const buffer = new BlueprintBuffer(size)
    
    buffer.writeByte(data.version)
    buffer.writeInt16(data.layout)
    
    buffer.writeInt16(data.icons.length)
    for (const icon of data.icons) {
      buffer.writeInt16(icon.index)
      buffer.writeInt32(icon.itemId)
    }
    
    buffer.writeInt32(data.buildings.length)
    for (const building of data.buildings) {
      buffer.writeInt32(building.itemId)
      buffer.writeInt32(building.index)
      // localOffset[0]
      buffer.writeFloat32(building.localOffset[0].x)
      buffer.writeFloat32(building.localOffset[0].y)
      buffer.writeFloat32(building.localOffset[0].z)
      // localOffset[1]
      buffer.writeFloat32(building.localOffset[1].x)
      buffer.writeFloat32(building.localOffset[1].y)
      buffer.writeFloat32(building.localOffset[1].z)
      // yaw
      buffer.writeInt16(building.yaw[0])
      buffer.writeInt16(building.yaw[1])
      // 其他字段
      buffer.writeInt32(building.recipeId)
      buffer.writeInt32(building.filterId)
      buffer.writeInt32(building.inputObjIdx)
      buffer.writeInt32(building.outputObjIdx)
    }
    
    return buffer.getBuffer()
  }
  
  private static arrayBufferToString(buffer: Uint8Array): string {
    let result = ''
    for (let i = 0; i < buffer.length; i++) {
      result += String.fromCharCode(buffer[i])
    }
    return result
  }
  
  private static arrayToBase64(buffer: Uint8Array): string {
    return btoa(this.arrayBufferToString(buffer))
  }
}
```

---

## 5. 第四阶段：稳定性回归体系 (Baseline Testing)

**目标**：确保"重构前后，字节不差"。

### 5.1 Baseline 测试用例

```typescript
import { BlueprintParser } from './BlueprintParser'
import { BlueprintEncoder } from './BlueprintEncoder'

describe('Blueprint Roundtrip', () => {
  const baseline1 = 'BLUEPRINT:0,...'
  const baseline2 = 'BLUEPRINT:0,...'
  const baseline3 = 'BLUEPRINT:0,...'
  
  it('should parse and encode baseline1 correctly', () => {
    const data = BlueprintParser.parse(baseline1)
    const result = BlueprintEncoder.encode(data)
    expect(result).toBe(baseline1)
  })
  
  it('should parse and encode baseline2 correctly', () => {
    const data = BlueprintParser.parse(baseline2)
    const result = BlueprintEncoder.encode(data)
    expect(result).toBe(baseline2)
  })
  
  it('should parse and encode baseline3 correctly', () => {
    const data = BlueprintParser.parse(baseline3)
    const result = BlueprintEncoder.encode(data)
    expect(result).toBe(baseline3)
  })
})
```

### 5.2 浮点精度测试

```typescript
describe('Float32 Precision', () => {
  it('should maintain coordinate precision', () => {
    const original = {
      posX: 123.456,
      posY: -78.901,
      posZ: 0.001
    }
    
    const buffer = new BlueprintBuffer(12)
    buffer.writeFloat32(original.posX)
    buffer.writeFloat32(original.posY)
    buffer.writeFloat32(original.posZ)
    
    const readX = buffer.readFloat32()
    const readY = buffer.readFloat32()
    const readZ = buffer.readFloat32()
    
    expect(Math.abs(readX - original.posX)).toBeLessThan(0.0001)
    expect(Math.abs(readY - original.posY)).toBeLessThan(0.0001)
    expect(Math.abs(readZ - original.posZ)).toBeLessThan(0.0001)
  })
})
```

---

## 6. 重构执行流程图

```
┌─────────────────────────────────────────────────────────────┐
│                  blueprint.js 重构路线图                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 1      │    │ 阶段 2      │    │ 阶段 3      │     │
│  │ 类型定义    │───▶│ 依赖提取    │───▶│ 服务封装    │     │
│  │ types.ts    │    │ Crypto.ts   │    │ Parser/Enc  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ IBlueprint  │    │ MD5 静态化  │    │ 无状态服务  │     │
│  │ IBuilding   │    │ Buffer 封装 │    │ 小端序保证  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 阶段 4      │    │ 阶段 5      │    │ 阶段 6      │     │
│  │ 回归测试    │───▶│ 性能优化    │───▶│ 完全解耦    │     │
│  │ Baseline    │    │ Web Worker  │    │ 独立模块    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 风险预警：架构师的最后提醒

### 7.1 Pako 兼容性

```typescript
// ✅ 正确的 ESM 引入方式
import pako from 'pako'
const compressed = pako.gzip(data)
const decompressed = pako.ungzip(compressed)

// ❌ 错误的引入方式
// import { gzip } from 'pako' // 不支持
```

### 7.2 浮点数精度

蓝图中的坐标 (X, Y, Z) 是 `Float32`。在 JS 中处理时要小心 64 位浮点数转换导致的微小误差：

```typescript
// ⚠️ 潜在问题
const x = 123.45678901234567  // JS 64位浮点
buffer.writeFloat32(x)        // 截断为 32位
const read = buffer.readFloat32()  // 123.456787109375 (精度损失)

// ✅ 正确做法
const tolerance = 0.0001
if (Math.abs(read - expected) > tolerance) {
  console.warn('Float32 precision loss detected')
}
```

### 7.3 性能瓶颈

大型蓝图 (几千个建筑) 的 `toStr` 过程非常耗时：

```typescript
// ⚠️ 阻塞主线程
const blueprint = BlueprintEncoder.encode(largeData)  // 可能 > 100ms

// ✅ 推荐方案：Web Worker
const worker = new Worker('blueprint-worker.js')
worker.postMessage({ type: 'encode', data: largeData })
worker.onmessage = (e) => {
  if (e.data.type === 'encoded') {
    console.log('Blueprint:', e.data.result)
  }
}
```

---

## 8. 协作 AI 模型指令

> "你现在的任务是协助进行 `blueprint.js` 的协议层解耦重构。请遵循以下规则：
> 1. 禁止修改 MD5 函数中的任何位运算魔数
> 2. 所有二进制读写必须使用 `BlueprintBuffer` 类
> 3. 严格遵守小端序 (Little-Endian)
> 4. 每次修改后必须运行 Baseline 测试确保二进制兼容性
> 5. 新增代码必须包含完整的 TypeScript 类型注解"
