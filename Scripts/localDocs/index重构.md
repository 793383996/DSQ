# `index.html` 现代化解耦重构详细实施方案

## 0. 重构进度追踪 (2026-02-14 更新)

> **状态**：✅ 已完成 - 所有核心重构任务已完成
>
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md)

### ✅ 第一阶段：遗留代码适配器 (Bridge Pattern) - 已完成

| 任务                  | 状态 | 实现位置                                              |
| --------------------- | ---- | ----------------------------------------------------- |
| 遗留函数类型声明      | ✅   | `src/core/bridge.ts` - Window 接口扩展                |
| `runCalculation` 封装 | ✅   | `bridge.ts` - 同步状态、清空变量、调用算法            |
| `cocoMessage` 拦截    | ✅   | `bridge.ts` - 重定向至 `cocoMessageProxy`             |
| ES Module 导出修复    | ✅   | `legacy/data.js`, `legacy/blueprint.js` - 添加 export |
| 动态模块加载          | ✅   | `loadLegacyModules()` - 延迟加载确保初始化顺序        |
| 机器设置同步          | ✅   | `legacyUpdateMachineSettings()` - 设备类型/增产剂配置 |
| 速度设置同步          | ✅   | `legacyUpdateSpeedSettings()` - 采矿机/分馏塔等速度   |
| 物流设置同步          | ✅   | `legacyUpdateLogisticsSettings()` - 传送带类型/堆叠   |
| 蓝图配置同步          | ✅   | `legacyUpdateConfig()` - 蓝图生成参数                 |

### ✅ 第二阶段：状态中心化 (Pinia Store) - 已完成

| 任务                   | 状态 | 实现位置                                            |
| ---------------------- | ---- | --------------------------------------------------- |
| `demandList` 状态      | ✅   | `stores/blueprint.ts` - 替代 `xqs`                  |
| `excludeList` 状态     | ✅   | `stores/blueprint.ts` - 替代 `ig_names`             |
| `machineSettings` 状态 | ✅   | `stores/blueprint.ts` - 替代 `settings`             |
| 持久化策略             | ✅   | `SETTINGS_STORAGE_KEY = 'machine_settings20240202'` |
| 状态同步机制           | ✅   | `syncStateToLegacy()` - 双向同步                    |
| 计算状态管理           | ✅   | `isCalculating`, `resultItems`, `calculationError`  |

### ✅ 第三阶段：UI 组件化拆分 - 已完成

| 组件                     | 状态 | 功能                                                |
| ------------------------ | ---- | --------------------------------------------------- |
| `ControlPanel.vue`       | ✅   | 产量输入、设备数输入、添加按钮、参数设置入口        |
| `ConfigPanel.vue`        | ✅   | 设备类型/增产剂/速度产量/物流配置/蓝图配置/显示设置 |
| `ResultTable.vue`        | ✅   | 计算结果展示、添加需求、排除/恢复操作               |
| `AddItemDialog.vue`      | ✅   | 添加需求对话框，支持搜索和分类                      |
| `Toast.vue`              | ✅   | 消息提示组件                                        |
| `BlueprintGenerator.vue` | ✅   | 蓝图生成组件                                        |
| `useIconProvider.ts`     | ✅   | 图标加载与缓存，替代 jQuery `f_initIcons`           |
| `useToast.ts`            | ✅   | Toast 代理，替代 `cocoMessage.js`                   |

### ✅ 第四阶段：指令化与事件解耦 - 已完成

| 任务                                     | 状态 | 备注                        |
| ---------------------------------------- | ---- | --------------------------- |
| `onclick` → `@click`                     | ✅   | 所有组件已使用 Vue 事件绑定 |
| `oncontextmenu` → `@contextmenu.prevent` | ✅   | ResultTable 已实现排除功能  |
| 表单双向绑定                             | ✅   | `v-model` 替代 DOM 操作     |
| 条件渲染                                 | ✅   | `v-if` 控制动态显示         |

### ✅ 第五阶段：jQuery 移除 - 已完成 (2026-02-14)

| 任务                             | 状态 | 优先级 | 备注                          |
| -------------------------------- | ---- | ------ | ----------------------------- |
| 移除 jQuery 依赖                 | ✅   | 高     | data.js 已移除 jQuery         |
| `$.ajax` → `fetch()`             | ✅   | 高     | 数据加载已替换                |
| `$.extend` → `structuredClone()` | ✅   | 高     | 深拷贝已替换                  |
| `$.cookie` → `localStorage`      | ✅   | 高     | Cookie 操作已替换             |
| 废弃文件清理                     | ✅   | 中     | jquery-\*.js 已删除           |
| 构建配置优化                     | ✅   | 中     | Vite code splitting + esbuild |

