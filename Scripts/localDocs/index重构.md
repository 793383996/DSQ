# `index.html` 现代化解耦重构详细实施方案

## 1. 目录结构规范

重构后的代码应遵循以下标准现代前端结构：

```text
src/
├── core/                # 遗留逻辑层 (黑盒)
│   ├── legacy/          # 存放原 data.js, blueprint.js, pako.js
│   └── bridge.ts        # 核心：遗留代码与 Vue 3 的适配层
├── stores/              # 状态管理层
│   └── blueprint.ts     # 托管 xqs, ig_names, settings 等全局变量
├── components/          # UI 组件层
│   ├── ControlPanel/    # 顶部控制栏组件
│   ├── ConfigPanel/     # 设置抽屉组件
│   └── ResultTable/     # 核心计算表格组件
├── App.vue              # 根组件：负责生命周期管理
└── main.ts              # 入口：挂载全局插件

```

---

## 2. 实施路线图与技术细节

### 第一阶段：构建“遗留代码适配器” (Bridge Pattern)

**目标**：在 TypeScript 环境中安全调用遗留全局函数，并消除对 `window` 对象的直接操作。

* **详细步骤**：
1. 在 `bridge.ts` 中定义遗留函数的类型声明。
2. 封装计算触发器：由于 `loadNumber()` 涉及递归计算，封装一个 `runCalculation` 函数，该函数负责：
* 同步 `Pinia` 状态到遗留变量。
* 执行 `xh_list = []; out_list = [];` 等清空操作。
* 调用核心算法并捕获错误。




* **必要的细节**：
* **拦截 `cocoMessage**`：在适配器中重定向 `window.cocoMessage` 到 Vue 3 的 Toast 代理，防止遗留代码崩溃导致 UI 挂死。



### 第二阶段：状态中心化 (Pinia Store 设计)

**目标**：将 `index.html` 中的全局变量 迁移为响应式状态。

* **状态映射表**：
* `xqs`  `store.demandList` (量产需求列表)。
* `ig_names`  `store.excludeList` (排除列表)。
* `settings`  `store.machineSettings` (设备参数)。


* **必要的细节**：
* **持久化策略**：使用 `pinia-plugin-persistedstate`。针对 `settings` 的不同版本（如 `machine_settings20240202`），在 `store` 初始化时实现版本检查与迁移逻辑，防止旧缓存破坏新结构。



### 第三阶段：UI 组件化拆分 (SFC Transformation)

**目标**：将 1000+ 行的 `index.html` 拆分为原子组件。

1. **`ControlPanel.vue` (产量控制)**：
* **细节**：迁移 `txtnumber` 的输入逻辑。使用 `v-model` 替代 `oninput` 样式调整逻辑。


2. **`ConfigDrawer.vue` (设置面板)**：
* **细节**：将原 `MoreSetting` 中的各种 `select` 选项（Mk.I, Mk.II 等）封装为响应式配置项。
* **风险防范**：原代码中频繁操作 `document.getElementById('csd').value`，必须全部改为监听 `store` 状态变更。


3. **`CalculatorTable.vue` (结果展示)**：
* **细节**：使用 Vue 的 `v-for` 循环渲染 `items` 数组。
* **图标处理**：利用 `IconProvider` 统一处理 Base64 图标，移除 jQuery 的 `f_initIcons` 这种直接操作 DOM 生成 HTML 的做法。



### 第四阶段：指令化与事件解耦

**目标**：彻底移除内联脚本。

* **事件映射**：
* `onclick="f_add()"`  `@click="handleAddItem"`。
* `oncontextmenu="f_remove_ig(...)"`  `@contextmenu.prevent="removeExcludeItem"`。


* **必要的细节**：
* **Tips 组件化**：原项目依赖 `jquery.tips.js`。重构时应引入标准的 Vue Tooltip 组件，并在 `Table` 渲染时通过 `v-memo` 优化频繁更新导致的性能下降。



---

## 3. 重构中的黑盒保护清单 (Architect's Check)

在操作 `index.html` 解耦时，**严禁修改**以下逻辑流向，直至 UI 层稳定：

1. **`find(name, normalize_recipe)` 的调用时机**：这是配方查询的核心入口。
2. **`loadNumber()` 的递归深度**：量产计算的准确性全赖于此。
3. **蓝图生成的参数构造**：`generateBlueprint()` 函数从 DOM 获取值的逻辑，应先改为从 `store` 获取，但其构造 `outputRecipe` 对象的数据格式必须保持原样。

---

## 4. 协作 AI 模型指令 (Instruction for Models)

> "你现在的任务是协助进行 UI 层的 SFC 转换。在生成 Vue 组件代码时，请确保所有对 `data.js` 中全局函数的调用都通过 `useLegacyBridge()` 接口进行。禁止尝试优化 `loadNumber` 中的递归算法，仅负责将其输入的 `DOM value` 替换为响应式 `props` 或 `store state`。"
