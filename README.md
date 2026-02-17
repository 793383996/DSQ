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
├── .github/                    # GitHub配置
│   └── workflows/              # CI/CD流水线
├── .husky/                     # Git Hooks
├── .storybook/                 # Storybook配置
├── dist/                       # 构建输出目录
├── e2e/                        # E2E测试
├── img/                        # 静态图片资源
├── public/                     # 公共静态资源
├── quote/                      # 页眉页脚模板
├── Scripts/                    # 遗留代码目录
│   ├── blueprint.js            # 蓝图生成核心（遗留）
│   ├── data.js                 # 计算核心（遗留）
│   └── localDocs/              # 项目文档
├── src/                        # 源代码目录
│   ├── components/             # Vue组件
│   │   ├── AddItemDialog/      # 添加物品对话框
│   │   ├── BlueprintGenerator/ # 蓝图生成器
│   │   ├── ConfigPanel/        # 配置面板
│   │   ├── ControlPanel/       # 控制面板
│   │   ├── DemandList/         # 需求列表
│   │   ├── ErrorBoundary/      # 错误边界
│   │   ├── LocaleSwitcher/     # 语言切换
│   │   ├── PWAUpdateBanner/    # PWA更新提示
│   │   ├── ResultTable/        # 结果表格
│   │   ├── Skeleton/           # 骨架屏组件
│   │   ├── Toast/              # 消息提示
│   │   └── layout/             # 响应式布局组件
│   ├── composables/            # 组合式函数
│   │   ├── useBreakpoints.ts   # 断点检测
│   │   ├── useIconProvider.ts  # 图标提供者
│   │   ├── useMeta.ts          # 元数据管理
│   │   └── useToast.ts         # 消息提示
│   ├── core/                   # 核心业务逻辑
│   │   ├── adapters/           # 适配器层
│   │   │   ├── BlueprintAdapter.ts  # 蓝图适配器
│   │   │   ├── RecipeAdapter.ts     # 配方适配器
│   │   │   └── SettingsAdapter.ts   # 设置适配器
│   │   ├── blueprint/          # 蓝图生成模块
│   │   │   ├── generators/     # 生成器
│   │   │   │   ├── building/   # 建筑生成器
│   │   │   │   ├── conveyor/   # 传送带生成器
│   │   │   │   └── sorter/     # 分拣器生成器
│   │   │   ├── services/       # 蓝图服务
│   │   │   └── types/          # 类型定义
│   │   ├── data/               # 数据文件
│   │   │   ├── recipes.json    # 配方数据
│   │   │   ├── itemMap.json    # 物品映射
│   │   │   └── buildingMap.json# 建筑映射
│   │   ├── legacy/             # 遗留代码封装
│   │   ├── services/           # 服务层
│   │   │   ├── CalculatorService.ts  # 计算服务
│   │   │   ├── CalculationContext.ts # 计算上下文
│   │   │   └── StackService.ts       # 堆叠服务
│   │   ├── types/              # 类型定义
│   │   ├── utils/              # 工具函数
│   │   │   ├── BlueprintEncoder.ts   # 蓝图编码
│   │   │   ├── BlueprintDecoder.ts   # 蓝图解码
│   │   │   └── IndexMapper.ts        # 索引映射
│   │   ├── workers/            # Web Worker
│   │   │   ├── calculator.worker.ts  # 计算Worker
│   │   │   └── CalculatorWorkerService.ts
│   │   └── bridge.ts           # 遗留代码桥接层
│   ├── i18n/                   # 国际化
│   │   └── locales/            # 语言文件
│   │       ├── zh-CN.ts        # 简体中文
│   │       └── en-US.ts        # 英文
│   ├── stores/                 # Pinia状态管理
│   │   └── blueprint.ts        # 蓝图状态
│   ├── utils/                  # 通用工具
│   │   ├── errorReporter.ts    # 错误上报
│   │   ├── logger.ts           # 日志工具
│   │   └── webVitals.ts        # 性能监控
│   ├── App.vue                 # 根组件
│   └── main.ts                 # 入口文件
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── .eslintrc.cjs               # ESLint配置
├── .prettierrc                 # Prettier配置
├── Dockerfile                  # Docker配置
├── docker-compose.yml          # Docker Compose配置
├── index.html                  # HTML入口
├── package.json                # 项目配置
├── playwright.config.ts        # E2E测试配置
├── tsconfig.json               # TypeScript配置
├── vite.config.ts              # Vite配置
└── vitest.config.ts            # 单元测试配置
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