### ✅ 第六阶段：性能优化 - 已完成 (2026-02-14)

| 任务             | 状态 | 优先级 | 备注                             |
| ---------------- | ---- | ------ | -------------------------------- |
| 图标缓存统一管理 | ✅   | 高     | ResultTable 使用 useIconProvider |
| v-memo 性能优化  | ✅   | 中     | ResultTable 列表渲染优化         |
| 日志环境控制     | ✅   | 中     | 新增 logger.ts，生产环境静默     |
| 搜索防抖优化     | ✅   | 中     | AddItemDialog 搜索延迟 150ms     |
| 状态同步机制     | ✅   | 高     | demandVersion + 快照验证         |
| 异常处理增强     | ✅   | 高     | xhMap/outMap清理、边界校验       |

### ⏳ 后续优化 - 待进行

| 任务             | 状态 | 优先级 | 备注                              |
| ---------------- | ---- | ------ | --------------------------------- |
| 配方数据 JSON 化 | ⏳   | 中     | 详见 [data重构.md](./data重构.md) |
| Tooltip 组件化   | ⏳   | 低     | 替代 `jquery.tips.js`             |

---

## 1. 目录结构规范 (当前状态)

```text
src/
├── core/                      # 遗留逻辑层 (黑盒)
│   ├── legacy/                # 存放原 data.js, blueprint.js
│   │   ├── data.js            # 配方数据 + 计算逻辑 (jQuery 已移除) ✅
│   │   ├── data.d.ts          # 类型声明
│   │   ├── blueprint.js       # 蓝图生成逻辑
│   │   └── blueprint.d.ts     # 类型声明
│   └── bridge.ts              # 核心：遗留代码与 Vue 3 的适配层 ✅
├── stores/                    # 状态管理层
│   └── blueprint.ts           # 托管 demandList, excludeList, settings ✅
├── components/                # UI 组件层
│   ├── ControlPanel/          # 顶部控制栏组件 ✅
│   ├── ConfigPanel/           # 参数设置面板 ✅
│   ├── ResultTable/           # 核心计算表格组件 ✅
│   ├── AddItemDialog/         # 添加需求对话框 ✅
│   ├── Toast/                 # 消息提示组件 ✅
│   └── BlueprintGenerator/    # 蓝图生成组件 ✅
├── composables/               # 组合式函数
│   ├── useIconProvider.ts     # 图标提供者 ✅
│   └── useToast.ts            # Toast 代理 ✅
├── App.vue                    # 根组件：负责生命周期管理 ✅
└── main.ts                    # 入口：挂载全局插件 ✅
```

### 1.1 pako 依赖说明 (2026-02-14 更新)

| 文件                          | 状态        | 说明                                 |
| ----------------------------- | ----------- | ------------------------------------ |
| ~~`src/core/legacy/pako.js`~~ | ✅ 已删除   | 死代码，未被 import                  |
| ~~`Scripts/pako.js`~~         | ✅ 已删除   | 参考文档，非运行时依赖               |
| `npm pako@2.1.0`              | ✅ 实际使用 | bridge.ts 通过 `import('pako')` 加载 |

**修复**：bridge.ts 已添加 `window.pako` 挂载，供 blueprint.js 使用。

### 1.2 已修复问题 (2026-02-14)

| 问题                          | 严重程度 | 修复方案                                        |
| ----------------------------- | -------- | ----------------------------------------------- |
| `window.xqs` 格式读取错误     | 高       | App.vue 兼容 `{ item: { name }, number }` 格式  |
| `isLegacyDataLoaded` 检查错误 | 致命     | 检查 `update_all/find/data` 而非 `isDataLoaded` |

**关键发现**：

- `window.xqs` 格式为 `{ item: { name }, number }`，非 `{ name, number }`
- `window.data` (配方数据) 与 `window.game_data` (图标资源) 是两套独立数据
- `window.isDataLoaded` 仅表示图标加载完成，不代表计算引擎就绪

---

## 2. 已完成的核心接口

### 2.1 Bridge 适配器接口 (`src/core/bridge.ts`)

```typescript
// 状态同步
export function syncStateToLegacy(state: StateSyncMap): void
export function clearLegacyState(): void

// 计算触发
export async function runCalculation(): Promise<any>

// 配置同步
export function legacyUpdateMachineSettings(config: MachineConfigSettings): void
export function legacyUpdateSpeedSettings(speeds: SpeedSettings): void
export function legacyUpdateLogisticsSettings(logistics: LogisticsSettings): void
export function legacyUpdateConfig(config: Partial<BlueprintConfig>): void

// 数据访问
export function getSelectableItems(): string[]
export function getSelectableItemsWithIcons(): SelectableItemsResult
export function getIconData(): { [key: string]: string }

// 数据加载状态
export function isLegacyDataLoaded(): boolean
export function waitForLegacyData(timeout: number): Promise<boolean>
```

