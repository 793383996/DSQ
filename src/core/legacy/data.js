import {
  saveData,
  getData,
  saveSetting,
  loadSetting,
  saveSettingTime,
  loadSettingTime,
  saveSettingPf,
  loadSettingPf,
  settings,
  settings_time,
  settings_pf,
  projects,
  saveSettingProjects,
  loadSettingProjects
} from './storageManager.js'
import { getGroup, getPfs, getPfsByQ } from './recipeHelper.js'
import {
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
  checkResult,
  fixGzSpeed,
  getAccSpeed,
  clearCalculatorState,
  setIgNames,
  loadNumberDepth,
  maxLoadNumberDepth,
  getXhs,
  doMergeMul,
  mergeMul
} from './calculator.js'
import {
  game_data,
  isDataLoaded,
  icons,
  loadData,
  f_initIcons,
  getIconImg,
  getIconShow
} from './iconLoader.js'
import { energyData, spaceData, icons_define, itemNameList } from './configData.js'
import { settingsLocal, getMachine, getAccType, getAccValue, getValue } from './settingsHelper.js'
import data from '../data/recipes.json'

window.data = data
var manualGzSpeed = false

var defaultAccType = '增产剂Mk.Ⅰ'
var defaultAccValue = '无'
window.defaultAccType = defaultAccType
window.defaultAccValue = defaultAccValue

var version = '20240202'

var recipeIndexByProduct = {}
var recipeIndexByMaterial = {}

function f_initData() {
  // 清空索引，准备重建
  recipeIndexByProduct = {}
  recipeIndexByMaterial = {}
  window.recipeIndexByProduct = recipeIndexByProduct
  window.recipeIndexByMaterial = recipeIndexByMaterial

  data.forEach(function (item, i) {
    item.id = i //配方的id，用index设置，data改变时应该重置配方

    // 构建产物索引
    for (var j = 0; j < item.s.length; j++) {
      var productName = item.s[j].name
      if (!recipeIndexByProduct[productName]) {
        recipeIndexByProduct[productName] = []
      }
      recipeIndexByProduct[productName].push(i)
    }

    // 构建原料索引
    if (item.q) {
      for (var j = 0; j < item.q.length; j++) {
        var materialName = item.q[j].name
        if (!recipeIndexByMaterial[materialName]) {
          recipeIndexByMaterial[materialName] = []
        }
        recipeIndexByMaterial[materialName].push(i)
      }
    }

    var ms = []
    if (item.m == '研究站') {
      ms = [
        { name: '矩阵研究站', speed: 1 },
        { name: '自演化研究站', speed: 3 }
      ]
    }
    if (item.m == '制作台') {
      ms = [
        { name: '制作台Mk.Ⅰ', speed: 0.75 },
        { name: '制作台Mk.Ⅱ', speed: 1 },
        { name: '制作台Mk.Ⅲ', speed: 1.5 },
        { name: '重组式制造台', speed: 3 }
      ]
    }

    if (item.m == '冶炼设备') {
      ms = [
        { name: '电弧熔炉', speed: 1 },
        { name: '位面熔炉', speed: 2 },
        { name: '负熵熔炉', speed: 3 }
      ]
    }
    if (item.m == '采矿机') {
      ms = [
        { name: '采矿机', speed: 0.5 * 6 },
        { name: '大型采矿机', speed: 1 * 20 },
        { name: '矿脉', speed: 0.5 * 1 }
      ]
    }
    if (item.m == '能量枢纽') {
      ms = [{ name: '能量枢纽', speed: 1 }]
    }

    if (item.m == '黑雾掉落') {
      ms = [{ name: '黑雾掉落', speed: 1 }]
    }

    if (item.m == '原油萃取站') {
      ms = [{ name: '原油萃取站', speed: 4 }]
    }
    if (item.m == '抽水机') {
      ms = [{ name: '抽水机', speed: 50 / 60 }]
    }

    if (item.m == '原油精炼机') {
      ms = [{ name: '原油精炼机', speed: 1 }]
    }
    if (item.m == '化工设备') {
      ms = [
        { name: '化工厂', speed: 1 },
        { name: '量子化工厂', speed: 2 }
      ]
    }
    if (item.m == '粒子对撞机') {
      ms = [{ name: '粒子对撞机', speed: 1 }]
    }
    if (item.m == '轨道采集器') {
      ms = [{ name: '轨道采集器(巨冰)', speed: 1 }]
    }
    if (item.m == '轨道采集器2') {
      ms = [{ name: '轨道采集器(气态)', speed: 1 }]
    }

    if (item.m == '射线接收塔') {
      ms = [{ name: '射线接收塔', speed: 1 }]
    }

    if (item.m == '分馏塔') {
      ms = [{ name: '分馏塔', speed: 30 }]
    }

    item.mName = item.m
    item.m = ms
  })
}
var pointLength = 3

