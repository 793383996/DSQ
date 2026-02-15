/**
 * 计算引擎模块 - 从 data.js 拆分
 *
 * 职责：
 * - 配方查找 (find)
 * - 需求计算 (loadNumber)
 * - 多产出处理 (mergeMul)
 *
 * 架构师注：
 * - 此模块仅包含纯计算逻辑，不包含UI渲染
 * - data.js 中的 update_all 仍保留完整逻辑，但调用此模块的核心函数
 * - 保持全局变量挂载到window，确保向后兼容
 * - 关键修复：所有状态变量直接使用window对象，避免引用断裂
 *
 * @deprecated 此模块已迁移到 calculatorEngine.js 闭包封装版本
 * 新代码请使用 createCalculator() 工厂函数创建独立计算器实例
 * 此模块仅为向后兼容保留
 */

var xh_list = window.xh_list || []
var out_list = window.out_list || []
var xhMap = window.xhMap || {}
var outMap = window.outMap || {}
var ig_names = window.ig_names || []

window.xh_list = xh_list
window.out_list = out_list
window.xhMap = xhMap
window.outMap = outMap
window.ig_names = ig_names

var loadNumberDepth = 0
var maxLoadNumberDepth = 200

function addXH(name, value) {
  var item = xhMap[name]
  if (item) {
    item.value += value
    return
  }
  item = { name: name, value: value }
  xh_list.push(item)
  xhMap[name] = item
}

function addAccTotal(name, value) {
  var item = xhMap[name]
  if (item) {
    item.accTotal = (item.accTotal || 0) + value
  }
}

function addOut(name, value) {
  var item = outMap[name]
  if (item) {
    item.value += value
    return
  }
  item = { name: name, value: value }
  out_list.push(item)
  outMap[name] = item
}

function findOut(name) {
  var item = outMap[name]
  return item ? item.value : null
}

function find(name, normalize_recipe) {
  function get(item) {
    var o = structuredClone(item)
    if (normalize_recipe) {
      for (var i = 0; i < o.s.length; i++) {
        o.s[i].n = o.s[i].n || 1
      }
      for (var i = 0; i < o.q.length; i++) {
        o.q[i].n = o.q[i].n || 1
      }

      for (var i = 0; i < o.s.length; i++) {
        var s_name = o.s[i].name
        for (var j = 0; j < o.q.length; j++) {
          if (s_name == o.q[j].name) {
            var to_cancel = Math.min(o.s[i].n, o.q[j].n)
            o.s[i].n -= to_cancel
            o.q[j].n -= to_cancel
          }
        }
      }

      var o_s = o.s
      o.s = []
      for (var i = 0; i < o_s.length; i++) {
        if (o_s[i].n === 0) continue
        o.s.push(o_s[i])
      }
      var o_q = o.q
      o.q = []
      for (var i = 0; i < o_q.length; i++) {
        if (o_q[i].n === 0) continue
        o.q.push(o_q[i])
      }
    }

    for (var j = 0; j < o.s.length; j++) {
      if (o.s[j].name == name) {
        Object.assign(o, o.s[j])
        return o
      }
    }
    return null
  }

  var settings_pf = window.settings_pf || {}
  var pf = settings_pf[name]
  if (pf) {
    var item = window.data[parseInt(pf)]
    if (item) return get(item)
  }

  var recipeIndexByProduct = window.recipeIndexByProduct
  if (recipeIndexByProduct && recipeIndexByProduct[name]) {
    var indices = recipeIndexByProduct[name]
    var settings = window.settings || {}
    var defaultAccValue = window.defaultAccValue || '无'

    for (var i = 0; i < indices.length; i++) {
      var idx = indices[i]
      var item = window.data[idx]
      if (!item) continue

      var accValue = (settings[item.id] || {}).accValue || defaultAccValue
      if (accValue == '增产' && item.noExtra) continue

      var result = get(item)
      if (result) return result
    }
    return get(window.data[indices[0]])
  }

  for (var i = 0; i < window.data.length; i++) {
    var item = window.data[i]
    for (var j = 0; j < item.s.length; j++) {
      if (item.s[j].name == name) {
        return get(item)
      }
    }
  }
  return null
}

