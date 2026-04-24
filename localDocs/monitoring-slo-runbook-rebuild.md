# Monitoring SLO Runbook Rebuild

日期：2026-04-24  
适用配置：`localDev/monitoring/monitoring.config.json`

## 1. 目标

本 Runbook 用于承接当前前端监控基线，覆盖：

1. 蓝图生成成功率
2. 蓝图生成 P95 时延
3. 前端 JS 错误率

## 2. 指标说明

### blueprint_generation_success_rate

1. 含义：蓝图生成成功次数 / 蓝图生成尝试次数
2. 目标：`>= 0.995`
3. 观察窗口：`15m`
4. Owner：`frontend-oncall`

### blueprint_generation_p95_ms

1. 含义：蓝图生成耗时 P95
2. 目标：`<= 1800ms`
3. 观察窗口：`15m`
4. Owner：`frontend-oncall`

### frontend_js_error_rate

1. 含义：页面 JS 错误事件 / 页面访问事件
2. 目标：`<= 0.01`
3. 观察窗口：`15m`
4. Owner：`frontend-oncall`

## 3. 告警分级

### Warning

1. `BlueprintSuccessRateWarning`
2. 通知渠道：`monitor-dashboard`、`team-chat`
3. 处理目标：10 分钟内完成初步分诊

### Critical

1. `BlueprintSuccessRateCritical`
2. `BlueprintP95Critical`
3. `FrontendErrorRateCritical`
4. 通知渠道：`team-chat`、`oncall-phone`

## 4. 分诊流程

1. 先确认 `release`、`route`、`traceId`、`sessionId` 是否完整上报。
2. 若是蓝图成功率下降，优先检查：
   - 最近发布是否改动 `data.blueprint.js`、`blueprint.*`、`calc-core.js`
   - 是否存在 HTTPS/Clipboard 权限回退
   - 是否为特定配方或堆叠配置触发
3. 若是蓝图时延升高，优先检查：
   - Worker 是否超时或退回同步路径
   - 蓝图布局/序列化阶段是否出现异常回退
   - 浏览器环境是否退化到低性能路径
4. 若是前端错误率升高，优先检查：
   - `main.js` / `src/main.ts` 启动链
   - `data.bootstrap.js` 数据加载失败
   - `index.events.js` / `i18n.js` 初始化异常

## 5. 处置动作

1. 确认是否为当前发布引入；如是，优先回滚最近发布。
2. 若无法立即回滚，至少临时关闭高风险入口或降级蓝图链路提示。
3. 对于蓝图生成异常，必须保留失败配方、浏览器信息、报错文本和持续时间。
4. 事故结束后补复盘，更新重构计划与验收矩阵。

## 6. 验证清单

1. 告警恢复后，观察至少一个完整窗口。
2. 重新执行：
   - `npm run test:blueprint`
   - `npm run test:unit`
   - `npm run test:integration`
3. 若涉及交互层或入口改动，追加：
   - `npm run test:e2e`
   - `npm run test:a11y`

## 7. 备注

旧版 `monitoring-slo-runbook.md` 已下线。当前仓库统一改用本重建版文档作为监控门禁引用源。
