/**
 * 设置辅助函数模块 - 从 data.js 拆分
 *
 * 职责：
 * - getMachine: 获取配方默认机器
 * - getAccType: 获取配方默认增产剂等级
 * - getAccValue: 获取配方默认增产剂效果
 * - getValue: 获取配方参数（时间/速度等）
 *
 * 依赖：
 * - settings/settings_time (storageManager.js)
 * - find (calculator.js)
 */

import { settings, settings_time } from './storageManager.js'
import { find } from './calculator.js'

var settingsLocal = {}
window.settingsLocal = settingsLocal

function getMachine(arg) {
  var item = typeof arg == 'string' ? find(arg) : arg
  if (!item) return null
  var machine = (settings[item.id] || {}).m || null
  if (machine != null) return machine

  machine = (settingsLocal[item.id] || {}).m || null
  if (machine != null) return machine

  return item.m[0].name
}

function getAccType(arg) {
  var item = typeof arg == 'string' ? find(arg) : arg
  if (!item) return null
  var accType = (settings[item.id] || {}).accType || null
  if (accType != null) return accType

  accType = (settingsLocal[item.id] || {}).accType || null
  if (accType != null) return accType

  return null
}

function getAccValue(arg) {
  var item = typeof arg == 'string' ? find(arg) : arg
  if (!item) return null
  var accValue = (settings[item.id] || {}).accValue || null
  if (accValue != null) return accValue

  accValue = (settingsLocal[item.id] || {}).accValue || null
  if (accValue != null) return accValue

  return null
}

function getValue(arg) {
  var item = typeof arg == 'string' ? find(arg) : arg
  if (!item) return null
  var machine = getMachine(item)
  var accType = getAccType(item),
    accValue = getAccValue(item)
  var speed = settings_time[machine]

  if (speed) {
    return {
      name: machine,
      t: item.t,
      speed: speed,
      time: item.t / speed,
      isChange: true,
      accType: accType,
      accValue: accValue
    }
  }
  for (var i = 0; i < item.m.length; i++) {
    var m = item.m[i]
    if (m.name == machine) {
      return {
        name: m.name,
        t: item.t,
        speed: m.speed,
        time: item.t / m.speed,
        accType: accType,
        accValue: accValue
      }
    }
  }
  m = item.m[0]
  return {
    name: m.name,
    t: item.t,
    speed: m.speed,
    time: item.t / m.speed,
    accType: accType,
    accValue: accValue
  }
}

export { settingsLocal, getMachine, getAccType, getAccValue, getValue }