function loadNumber(itemName, n) {
  loadNumberDepth++
  if (loadNumberDepth > maxLoadNumberDepth) {
    loadNumberDepth--
    window.cocoMessage.warning('配方递归深度超限，可能存在循环依赖: ' + itemName, 5000)
    return
  }
  try {
    if (ig_names.indexOf(itemName) !== -1) {
      loadNumberDepth--
      return
    }
    if (
      (itemName == '增产剂Mk.Ⅰ' || itemName == '增产剂Mk.Ⅱ' || itemName == '增产剂Mk.Ⅲ') &&
      n < 0.1
    ) {
      loadNumberDepth--
      return
    }
    var item = find(itemName, true)
    if (!item) {
      loadNumberDepth--
      return
    }

    var settings = window.settings || {}
    var defaultAccType = window.defaultAccType || '增产剂Mk.Ⅰ'
    var defaultAccValue = window.defaultAccValue || '无'

    addXH(itemName, n)
    for (var i = 0; i < item.s.length; i++) {
      if (item.s[i].name != itemName) {
        if (item.s[i].n === 0) continue
        addOut(item.s[i].name, (-1 * n * (item.s[i].n || 1)) / (item.n || 1))
      }
    }
    var accType = (settings[item.id] || {}).accType || defaultAccType
    var accValue = (settings[item.id] || {}).accValue || defaultAccValue
    var accTotal = 0
    for (var i = 0; item.q && i < item.q.length; i++) {
      var q = item.q[i]
      if (ig_names.indexOf(q.name) !== -1) {
        continue
      }
      if (q.n === 0) continue
      if (q.name == itemName) {
      } else {
        var r = (n * (q.n || 1)) / (item.n || 1)
        var v = 1,
          tm = 0
        if (accType == '增产剂Mk.Ⅰ') ((v = 1.125), (tm = 12))
        else if (accType == '增产剂Mk.Ⅱ') ((v = 1.2), (tm = 24))
        else if (accType == '增产剂Mk.Ⅲ') ((v = 1.25), (tm = 60))
        if (window.selfAcc && window.selfAcc.checked) tm = tm * v - 1
        if (accValue == '增产' && item.noExtra) accValue = '无'
        if (item.q.length == 0 || item.noExtra === null) accValue = '无'

        if (accValue == '加速') {
          accTotal += r / tm
          if (!(window.isAddSelfAccP && window.isAddSelfAccP.checked)) {
            loadNumber(accType, r / tm)
          }
        } else if (accValue == '增产') {
          r /= v
          accTotal += r / tm
          if (!(window.isAddSelfAccP && window.isAddSelfAccP.checked)) {
            loadNumber(accType, r / tm)
          }
        }

        loadNumber(q.name, r)
      }
    }
    addAccTotal(itemName, accTotal)
  } catch (e) {
    throw e
  }
  loadNumberDepth--
}

function getXhs(itemId) {
  var xhs = []
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i]
    if (!xh.value) continue
    var itemName = xh.name
    var item = find(itemName)
    if (item && item.id == itemId) xhs.push(xh)
  }
  return xhs
}

function doMergeMul(xhs) {
  var maxValue2Index = -1
  var max = 0
  for (var i = 0; i < xhs.length; i++) {
    if (xhs[i].value2 > max) maxValue2Index = i
  }

  for (var i = 0; i < xhs.length; i++) {
    if (i != maxValue2Index && xhs[i].value2 > 0) {
      var number = xhs[i].value
      xhs[i].value2 = 0
      var item = find(xhs[i].name)
      if (!item) continue
      for (var j = 0; j < item.s.length; j++) {
        addOut(item.s[j].name, (number * (item.s[j].n || 1)) / (item.n || 1))
      }
    }
  }
}

