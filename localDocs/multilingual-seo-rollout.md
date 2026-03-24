# 多语言 SEO 扩展说明（E-09）

更新时间：2026-03-24（D-03 已补齐）

## 1. 已落地项

1. 页面 head 新增多语言 `hreflang`：
- `zh-CN` -> `https://dsqstar.xyz/?lang=zh-CN`
- `en-US` -> `https://dsqstar.xyz/?lang=en-US`
- `x-default` -> `https://dsqstar.xyz/`

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

## 4. D-03 增强项（2026-03-24）

1. 新增动态 SEO 元信息联动：
- `Scripts/i18n.js` 支持根据当前需求状态更新 `title` / `description` / `og:*` / `twitter:*`。
- 新增 `DSQI18n.updateSeoState(...)`，由 `update_all()` 在每轮计算后同步需求摘要。

2. 新增结构化数据模板：
- `schemaWebApplication`
- `schemaBreadcrumbList`
- `schemaFAQPage`

3. 新增图片 SEO 与图片站点地图：
- `sitemap.xml` 增加 `xmlns:image` 与主页面 `image:image` 条目。
- 新增 `sitemap-images.xml`，在 `robots.txt` 中登记。

4. 新增 SEO 自动校验脚本：
- `npm run seo:check`（校验 canonical/hreflang、JSON-LD 插槽、图片 sitemap 与双语 FAQ key）。

