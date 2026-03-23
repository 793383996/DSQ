# Lighthouse CI 性能预算说明（E-06）

更新时间：2026-03-24

## 1. 执行入口

1. 本地快速检查：
```bash
npm run perf:lhci:quick
```

2. 本地完整检查（3 次采样）：
```bash
npm run perf:lhci
```

3. CI 自动执行：
- `.github/workflows/lighthouse.yml` 在 `push / pull_request` 触发。
- workflow 会先安装 Playwright Chromium，并将其作为 LHCI 浏览器执行环境。

## 2. 预算阈值

定义文件：`.lighthouserc.json`

1. 分类分数
- Performance >= 0.85
- Best Practices >= 0.95

2. 核心性能指标
- LCP <= 3000ms
- FCP <= 2200ms
- TBT <= 300ms
- CLS <= 0.1
- Speed Index <= 3400ms

超出阈值时，LHCI 任务会直接失败，从而形成阻断。

## 3. 回归处理流程

1. 在 CI 日志或 artifact 中查看 Lighthouse 报告。
2. 对照预算项定位超标指标（渲染阻塞、资源体积、脚本执行时间）。
3. 修复后重新触发 PR 检查，直到预算恢复达标。