var currentItem = null

var xqs = window.xqs || []
var singleMake = window.singleMake || []

window.xqs = xqs
window.singleMake = singleMake

var xqss = []

var dataInitPromise = null
var isDataInitialized = false

async function ensureDataInitialized() {
  if (isDataInitialized) return true
  if (dataInitPromise) return dataInitPromise

  dataInitPromise = (async function () {
    await new Promise(function (resolve) {
      var checkInterval = setInterval(function () {
        if (window.isDataLoaded) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 50)
      setTimeout(function () {
        clearInterval(checkInterval)
        resolve(true)
      }, 5000)
    })()

    f_init()
    isDataInitialized = true

    if (typeof window.notifyRecipeIndexReady === 'function') {
      window.notifyRecipeIndexReady()
    }
    return true
  })()

  return dataInitPromise
}

loadData()
ensureDataInitialized()

function getPfTitle(item, info) {
  var title = []
  var speed1_5 = 1
  var showMaxOneBelt = false
  var csd = '极速传送带'

  function calculateBaseNumber(t, item_array, item_index, info, csdsize, speed1_5) {
    return (csdsize / ((60 / (t || 1)) * info.speed * (item_array[item_index].n || 1))) * speed1_5
  }

  for (var j = 0; j < item.q.length; j++) {
    title.push(getIconShow(item.q[j].name, item.q[j].n || 1))

    if (info && showMaxOneBelt) {
      var csdsize = 1800
      if (csd == '传送带') {
        csdsize = 360
      } else if (csd == '高速传送带') {
        csdsize = 720
      }
      var number =
        info.accValue === '增产'
          ? calculateBaseNumber(item.t, item.q, j, info, csdsize, speed1_5)
          : calculateBaseNumber(item.t, item.q, j, info, csdsize, speed1_5) /
            getAccSpeed(info.accType, info.accValue)
      title.push("<sub class='maxOneBeltIn'>" + number.toFixed(1))
      title.push('</sub>')
    }
  }

  if (item.q.length) {
    title.push('<img class="to" src="./img/to.png" />')
  }
  for (var j = 0; j < item.s.length; j++) {
    title.push(getIconShow(item.s[j].name, item.s[j].n || 1))

    if (info && showMaxOneBelt) {
      var csdsize = 1800
      if (csd == '传送带') {
        csdsize = 360
      } else if (csd == '高速传送带') {
        csdsize = 720
      }
      var number =
        calculateBaseNumber(item.t, item.s, j, info, csdsize, speed1_5) /
        getAccSpeed(info.accType, info.accValue)
      title.push("<sub class='maxOneBeltOut'>" + number.toFixed(1))
      title.push('</sub>')
    }
  }
  title.push('(' + (item.t || 1).toFixed(1) + 's)')

  return title.join(' ')
}

function f_add3(name) {
  currentItem = find(name)
  var number = parseInt(window.txtnumber?.value || '60')
  var v = window.selmaince?.value
  if (v) {
    var accType = (settings[currentItem.id] || {}).accType || defaultAccType
    var accValue = (settings[currentItem.id] || {}).accValue || defaultAccValue
    if (accValue == '增产' && currentItem.noExtra) accValue = '无'
    if (currentItem.q.length == 0) accValue = '无'

    var info = getValue(currentItem)
    for (var i = 0; i < currentItem.s.length; i++) {
      if (currentItem.s[i].name == name) {
        number =
          ((parseInt(v) * 60) / (currentItem.t || 1)) * info.speed * (currentItem.s[i].n || 1)
      }
      number *= getAccSpeed(accType, accValue)
    }
  }

  addItem(currentItem, number)
}
function addItem(item, number) {
  xqs.push({
    item: item,
    number: number
  })

  update_all()
}
// function removeItem(itemId) {
//     xqs = xqs.filter(function (one) { return one.item.id != itemId; });
//     update_all();
// }

var app = null
// 这里加入了一些用法和一些变量，用于处理“设备数量”处的输入框
function f_init() {
  app = {
    totalEnergy: 0,
    totalSpace: 0,
    totalAcc: 0,
    total: [],
    xqs: [],
    icons: icons,
    items: [],
    items2: [],
    items0: [],
    ig_names: [],
    xps_editor_index: -1,
    xps_editor_number: 0,
    items_editor_index: -1,
    items_editor_number: 0,
    speedChange: function (item) {
      settings_time[item.machineName] = parseFloat(item.speed)
      saveSettingTime()
      update_all()
    },
    onClickNumber: function (index) {
      if (this.xqs && this.xqs[index]) {
        this.xps_editor_index = index
        this.xps_editor_number = this.xqs[index].number
      }
    },
    onClickNumberItem: function (index_item) {
      if (this.items && this.items[index_item]) {
        this.items_editor_index = index_item
        this.items_editor_number = this.items[index_item].number2
      }
    },
    submitEditorNumber: function () {
      if (this.xqs && this.xqs[this.xps_editor_index]) {
        if (this.xps_editor_number > 0) {
          this.xqs[this.xps_editor_index].number = this.xps_editor_number
          update_all()
        }
        this.xps_editor_index = -1
      }
    },
    submitEditorNumberItem: function () {
      if (this.items && this.items[this.items_editor_index]) {
        if (this.items_editor_number > 0) {
          multiple = this.items_editor_number / this.items[this.items_editor_index].number2

          for (var i = 0; i < this.xqs.length; i++) {
            this.xqs[i].number *= multiple
          }
          update_all()
          multiple = this.items_editor_number / this.items[this.items_editor_index].number2

          for (var i = 0; i < this.xqs.length; i++) {
            this.xqs[i].number *= multiple
          }
          update_all()
        }
        this.items_editor_index = -1
      }
    },
    cancelEditorNumber: function () {
      this.xps_editor_index = -1
    },
    cancelEditorNumberItem: function () {
      this.items_editor_index = -1
    },
    removeItem: function (index) {
      if (this.xqs && this.xqs[index]) {
        this.xqs.splice(index, 1)
        update_all()
      }
    },
    totalDisplay: function () {
      if (!this.total || !this.total.length) return []
      return this.total.map(function (item) {
        return {
          name: item.name,
          value: item.value,
          energy: item.energy ? item.energy.toFixed(2) : '0.00',
          space: item.space ? Math.round(item.space) : 0
        }
      })
    }
  }
  f_initData()
  loadSetting()
  loadSettingTime()
  loadSettingPf()
  doSpeed1()
  update_all()

  function doSpeed1() {
    var st = settings_time || {}
    var speed1_1 = st['轨道采集器(气态)_氢'] || 1
    var speed1_2 = st['轨道采集器(气态)_重氢'] || 0.02
    var speed1_3 = st['轨道采集器(巨冰)_氢'] || 0.5
    var speed1_4 = st['轨道采集器(巨冰)_可燃冰'] || 0.5
    var ore = st['采矿机_效率'] || 100

    function getSum(value1, value2, p1, p2) {
      var sum = 0

      sum = 60 * value1 * 0.01 * ore * 8
      var per = (value1 * p1) / (value1 * p1 + value2 * p2)
      sum -= (60 * 30 * per) / p1

      return sum
    }
    data.forEach(function (recipe) {
      if (
        recipe.s &&
        (recipe.s[0].name == '氢' || recipe.s[0].name == '重氢' || recipe.s[0].name == '可燃冰')
      ) {
        if (recipe.m) {
          for (var i = 0; i < recipe.m.length; i++) {
            if (recipe.m[i].name == '轨道采集器(气态)') {
              if (recipe.s[0].name == '氢') {
                recipe.t = 1 / (getSum(speed1_1, speed1_2, 8, 8) / 60)
              } else if (recipe.s[0].name == '重氢') {
                recipe.t = 1 / (getSum(speed1_2, speed1_1, 8, 8) / 60)
              }
            }
            if (recipe.m[i].name == '轨道采集器(巨冰)') {
              if (recipe.s[0].name == '氢') {
                recipe.t = 1 / (getSum(speed1_4, speed1_3, 8, 4.8) / 60)
              } else if (recipe.s[0].name == '可燃冰') {
                recipe.t = 1 / (getSum(speed1_3, speed1_4, 4.8, 8) / 60)
              }
            }
          }
        }
      }
    })
  }
}

var single_list = [] //独立生产

function update_all() {
  var outResult = []
  clearCalculatorState()
  single_list = []

  try {
    fixGzSpeed()
    for (var m = 0; m < singleMake.length; m++) {
      var item = data[singleMake[m].id]
      var info = getValue(item)
      var times = parseFloat(
        ((60 * parseInt(singleMake[m].number) * info.speed) / (item.t || 1)).toFixed(6)
      )

      for (var i = 0; i < item.s.length; i++) {
        single_list.push({
          id: singleMake[m].id,
          number: singleMake[m].number,
          name: item.s[i].name,
          mName: info.name,
          value: times * (item.s[i].n || 1)
        })
        loadNumber(item.s[i].name, -1 * times * (item.s[i].n || 1))
      }
      for (var j = 0; item.q && j < item.q.length; j++) {
        loadNumber(item.q[j].name, times * (item.q[j].n || 1))
      }
    }
    for (var m = 0; m < xqs.length; m++) {
      var currentItem = xqs[m].item
      loadNumber(currentItem.name, xqs[m].number)
    }
  } catch (e) {
    clearCalculatorState()
    single_list = []
    console.error('[update_all] Calculation error:', e)
    throw e
  }

  function isXqs(name) {
    for (var m = 0; m < xqs.length; m++) {
      if (xqs[m].item.name == name) return true
    }
    return false
  }
  var items0 = []
  var items = []
  var items2 = []

  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i]
    if (!xh.value) continue
    var itemName = xh.name
    var item = find(itemName)
    if (!item) continue
    var info = getValue(itemName)
    if (!info) continue
    if (xh.value > 0) {
      xh.value2 = xh.value / (1 / info.time) / 60 / (item.n || 1)
      var accType = (settings[item.id] || {}).accType || defaultAccType
      var accValue = (settings[item.id] || {}).accValue || defaultAccValue
      if (accValue == '增产' && item.noExtra) accValue = '无'
      if (item.q.length == 0) accValue = '无'

      if (item.name !== '临界光子' || item.mName !== '射线接收塔') {
        // 修正产物与需求物相同时，生产设备计算偏少
        let fixValue2Times = 1
        for (let j = 0; j < item.q.length; j++) {
          if (item.q[j].name === item.name) {
            fixValue2Times = item.n / (item.n - item.q[j].n)
          }
        }
        xh.value2 = (xh.value2 / getAccSpeed(accType, accValue)) * fixValue2Times
      }
    }
  }
  //mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
  checkResult() //优化当前结果，遍历配方，如果 出现几个产出都多余，比如氢-120 精炼油-120，那么应该把设备调整到合适数量

  for (var i = 0; i < single_list.length; i++) {
    if (!single_list[i].value) continue
    var item = data[single_list[i].id]
    var info = getValue(single_list[i].name)
    var outitem = {
      name: single_list[i].name,
      number1: single_list[i].value,
      number2: single_list[i].number,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      pfTitle: getPfTitle(item, info),
      mName: single_list[i].mName
    }
    items0.push(outitem)
  }

  //for (var i = 0; i < out_list.length; i++) {
  //    addXH(out_list[i].name, out_list[i].value);
  //    out_list[i].value = 0;
  //}
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i]
    if (!xh.value) continue
    var itemName = xh.name
    var item = find(itemName)
    if (!item) continue
    var info = getValue(itemName)
    if (xh.value < 0) {
      xh.value2 = 0
    }
  }
  var total = []
  var totalAcc = 0
  function addTotal(name, value, s) {
    var energy = energyData[name] || 0
    var space = spaceData[name] || 0

    var accType = (s || {}).accType || defaultAccType
    var accValue = (s || {}).accValue || defaultAccValue
    if (accValue != '无') {
      if (accType == '增产剂Mk.Ⅰ') energy *= 1.3
      else if (accType == '增产剂Mk.Ⅱ') energy *= 1.7
      else if (accType == '增产剂Mk.Ⅲ') energy *= 2.5
    }

    for (var i = 0; i < total.length; i++) {
      var item = total[i]

      if (!item.energy) item.energy = 0
      if (!item.space) item.space = 0
      if (item.name == name) {
        item.value += value
        item.energy += energy * (value || 0)
        item.space += space * (value || 0)
        return
      }
    }

    total.push({
      name: name,
      value: value,
      energy: energy * (value || 0),
      space: space * (value || 0)
    })
  }

  for (var i = 0; i < xh_list.length; i++) {
    if (!xh_list[i].value) continue

    var item = find(xh_list[i].name)
    if (!item) continue
    var info = getValue(xh_list[i].name)
    if (!info) continue
    if (window.hideSource?.checked) {
      if (!item.q || !item.q.length) {
        continue
      }
    }
    var img = getIconImg(info.name)
    if (img.indexOf('<img') == -1) {
      img = 'X' + img
    }
    // 当生产精炼油/氢/石墨烯/重氢的生产设施为空时，显示0生产设施以跳过“存在生产设施为空的配方”检验
    var outitem = {
      name: xh_list[i].name,
      number1: xh_list[i].value.toFixed(pointLength),
      number2: xh_list[i].value2
        ? xh_list[i].value2.toFixed(pointLength)
        : ['精炼油', '氢', '石墨烯', '重氢'].includes(xh_list[i].name)
          ? (0.0).toFixed(pointLength)
          : '',
      number2full:
        img +
        (xh_list[i].value2
          ? xh_list[i].value2.toFixed(pointLength)
          : ['精炼油', '氢', '石墨烯', '重氢'].includes(xh_list[i].name)
            ? (0.0).toFixed(pointLength)
            : ''),
      number2img: img,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? 'time time2' : 'time',
      rowClass: isXqs(xh_list[i].name) ? 'xqsrow' : '',
      machineName: info.name,
      m: [],
      pf: [],
      accType: [],
      accValue: [],
      accTotal: (xh_list[i].accTotal || 0).toFixed(2)
    }
    if (!outitem.number2) outitem.number2full = ''
    if (xh_list[i].name == '太阳帆') {
      outitem.numberOther = '(可供' + getIconShow('电磁轨道弹射器', outitem.number1 / 20) + ')'
    }
    if (xh_list[i].name == '小型运载火箭') {
      outitem.numberOther = '(可供' + getIconShow('垂直发射井', outitem.number1 / 5) + ')'
    }
    addTotal(info.name, Math.ceil(outitem.number2), settings[item.id])
    // 增产剂总和
    if (info.accValue != '无') {
      // TODO: 这里调用Math.ceil未必合理，增产剂一般放在总线起始处，所以应该在最终算出的总和处调用Math.ceil
      totalAcc += xh_list[i].accTotal || 0
    }
    var pfds = getPfs(xh_list[i].name)

    for (var j = 0; j < pfds.length; j++) {
      var pf = {
        class: item.id == pfds[j].id ? 'pf selected' : 'pf',
        href:
          item.id == pfds[j].id
            ? 'javascript:void(0)'
            : 'javascript: selectPf("' + item.name + '","' + pfds[j].id + '")',
        title: getPfTitle(pfds[j], item.id == pfds[j].id ? info : null)
      }
      outitem.pf.push(pf)
    }
    for (var j = 0; j < item.m.length; j++) {
      var m = {
        class: info.name == item.m[j].name ? 'm selected' : 'm',
        itemName: item.name,
        href:
          info.name == item.m[j].name
            ? 'javascript:void(0)'
            : 'javascript: selectM("' + item.id + '","' + item.m[j].name + '")',
        name: item.m[j].name,
        title: '设备速度:' + item.m[j].speed.toFixed(pointLength),
        showName: item.m[j].name.replace('制作台', '')
      }
      if (m.showName == '采矿机') {
        m.title += ' 采矿机按6个矿脉计算(因所限传送带速度最高30)'
      }
      if (m.showName == '大型采矿机') {
        m.title += ' 大型采矿机按20个矿脉计算'
      }
      if (m.showName == '矿脉') {
        m.title += ' (速度最高30)'
      }
      outitem.m.push(m)
    }
    var accType = (settings[item.id] || {}).accType || defaultAccType
    var accValue = (settings[item.id] || {}).accValue || defaultAccValue
    if (accValue == '增产' && item.noExtra) accValue = '无'
    if (item.q.length == 0 || item.noExtra === null) accValue = '无'
    ;['增产剂Mk.Ⅰ', '增产剂Mk.Ⅱ', '增产剂Mk.Ⅲ'].forEach(function (one) {
      outitem.accType.push({
        class: one == accType ? 'm selected' : 'm',
        itemName: item.name,
        href:
          one == accType
            ? 'javascript:void(0)'
            : 'javascript: selectAccType("' + item.id + '","' + one + '")',
        name: one,
        title: one,
        showName: one.replace('增产剂', '')
      })
    })
    ;['无', '加速', '增产'].forEach(function (one) {
      if (one != '无' && (item.q.length == 0 || item.noExtra === null)) return
      if (one == '增产' && item.noExtra) return
      outitem.accValue.push({
        class: one == accValue ? 'm selected' : 'm',
        itemName: item.name,
        href:
          one == accValue
            ? 'javascript:void(0)'
            : 'javascript: selectAccValue("' + item.id + '","' + one + '")',
        name: one,
        title: one,
        showName: one
      })
    })

    items.push(outitem)
  }

  for (var i = 0; i < out_list.length; i++) {
    if (!out_list[i].value) continue
    var item = find(out_list[i].name)
    if (!item) continue
    var info = getValue(out_list[i].name)
    if (!info) continue
    var outitem = {
      name: out_list[i].name,
      number1: out_list[i].value.toFixed(pointLength),
      number2: out_list[i].value2 ? out_list[i].value2.toFixed(pointLength) : '',
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? 'time time2' : 'time',
      rowClass: 'outrow',
      m: [],
      pf: []
    }
    items2.push(outitem)
  }
  app.items0 = items0
  app.xqs = xqs
  app.items = items
  app.items2 = items2
  app.total = total
  app.ig_names = ig_names
  var energy = 0
  for (var i = 0; i < total.length; i++) {
    energy += total[i].energy || 0
  }
  app.totalEnergy = energy.toFixed(pointLength)
  var space = 0
  for (var i = 0; i < total.length; ++i) {
    space += total[i].space || 0
  }
  app.totalSpace = space
  app.totalAcc = totalAcc.toFixed(2)
}
/**
 * @deprecated 已迁移到 calculatorEngine.js
 * 新代码请使用 createCalculator().loadNumber() 或 window.createCalculator().loadNumber()
 * 此函数仅为向后兼容保留
 */
