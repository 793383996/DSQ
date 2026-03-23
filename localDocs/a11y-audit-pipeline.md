# 可访问性持续审计说明（E-10）

更新时间：2026-03-24

## 1. 审计入口

1. 本地执行：
```bash
npm run test:a11y
```

2. CI 执行：
- `ci:check` 已纳入 `test:a11y`。
- `.github/workflows/ci.yml` 会在 E2E 后执行可访问性审计。

## 2. 审计策略

1. 浏览器级检查基于 `Playwright + axe-core`。
2. 规则覆盖：`wcag2a/wcag2aa/wcag21a/wcag21aa`。
3. 阻断条件：存在 `serious` 或 `critical` 级别违规即失败。

已记录的扫描排除项（仅限遗留内容块）：

1. `#btnExcludeAccLine`（历史样式导致 color-contrast 误报）
2. `div[data-include="updata"]`（历史更新说明富文本）
3. `div[data-include="explanation"]`（历史说明富文本）

## 3. Lighthouse 联动

`Lighthouse CI` 断言增加：

1. `categories:accessibility >= 0.95`

这保证了“规则扫描 + 综合评分”双轨审计。
