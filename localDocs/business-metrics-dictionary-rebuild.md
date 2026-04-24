# Business Metrics Dictionary Rebuild

日期：2026-04-24  
适用配置：`localDev/monitoring/business-metrics.config.json`

## 1. 目标

本字典用于冻结当前前端业务埋点定义，保证：

1. 事件名稳定
2. 触发点稳定
3. 漏斗与留存口径稳定
4. 重构过程中不因埋点漂移导致指标失真

## 2. 事件字典

| 事件名 | 含义 | 当前触发点 | 必填字段 |
| ---- | ---- | ---- | ---- |
| `page_view` | 页面访问 | `index.events.js` 页面就绪后 | `path` `locale` |
| `add_requirement_click` | 点击新增需求 | `data-click-action=addRequirement` | `action` |
| `save_project_click` | 点击保存方案 | `data-click-action=saveProject` | `action` |
| `generate_blueprint_click` | 点击生成蓝图 | `data-click-action=generateBlueprint` | `action` |
| `blueprint_generate_attempt` | 发起蓝图任务 | `generateBlueprint()` 启动时 | `recipeCount` `stackLayers` |
| `blueprint_generate_success` | 蓝图生成成功 | `generateBlueprint()` 成功时 | `recipeCount` `durationMs` `blueprintLength` |
| `blueprint_generate_failed` | 蓝图生成失败 | `generateBlueprint()` 失败时 | `recipeCount` `durationMs` `error` |

## 3. 漏斗定义

漏斗名称：`weekly_blueprint_conversion`

步骤定义：

1. `page_view`
2. `add_requirement_click`
3. `generate_blueprint_click`
4. `blueprint_generate_success`

统计窗口：

1. `7` 天

## 4. 留存定义

留存队列：`blueprint_creator_retention`

1. 进入事件：`blueprint_generate_success`
2. 回访事件：`blueprint_generate_success`
3. 窗口：`D1`、`D7`、`D30`

## 5. 使用约束

1. 不得随意改动现有事件名。
2. 若重构导致触发点迁移，必须保持事件语义和字段口径不变。
3. 新增事件前，先补文档再补代码。
4. 若删除事件，必须同步更新：
   - `business-metrics.config.json`
   - 漏斗/留存定义
   - 前端埋点触发代码

## 6. 重构期间校验要求

每次改动埋点链路后至少执行：

1. `npm run metrics:check`
2. `npm run test:unit`
3. 若涉及按钮或页面流程，追加 `npm run test:e2e`

## 7. 备注

旧版 `business-metrics-dictionary.md` 已下线。当前仓库统一改用本重建版字典作为指标门禁引用源。
