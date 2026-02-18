# 戴森球计划量产量化计算器

<a href="https://www.gnu.org/licenses/gpl-3.0.html"><img src="https://img.shields.io/badge/license-GPLV3-blue" alt="license GPLV3"></a>
<a href="https://github.com/793383996/DSQ/actions"><img src="https://img.shields.io/github/actions/workflow/status/793383996/DSQ/ci.yml?branch=main" alt="CI Status"></a>
<a href="https://codecov.io/gh/793383996/DSQ"><img src="https://img.shields.io/codecov/c/github/793383996/DSQ" alt="Coverage"></a>

## 项目简介

戴森球计划量产量化计算器是一款专为《戴森球计划》游戏设计的工厂规划工具，帮助玩家计算生产线需求、优化资源配置、生成可导入游戏的蓝图。

### 核心特性

- 🧮 **多配方计算** - 支持同一物品多种配方混合计算
- 🎯 **可视化选择** - 直观的物品搜索与分类筛选
- 📊 **需求叠加** - 支持多需求同时计算
- 💾 **方案管理** - 保存/加载多套生产方案
- 🏭 **蓝图生成** - 一键生成可导入游戏的蓝图字符串
- 🏗️ **垂直堆叠** - 支持建筑垂直堆叠，节省占地面积
- 🌐 **国际化** - 支持中文/英文切换
- 📱 **PWA支持** - 可离线使用，支持安装到桌面
- 🔒 **纯前端** - 数据本地存储，无需后端服务

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 其他命令

```bash
# 运行单元测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行E2E测试
npm run test:e2e

# 代码检查
npm run lint

# 代码格式化
npm run format

# 启动Storybook组件文档
npm run storybook
```

## 项目结构