window.update_all = update_all
/**
 * @deprecated 已迁移到 calculatorEngine.js
 * 新代码请使用 createCalculator().loadNumber() 或 window.createCalculator().loadNumber()
 * 此函数仅为向后兼容保留
 */
window.loadNumber = loadNumber
/**
 * @deprecated 已迁移到 calculatorEngine.js
 * 新代码请使用 createCalculator().find() 或 window.createCalculator().find()
 * 此函数仅为向后兼容保留
 */
window.find = find
window.generateBlueprint = generateBlueprint
window.recipeIndexByProduct = recipeIndexByProduct
window.recipeIndexByMaterial = recipeIndexByMaterial
function selectM(id, m) {
  settings[id] = settings[id] || {}
  settings[id].m = m
  saveSetting()
  update_all()
}
function selectAccType(id, accType) {
  settings[id] = settings[id] || {}
  settings[id].accType = accType
  saveSetting()
  update_all()
}
function selectAccValue(id, accValue) {
  settings[id] = settings[id] || {}
  settings[id].accValue = accValue
  saveSetting()
  update_all()
}
function selectPf(name, value) {
  let old_settings_pf = structuredClone(settings_pf)
  try {
    settings_pf[name] = parseInt(value)
    update_all()
  } catch (e) {
    Object.keys(settings_pf).forEach(function (key) {
      delete settings_pf[key]
    })
    Object.keys(old_settings_pf).forEach(function (key) {
      settings_pf[key] = old_settings_pf[key]
    })
    update_all()
    if (e.name == 'RangeError') {
      cocoMessage.warning(
        '无法切换到X射线裂解(制氢)/重整精炼(制精炼油)公式？请尝试先将对应的另一条(分别为制精炼油/制氢)默认公式切换为其他公式。',
        6000
      )
    }
    throw e
  }
  saveSettingPf()
}
function f_reset() {
  xqs = []
  singleMake = []
  app.xps_editor_index = -1
  app.items_editor_index = -1

  update_all()
}
function f_reset_ig() {
  setIgNames([])

  update_all()
}
function f_remove_ig(name) {
  var filtered = ig_names.filter(function (one) {
    return one != name
  })
  setIgNames(filtered)
  update_all()
}

