/**
 * 配方辅助模块 - 从 data.js 拆分
 *
 * 职责：
 * - 配方分组获取
 * - 配方查找 (getPfs/getPfsByQ)
 *
 * 架构师注：
 * - 此模块依赖全局变量 data 和 recipeIndexByProduct/recipeIndexByMaterial
 * - 使用索引查找优化性能 O(n) → O(k)
 */

function getGroup() {
  var groups = []
  window.data.forEach(function (item) {
    if (!item.group) return

    if (groups.indexOf(item.group) == -1) {
      groups.push(item.group)
    }
  })
  return groups
}

function getPfs(name) {
  var pfs = []
  var indices = window.recipeIndexByProduct[name] || []
  for (var i = 0; i < indices.length; i++) {
    var pf = structuredClone(window.data[indices[i]])
    pfs.push(pf)
  }
  return pfs
}

function getPfsByQ(name) {
  var pfs = []
  var indices = window.recipeIndexByMaterial[name] || []
  for (var i = 0; i < indices.length; i++) {
    var pf = structuredClone(window.data[indices[i]])
    pfs.push(pf)
  }
  return pfs
}

window.getGroup = getGroup
window.getPfs = getPfs
window.getPfsByQ = getPfsByQ

export { getGroup, getPfs, getPfsByQ }
