# `data.js` 核心数据与逻辑解耦重构指南

## 0. 架构师准则：稳定性第一

* **严禁全局搜索替换**：严禁直接将 `s` 替换为 `outputs`，这会破坏 `loadNumber` 的递归链。
* **影子运行**：重构后的代码必须支持与旧逻辑并行运行，通过 Baseline 对比验证。
* **接口隔离**：新 UI 组件只能通过 `RecipeProvider` 接口访问数据，不得触碰底层原始对象。

---

## 1. 第一阶段：定义标准语义化接口 (TypeScript 建模)

**目标**：消除 `s, q, n, t, m` 等命名带来的理解成本。

1. **定义核心接口**：
   创建 `src/core/types/recipe.ts`，定义标准的配方模型。
```typescript
export interface IRecipe {
    id: string;              // 对应原 key
    name: string;            // 配方显示名称
    outputs: Record<string, number>; // 对应原 s
    inputs: Record<string, number>;  // 对应原 q
    time: number;            // 对应原 t (单位：秒)
    machineType: string;     // 对应原 m
    isFluid: boolean;        // 对应原 f
    // ...其他扩展字段
}

```



---

## 2. 第二阶段：开发“防腐层”适配器 (RecipeAdapter)

**目标**：在不修改原始数据文件的前提下，提供语义化访问能力。

1. **实现 `RecipeProvider` 类**：
   该类负责加载原始 `data.js` 并将其转换为 `Map<string, IRecipe>`。
2. **必要的细节（转换逻辑）**：
* **字段映射**：映射逻辑必须在构造函数中完成，生成一个只读的 `Map`。
* **索引预热**：初始化时预先生成 `ProductToRecipe` 索引，避免递归时频繁遍历 `Object.keys`。
* **防御逻辑**：若原始数据缺失 `s` 字段，适配器必须抛出具体异常，指明哪个配方数据损坏。



---

## 3. 第三阶段：计算引擎服务化 (Calculation Service)

**目标**：将 `loadNumber` 及其依赖的全局变量（`xh_list`, `out_list`）封装。

1. **封装 `CalculationContext**`：
   创建一个上下文类，用于替代全局变量。
```typescript
class CalculationContext {
    consumption: Map<string, number> = new Map(); // 代替 xh_list
    production: Map<string, number> = new Map();  // 代替 out_list
    depth: number = 0;                            // 递归深度监控
}

```


2. **逻辑迁移 (Functional Shifting)**：
* 将 `loadNumber(name, num)` 迁移为 `CalculationService.calculate(name, num, context)`。
* **先注后改**：复制原 `loadNumber` 逻辑到新方法中，在每一行关键逻辑旁添加注释，解释其对应的原简写字段含义。
* **线程隔离**：确保该计算服务不直接操作 DOM，仅返回 `CalculationContext` 结果。



---

## 4. 第四阶段：数据文件 JSON 化 (Data Engineering)

**目标**：将 `data.js` 从可执行脚本转变为纯静态数据。

1. **自动化提取**：
   运行一段临时脚本，将全局 `window.data` 对象通过 `JSON.stringify` 导出。
2. **Schema 验证**：
   使用 JSON Schema 校验导出的数据，确保没有循环引用且类型符合 `IRecipe` 规范。
3. **资源加载优化**：
   在新架构中，使用 Vite 的 `import data from './data.json'` 静态引入，利用构建工具实现 Tree Shaking。

---

## 5. 重构执行流程图（给协作 AI 的指令）

如果你引导其他 AI 模型进行重构，请按以下顺序下达任务：

1. **任务 A（类型定义）**：
> "请根据 `data.js` 的数据结构，在 `src/core/types` 下创建语义化的 TypeScript 接口。要求将简写（s, q, t）转换为完整英文单词（outputs, inputs, time），并为每个字段编写 JSDoc 注释。"


2. **任务 B（适配器实现）**：
> "请实现 `RecipeAdapter` 类。该类应接收原始的简写对象，并输出符合 `IRecipe` 接口的标准对象。要求：内部使用 `Map` 存储以优化查询性能，并实现单例模式。"


3. **任务 C（计算逻辑搬迁）**：
> "请在不改变算法逻辑的前提下，将 `loadNumber` 递归函数重构为 `Calculator` 类的私有方法。要求：移除对全局数组 `xh_list` 的直接修改，改用一个由调用者传入的 `Context` 对象来承载计算结果。"



---

## 6. 稳定性校验清单 (Architect's Regression)

* **比对测试**：
* 输入：`电力感应塔`, 数量: `60`。
* 操作：分别运行旧版 `update_all()` 和新版 `Calculator.calculate()`。
* 预期：比对 `xh_list` 与新版 `context.consumption`，每个物料的数量必须精确到小数点后 6 位一致。


* **异常拦截**：
* 模拟输入一个不存在的物料名，新版代码必须捕获该错误并调用 `cocoMessage.error`，而不是抛出 `Cannot read property 's' of undefined` 导致白屏。