### 2.2 Pinia Store 接口 (`src/stores/blueprint.ts`)

```typescript
// 状态
const demandList = ref<DemandItem[]>([])
const excludeList = ref<string[]>([])
const machineSettings = ref<MachineSettings>({})
const resultItems = ref<any[]>([])
const isCalculating = ref(false)
const calculationError = ref<string | null>(null)

// Actions
function addDemand(name: string, num: number): void
function removeDemand(name: string): void
function updateDemand(name: string, num: number): void
function addExclude(name: string): void
function removeExclude(name: string): void
function setMachineSetting<K>(key: K, value: MachineSettings[K]): void
function clearAll(): void
```

---

## 3. 重构前后功能对比

| 功能模块         | 重构前 (index.html)     | 重构后 (Vue 3)                 | 状态 |
| ---------------- | ----------------------- | ------------------------------ | ---- |
| **产量输入**     | `oninput` + DOM 操作    | `v-model` + computed           | ✅   |
| **设备数输入**   | `oninput` + DOM 操作    | `v-model` + computed           | ✅   |
| **添加需求**     | `onclick="f_add()"`     | `@click="handleAdd"` + Dialog  | ✅   |
| **参数设置**     | jQuery 弹窗             | `ConfigPanel.vue` 抽屉         | ✅   |
| **计算结果**     | jQuery 表格拼接         | `ResultTable.vue` v-for        | ✅   |
| **排除物品**     | 右键菜单 + `f_ig()`     | `@contextmenu.prevent` + store | ✅   |
| **消息提示**     | `cocoMessage.js`        | `Toast.vue` + `useToast`       | ✅   |
| **图标加载**     | jQuery `f_initIcons()`  | `useIconProvider.ts`           | ✅   |
| **状态持久化**   | `localStorage` 直接操作 | Pinia + 版本控制               | ✅   |
| **蓝图生成**     | `generateBlueprint()`   | 保留原逻辑 + bridge 封装       | ✅   |
| **设备类型选择** | DOM 直接操作            | `ConfigPanel.vue` + store      | ✅   |
| **增产剂配置**   | DOM 直接操作            | `ConfigPanel.vue` + store      | ✅   |
| **速度产量配置** | DOM 直接操作            | `ConfigPanel.vue` + bridge     | ✅   |
| **物流配置**     | DOM 直接操作            | `ConfigPanel.vue` + bridge     | ✅   |
| **蓝图配置**     | DOM 直接操作            | `ConfigPanel.vue` + bridge     | ✅   |
| **Tooltip 提示** | `jquery.tips.js`        | 待引入 Vue Tooltip             | ⏳   |
| **性能优化**     | 无                      | 待添加 `v-memo`                | ⏳   |

---

## 4. 下一阶段重构计划

### 4.1 移除 jQuery 依赖 (高优先级)

**目标**：彻底移除 `data.js` 对 jQuery 的依赖。

**当前问题**：

- `data.js` 顶部 `import $ from 'jquery'`
- 部分遗留函数仍使用 `$()` 选择器

**实施方案**：

1. 审计 `data.js` 中所有 `$()` 调用
2. 将 DOM 操作迁移至 Vue 组件
3. 将事件监听迁移至 `@click` 等指令
4. 移除 jQuery import

### 4.2 配方数据 JSON 化 (高优先级)

**目标**：将 `data.js` 中的配方数据提取为纯 JSON。

**实施方案**：

1. 提取 `data` 数组为 `data.json`
2. 创建 `RecipeProvider` 类加载 JSON
3. 保持 `loadNumber` 逻辑不变，仅替换数据源
4. 添加 JSON Schema 校验

### 4.3 计算逻辑服务化 (高优先级)

**目标**：将 `loadNumber` 及相关函数封装为独立服务。

**实施方案**：

1. 创建 `CalculationService` 类
2. 封装 `xh_list`, `out_list` 为 `CalculationContext`
3. 提供异步计算接口
4. 添加计算进度回调

---

## 5. 协作 AI 模型指令 (Instruction for Models)

> "你现在的任务是协助进行遗留代码解耦。在修改 `data.js` 或 `blueprint.js` 时，请确保：
>
> 1. 所有对全局变量的访问都通过 `bridge.ts` 提供的接口进行
> 2. 禁止尝试优化 `loadNumber` 中的递归算法
> 3. 仅负责将 DOM 操作替换为 Vue 响应式状态
> 4. 保持蓝图生成的二进制兼容性"
