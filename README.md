# 戴森球计划量产量化计算器（DSQ）
<a href="https://www.gnu.org/licenses/gpl-3.0.html"><img src="https://img.shields.io/badge/license-GPLV3-blue" alt="license GPLV3"></a>

DSQ 是一个开源、纯前端的戴森球计划产线计算与蓝图生成工具站，当前已具备工程化质量门禁、CI、性能与可访问性基线、基础安全治理和商业化运营埋点基线。

## 功能概览

- 多配方计算与多需求叠加
- 可视化物品选择与方案保存
- 蓝图生成与复制
- 本地化语言切换（`zh-CN` / `en-US`）

## 30 分钟快速上手（新成员）

1. 准备环境（约 5 分钟）
- Node.js `20.19.x`（推荐 `nvm use`，参考 `.nvmrc`）
- npm（随 Node 安装）
- Git

2. 安装依赖（约 5-10 分钟）

```bash
npm ci
```

3. 跑完整工程校验（约 10-15 分钟）

```bash
npm run ci:check
```

4. 本地调试（约 5 分钟）
- 开发态联调（源码 + 热更新）：
```bash
npx vite --host 127.0.0.1 --port 5173 --strictPort
```
访问：`http://127.0.0.1:5173`

- 构建产物预览（接近线上）：
```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```
访问：`http://127.0.0.1:4173`

- 自动化调试入口（基于 `dist`）：
```bash
npm run build
npm run test:integration
npm run test:e2e
npm run test:a11y
```

5. 提交流程演练（约 5 分钟）

```bash
git switch -c feat/your-topic
# 修改代码后
git add .
git commit -m "feat: your change"
git push origin feat/your-topic
```

说明：
- `pre-commit` 会自动执行 `lint-staged`
- `pre-push` 会自动执行 `npm run ci:check`
- `https_server.py` 为历史本地运行方案，当前不再作为推荐调试入口
- 蓝图复制链路当前强制 `https` 协议，`http` 本地页会提示并中断复制；建议通过 `npm run test:e2e` 或 HTTPS 预览环境验证

## 常用脚本

| 类别 | 命令 | 作用 |
| ---- | ---- | ---- |
| 全量门禁 | `npm run ci:check` | 本地与 CI 主验收入口 |
| Lint | `npm run lint` | ESLint 检查 |
| Lint 基线 | `npm run lint:baseline` | 冻结并校验 warning 基线 |
| 格式检查 | `npm run format:check` | Prettier 检查 |
| 构建 | `npm run build` | Vite 构建并同步静态资产到 `dist/` |
| 构建校验 | `npm run verify:dist` | 校验 `dist/` 关键产物完整性 |
| 单测 | `npm run test:unit` | Vitest 单元测试 |
| 蓝图回归 | `npm run test:blueprint` | 蓝图核心回归脚本 |
| E2E | `npm run test:e2e` | Playwright 浏览器级流程检查 |
| a11y | `npm run test:a11y` | axe 自动审计 |
| 集成校验 | `npm run test:integration` | 构建产物关键路由与标记校验 |
| 安全基线 | `npm run security:check` | 安全头与 vendored 依赖治理基线 |
| 依赖审计 | `npm run security:audit` | npm 生产依赖高危漏洞审计 |
| 监控基线 | `npm run monitor:check` | 监控 SLO 配置与告警基线校验 |
| 业务指标基线 | `npm run metrics:check` | 事件字典、漏斗、留存配置校验 |
| 性能预算 | `npm run perf:lhci` | Lighthouse CI 预算检查 |

## CI 与治理工作流

- 主质量门禁：`.github/workflows/ci.yml`
- 性能预算：`.github/workflows/lighthouse.yml`
- 安全基线与审计：`.github/workflows/security.yml`

合并前建议至少执行一次 `npm run ci:check`。

## 发布与回滚

- Vercel 构建命令：`npm run build`
- 发布产物目录：`dist`
- 部署配置：`vercel.json`
- 发布/回滚标准流程：`localDocs/release-governance-runbook.md`

## 文档导航

- 工程化总计划：`localDocs/网站工程化完善实施计划（按优先级执行）.md`
- 监控与告警 Runbook：`localDocs/monitoring-slo-runbook.md`
- 性能预算说明：`localDocs/lighthouse-ci-budget.md`
- 业务指标字典：`localDocs/business-metrics-dictionary.md`
- 依赖现代化路线：`localDocs/dependency-modernization-roadmap.md`
- Node 版本锁定说明：`localDocs/Node版本锁定说明.md`

## 项目结构（当前）

```
DSQ/
├─ Scripts/                 # 前端核心逻辑（计算、蓝图、UI 绑定等）
├─ localDev/node-scripts/   # 工程化脚本（lint/smoke/回归/校验）
├─ localDev/monitoring/     # 监控与业务指标基线配置
├─ localDocs/               # 工程文档、Runbook、治理说明
├─ locales/                 # i18n 语言资源（zh-CN / en-US）
├─ legal/                   # 隐私、条款、Cookie、安全说明页面
├─ .github/workflows/       # CI / Security / Lighthouse
├─ vercel.json              # 部署与安全头配置
├─ vite.config.mjs          # Vite 构建配置
└─ index.html               # 站点入口
```

## 社区与协作

- 常见问题：<https://github.com/122474363/DSQ/wiki>
- 问题反馈与任务：<https://github.com/122474363/DSQ/issues>
- 讨论群：<http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=UzzPv3ic7Fk9EDCyHo_4gkWQLR3WEA9Y&authKey=ysjOY0JQOSpT2ZCLkttSzI73sXyzu%2FXEqJXMmY2O645LpO6GOD5lRBrjdalqpO5k&noverify=0&group_code=53309723>
