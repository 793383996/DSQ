# `index.html` 现代化解耦重构详细实施方案

## 0. 重构进度追踪 (2026-02-13 更新)

### ✅ 第一阶段：遗留代码适配器 (Bridge Pattern) - 已完成

| 任务 | 状态 | 实现位置 |
|------|------|----------|
| 遗留函数类型声明 | ✅ | `src/core/bridge.ts` - Window 接口扩展 |
| `runCalculation` 封装 | ✅ | `bridge.ts` - 同步状态、清空变量、调用算法 |
| `cocoMessage` 拦截 | ✅ | `bridge.ts` - 重定向至 `cocoMessageProxy` |
| ES Module 导出修复 | ✅ | `legacy/data.js`, `legacy/blueprint.js` - 添加 export |
| 动态模块加载 | ✅ | `loadLegacyModules()` - 延迟加载确保初始化顺序 |

### ✅ 第二阶段：状态中心化 (Pinia Store) - 已完成

| 任务 | 状态 | 实现位置 |
|------|------|----------|
| `demandList` 状态 | ✅ | `stores/blueprint.ts` - 替代 `xqs` |
| `excludeList` 状态 | ✅ | `stores/blueprint.ts` - 替代 `ig_names` |
| `machineSettings` 状态 | ✅ | `stores/blueprint.ts` - 替代 `settings` |
| 持久化策略 | ✅ | `SETTINGS_STORAGE_KEY = 'machine_settings20240202'` |
| 状态同步机制 | ✅ | `syncStateToLegacy()` - 双向同步 |

### ✅ 第三阶段：UI 组件化拆分 - 已完成

| 组件 | 状态 | 功能 |
|------|------|------|
| `ControlPanel.vue` | ✅ | 产量输入、设备数输入、添加按钮、参数设置入口 |
| `ConfigPanel.vue` | ✅ | 制作台/熔炉/化工厂/增产剂设置面板 |
| `ResultTable.vue` | ✅ | 计算结果展示、添加需求、排除/恢复操作 |
| `AddItemDialog.vue` | ✅ | 添加需求对话框 |
| `Toast.vue` | ✅ | 消息提示组件 |
| `useIconProvider.ts` | ✅ | 图标加载与缓存，替代 jQuery `f_initIcons` |

### ⏳ 第四阶段：指令化与事件解耦 - 部分完成

| 任务 | 状态 | 备注 |
|------|------|------|
| `onclick` → `@click` | ✅ | 所有组件已使用 Vue 事件绑定 |
| `oncontextmenu` → `@contextmenu.prevent` | ✅ | ResultTable 已实现排除功能 |
| Tooltip 组件化 | ⏳ | 待引入 Vue Tooltip 替代 `jquery.tips.js` |
| `v-memo` 性能优化 | ⏳ | 待对 ResultTable 频繁更新场景优化 |

---

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
│   ├── ControlPanel/    # 顶部控制栏组件 ✅
│   ├── ConfigPanel/     # 设置抽屉组件 ✅
│   ├── ResultTable/     # 核心计算表格组件 ✅
│   ├── AddItemDialog/   # 添加需求对话框 ✅
│   ├── Toast/           # 消息提示组件 ✅
│   ├── BlueprintGenerator/ # 蓝图生成组件
│   └── MoreSetting/     # 高级设置组件
├── composables/         # 组合式函数
│   ├── useIconProvider.ts # 图标提供者 ✅
│   └── useToast.ts      # Toast 代理 ✅
├── App.vue              # 根组件：负责生命周期管理 ✅
└── main.ts              # 入口：挂载全局插件 ✅