function getRecipe() {
  let recipeList = []
  let outputHasHydrogen = false
  let inputHasHydrogen = false
  let proliferator = null
  let blueprintTitle = ''
  let blueprintDesc = ''
  let blueprintIconIdx = []
  for (let tr of document.getElementsByTagName('tbody')[0].childNodes) {
    if (tr.className === 'header') {
      continue
    }
    if (tr.className === 'total') {
      break
    }
    if (tr.childNodes.length === 0) {
      continue
    }
    let nodeList = []
    for (let node of tr.childNodes) {
      if (!node.tagName) {
        continue
      }
      nodeList.push(node)
    }

    let buildingName = nodeList[3].getElementsByTagName('img')[0]
    //console.log(buildingName);
    if (!buildingName) {
      cocoMessage.warning('存在生产设施为空的配方，请检查配方列表', 4000)
      throw `unsupported recipe combination`
    } else {
      buildingName = buildingName.getAttribute('title')
    }
    let building = {
      name: buildingName,
      // num: Math.ceil(parseFloat(nodeList[3].getElementsByTagName('span')[0].innerText))
      num: parseFloat(nodeList[3].getElementsByTagName('span')[0].innerText)
    }
    let success = false
    for (let item of itemNameList) {
      if (item[0] !== building.name) {
        continue
      }
      building.name = item[1]
      success = true
      break
    }
    if (!success) {
      alert(`item map error: ${building.name}`)
      return
    }

    const recipeHtml = nodeList[4]
      .getElementsByTagName('div')[0]
      .getElementsByClassName('pf selected')[0]
    let input = []
    let output = []
    let recipeId = 0
    let isInput = true
    const t = parseFloat(recipeHtml.innerText.split('(')[1].split('s')[0])
    for (let node of recipeHtml.childNodes) {
      if (!node.tagName) {
        continue
      }
      if (node.tagName === 'IMG') {
        if (node.className === 'to') {
          isInput = false
          continue
        }
        let cnTitle = node.getAttribute('title')
        let title = ''
        for (let item of itemNameList) {
          if (item[0] !== cnTitle) {
            continue
          }
          title = item[1]
          success = true
          break
        }
        if (!success) {
          // alert(`item map error: ${cnTitle}`)
          let msg = `item map error: ${cnTitle}`
          cocoMessage.error(msg)
          throw msg
        }
        if (isInput) {
          input.push({ name: title })
        } else {
          output.push({ name: title })
          if (title === 'hydrogen') {
            outputHasHydrogen = true
          }
        }
      } else if (node.tagName === 'SUB') {
        if (isInput) {
          input[input.length - 1].rate = parseFloat(node.innerText) / t
        } else {
          output[output.length - 1].rate = parseFloat(node.innerText) / t
        }
      }
    }
    const acceleratorModeName = nodeList[6]
      .getElementsByClassName('m selected')[0]
      .getAttribute('data-modein')
    let acceleratorMode = -1 // 不使用增产剂
    if (acceleratorModeName === '加速') {
      acceleratorMode = 1
    } else if (acceleratorModeName === '增产') {
      acceleratorMode = 0
    }
    if (acceleratorMode !== -1) {
      let recipeProliferator = nodeList[5]
        .getElementsByTagName('div')[0]
        .getElementsByClassName('m selected')[0]
        .getAttribute('data-modein')
      if (proliferator) {
        if (proliferator !== recipeProliferator) {
          cocoMessage.warning(
            '检测到不同等级的增产剂选择，生成蓝图时所有配方必须采用同类型增产剂，请重新设置',
            4000
          )
          throw `unsupported proliferator config`
        }
      } else {
        proliferator = recipeProliferator
      }
    }

    if (isInput) {
      // 还是input就说明这个是原矿，蓝图不需要考虑原矿的生产建筑，且原矿的rate（每秒需求量）需重新计算
      output = input
      output[0].rate = parseFloat(nodeList[2].getElementsByTagName('span')[0].innerText) / 60
      building = null
      input = null
      if (output[0].name === 'hydrogen') {
        inputHasHydrogen = true
      }
    }

    if (!blueprintTitle) {
      // blueprint name and icon id
      let outputItemName = nodeList[1].getAttribute('data-name')
      let outputRateText = nodeList[2].getElementsByTagName('span')[0].innerText
      // 移除小数点后的0：5.000 -> 5, 5.100 -> 5.1
      let outputRate = parseFloat(outputRateText).toString()
      blueprintTitle = outputItemName + '-' + outputRate + 'min'
      let resultList = document.querySelectorAll('#result > div:nth-child(1) > span')
      let outputItemNameList = []
      for (let i = 0; i < resultList.length - 1; i++) {
        let result = resultList[i]
        let outputItemName = result.querySelector('img').title
        let outputRateText = result.querySelector('span > span').textContent
        // 移除小数点后的0：5.000 -> 5, 5.100 -> 5.1
        let outputRate = parseFloat(outputRateText).toString()
        blueprintDesc += outputItemName + '-' + outputRate + 'min\n'
        outputItemNameList.push(outputItemName)
      }

      let mapItemMap = {}
      Object.keys(window.itemMap).map((v, _) => {
        mapItemMap[window.itemMap[v].remark] = window.itemMap[v]
      })
      for (const name of outputItemNameList) {
        let item = mapItemMap[name]
        if (item !== undefined) {
          blueprintIconIdx = [...blueprintIconIdx, item.iconId]
        }
      }
    }

    const recipe = {
      building: building,
      output: output,
      input: input,
      acceleratorMode: acceleratorMode,
      recipeID: recipeId
    }

    recipeList.push(recipe)
  }
  switch (proliferator) {
    case '增产剂Mk.Ⅲ':
      proliferator = 'proliferatorMk3'
      break
    case '增产剂Mk.Ⅱ':
      proliferator = 'proliferatorMk2'
      break
    case '增产剂Mk.Ⅰ':
      proliferator = 'proliferatorMk1'
      break
    case null:
      proliferator = null
      break
    default:
      cocoMessage.error('未知的增产剂类型', 4000)
      throw `unknown proliferator`
  }

  if (inputHasHydrogen && outputHasHydrogen) {
    // 输入和输出同时有氢时，把输出氢映射为新产物单独处理
    for (let recipe of recipeList) {
      if (!recipe.input) {
        // 略过原矿
        continue
      }
      for (let item of recipe.output) {
        if (item.name === 'hydrogen') {
          item.name = 'hydrogenOutput'
        }
      }
    }
  }
  // console.log(recipeList)
  return {
    recipeList: recipeList,
    proliferator: proliferator,
    blueprintIcon: blueprintIconIdx,
    blueprintTitle: blueprintTitle,
    blueprintDesc: blueprintDesc
  }
}