```
DSQ/
├── .github/                        # GitHub配置
│   └── workflows/
│       ├── ci.yml                  # CI/CD流水线：lint、test、e2e、build、deploy
│       └── release.yml             # 发布流水线：版本发布自动化
├── .husky/                         # Git Hooks
│   └── pre-commit                  # 提交前代码检查钩子
├── .storybook/                     # Storybook组件文档配置
│   ├── main.ts                     # Storybook入口配置
│   └── preview.ts                  # Storybook预览配置
├── .well-known/                    # Well-Known URI配置
│   └── appspecific/
│       └── com.chrome.devtools.json # Chrome DevTools配置
├── Scripts/                        # 遗留代码目录
│   ├── blueprint.js                # 蓝图编解码核心（遗留）：itemMap定义、蓝图JSON编解码
│   ├── cocoMessage.js              # 消息提示组件（遗留）
│   ├── data.js                     # 配方数据定义（遗留）：所有游戏配方数据
│   ├── data.json                   # 配方数据JSON格式
│   ├── e2e-setup.js                # E2E测试环境初始化
│   ├── extract-recipes.ts          # 配方数据提取脚本
│   ├── index.html.backup           # 原始HTML备份
│   └── style.css                   # 遗留样式文件
├── e2e/                            # E2E测试
│   └── calculator.spec.ts          # 计算器E2E测试用例
├── feature-test/                   # 功能测试数据
│   ├── 电力感应塔-json - 堆叠.txt   # 电力感应塔堆叠测试数据
│   └── 电力感应塔-json.txt          # 电力感应塔测试数据
├── img/                            # 静态图片资源
│   └── to.png                      # 网站图标
├── k8s/                            # Kubernetes部署配置
│   └── deployment.yaml             # K8s部署清单
├── localDocs/                      # 项目文档
│   ├── Features.md                 # 功能特性文档
│   ├── bluepirnt重构.md            # 蓝图模块重构文档
│   ├── data模块详细说明.md          # data模块详细说明
│   ├── data重构.md                 # data模块重构文档
│   ├── index重构.md                # index重构文档
│   ├── 功能清单.md                 # 功能清单文档
│   ├── 原indexUI流程拆分详细文档.md # 原UI流程拆分文档
│   ├── 原index流程拆分详细文档.md   # 原流程拆分文档
│   ├── 堆叠流程重构.md             # 堆叠流程重构文档
│   ├── 架构补齐文档.md             # 架构补齐文档
│   ├── 架构迁移方案.md             # 架构迁移方案文档
│   ├── 蓝图不堆叠模块详细说明.md    # 蓝图不堆叠模块说明
│   ├── 蓝图堆叠模块详细说明.md      # 蓝图堆叠模块说明
│   ├── 蓝图模块说明.md             # 蓝图模块说明
│   ├── 重构后部署方案.md           # 重构后部署方案
│   └── 需求文档.md                 # 需求文档
├── public/                         # 公共静态资源
│   ├── 429.html                    # 请求过多错误页面
│   ├── health.json                 # 健康检查端点
│   ├── og-image.svg                # Open Graph图片
│   ├── pwa-192x192.svg             # PWA图标192x192
│   ├── pwa-512x512.svg             # PWA图标512x512
│   ├── ready.json                  # 就绪检查端点
│   ├── robots.txt                  # 爬虫规则
│   └── sitemap.xml                 # 站点地图
├── quote/                          # 页眉页脚模板
│   ├── localDocs/
│   │   └── 模块说明.md             # 模块说明文档
│   ├── explanation.html            # 说明页面模板
│   └── updata.html                 # 更新页面模板
├── src/                            # 源代码目录
│   ├── components/                 # Vue组件
│   │   ├── AddItemDialog/
│   │   │   └── AddItemDialog.vue   # 添加物品对话框：物品搜索、分类筛选、数量输入
│   │   ├── BlueprintGenerator/
│   │   │   └── BlueprintGenerator.vue # 蓝图生成器：生成蓝图字符串、下载蓝图文件
│   │   ├── ConfigPanel/
│   │   │   └── ConfigPanel.vue     # 配置面板：设备类型选择、增产剂配置、蓝图参数设置
│   │   ├── ControlPanel/
│   │   │   └── ControlPanel.vue    # 控制面板：产量/设备数量输入、添加需求、设置按钮
│   │   ├── DemandList/
│   │   │   └── DemandList.vue      # 需求列表：显示已添加需求、编辑数量、删除需求
│   │   ├── ErrorBoundary/
│   │   │   ├── ErrorBoundary.vue   # 错误边界：捕获组件错误、显示错误UI、重试机制
│   │   │   └── ErrorBoundary.stories.ts # 错误边界Storybook文档
│   │   ├── LocaleSwitcher/
│   │   │   ├── LocaleSwitcher.vue  # 语言切换：中英文切换下拉框
│   │   │   └── LocaleSwitcher.stories.ts # 语言切换Storybook文档
│   │   ├── PWAUpdateBanner/
│   │   │   └── PWAUpdateBanner.vue # PWA更新提示：检测新版本、提示用户刷新
│   │   ├── ResultTable/
│   │   │   └── ResultTable.vue     # 结果表格：树形展示计算结果、排除物品、配方选择
│   │   ├── Skeleton/
│   │   │   ├── Skeleton.vue        # 骨架屏基础组件：加载占位动画
│   │   │   ├── SkeletonCard.vue    # 卡片骨架屏
│   │   │   ├── SkeletonTable.vue   # 表格骨架屏
│   │   │   └── index.ts            # 骨架屏组件导出
│   │   ├── Toast/
│   │   │   └── Toast.vue           # 消息提示：success/error/warning/info/loading
│   │   └── layout/
│   │       ├── ResponsiveContainer.vue # 响应式容器：自适应宽度、响应式padding
│   │       ├── ResponsiveGrid.vue  # 响应式网格：自适应列数、响应式间距
│   │       ├── ResponsiveHide.vue  # 响应式隐藏：断点控制显示/隐藏
│   │       └── index.ts            # 布局组件导出
│   ├── composables/                # 组合式函数
│   │   ├── useBreakpoints.ts       # 断点检测：响应式断点(xs/sm/md/lg/xl/2xl)
│   │   ├── useIconProvider.ts      # 图标提供者：物品图标加载、缓存、Base64转换
│   │   ├── useMeta.ts              # 元数据管理：动态设置title/description/og标签
│   │   └── useToast.ts             # 消息提示：全局toast API封装
│   ├── core/                       # 核心业务逻辑
│   │   ├── adapters/               # 适配器层
│   │   │   ├── BlueprintAdapter.ts # 蓝图适配器：封装蓝图生成、配置转换
│   │   │   ├── RecipeAdapter.ts    # 配方适配器：配方数据转换、索引构建
│   │   │   ├── SettingsAdapter.ts  # 设置适配器：配方设置/速度设置/增产剂设置管理
│   │   │   └── index.ts            # 适配器导出
│   │   ├── blueprint/              # 蓝图生成模块
│   │   │   ├── generators/         # 生成器
│   │   │   │   ├── building/       # 建筑生成器
│   │   │   │   │   ├── AssemblerGenerator.ts      # 制造台生成器
│   │   │   │   │   ├── BaseBuildingGenerator.ts   # 建筑生成器基类
│   │   │   │   │   ├── BuildingGeneratorFactory.ts# 建筑生成器工厂
│   │   │   │   │   ├── ColliderGenerator.ts       # 粒子对撞机生成器
│   │   │   │   │   ├── LabGenerator.ts            # 研究站生成器
│   │   │   │   │   ├── PlantGenerator.ts         # 化工厂生成器
│   │   │   │   │   ├── RefineryGenerator.ts      # 精炼厂生成器
│   │   │   │   │   ├── SmelterGenerator.ts       # 熔炉生成器
│   │   │   │   │   └── index.ts                   # 建筑生成器导出
│   │   │   │   ├── conveyor/       # 传送带生成器
│   │   │   │   │   ├── ConveyorConnectionBuilder.ts    # 传送带连接构建器
│   │   │   │   │   ├── ConveyorNodeBuilder.ts         # 传送带节点构建器
│   │   │   │   │   ├── SprayCoaterConveyorBuilder.ts  # 喷涂机传送带构建器
│   │   │   │   │   └── index.ts                       # 传送带生成器导出
│   │   │   │   ├── sorter/         # 分拣器生成器
│   │   │   │   │   ├── ColliderSorterStrategy.ts      # 对撞机分拣器策略
│   │   │   │   │   ├── LabSorterStrategy.ts           # 研究站分拣器策略
│   │   │   │   │   ├── PlantSorterStrategy.ts         # 化工厂分拣器策略
│   │   │   │   │   ├── RefinerySorterStrategy.ts      # 精炼厂分拣器策略
│   │   │   │   │   ├── SmelterAssemblerSorterStrategy.ts # 熔炉/制造台分拣器策略
│   │   │   │   │   ├── SorterPositionCalculator.ts    # 分拣器位置计算器
│   │   │   │   │   ├── SorterPositionStrategy.ts      # 分拣器位置策略接口
│   │   │   │   │   └── index.ts                       # 分拣器生成器导出
│   │   │   │   ├── BuildingGenerator.ts    # 建筑生成器：建筑布局、索引分配
│   │   │   │   ├── ConnectionBuilder.ts    # 连接构建器：建筑间连接
│   │   │   │   ├── ConveyorGenerator.ts    # 传送带生成器：传送带网络生成
│   │   │   │   ├── ItemSummaryCalculator.ts # 物品汇总计算器：输入输出汇总
│   │   │   │   ├── LayoutCalculator.ts      # 布局计算器：蓝图尺寸、建筑位置
│   │   │   │   ├── SorterGenerator.ts       # 分拣器生成器：分拣器位置、朝向
│   │   │   │   └── index.ts                 # 生成器导出
│   │   │   ├── services/
│   │   │   │   ├── BlueprintService.ts      # 蓝图服务：蓝图生成入口、配置管理
│   │   │   │   └── index.ts                 # 服务导出
│   │   │   ├── types/
│   │   │   │   ├── buildingGenerator.ts     # 建筑生成器类型定义
│   │   │   │   ├── conveyorGenerator.ts     # 传送带生成器类型定义
│   │   │   │   └── index.ts                 # 类型导出
│   │   │   └── index.ts                     # 蓝图模块导出
│   │   ├── config/
│   │   │   └── app.config.ts                # 应用配置：版本、存储键名、默认值
│   │   ├── data/                            # 数据文件
│   │   │   ├── buildingMap.json             # 建筑映射：itemId/modelIndex/size等
│   │   │   ├── buildingType.json            # 建筑类型定义
│   │   │   ├── index.ts                     # 数据导出
│   │   │   ├── itemMap.json                 # 物品映射：iconId/name/remark
│   │   │   ├── productionCategory.json      # 生产类别定义
│   │   │   ├── recipeMap.json               # 配方映射
│   │   │   ├── recipes.json                 # 配方数据：所有游戏配方
│   │   │   └── recipes.schema.json          # 配方数据JSON Schema
│   │   ├── legacy/                          # 遗留代码封装
│   │   │   ├── blueprint.d.ts               # 蓝图模块类型声明
│   │   │   ├── blueprint.js                 # 蓝图模块封装：编解码函数
│   │   │   ├── calculator.d.ts              # 计算器类型声明
│   │   │   ├── calculator.js                # 计算器模块：loadNumber/find/checkResult
│   │   │   ├── configData.d.ts              # 配置数据类型声明
│   │   │   ├── configData.js                # 配置数据：energyData/spaceData
│   │   │   ├── data.d.ts                    # data模块类型声明
│   │   │   ├── data.js                      # data模块：update_all核心计算逻辑
│   │   │   ├── iconLoader.d.ts              # 图标加载器类型声明
│   │   │   ├── iconLoader.js                # 图标加载器：游戏图标加载
│   │   │   ├── recipeHelper.d.ts            # 配方助手类型声明
│   │   │   ├── recipeHelper.js              # 配方助手：getGroup/getPfs
│   │   │   ├── settingsHelper.d.ts          # 设置助手类型声明
│   │   │   ├── settingsHelper.js            # 设置助手：设置持久化
│   │   │   ├── storageManager.d.ts          # 存储管理类型声明
│   │   │   └── storageManager.js            # 存储管理：localStorage封装
│   │   ├── services/                        # 服务层
│   │   │   ├── CalculationContext.ts        # 计算上下文：消费/生产记录、递归深度
│   │   │   ├── CalculatorService.ts         # 计算服务：计算入口、状态管理
│   │   │   ├── RecipeCalculator.ts          # 配方计算器：loadNumber/find/checkResult
│   │   │   ├── StackService.ts              # 堆叠服务：垂直堆叠、索引重映射
│   │   │   ├── UpdateAllService.ts          # 更新服务：update_all逻辑封装
│   │   │   └── index.ts                     # 服务导出
│   │   ├── types/                           # 类型定义
│   │   │   ├── blueprint.ts                 # 蓝图类型：IBlueprintData/IBlueprintBuilding
│   │   │   ├── buildingMap.ts               # 建筑映射类型
│   │   │   ├── calculator.ts                # 计算器类型
│   │   │   ├── index.ts                     # 类型导出
│   │   │   ├── itemMap.ts                   # 物品映射类型
│   │   │   ├── legacy.ts                    # 遗留代码类型
│   │   │   ├── recipe.ts                    # 配方类型：IRecipe/IDemand
│   │   │   ├── settings.ts                  # 设置类型：IRecipeSettings/ISpeedSettings
│   │   │   └── stack.ts                     # 堆叠类型：IStackConfig/ICloneResult
│   │   ├── utils/                           # 工具函数
│   │   │   ├── BinaryReader.ts              # 二进制读取器：蓝图解码用
│   │   │   ├── BinaryWriter.ts              # 二进制写入器：蓝图编码用
│   │   │   ├── BlueprintDecoder.ts          # 蓝图解码器：蓝图字符串→JSON
│   │   │   ├── BlueprintEncoder.ts          # 蓝图编码器：JSON→蓝图字符串
│   │   │   ├── IndexMapper.ts               # 索引映射器：堆叠时索引重映射
│   │   │   ├── index.ts                     # 工具导出
│   │   │   ├── md5.ts                       # MD5哈希：蓝图校验
│   │   │   ├── storage.ts                   # 存储工具：localStorage封装
│   │   │   ├── unitConverter.ts             # 单位转换器
│   │   │   └── validator.ts                 # 验证器：数据校验
│   │   ├── workers/                         # Web Worker
│   │   │   ├── CalculatorWorkerService.ts   # Worker服务：Worker生命周期管理
│   │   │   ├── calculator.worker.ts         # 计算Worker：后台计算逻辑
│   │   │   ├── index.ts                     # Worker导出
│   │   │   └── types.ts                     # Worker类型定义
│   │   └── bridge.ts                        # 遗留代码桥接层：新旧代码交互
│   ├── i18n/                                # 国际化
│   │   ├── index.ts                         # i18n配置：语言检测、切换
│   │   └── locales/                         # 语言文件
│   │       ├── en-US.ts                     # 英文翻译
│   │       └── zh-CN.ts                     # 简体中文翻译
│   ├── stores/                              # Pinia状态管理
│   │   └── blueprint.ts                     # 蓝图状态：需求列表、计算结果、设置
│   ├── utils/                               # 通用工具
│   │   ├── desensitize.ts                   # 数据脱敏：敏感信息处理
│   │   ├── errorReporter.ts                 # 错误上报：错误收集、上报
│   │   ├── format.ts                        # 格式化工具：数字格式化
│   │   ├── logger.ts                        # 日志工具：分级日志、脱敏
│   │   ├── validators.ts                    # 验证器：通用验证函数
│   │   └── webVitals.ts                     # 性能监控：LCP/FID/CLS等指标
│   ├── App.vue                              # 根组件：应用布局、全局组件
│   ├── main.ts                              # 入口文件：Vue应用初始化
│   └── shims.d.ts                           # 类型声明垫片
├── .dockerignore                            # Docker忽略文件
├── .env.development                         # 开发环境变量
├── .env.example                             # 环境变量示例
├── .env.production                          # 生产环境变量
├── .eslintignore                            # ESLint忽略文件
├── .eslintrc.cjs                            # ESLint配置
├── .gitignore                               # Git忽略文件
├── .prettierignore                          # Prettier忽略文件
├── .prettierrc                              # Prettier配置
├── Dockerfile                               # Docker镜像构建
├── LICENSE                                  # 开源许可证
├── README.md                                # 项目说明文档
├── docker-compose.yml                       # Docker Compose配置
├── favicon.ico                              # 网站图标
├── index.html                               # HTML入口
├── nginx.conf                               # Nginx配置
├── package-lock.json                        # 依赖锁定文件
├── package.json                             # 项目配置：依赖、脚本
├── playwright.config.ts                     # E2E测试配置
├── tsconfig.json                            # TypeScript配置
├── tsconfig.node.json                       # Node TypeScript配置
├── vercel.json                              # Vercel部署配置
├── vite.config.ts                           # Vite构建配置
├── vitest.config.ts                         # Vitest测试配置
└── vitest.shims.d.ts                        # Vitest类型垫片
```

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         表现层 (UI Layer)                        │
│  Vue 3 SFC组件 + 响应式布局 + 国际化                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       状态管理层 (State Layer)                    │
│  Pinia Store + 持久化 + 响应式状态                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       服务层 (Service Layer)                      │
│  CalculatorService / BlueprintService / StackService            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       适配器层 (Adapter Layer)                    │
│  RecipeAdapter / SettingsAdapter / BlueprintAdapter             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据层 (Data Layer)                         │
│  recipes.json / itemMap.json / buildingMap.json                 │
└─────────────────────────────────────────────────────────────────┘
```

### 核心模块

| 模块       | 职责                 | 关键文件               |
| ---------- | -------------------- | ---------------------- |
| 计算引擎   | 需求计算、配方解析   | `CalculatorService.ts` |
| 蓝图生成   | 建筑布局、传送带网络 | `BlueprintService.ts`  |
| 堆叠服务   | 垂直堆叠、索引映射   | `StackService.ts`      |
| Web Worker | 非阻塞计算           | `calculator.worker.ts` |
| 状态管理   | 全局状态、持久化     | `stores/blueprint.ts`  |

## 功能清单

### 需求输入

- 物品搜索与分类筛选
- 产量/设备数量输入
- 需求添加/删除/清空

### 计算结果

- 树形展示各层级原料
- 汇总统计（设备数、电力）
- 物品分类（原料/中间品/产品）
- 排除物品/标注颜色
- 多配方计算与配方选择

### 设备配置

- 熔炉选择（电弧/位面/负熵）
- 制造台选择（Mk.I/II/III/重组式）
- 化工厂选择（普通/量子）
- 研究站选择（矩阵/自演化）
- 精炼厂/对撞机配置

### 增产剂配置

- 等级选择（Mk.I/II/III）
- 效果选择（加速/增产/无）
- 单物品配置
- 自喷涂支持

### 蓝图生成

- 布局长宽比设置
- 紧凑布局模式
- 垂直堆叠（1-4层）
- 研究站堆叠层数
- 电力感应塔自动添加
- 传送带/分拣器等级配置

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 框架     | Vue 3 + TypeScript  |
| 状态管理 | Pinia               |
| 构建工具 | Vite                |
| 测试     | Vitest + Playwright |
| 代码规范 | ESLint + Prettier   |
| CI/CD    | GitHub Actions      |
| 容器化   | Docker              |
| PWA      | vite-plugin-pwa     |
| 国际化   | vue-i18n            |
| 组件文档 | Storybook           |

## 架构完成度

```
核心功能层  ████████████████████████████████ 100%
组件化架构  ████████████████████████████████ 100%
状态管理    ████████████████████████████████ 100%
类型系统    ████████████████████████████████ 100%
单元测试    ████████████████████████████████ 100%
错误处理    ████████████████████████████████ 100%
开发工具链  ████████████████████████████████ 100%
CI/CD      ████████████████████████████████ 100%
E2E测试    ████████████████████████████████ 100%
SEO/可访问 ████████████████████░░░░░░░░░░░░  70%
PWA/性能   ████████████████████████████████ 100%
安全加固   ████████████████████████████████ 100%
国际化     ████████████████████████████████ 100%
Docker部署 ████████████████████████████████ 100%
组件文档   ████████████████████████████████ 100%
```

## 测试覆盖

```
Test Files  30+ passed
Tests       648 passed
Duration    ~3s
```

### 测试类型

- 单元测试：核心业务逻辑
- 组件测试：Vue组件行为
- E2E测试：多浏览器端到端测试（Chromium/Firefox/Mobile）

### 测试文件清单

| 测试类别 | 测试文件                     | 测试内容        |
| -------- | ---------------------------- | --------------- |
| 核心逻辑 | `recipe.test.ts`             | 配方适配器      |
| 核心逻辑 | `calculatorService.test.ts`  | 计算服务        |
| 核心逻辑 | `calculatorEngine.test.ts`   | 计算引擎        |
| 核心逻辑 | `calculationContext.test.ts` | 计算上下文      |
| 核心逻辑 | `dataConsistency.test.ts`    | 数据一致性      |
| 核心逻辑 | `bridge.test.ts`             | 桥接层          |
| 核心逻辑 | `stackService.test.ts`       | 堆叠服务        |
| 蓝图     | `blueprint.test.ts`          | 蓝图编解码      |
| 蓝图     | `blueprintService.test.ts`   | 蓝图服务        |
| 蓝图     | `buildingGenerator.test.ts`  | 建筑生成器      |
| 蓝图     | `conveyorGenerator.test.ts`  | 传送带生成器    |
| 适配器   | `BlueprintAdapter.test.ts`   | 蓝图适配器      |
| 适配器   | `SettingsAdapter.test.ts`    | 设置适配器      |
| Worker   | `calculatorWorker.test.ts`   | Worker测试      |
| 组件     | `ErrorBoundary.test.ts`      | 错误边界组件    |
| Store    | `blueprint.test.ts`          | Blueprint Store |
| E2E      | `calculator.spec.ts`         | E2E计算流程     |

## 部署方式

### 静态部署

```bash
# 构建
npm run build

