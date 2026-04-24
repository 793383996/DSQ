# DSQ 前端 Vue 3 + Pinia + 全量 TypeScript 原地重构实施计划

日期：2026-04-24  
适用范围：`index.html`、`main.js`、`vite.config.*`、`Scripts/`、`src/`、`localDev/`、`.github/workflows/`

## 1. 目标与约束

### 1.1 最终目标

将当前“`Vite` 壳层 + legacy 脚本顺序注入 + `Vue2` 全局实例 + 全局共享状态”的过渡架构，演进为：

1. 单一 `Vite` 构建入口
2. `Vue 3 + Pinia + vue-i18n + TypeScript` 作为唯一一方运行时承载层
3. 业务逻辑模块化、类型化、可测试
4. 蓝图链路通过标准快照与模块化 Worker 交互
5. 发布产物收敛到 `dist-vite/`

### 1.2 本轮必须保持不变

1. 纯前端静态部署模型不变
2. `zh-CN` / `en-US` 双语能力不变
3. 首页 URL、语言查询参数、关键 DOM ID 与主要交互语义不变
4. 法律页面继续保留为独立静态 HTML
5. 蓝图生成、HTTPS 复制限制、SEO 关键标记不变

### 1.3 当前回合实施边界

本轮只落地 Phase 0 和 Phase 1 的首批基础设施：

1. 重构主计划文档
2. legacy 运行时清单文档
3. 重构验收矩阵
4. `Vue 3 + Pinia + TypeScript + vue-i18n` 基础设施
5. `src/` 骨架与最小桥接层
6. `typecheck` 门禁与 CI 接入

以下内容明确不在本轮完成：

1. `data.ui-bindings.js` 组件化重写
2. `scheduleUpdateAll()` / `update_all()` 逻辑下线
3. `Vue2`、`jQuery`、`cocoMessage`、蓝图 Worker 的彻底退场
4. `Scripts/data.js` 4000+ 行数据本体重构

## 2. 当前架构诊断

### 2.1 运行时现状

当前入口仍由 `main.js` 顺序加载 legacy 脚本：

1. `error-monitor.js`
2. `i18n.js`
3. `dom.legacy.js`
4. `vue.min.js`
5. `cocoMessage.js`
6. `calc-core.js`
7. `data.state.js`
8. `domain.dictionary.js`
9. `app.services.js`
10. `data.storage.js`
11. `data.js`
12. `data.recipe-init.js`
13. `data.recipe.js`
14. `data.recipe-ui.js`
15. `data.blueprint.js`
16. `ui.panel-controller.js`
17. `data.ui-bindings.js`
18. `data.bootstrap.js`
19. `index.events.js`

当前页面的正确性依赖脚本加载顺序，而不是显式模块契约。

### 2.2 关键问题

1. `data.ui-bindings.js` 仍承担 Vue 挂载、事件绑定、状态回写、重算调度、项目管理、SEO 刷新等多重职责。
2. `window.settings`、`window.projects`、`window.xqs`、`window.currentCalculationResult` 等共享状态仍是主数据流。
3. `README.md` 曾指向已删除或不存在的 `localDocs` 文档，文档可信度已出现漂移。
4. `dist/` 与 `dist-vite/` 双轨仍共存，发布链收口不彻底。
5. `lint` 仍容忍 legacy warning，说明历史脚本风格尚未收敛到长期可维护状态。

### 2.3 积极基础

1. `test:unit`、`test:e2e`、`test:a11y`、`test:integration` 已具备
2. `jquery:check`、Lighthouse、Security、SEO、Metrics、Monitoring 基线已建立
3. `calc-core`、`app.services`、`domain.dictionary`、`data.storage` 已具备可抽离雏形
4. `data.js` 末尾已不再承载主要业务控制逻辑，说明拆分已经开始

## 3. 目标架构

### 3.1 目录目标

```text
src/
├─ main.ts
├─ env.d.ts
├─ app/
├─ components/
├─ domain/
├─ features/
├─ legacy-adapters/
├─ services/
├─ stores/
├─ types/
└─ workers/
```

### 3.2 状态模型

固定拆分为六类 `Pinia Store`：

1. `app`：启动状态、运行时阶段、legacy 兼容状态
2. `ui`：语言、面板开合、交互状态
3. `settings`：全局设置、速度配置、配方配置
4. `projects`：方案列表、当前方案、快照持久化
5. `calculation`：需求、排除项、计算结果、SEO 快照
6. `blueprint`：蓝图配置、生成状态、错误与进度
7. `seo`：标题、描述、canonical、hreflang、JSON-LD

### 3.3 公共接口

1. `bootstrapDsqApp(): Promise<void>`
2. `calculateProductionPlan(snapshot: CalculationInput): CalculationOutput`
3. `generateBlueprint(snapshot: BlueprintSnapshot, config: BlueprintConfig): Promise<BlueprintResult>`
4. `loadPersistedState() / savePersistedState() / migrateLegacyStorage()`

### 3.4 兼容策略

1. 过渡期允许保留 `main.js` 作为桥接入口
2. 过渡期允许保留 legacy 脚本运行，但必须由新入口统一调度
3. 过渡期只允许薄桥接，不允许继续新增全局业务逻辑
4. 新增业务必须优先进入 `src/`

## 4. 分阶段实施计划

### Phase 0：基线冻结与文档修正

目标：

1. 把真实现状固定下来
2. 修正文档漂移
3. 形成后续重构验收基线

