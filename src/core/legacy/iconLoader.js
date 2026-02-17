/**
 * 图标加载模块 - 从 data.js 拆分
 *
 * 职责：
 * - 游戏资源加载 (loadData)
 * - 图标初始化 (f_initIcons)
 * - 图标HTML生成 (getIconImg/getIconShow)
 *
 * 架构师注：
 * - 此模块负责异步加载游戏图标资源
 * - 加载完成后初始化图标映射并挂载到window
 * - 保持向后兼容，window.game_data 和 window.icons 仍可访问
 */

var game_data = {}
var isDataLoaded = false
var icons = {}

window.game_data = game_data
window.isDataLoaded = false

function loadData() {
  var controller = new AbortController()
  var timeoutId = setTimeout(function () {
    controller.abort()
  }, 30000)

  var version = window.version || ''

  fetch('./Scripts/data.json?v' + version, { signal: controller.signal })
    .then(function (res) {
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error('Network error')
      return res.json()
    })
    .then(function (data) {
      Object.keys(game_data).forEach(function (key) {
        delete game_data[key]
      })
      Object.keys(data).forEach(function (key) {
        game_data[key] = data[key]
      })
      window.game_data = game_data
      isDataLoaded = true
      window.isDataLoaded = true
      f_initIcons()
      // P2-1修复：加载完成后触发事件，避免轮询
      window.dispatchEvent(new CustomEvent('gameDataLoaded', { detail: game_data }))
    })
    .catch(function (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        alert('游戏资源加载超时，请检查网络后刷新重试')
      } else {
        alert('游戏资源加载失败，图标将无法显示正常，请刷新再试')
      }
    })
}

function f_initIcons() {
  var reg = /^(\d)-(\d{1,2})-(.*)+/
  Object.keys(icons).forEach(function (key) {
    delete icons[key]
  })

  if (!game_data || !game_data.icons1) return

  for (var i = 0; i < game_data.icons1.length; i++) {
    var icon = game_data.icons1[i]
    if (reg.test(icon.name)) {
      var x = icon.name.match(reg)
      icons[x[3]] = icon.value
    } else {
      icons[icon.name] = icon.value
    }
  }
  for (var i = 0; i < game_data.icons2.length; i++) {
    var icon = game_data.icons2[i]
    if (reg.test(icon.name)) {
      var x = icon.name.match(reg)
      icons[x[3]] = icon.value
    } else {
      icons[icon.name] = icon.value
    }
  }
  if (window.app) {
    window.app.icons = icons
  }
}

function getIconImg(name) {
  var title = []
  if (name == '研究站') name = '矩阵研究站'
  if (name == '电弧熔炉') name = '电弧熔炉'
  if (name == '位面熔炉') name = '位面熔炉'
  if (name == '原油精炼机') name = '原油精炼厂'
  if (name == '粒子对撞机') name = '微型粒子对撞机'
  if (name == '射线接收塔') name = '射线接收站'
  if (name == '轨道采集器(气态)') name = '轨道采集器'
  if (name == '轨道采集器(巨冰)') name = '轨道采集器'

  if (icons[name]) {
    title.push(
      "<img class='sicon' src='data:image/png;base64," + icons[name] + "' title='" + name + "' />"
    )
  } else {
    title.push(name)
  }
  return title.join('')
}

function getIconShow(name, number) {
  var title = []
  title.push(getIconImg(name))
  title.push('<sub>' + number + '</sub>')

  return title.join('')
}

function getIconImgSync(name, iconMap) {
  if (name == '研究站') name = '矩阵研究站'
  if (name == '电弧熔炉') name = '电弧熔炉'
  if (name == '位面熔炉') name = '位面熔炉'
  if (name == '原油精炼机') name = '原油精炼厂'
  if (name == '粒子对撞机') name = '微型粒子对撞机'
  if (name == '射线接收塔') name = '射线接收站'
  if (name == '轨道采集器(气态)') name = '轨道采集器'
  if (name == '轨道采集器(巨冰)') name = '轨道采集器'

  if (iconMap && iconMap[name]) {
    return (
      "<img class='sicon' src='data:image/png;base64," + iconMap[name] + "' title='" + name + "' />"
    )
  }
  return name
}

window.game_data = game_data
window.isDataLoaded = isDataLoaded
window.icons = icons
window.loadData = loadData
window.f_initIcons = f_initIcons
window.getIconImg = getIconImg
window.getIconShow = getIconShow

export {
  game_data,
  isDataLoaded,
  icons,
  loadData,
  f_initIcons,
  getIconImg,
  getIconShow,
  getIconImgSync
}
