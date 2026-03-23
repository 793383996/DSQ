# 多语言 SEO 扩展说明（E-09）

更新时间：2026-03-24

## 1. 已落地项

1. 页面 head 新增多语言 `hreflang`：
- `zh-CN` -> `https://dsq.vercel.app/?lang=zh-CN`
- `en-US` -> `https://dsq.vercel.app/?lang=en-US`
- `x-default` -> `https://dsq.vercel.app/`

2. Canonical 与 OG URL 联动当前语言：
- `canonicalLink`、`metaOgUrl` 会随语言切换为对应 URL。
- `metaOgLocale` 随语言切换为 `zh_CN` / `en_US`。

3. sitemap 扩展为双语言 URL，并为每个 URL 提供互链的 `xhtml:link`。

## 2. 实现策略

1. 采用 `?lang=` 作为多语言入口参数，便于爬虫识别与索引。
2. `Scripts/i18n.js` 初始化优先读取 query 参数，其次本地持久化。
3. 语言切换时同步更新 URL、canonical 与 meta，保持页面信号一致。

## 3. 验收建议

1. Search Console 检查 hreflang 报告是否存在冲突。
2. 分别抓取 `?lang=zh-CN` 与 `?lang=en-US`，确认 canonical/og:url 正确。
3. 在 sitemap 检查中确认两条语言 URL 可成功抓取。