function generateBlueprint() {
  if (!location.href.startsWith('https')) {
    cocoMessage.warning('请使用 https 协议访问以启用复制到剪切板功能')
    return
  }
  const recipe = getRecipe()
  const outputRecipe = {
    proliferator: recipe.proliferator,
    subRecipes: recipe.recipeList
  }
  // console.log(JSON.stringify(outputRecipe))
  //{"subRecipes":[{"building":{"name":"assemblingMachineMk1","num":0.7},"output":[{"name":"magneticCoil","rate":2}],"input":[{"name":"magnet","rate":2},{"name":"copperIngot","rate":1}],"acceleratorMode":0,"recipeID":0},{"building":{"name":"arcSmelter","num":1.5},"output":[{"name":"magnet","rate":0.6666666666666666}],"input":[{"name":"ironOre","rate":0.6666666666666666}],"acceleratorMode":0,"recipeID":0},{"building":null,"output":[{"name":"ironOre","rate":1}],"input":null,"acceleratorMode":0,"recipeID":0},{"building":{"name":"arcSmelter","num":0.5},"output":[{"name":"copperIngot","rate":1}],"input":[{"name":"copperOre","rate":1}],"acceleratorMode":0,"recipeID":0},{"building":null,"output":[{"name":"copperOre","rate":0.5}],"input":null,"acceleratorMode":0,"recipeID":0}]}
  if (!outputRecipe.subRecipes) {
    return
  }
  function getChecked(id, defaultVal) {
    var el = document.getElementById(id)
    if (el) return el.checked
    if (window[id] && window[id].checked !== undefined) return window[id].checked
    return defaultVal
  }
  function getValue(id, defaultVal) {
    var el = document.getElementById(id)
    if (el) return el.value
    if (window[id] && window[id].value !== undefined) return window[id].value
    return defaultVal
  }
  let config = {
    maxSorterNumOneBelt: 8,
    conveyorBeltStackLayer: parseInt(getValue('conveyorBeltStackLayer', '4')),
    x_y_ratio: parseFloat(getValue('x_y_ratio', '2')),
    compactLayout: false,
    upgradeConveyorBelt: false,
    onlyConveyorBeltMk3: getChecked('onlyConveyorBeltMk3', true),
    onlySorterMk3: getChecked('onlySorterMk3', true),
    useSorterMk4: getChecked('useSorterMk4', false),
    maxLabLayers: parseInt(getValue('maxLabLayers', '15')),
    selfSpray: getChecked('selfAcc', false),
    generateTeslaTower: getChecked('generateTeslaTower', true),
    teslaTowerInterval: 10,
    teslaTowerLineInterval: parseInt(getValue('teslaTowerLineInterval', '1')),
    onlyConveyorBeltMk3Downgrade: false,
    stackLayers: parseInt(getValue('stackLayers', '1')) || 1
  }
  // console.log(config)
  let b1 = new Blueprint(
    recipe.blueprintTitle,
    recipe.blueprintIcon.concat(Array(5).fill(0)).slice(0, 5),
    outputRecipe,
    config
  )
  b1.init()
  b1.generateBuildings()
  b1.generateConveyorBelts()
  b1.generateConveyorBeltsForSprayCoater()
  b1.cloneToStackLayers() // 堆叠模式：将 z=0 层克隆到 z=10,20,30
  b1.blueprintTemplate.buildings = b1.buildings
  b1.blueprintTemplate.header.desc = recipe.blueprintDesc.trimEnd()
  switch (recipe.blueprintIcon.length) {
    case 1:
      b1.blueprintTemplate.header.layout = 10
      break
    case 2:
      b1.blueprintTemplate.header.layout = 20
      break
    case 3:
      b1.blueprintTemplate.header.layout = 30
      break
    case 4:
      b1.blueprintTemplate.header.layout = 40
      break
    default:
      b1.blueprintTemplate.header.layout = 51
      break
  }
  navigator.clipboard.writeText(b1.toStr()).then(r => cocoMessage.success('已复制到粘贴板', 1000))
  // navigator.clipboard.writeText(JSON.stringify(b1.blueprintTemplate.buildings)).then(r => cocoMessage.success("已复制到粘贴板", 1000))
}