落地项：

1. 新增本重构主计划文档
2. 新增 legacy 运行时清单与迁移边界文档
3. 新增重构验收矩阵
4. 收口 `README.md` 的无效文档引用
5. 为“禁止新增全局状态写入”和“README 文档链接有效性”准备检查脚本

DoD：

1. 三份核心文档就位
2. `README.md` 只指向真实存在的文档
3. 后续阶段拥有固定验收矩阵

### Phase 1：TypeScript 与 Vue 3 基础设施落地

目标：

1. 不改变现有行为
2. 建立 `Vue 3 + Pinia + TypeScript` 新骨架
3. 把 `typecheck` 纳入门禁

落地项：

1. 新增 `typescript`、`vue`、`pinia`、`vue-i18n`、`vue-tsc`、`@vitejs/plugin-vue`、`@types/node`
2. `vite.config.mjs -> vite.config.ts`
3. 新增 `tsconfig.json`、`tsconfig.node.json`、`src/env.d.ts`
4. 新增 `src/main.ts`、`src/app/bootstrap.ts`、`src/app/AppShell.vue`
5. 新增 `src/stores/`、`src/services/`、`src/types/`、`src/legacy-adapters/` 骨架
6. 增加 `npm run typecheck`
7. 在 CI 主链加入 `typecheck`

DoD：

1. `typecheck` 可运行
2. `build` 仍输出 `dist-vite/`
3. 旧页面功能不因新骨架接入而退化

### Phase 2：领域逻辑抽离到 TypeScript 模块

目标：

1. 先抽离纯逻辑，再谈 UI 替换
2. 让迁移建立在等价行为之上

优先迁移对象：

1. `calc-core`
2. `domain.dictionary`
3. `app.services`
4. `data.storage`

DoD：

1. 领域与服务层拥有 TS 等价模块
2. UI 不再直接负责存储迁移、名称归一化和数值校验

### Phase 3：Pinia 状态内核接管

目标：

1. 终止共享全局状态主导的数据流
2. 把 legacy 状态读写迁移到 Store Action

DoD：

1. 新增逻辑禁止直接写 `window.*`
2. `currentCalculationResult` 改由 Store 派生

### Phase 4：Vue 3 组件化重写交互层

目标：

1. 下线 `data.ui-bindings.js` 的核心职责
2. 让页面进入组件化和组合式状态管理

DoD：

1. 控制区、结果区、弹层和项目管理已由 Vue 3 接管
2. Vue2 不再处于主交互链路

### Phase 5：蓝图 Worker、发布链和遗留依赖清退

目标：

1. 完成关键依赖退场
2. 完成单轨发布收口

DoD：

1. 单轨 `dist-vite/`
2. 零 `Vue2/jQuery` 关键路径依赖
3. `typecheck + lint + unit + integration + e2e + a11y + build` 全绿

## 5. 首批实施清单

本轮固定只做以下事项：

1. 新增 `localDocs/DSQ前端Vue3原地重构实施计划.md`
2. 新增 `localDocs/legacy运行时清单与迁移边界.md`
3. 新增 `localDocs/重构验收矩阵.md`
4. 新增 `tsconfig.json`、`tsconfig.node.json`
5. 将 `vite.config.mjs` 迁移为 `vite.config.ts`
6. 在 `package.json` 中加入 `Vue 3 / Pinia / vue-i18n / TypeScript / vue-tsc / plugin-vue / typecheck`
7. 新增 `src/main.ts`、`src/app/bootstrap.ts`、`src/app/AppShell.vue`
8. 新增 `src/stores/`、`src/services/`、`src/types/`、`src/legacy-adapters/`
9. 新增 `src/types/legacy-globals.d.ts`
10. 在 CI 中加入 `npm run typecheck`

明确不碰的在途文件：

1. `Scripts/data.recipe.js`
2. `localDev/node-scripts/e2e.mjs`
3. `localDev/tests/global-settings-recipe.test.mjs`

## 6. 风险与控制

### 6.1 高风险项

1. 新依赖接入可能影响现有 `build`
2. `main.js` 入口迁移可能影响 legacy 脚本加载时序
3. 文档修正若不谨慎，可能再次引入 README 漂移

### 6.2 控制策略

1. 保留 `main.js` 作为桥接入口，不直接替换 `index.html`
2. 新 Vue 3 根节点默认隐藏挂载，不干扰当前页面布局
3. 所有新逻辑先落在 `src/`，旧逻辑不做大规模移动
4. 先跑 `typecheck / unit / lint / jquery:check / build` 作为首轮收口

## 7. 验收标准

本轮验收标准固定为：

1. 文档已写入仓库
2. `Vue 3 + Pinia + TypeScript` 基础设施可运行
3. `npm run typecheck` 可运行
4. `npm run test:unit` 不退化
5. `npm run lint` 不出现新增阻塞错误
6. `npm run jquery:check` 继续通过
7. `npm run build` 继续成功并输出 `dist-vite/`

## 8. 后续执行顺序

1. 先完成本轮基础设施与文档落地
2. 再推进 Phase 2 的领域逻辑抽离
3. 再推进 Phase 3 的状态接管
4. 最后再进入大规模 UI 组件化和 legacy 依赖退场

结论：

当前最正确的推进方式不是直接重写 UI，而是先建立“可承载重写”的新底座。本轮只负责把底座立起来，并证明它不会破坏现有系统。
