# `index.html` 现代化解耦重构详细实施方案

## 0. 重构进度追踪 (2026-02-15 更新)

> **状态**：✅ 已完成 - 所有核心重构任务已完成
>
> **关联文档**：[架构迁移方案.md](./架构迁移方案.md) | [data重构.md](./data重构.md) | [bluepirnt重构.md](./bluepirnt重构.md)

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
| `ErrorBoundary.vue`      | ✅   | 全局错误边界组件                                    |
| `LocaleSwitcher.vue`     | ✅   | 语言切换组件                                        |
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
| 废弃文件清理                     | ✅   | 中     | jquery-\*.js 已删除 (~96KB)   |
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

### ✅ 第七阶段：数据与服务层重构 - 已完成 (2026-02-15)

| 任务                      | 状态 | 优先级 | 备注                         |
| ------------------------- | ---- | ------ | ---------------------------- |
| 配方数据 JSON 化          | ✅   | 高     | recipes.json + schema        |
| itemMap/buildingMap 提取  | ✅   | 高     | 迁移到 types/ 和 data/       |
| CalculatorService 服务    | ✅   | 高     | 计算逻辑封装                 |
| CalculationContext 上下文 | ✅   | 高     | 替代全局变量                 |
| SettingsAdapter 适配器    | ✅   | 中     | 配方/速度/增产剂设置管理     |
| 闭包封装计算引擎          | ✅   | 高     | calculatorEngine.js 状态隔离 |
| 双引擎支持                | ✅   | 中     | 遗留+新计算引擎并存          |

### ✅ 第八阶段：质量保证 - 已完成 (2026-02-15)

| 任务             | 状态 | 优先级 | 备注               |
| ---------------- | ---- | ------ | ------------------ |
| 单元测试覆盖     | ✅   | 高     | 359个测试全部通过  |
| ESLint/Prettier  | ✅   | 中     | 代码规范工具       |
| husky pre-commit | ✅   | 中     | Git 提交前检查     |
| CI/CD 流水线     | ✅   | 中     | GitHub Actions     |
| 全局错误边界     | ✅   | 中     | ErrorBoundary 组件 |

### 🔲 后续优化 - 待进行

| 任务                | 状态 | 优先级 | 备注                      |
| ------------------- | ---- | ------ | ------------------------- |
| Web Worker 计算迁移 | 🔲   | 中     | 计算密集型任务移至 Worker |
| E2E 测试覆盖        | 🔲   | 低     | Playwright 端到端测试     |
| PWA 支持            | 🔲   | 低     | 离线可用性                |
| Tooltip 组件化      | 🔲   | 低     | 替代 `jquery.tips.js`     |

---

## 1. 目录结构规范 (当前状态)

