# 监控 SLO 与告警处置 Runbook（E-05）

更新时间：2026-03-24

## 1. 目标与范围

本 Runbook 覆盖 DSQ 前端站点的三类核心指标：

1. 蓝图生成成功率（`blueprint_generation_success_rate`）
2. 蓝图生成 P95 耗时（`blueprint_generation_p95_ms`）
3. 前端 JS 错误率（`frontend_js_error_rate`）

处置目标：**10 分钟内定位到发布版本与异常链路**。

## 2. 事件字段规范

所有上报事件必须包含以下上下文字段：

1. `service`
2. `release`
3. `sessionId`
4. `traceId`
5. `route`
6. `chain`
7. `timestamp`

说明：

1. `release` 用于按版本归因（是否由最新发布引入）。
2. `traceId` 与 `chain` 用于串联“报错 -> 蓝图生成 -> 用户操作”的链路上下文。

## 3. 告警等级与动作

1. Warning（趋势预警）
- 通道：`monitor-dashboard`、`team-chat`
- 动作：值班同学 30 分钟内确认并记录是否持续恶化

2. Critical（服务风险）
- 通道：`team-chat`、`oncall-phone`
- 动作：值班同学立即介入，按下方处置流程执行

## 4. 10 分钟处置流程

1. 第 1-2 分钟：确认告警指标与窗口
- 判断是成功率、耗时还是错误率异常
- 核对告警窗口（默认 15 分钟）和当前阈值突破幅度

2. 第 3-5 分钟：版本归因
- 按 `release` 聚合事件，确认异常是否集中于新版本
- 如果集中于新版本，优先准备回滚

3. 第 6-8 分钟：链路定位
- 使用 `chain` 与 `traceId` 检索相关事件
- 重点检查 `error_log` 与 `blueprint_generation` 的关联
- 定位到具体页面路由与失败步骤

4. 第 9-10 分钟：处置决策
- 可快速修复：热修并持续观察
- 风险扩大：执行发布回滚并发出事故通知

## 5. 复盘要求

每次 Critical 告警必须补充：

1. 异常开始时间与恢复时间
2. 受影响版本
3. 根因链路（traceId/chain）
4. 永久修复项与预防项