function mergeMul() {
  var gs = []
  var ids = []
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i]
    if (!xh.value) continue
    var itemName = xh.name
    var item = find(itemName)
    if (!item) continue
    if (ids.indexOf(item.id) !== -1) continue
    var xhs = getXhs(item.id)

    if (xhs.length > 1) {
      gs.push(xhs)
      ids.push(item.id)
    }
  }
  for (var i = 0; i < gs.length; i++) {
    doMergeMul(gs[i])
  }
}

function checkResult() {
  function isOverflow(item, info, nn) {
    for (var j = 0; j < item.s.length; j++) {
      var s = item.s[j]
      var out = findOut(s.name)
      if (out === null) continue
      if (out < 0) {
        return true
      }
    }
    return false
  }

  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i]
    if (!xh.value) continue
    var itemName = xh.name
    var item = find(itemName)
    if (!item) continue
    var info = window.getValue ? window.getValue(itemName) : null
    if (!info) continue

    if (isOverflow(item, info, xh.value)) {
      var need = xh.value
      var produce = 0
      for (var j = 0; j < item.s.length; j++) {
        var s = item.s[j]
        if (s.name == itemName) {
          produce = (xh.value * (s.n || 1)) / (item.n || 1)
          break
        }
      }

      var ratio = need / produce
      if (ratio > 0 && ratio < 1) {
        xh.value = produce
        xh.value2 = xh.value2 ? xh.value2 * ratio : xh.value * (1 - ratio)
      }
    }
  }
}

function fixGzSpeed() {
  var gzItem = null
  for (var i = 0; i < xh_list.length; i++) {
    if (xh_list[i].name == '光栅石') {
      gzItem = xh_list[i]
      break
    }
  }
  if (!gzItem) return

  var gzRecipe = find('光栅石')
  if (!gzRecipe) return

  var machine = gzRecipe.m
  if (machine != '采矿机') return

  var gzValue = gzItem.value
  if (gzValue <= 0) return

  var settings_time = window.settings_time || {}
  var speed = settings_time['采矿机'] || 1

  gzItem.value = gzValue / speed
}

function getAccSpeed(type, value) {
  if (value == '加速') {
    if (type == '增产剂Mk.Ⅰ') return 1.25
    if (type == '增产剂Mk.Ⅱ') return 1.5
    if (type == '增产剂Mk.Ⅲ') return 2
  } else if (value == '增产') {
    if (type == '增产剂Mk.Ⅰ') return 1.125
    if (type == '增产剂Mk.Ⅱ') return 1.2
    if (type == '增产剂Mk.Ⅲ') return 1.25
  }
  return 1
}

function clearCalculatorState() {
  xh_list.length = 0
  out_list.length = 0
  Object.keys(xhMap).forEach(function (key) {
    delete xhMap[key]
  })
  Object.keys(outMap).forEach(function (key) {
    delete outMap[key]
  })
  loadNumberDepth = 0
}

function clearAllState() {
  clearCalculatorState()
  ig_names.length = 0
}

function setIgNames(names) {
  ig_names.length = 0
  if (names && names.length) {
    for (var i = 0; i < names.length; i++) {
      ig_names.push(names[i])
    }
  }
}

window.xh_list = xh_list
window.out_list = out_list
window.xhMap = xhMap
window.outMap = outMap
window.ig_names = ig_names
window.find = find
window.loadNumber = loadNumber

export {
  xh_list,
  out_list,
  xhMap,
  outMap,
  ig_names,
  addXH,
  addAccTotal,
  addOut,
  findOut,
  find,
  loadNumber,
  getXhs,
  doMergeMul,
  mergeMul,
  checkResult,
  fixGzSpeed,
  getAccSpeed,
  clearCalculatorState,
  clearAllState,
  setIgNames,
  loadNumberDepth,
  maxLoadNumberDepth
}
