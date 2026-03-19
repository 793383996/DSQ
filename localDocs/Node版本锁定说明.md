# Node 版本锁定说明（A-01）

- 锁定版本：`20.19.0`
- 锁定方式：
1. 根目录 `.nvmrc` 指定精确版本。
2. `package.json` 的 `engines.node` 指定 `20.19.x`。

## 目的

- 保证本地、CI、不同开发机上的 Node 主次版本一致，降低“同命令不同结果”的概率。
- 为后续 A-02（ESLint/Prettier）和 A-04（CI）提供稳定运行时基线。

## 使用方式

- 使用 nvm：`nvm use`
- 验证版本：`node -v`
- 执行工程检查：`npm run ci:check`

## 回滚方式

- 删除 `.nvmrc` 与 `package.json` 中 `engines` 字段，恢复到未锁版本状态。
