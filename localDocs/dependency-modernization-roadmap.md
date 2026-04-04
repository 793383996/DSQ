# 第三方依赖现代化治理路线图（E-04）

更新时间：2026-04-04  
责任团队：frontend-engineering

## 1. 当前依赖基线（更新）

项目 vendored 依赖已登记于 `localDev/vendor-inventory.json`，并由自动化脚本持续校验（`npm run security:vendor`）。

本阶段结果（已完成）：

1. `jQuery@2.2.4`：已从运行时主链路移除（`index.html` 无引用，一方脚本运行时调用清零）。
2. `jquery.cookie@1.4.1`：已退役，存储切换到 `localStorage + 一次性 legacy cookie 迁移`。
3. `jquery.tips`：已从运行时退场，改为原生 tooltip 方案。

当前重点风险依赖：

1. `Vue@2.7.16`（维护尾声，需规划中长期升级路径）
2. `cocoMessage`（历史 UMD 兼容包，需逐步收敛到可控适配层）

## 2. 季度治理节奏（滚动）

1. `2026-Q2`
- 完成 jQuery 退场后的遗留收口（文档、基线、回归资产固化）
- 明确 `data.ui-bindings.js` 拆分边界，降低对全局依赖
- 发布“依赖退役完成报告 + 风险台账”

2. `2026-Q3`
- 启动 Vue2 邻接层治理（组合式兼容策略评估，不破坏现有业务）
- 为 `cocoMessage` 建立项目内适配层，隔离三方 API
- 推进模块化打包边界，减少全局脚本耦合

3. `2026-Q4`
- 进行 Vue3 迁移 PoC（局部模块试点）
- 评估是否淘汰剩余历史 UMD 依赖
- 输出年度依赖治理复盘与下一周期路线

## 3. 风险分级与替代方向

1. 高风险
- `Vue 2` -> 渐进式迁移到 Vue 3（分模块 PoC）
- `cocoMessage` -> 项目内适配层 -> 可替换消息内核

2. 中风险
- 历史全局脚本模式 -> 模块化边界 + 构建期依赖管理

3. 低风险
- `pako` 维持现状，按年度复盘是否迁移到浏览器原生压缩能力

## 4. 自动化校验要求

当前依赖治理门禁包括：

1. `security:vendor`：清单字段完整性、vendored 文件存在性、季度计划覆盖度
2. `jquery:check`：阻断 jQuery 运行时回归（脚本关键词 + `index.html` 引用）
3. `ci:check`：将上述校验纳入主门禁链路

执行命令：

```bash
npm run security:vendor
npm run jquery:check
npm run ci:check
```
