# 发布治理与回滚 Runbook（E-12）

更新时间：2026-03-24

## 1. 目标

统一 DSQ 的发布与回滚动作，确保：

1. 每次发布都有可追溯验收记录。
2. 出现异常时可在 10 分钟内启动回滚。
3. 新成员可按文档独立完成发布与回滚演练。

## 2. 适用范围

- 发布环境：Vercel 生产站点
- 发布分支：`main` / `master`
- 核心入口：`npm run ci:check`、`npm run build`、`vercel.json`

## 3. 角色职责

1. 发布负责人（Release Owner）
- 组织发布窗口、执行发布清单、确认放量

2. 评审人（Reviewer）
- 复核风险项、确认回滚预案完整

3. 值班同学（On-call）
- 监控发布后 30 分钟指标，必要时执行回滚

## 4. 发布前检查清单

1. 所有变更已通过 PR 审核并可追溯。
2. 本地执行 `npm run ci:check` 通过。
3. 关键文档已更新（README、变更说明、相关 Runbook）。
4. 监控看板可用（错误率、蓝图成功率、P95 耗时）。
5. 已指定回滚责任人和通知通道。

## 5. 标准发布流程（SOP）

1. 进入发布窗口，冻结新变更合入。
2. 基于最新 `main` 拉取并确认工作区干净。

```bash
git checkout main
git pull --ff-only
```

3. 在发布分支执行最终验收。

```bash
npm ci
npm run ci:check
npm run perf:lhci:quick
```

4. 合并目标 PR 到 `main`，等待 GitHub Actions 通过。
5. 确认 Vercel 新部署成功（Production 状态 Healthy）。
6. 执行线上冒烟：
- 页面可访问
- 新增需求/保存方案可用
- 蓝图生成可成功复制（HTTPS 环境）
7. 在发布记录中登记：提交范围、发布时间、负责人、验证结果。

## 6. 发布后 30 分钟观察

1. 每 10 分钟检查一次监控看板。
2. 重点关注：
- `frontend_js_error_rate`
- `blueprint_generation_success_rate`
- `blueprint_generation_p95_ms`
3. 若指标连续恶化，立即进入回滚流程。

## 7. 回滚触发条件

满足任意条件即可触发：

1. 蓝图成功率明显跌破 SLO 且持续 10 分钟。
2. 前端错误率超过 Critical 阈值。
3. 关键业务链路不可用（页面白屏、无法生成蓝图、保存失败）。

## 8. 回滚流程（SOP）

### 8.1 快速回滚（优先）

1. 在 Vercel Dashboard 打开当前项目 Deployments。
2. 选择上一版稳定部署（上一次成功且验证通过）。
3. 点击 Promote to Production。
4. 在监控中确认 10 分钟内指标恢复。

### 8.2 Git 回滚（需要保留审计链路时）

1. 定位问题提交。

```bash
git log --oneline
```

2. 执行回滚提交并推送。

```bash
git revert <bad_commit_sha>
git push origin main
```

3. 等待 CI 与 Vercel 新部署完成后复验线上。

## 9. 沟通模板

1. 发布开始
- 「DSQ 生产发布开始，窗口 XX:XX-XX:XX，负责人 XXX，回滚负责人 XXX。」

2. 发布完成
- 「DSQ 发布完成，版本 `<commit>`，核心链路冒烟通过，进入 30 分钟观察。」

3. 回滚通知
- 「DSQ 已触发回滚，原因：XXX，回滚版本：`<commit>`，预计恢复时间：XX 分钟。」

## 10. 关联文档

- `README.md`
- `localDocs/monitoring-slo-runbook.md`
- `localDocs/lighthouse-ci-budget.md`
- `localDocs/business-metrics-dictionary.md`