```text
src/
├── core/                          # 核心业务逻辑
│   ├── legacy/                    # 遗留代码 (只读)
│   │   ├── data.js                # 核心流程 (1111行)
│   │   ├── calculator.js          # 计算引擎导出层 (358行)
│   │   ├── calculatorEngine.js    # 闭包封装计算引擎 (444行) ✅ 新增
│   │   ├── iconLoader.js          # 图标加载 (134行)
│   │   ├── storageManager.js      # 存储管理 (152行)
│   │   ├── recipeHelper.js        # 配方辅助 (41行)
│   │   ├── configData.js          # 配置数据 (230行)
│   │   ├── settingsHelper.js      # 设置辅助 (82行)
│   │   ├── blueprint.js           # 蓝图编码/解码 (3967行)
│   │   ├── data.d.ts              # 类型声明
│   │   └── blueprint.d.ts         # 类型声明
│   ├── types/                     # 类型定义 ✅ (714行)
│   ├── data/                      # 数据文件 ✅ (7个JSON)
│   ├── adapters/                  # 适配器 ✅ (411行)
│   ├── services/                  # 业务服务 ✅ (683行)
│   ├── utils/                     # 工具函数 ✅ (1427行)
│   ├── config/                    # 配置 ✅
│   ├── __tests__/                 # 测试 ✅ (3108行)
│   └── bridge.ts                  # 遗留代码适配层 ✅
│
├── stores/                        # Pinia 状态管理 ✅
│   ├── blueprint.ts               # 托管 demandList, excludeList, settings
│   └── __tests__/                 # Store 测试
│
├── components/                    # Vue 组件 ✅
│   ├── ControlPanel/              # 顶部控制栏组件
│   ├── ConfigPanel/               # 参数设置面板
│   ├── ResultTable/               # 核心计算表格组件
│   ├── AddItemDialog/             # 添加需求对话框
│   ├── BlueprintGenerator/        # 蓝图生成组件
│   ├── Toast/                     # 消息提示组件
│   ├── ErrorBoundary/             # 全局错误边界组件 ✅ 新增
│   ├── LocaleSwitcher/            # 语言切换组件 ✅ 新增
│   └── __tests__/                 # 组件测试
│
├── composables/                   # 组合式函数 ✅
│   ├── useIconProvider.ts         # 图标提供者
│   └── useToast.ts                # Toast 代理
│
├── workers/                       # Web Workers 🔲 待实现
│   └── calculator.worker.ts
│
├── App.vue                        # 根组件：负责生命周期管理 ✅
└── main.ts                        # 入口：挂载全局插件 ✅
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
| **错误处理**     | 无全局处理              | `ErrorBoundary.vue` 组件       | ✅   |
| **多语言支持**   | 无                      | `LocaleSwitcher.vue` + i18n    | ✅   |
| **性能优化**     | 无                      | `v-memo` + 图标缓存            | ✅   |
| **单元测试**     | 无                      | Vitest (359个测试)             | ✅   |
| **代码规范**     | 无                      | ESLint/Prettier/husky          | ✅   |
| **CI/CD**        | 无                      | GitHub Actions                 | ✅   |
| **Tooltip 提示** | `jquery.tips.js`        | 待引入 Vue Tooltip             | 🔲   |
| **Web Worker**   | 无                      | 计算密集型任务迁移             | 🔲   |
| **E2E 测试**     | 无                      | Playwright                     | 🔲   |
| **PWA 支持**     | 无                      | vite-plugin-pwa                | 🔲   |

---

## 4. 重构成果总结

### 4.1 已完成的核心重构

| 阶段   | 内容                            | 完成日期   |
| ------ | ------------------------------- | ---------- |
| 阶段 1 | 遗留代码适配器 (Bridge Pattern) | 2026-02-14 |
| 阶段 2 | 状态中心化 (Pinia Store)        | 2026-02-14 |
| 阶段 3 | UI 组件化拆分                   | 2026-02-14 |
| 阶段 4 | 指令化与事件解耦                | 2026-02-14 |
| 阶段 5 | jQuery 移除                     | 2026-02-14 |
| 阶段 6 | 性能优化                        | 2026-02-14 |
| 阶段 7 | 数据与服务层重构                | 2026-02-15 |
| 阶段 8 | 质量保证                        | 2026-02-15 |

### 4.2 代码统计

| 指标        | 数值              |
| ----------- | ----------------- |
| 遗留代码    | 6519行 (9个文件)  |
| 新架构代码  | 6343行 (38个文件) |
| 测试代码    | 3108行 (12个文件) |
| 测试用例    | 359个 ✅          |
| Vue 组件    | 8个               |
| Composables | 2个               |
| Services    | 4个               |
| Utils       | 10个              |

### 4.3 技术栈升级

| 层级     | 旧技术           | 新技术             |
| -------- | ---------------- | ------------------ |
| 运行时   | 原生 JS + jQuery | Vue 3 + TypeScript |
| 状态管理 | 全局变量         | Pinia Store        |
| UI 组件  | HTML 字符串拼接  | Vue SFC            |
| 构建工具 | 无               | Vite               |
| 类型安全 | 无               | TypeScript strict  |
| 测试框架 | 无               | Vitest             |
| 代码规范 | 无               | ESLint/Prettier    |
| CI/CD    | 无               | GitHub Actions     |

---

## 5. 后续优化计划

### 5.1 性能优化 (中优先级)

**目标**：将计算密集型任务迁移至 Web Worker。

**实施方案**：

1. 创建 `calculator.worker.ts`
2. 封装 `CalculatorService` 为 Worker 兼容接口
3. 主线程与 Worker 通信协议设计
4. 计算进度回调实现

### 5.2 测试覆盖 (低优先级)

**目标**：添加 E2E 测试覆盖。

**实施方案**：

1. 引入 Playwright
2. 编写核心流程 E2E 测试
3. CI 集成 E2E 测试

### 5.3 用户体验 (低优先级)

**目标**：PWA 支持与离线可用性。

**实施方案**：

1. 引入 `vite-plugin-pwa`
2. 配置 Service Worker
3. 添加离线缓存策略

---

## 6. 协作 AI 模型指令 (Instruction for Models)

> "你现在的任务是协助进行遗留代码解耦。在修改 `data.js` 或 `blueprint.js` 时，请确保：
>
> 1. 所有对全局变量的访问都通过 `bridge.ts` 提供的接口进行
> 2. 禁止尝试优化 `loadNumber` 中的递归算法
> 3. 仅负责将 DOM 操作替换为 Vue 响应式状态
> 4. 保持蓝图生成的二进制兼容性
> 5. 新增代码必须包含完整的 TypeScript 类型注解"