# 部署dist目录到任意静态服务器
```

### Docker部署

```bash
# 构建镜像
docker build -t dsq-calculator .

# 运行容器
docker run -p 80:80 dsq-calculator

# 或使用docker-compose
docker-compose up -d
```

### GitHub Pages

项目配置了GitHub Actions自动部署，推送到main分支后自动构建部署。

## CI/CD流程

### 流水线阶段

```
┌──────┐   ┌──────┐   ┌─────────────┐   ┌───────┐   ┌────────┐
│ lint │ → │ test │ → │ e2e-chromium│ → │ build │ → │ deploy │
└──────┘   └──────┘   └─────────────┘   └───────┘   └────────┘
                           ↓
                    ┌─────────────┐
                    │ e2e-firefox │ (可选)
                    └─────────────┘
                           ↓
                    ┌─────────────┐
                    │ e2e-mobile  │ (可选)
                    └─────────────┘
```

### 自动化检查

| 检查项   | 触发条件 | 说明           |
| -------- | -------- | -------------- |
| ESLint   | 每次提交 | 代码风格检查   |
| 单元测试 | 每次提交 | 核心逻辑验证   |
| E2E测试  | PR/合并  | 多浏览器兼容性 |
| 构建验证 | 每次提交 | 确保可构建     |
| 自动部署 | main分支 | GitHub Pages   |

## 技术债务迁移

### 遗留代码迁移状态

| 阶段    | 内容                                                  | 状态      |
| ------- | ----------------------------------------------------- | --------- |
| Phase 1 | `data.js` 核心计算逻辑 → `CalculatorService.ts`       | ✅ 已完成 |
| Phase 2 | `blueprint.js` 编解码 → `BlueprintEncoder/Decoder.ts` | ✅ 已完成 |
| Phase 3 | `data.js` 配方数据 → `recipes.json`                   | ✅ 已完成 |
| Phase 4 | 全局变量 → Pinia Store                                | ✅ 已完成 |
| Phase 5 | `blueprint.js` 生成器 → `BlueprintService`            | ✅ 已完成 |
| Phase 6 | 国际化支持 → `vue-i18n`                               | ✅ 已完成 |
| Phase 7 | E2E测试 → Playwright                                  | ✅ 已完成 |
| Phase 8 | PWA支持 → vite-plugin-pwa                             | ✅ 已完成 |

## 开发指南

### 代码规范

项目使用ESLint + Prettier进行代码规范检查，提交代码前会自动执行lint检查。

```bash
# 手动检查
npm run lint

