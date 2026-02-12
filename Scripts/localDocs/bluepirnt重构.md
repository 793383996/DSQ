
# `blueprint.js` 协议层解耦与重构详细实施方案

## 0. 架构师禁令：红线原则

* **严禁重写算法**：禁止尝试用“更优雅”的数学公式重写现有的位运算逻辑。
* **严禁格式化 MD5**：原文件末尾的 MD5 逻辑包含大量“魔数”，严禁对其进行变量重命名或逻辑重构。
* **字节对齐强制要求**：DSP 蓝图协议严格遵守 **小端序 (Little-Endian)**。重构后的读写器必须显式声明处理顺序。

---

## 1. 第一阶段：协议数据模型化 (Type Modeling)

**目标**：将二进制流中的偏移量转化为语义化的 TypeScript 接口。

1. **定义蓝图元数据接口**：
创建 `src/core/blueprint/types.ts`。
```typescript
/** 蓝图建筑属性映射 */
export interface IBlueprintBuilding {
    itemId: number;      // 建筑ID
    index: number;       // 建筑序号
    posX: number;        // 坐标需保持 float32 精度
    posY: number;
    posZ: number;
    rotation: number;    // 旋转向量
    recipeId: number;    // 配方ID
    filterId: number;    // 过滤器设置
    // ...对应原代码中 b[0], b[1] 等解析出的字段
}

export interface IBlueprintData {
    version: number;     // 协议版本，目前固定为 0
    layout: number;      // 布局信息
    icons: number[];     // 蓝图图标列表
    buildings: IBlueprintBuilding[];
}

```



---

## 2. 第二阶段：核心依赖提取 (Dependency Isolation)

**目标**：将 MD5 和二进制工具类从业务逻辑中抽离。

1. **MD5 算法静态化**：
将 `blueprint.js` 末尾的 `function md5(string)` 完整迁入 `src/core/utils/Crypto.ts`。
* **细节**：保持原函数的输入输出类型（String in, String out），不要尝试将其改为 `ArrayBuffer` 操作，除非你有完整的单元测试覆盖。


2. **二进制读写器封装 (BinaryBuffer)**：
创建一个 `BlueprintBuffer` 类，封装原有的字符串拼接操作。
* **关键点**：原代码使用 `String.fromCharCode` 模拟二进制流，重构必须使用现代的 `Uint8Array` 和 `DataView`。



---

## 3. 第三阶段：解析与生成逻辑重构 (Service Wrapping)

**目标**：将全局 `Blueprint` 对象转化为无状态的服务类。

1. **实现 `BlueprintParser` (解包)**：
* 输入：`BLUEPRINT:0...` 字符串。
* 逻辑流：正则截取 -> Base64 解码 -> **Pako (Gzip) 解压** -> `BlueprintBuffer` 顺序读取。
* **必要的细节**：原代码中存在大量循环判断（如 `for (var i = 0; i < blen; i++)`），重构时需保留这些循环结构，仅将内部的偏移读取替换为 `buffer.readInt32()` 等。


2. **实现 `BlueprintEncoder` (打包)**：
* 输入：`IBlueprintData` 对象。
* 逻辑流：`BlueprintBuffer` 写入建筑数据 -> **计算 MD5 签名** -> **Pako (Gzip) 压缩** -> Base64 编码 -> 拼接 `BLUEPRINT:0` 前缀。
* **细节**：MD5 签名必须在 Gzip 压缩 **之前** 的原始二进制流上进行计算（需严格核对原逻辑顺序）。



---

## 4. 第四阶段：稳定性回归体系 (Baseline Testing)

**目标**：确保“重构前后，字节不差”。

1. **建立 Baseline 库**：
从项目中提取 3 组典型蓝图：
* A: 仅包含单一传送带（最简）。
* B: 包含多层叠放的研究站（测试坐标位移）。
* C: 包含复杂的化工配方（测试配方 ID 存储）。


2. **双轨比对脚本**：
```typescript
const rawStr = "BLUEPRINT:0,0,...";
const data = NewParser.parse(rawStr);
const newStr = NewEncoder.generate(data);

// 强制性断言：生成的字符串必须完全一致
assert(rawStr === newStr, "Blueprint String Mismatch!");

```



---

## 5. 协作执行流程 (给协作 AI 的指令)

若指引其他模型重构，请按以下步骤下发任务：

1. **任务 A（MD5 搬运）**：
> "请将 `blueprint.js` 尾部的 MD5 实现完整迁移到 `src/core/utils/Crypto.ts`。要求：不改变任何位运算魔数，仅进行 ESM 导出封装。为函数添加 JavaDoc，注明这是针对蓝图协议的专用实现。"


2. **任务 B（模型定义）**：
> "请根据 `Blueprint.prototype.parse` 方法中读取二进制流的顺序，定义 `IBlueprintBuilding` 接口。确保字段顺序与读取顺序一一对应，并添加中文注释说明每个字段在游戏中的含义（如坐标、旋转、配方等）。"


3. **任务 C（Buffer 类实现）**：
> "请实现一个 `BlueprintBuffer` 类，封装 `Uint8Array`。需要支持 `readInt32`, `writeInt32`, `readFloat32`, `writeFloat32` 等小端序操作。用于替换原有的字符编码式读写逻辑。"



---

## 6. 风险预警：Android 架构师的最后提醒

* **Pako 兼容性**：新架构下推荐使用 `npm install pako`。注意在 ESM 中引入方式为 `import pako from 'pako'`，调用时使用 `pako.deflate`。
* **浮点数精度**：蓝图中的坐标（X, Y, Z）是 `Float32`。在 JS 中处理时要小心 64 位浮点数转换导致的微小误差，这可能导致蓝图在游戏中虽然能解析，但建筑位置会发生偏移。
* **性能瓶颈**：大型蓝图（几千个建筑）的 `toStr` 过程非常耗时。在 UI 层调用时，建议包裹在 `try-catch` 中，并考虑在未来版本引入 `Web Worker`。

