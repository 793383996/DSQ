# 商业运营指标字典（E-11）

更新时间：2026-03-24

## 1. 目标

建立可周维度追踪的业务指标体系，覆盖：

1. 行为事件字典
2. 转化漏斗
3. 留存指标

## 2. 事件字典（核心）

1. `page_view`
- 含义：页面访问
- 关键字段：`path`、`locale`

2. `add_requirement_click`
- 含义：用户点击新增需求
- 关键字段：`action`

3. `save_project_click`
- 含义：用户点击保存方案
- 关键字段：`action`

4. `generate_blueprint_click`
- 含义：用户点击生成蓝图
- 关键字段：`action`

5. `blueprint_generate_attempt`
- 含义：蓝图任务发起
- 关键字段：`recipeCount`、`stackLayers`

6. `blueprint_generate_success`
- 含义：蓝图任务成功
- 关键字段：`recipeCount`、`durationMs`、`blueprintLength`

7. `blueprint_generate_failed`
- 含义：蓝图任务失败
- 关键字段：`recipeCount`、`durationMs`、`error`

## 3. 漏斗定义（周）

漏斗名：`weekly_blueprint_conversion`

步骤：

1. `page_view`
2. `add_requirement_click`
3. `generate_blueprint_click`
4. `blueprint_generate_success`

窗口：`7` 天

## 4. 留存定义

队列：`blueprint_creator_retention`

1. 入组事件：`blueprint_generate_success`
2. 回访事件：`blueprint_generate_success`
3. 观察窗口：`D1` / `D7` / `D30`

## 5. 治理与校验

配置文件：`localDev/monitoring/business-metrics.config.json`

校验命令：

```bash
npm run metrics:check
```

该校验会验证：

1. 字典结构完整性
2. 漏斗与留存引用合法性
3. 周报节奏是否为 weekly
4. 关键事件是否在埋点源码中被实际引用