export {
  data,
  manualGzSpeed,
  energyData,
  spaceData,
  defaultAccType,
  defaultAccValue,
  version,
  recipeIndexByProduct,
  recipeIndexByMaterial,
  f_initData,
  pointLength,
  settingsLocal,
  settings,
  saveData,
  getData,
  saveSetting,
  loadSetting,
  settings_time,
  saveSettingTime,
  loadSettingTime,
  settings_pf,
  saveSettingPf,
  loadSettingPf,
  projects,
  saveSettingProjects,
  loadSettingProjects,
  getMachine,
  getAccType,
  getAccValue,
  getValue,
  currentItem,
  xqs,
  singleMake,
  xqss,
  game_data,
  isDataLoaded,
  getGroup,
  getPfs,
  getPfsByQ,
  getIconImg,
  getIconShow,
  getAccSpeed,
  getPfTitle,
  find,
  f_add3,
  addItem,
  app,
  f_init,
  single_list,
  xh_list,
  out_list,
  addXH,
  addAccTotal,
  addOut,
  findOut,
  ig_names,
  loadNumber,
  getXhs,
  doMergeMul,
  mergeMul,
  checkResult,
  fixGzSpeed,
  update_all,
  selectM,
  selectAccType,
  selectAccValue,
  selectPf,
  f_reset,
  f_reset_ig,
  f_remove_ig,
  icons_define,
  icons,
  f_initIcons,
  getRecipe,
  generateBlueprint,
  ensureDataInitialized,
  isDataInitialized
}