```

---

## 2. 实施路线图与技术细节

### 第一阶段：构建"遗留代码适配器" (Bridge Pattern) ✅ 已完成

**目标**：在 TypeScript 环境中安全调用遗留全局函数，并消除对 `window` 对象的直接操作。

* **详细步骤**：
1. ✅ 在 `bridge.ts` 中定义遗留函数的类型声明。
2. ✅ 封装计算触发器：由于 `loadNumber()` 涉及递归计算，封装一个 `runCalculation` 函数，该函数负责：
   * 同步 `Pinia` 状态到遗留变量。
   * 执行 `xh_list = []; out_list = [];` 等清空操作。
   * 调用核心算法并捕获错误。

* **必要的细节**：
* ✅ **拦截 `cocoMessage`**：在适配器中重定向 `window.cocoMessage` 到 Vue 3 的 Toast 代理，防止遗留代码崩溃导致 UI 挂死。
* ✅ **ES Module 导出**：为 `data.js` 和 `blueprint.js` 添加 `export` 语句，解决 `"type": "module"` 兼容问题。
* ✅ **动态加载**：`loadLegacyModules()` 确保初始化顺序正确。

### 第二阶段：状态中心化 (Pinia Store 设计) ✅ 已完成

**目标**：将 `index.html` 中的全局变量 迁移为响应式状态。

* **状态映射表**：
  * ✅ `xqs` → `store.demandList` (量产需求列表)。
  * ✅ `ig_names` → `store.excludeList` (排除列表)。
  * ✅ `settings` → `store.machineSettings` (设备参数)。

* **必要的细节**：
* ✅ **持久化策略**：实现 `SETTINGS_STORAGE_KEY = 'machine_settings20240202'` 版本控制。
* ✅ **双向同步**：`syncStateToLegacy()` 确保 Pinia 状态与遗留变量同步。

### 第三阶段：UI 组件化拆分 (SFC Transformation) ✅ 已完成

**目标**：将 1000+ 行的 `index.html` 拆分为原子组件。

1. **✅ `ControlPanel.vue` (产量控制)**：
   * 迁移 `txtnumber` 的输入逻辑。
   * 使用 `v-model` 替代 `oninput` 样式调整逻辑。

2. **✅ `ConfigPanel.vue` (设置面板)**：
   * 将原 `MoreSetting` 中的各种 `select` 选项（Mk.I, Mk.II 等）封装为响应式配置项。
   * 移除 `document.getElementById('csd').value` 操作，改为监听 `store` 状态变更。

3. **✅ `ResultTable.vue` (结果展示)**：
   * 使用 Vue 的 `v-for` 循环渲染 `items` 数组。
   * 图标处理：利用 `useIconProvider` 统一处理 Base64 图标，移除 jQuery 的 `f_initIcons`。

4. **✅ 其他组件**：
   * `AddItemDialog.vue` - 添加需求对话框
   * `Toast.vue` - 消息提示组件
   * `BlueprintGenerator.vue` - 蓝图生成组件
   * `MoreSetting.vue` - 高级设置组件

### 第四阶段：指令化与事件解耦 ⏳ 部分完成

**目标**：彻底移除内联脚本。

* **事件映射**：
  * ✅ `onclick="f_add()"` → `@click="handleAddItem"`
  * ✅ `oncontextmenu="f_remove_ig(...)"` → `@contextmenu.prevent="removeExcludeItem"`

* **待完成**：
  * ⏳ **Tips 组件化**：原项目依赖 `jquery.tips.js`，需引入 Vue Tooltip 组件。
  * ⏳ **`v-memo` 性能优化**：对 ResultTable 频繁更新场景优化。

---

## 3. 重构前后功能对比

| 功能模块 | 重构前 (index.html) | 重构后 (Vue 3) | 状态 |
|---------|---------------------|----------------|------|
| **产量输入** | `oninput` + DOM 操作 | `v-model` + computed | ✅ |
| **设备数输入** | `oninput` + DOM 操作 | `v-model` + computed | ✅ |
| **添加需求** | `onclick="f_add()"` | `@click="handleAdd"` + Dialog | ✅ |
| **参数设置** | jQuery 弹窗 | `ConfigPanel.vue` 抽屉 | ✅ |
| **计算结果** | jQuery 表格拼接 | `ResultTable.vue` v-for | ✅ |
| **排除物品** | 右键菜单 + `f_ig()` | `@contextmenu.prevent` + store | ✅ |
| **消息提示** | `cocoMessage.js` | `Toast.vue` + `useToast` | ✅ |
| **图标加载** | jQuery `f_initIcons()` | `useIconProvider.ts` | ✅ |
| **状态持久化** | `localStorage` 直接操作 | Pinia + 版本控制 | ✅ |
| **蓝图生成** | `generateBlueprint()` | 保留原逻辑 + bridge 封装 | ✅ |
| **Tooltip 提示** | `jquery.tips.js` | 待引入 Vue Tooltip | ⏳ |
| **性能优化** | 无 | 待添加 `v-memo` | ⏳ |

---

## 4. 重构中的黑盒保护清单 (Architect's Check)

在操作 `index.html` 解耦时，**严禁修改**以下逻辑流向，直至 UI 层稳定：

1. **`find(name, normalize_recipe)` 的调用时机**：这是配方查询的核心入口。
2. **`loadNumber()` 的递归深度**：量产计算的准确性全赖于此。
3. **蓝图生成的参数构造**：`generateBlueprint()` 函数从 DOM 获取值的逻辑，应先改为从 `store` 获取，但其构造 `outputRecipe` 对象的数据格式必须保持原样。

---

## 5. 协作 AI 模型指令 (Instruction for Models)

> "你现在的任务是协助进行 UI 层的 SFC 转换。在生成 Vue 组件代码时，请确保所有对 `data.js` 中全局函数的调用都通过 `useLegacyBridge()` 接口进行。禁止尝试优化 `loadNumber` 中的递归算法，仅负责将其输入的 `DOM value` 替换为响应式 `props` 或 `store state`。"
