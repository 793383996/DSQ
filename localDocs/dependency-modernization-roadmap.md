# 第三方依赖现代化治理路线图（E-04）

更新时间：2026-03-24  
责任团队：frontend-engineering

## 1. 当前依赖基线

项目当前 vendored 依赖已统一登记于 `localDev/vendor-inventory.json`，并纳入自动化校验（`npm run security:vendor`）。

重点高风险依赖：

1. `jQuery@2.2.4`（历史版本较老，生态与安全维护风险较高）
2. `jquery.cookie@1.4.1`（维护停滞，建议替换）
3. `Vue@2.7.16`（进入维护尾声，需要规划升级路径）

## 2. 季度治理节奏

1. `2026-Q2`
- 完成依赖清单冻结与责任人绑定
- 完成 `jquery.cookie` 替换方案落地
- 发布依赖季度评审清单

2. `2026-Q3`
- 替换 jQuery 的页面初始化与事件绑定路径
- 退役 `jquery.tips` 插件，统一提示组件
- 对替换路径进行安全回归

3. `2026-Q4`
- 启动 Vue 3 迁移试点（关键交互模块优先）
- 将 `cocoMessage` 封装为项目自有适配层
- 发布年度复盘与下一周期路线

## 3. 风险分级与替代方向

1. 高风险
- `jQuery` -> 原生 DOM + 小型工具函数
- `jquery.cookie` -> `js-cookie` 或统一 `localStorage` 抽象
- `Vue 2` -> Vue 3（组合式 API）或渐进式替代

2. 中风险
- `jquery.tips` -> 统一消息提示组件
- `cocoMessage` -> 自研适配层后再替换底层实现

3. 低风险
- `pako` 维持现状，按年度复盘评估是否迁移到浏览器原生 `CompressionStream`

## 4. 自动化校验要求

`vendor-baseline` 脚本会校验：

1. 清单字段完整性（版本、风险、状态、替代方案、季度目标）
2. vendored 文件存在性
3. 季度计划完整性（至少 3 个季度）
4. 高风险依赖必须在季度计划中被显式覆盖

执行命令：

```bash
npm run security:vendor
```
