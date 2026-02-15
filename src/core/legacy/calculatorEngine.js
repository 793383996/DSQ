/**
 * 计算引擎 - 闭包封装版本
 *
 * 架构师注：
 * - 使用闭包封装全局状态，实现状态隔离
 * - 保持 loadNumber 递归逻辑不变（黑盒保护）
 * - 支持多实例并发计算
 * - 向后兼容遗留代码调用方式
 */

/**
 * 创建计算器实例
 * @param {Object} options - 配置选项
 * @param {number} options.maxDepth - 最大递归深度
 * @param {string} options.defaultAccType - 默认增产剂类型
 * @param {string} options.defaultAccValue - 默认增产剂效果
 * @returns {Object} 计算器实例
 */
function createCalculator(options) {
  options = options || {}
  var maxDepth = options.maxDepth || 200
  var defaultAccType = options.defaultAccType || '增产剂Mk.Ⅰ'
  var defaultAccValue = options.defaultAccValue || '无'

  var xh_list = []
  var out_list = []
  var xhMap = {}
  var outMap = {}
  var ig_names = []
  var loadNumberDepth = 0

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
    if (loadNumberDepth > maxDepth) {
      loadNumberDepth--
      if (window.cocoMessage) {
        window.cocoMessage.warning('配方递归深度超限，可能存在循环依赖: ' + itemName, 5000)
      }
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

  function clearState() {
    xh_list.length = 0
    out_list.length = 0
    Object.keys(xhMap).forEach(function (key) {
      delete xhMap[key]
    })
    Object.keys(outMap).forEach(function (key) {
      delete outMap[key]
    })
    ig_names.length = 0
    loadNumberDepth = 0
  }

  function setExcludes(names) {
    ig_names.length = 0
    if (names && names.length) {
      for (var i = 0; i < names.length; i++) {
        ig_names.push(names[i])
      }
    }
  }

  function getState() {
    return {
      xh_list: xh_list.slice(),
      out_list: out_list.slice(),
      xhMap: Object.assign({}, xhMap),
      outMap: Object.assign({}, outMap),
      ig_names: ig_names.slice(),
      depth: loadNumberDepth
    }
  }

  function calculate(demands, excludes, singleMakes) {
    clearState()
    setExcludes(excludes || [])

    try {
      fixGzSpeed()

      if (singleMakes && singleMakes.length > 0) {
        for (var m = 0; m < singleMakes.length; m++) {
          var recipeId = singleMakes[m].id
          var recipe = window.data[recipeId]
          if (!recipe) continue

          var settings = window.settings || {}
          var recipeSettings = settings[recipeId] || {}
          var machine = recipeSettings.m || recipe.m[0]?.name
          var machineSpeed = 1

          if (recipe.m) {
            for (var k = 0; k < recipe.m.length; k++) {
              if (recipe.m[k].name === machine) {
                machineSpeed = recipe.m[k].speed
                break
              }
            }
          }

          var times = parseFloat(
            ((60 * parseInt(singleMakes[m].number) * machineSpeed) / (recipe.t || 1)).toFixed(6)
          )

          for (var i = 0; i < recipe.s.length; i++) {
            loadNumber(recipe.s[i].name, -1 * times * (recipe.s[i].n || 1))
          }
          if (recipe.q) {
            for (var j = 0; j < recipe.q.length; j++) {
              loadNumber(recipe.q[j].name, times * (recipe.q[j].n || 1))
            }
          }
        }
      }

      if (demands && demands.length > 0) {
        for (var m = 0; m < demands.length; m++) {
          var demand = demands[m]
          var itemName = demand.item ? demand.item.name : demand.name
          var number = demand.number || demand.num || 0
          loadNumber(itemName, number)
        }
      }

      checkResult()

      return {
        success: true,
        xh_list: xh_list.slice(),
        out_list: out_list.slice(),
        xhMap: Object.assign({}, xhMap),
        outMap: Object.assign({}, outMap)
      }
    } catch (e) {
      clearState()
      return {
        success: false,
        error: e,
        xh_list: [],
        out_list: [],
        xhMap: {},
        outMap: {}
      }
    }
  }

  return {
    addXH: addXH,
    addAccTotal: addAccTotal,
    addOut: addOut,
    findOut: findOut,
    find: find,
    loadNumber: loadNumber,
    getXhs: getXhs,
    doMergeMul: doMergeMul,
    mergeMul: mergeMul,
    checkResult: checkResult,
    fixGzSpeed: fixGzSpeed,
    getAccSpeed: getAccSpeed,
    clearState: clearState,
    setExcludes: setExcludes,
    getState: getState,
    calculate: calculate,
    get xh_list() {
      return xh_list
    },
    get out_list() {
      return out_list
    },
    get xhMap() {
      return xhMap
    },
    get outMap() {
      return outMap
    },
    get ig_names() {
      return ig_names
    },
    get depth() {
      return loadNumberDepth
    }
  }
}

var defaultCalculator = createCalculator()

window.createCalculator = createCalculator

export { createCalculator, defaultCalculator }