# 自动修复
npm run lint -- --fix

# 格式化
npm run format
```

### 提交规范

```
[模块]：[总结标题]

[版本]：[###]

[方案]：[###]

[需求Id/bugId]：[###]

[影响范围]：[###]

[测试建议]：[###]
```

### 分支策略

- `main` - 主分支，稳定版本
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

## 常见问题

### 计算相关

- **传送带参考数据**：普通360/min、高速720/min、极速1800/min
- **采矿机默认**：6个矿脉
- **大型采矿机默认**：20个矿脉
- **喷涂机**：加速与增产剂效果相同

### 蓝图生成

- 支持的建筑类型：熔炉、制造台、精炼厂、对撞机、化工厂、研究站
- 研究站支持垂直堆叠，其他建筑通过克隆实现堆叠

## 相关链接

- [Wiki帮助](https://github.com/793383996/DSQ/wiki)
- [Issues](https://github.com/793383996/DSQ/issues)
- [戴森球计划工具交流QQ群：53309723](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=UzzPv3ic7Fk9EDCyHo_4gkWQLR3WEA9Y&authKey=ysjOY0JQOSpT2ZCLkttSzI73sXyzu%2FXEqJXMmY2O645LpO6GOD5lRBrjdalqpO5k&noverify=0&group_code=53309723)

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m '[模块]：添加某某功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

本项目采用 [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) 许可证。

## 致谢

感谢所有为本项目做出贡献的开发者！
