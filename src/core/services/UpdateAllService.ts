/**
 * UpdateAllService - 更新服务
 *
 * 功能：
 * - 执行完整的计算流程
 * - 协调RecipeCalculator进行配方计算
 * - 处理机器信息和增产剂设置
 * - 生成结果列表和统计信息
 * - 处理临界光子/轨道采集器特殊逻辑
 *
 * 主要方法：
 * - updateAll(options): 执行完整计算
 * - getMachineInfo(recipe, settings, settingsTime): 获取机器信息
 * - getState(): 获取计算状态
 * - fixCriticalPhotonSpeed(): 修正临界光子速度
 * - fixOrbitalCollector(): 修正轨道采集器
 *
 * 上游调用：
 * - core/services/CalculatorService.ts: 计算服务
 * - core/workers/calculator.worker.ts: Worker计算
 *
 * 下游依赖：
 * - core/services/RecipeCalculator.ts: 配方计算器
 * - core/types/settings.ts: 设置类型定义
 * - core/types/recipe.ts: 配方类型定义
 * - utils/logger.ts: 日志记录
 * - composables/useToast.ts: 消息提示
 *
 * 计算流程：
 * 1. 初始化RecipeCalculator
 * 2. 设置排除列表
 * 3. 修正临界光子速度
 * 4. 修正轨道采集器
 * 5. 执行loadNumber递归计算
 * 6. 执行fixGzSpeed修正光栅石
 * 7. 计算value2（设备数量）
 * 8. 执行checkResult检查溢出
 * 9. 执行mergeMul合并多产出
 * 10. 生成结果列表
 */
import {
  RecipeCalculator,
  type ICalculationState,
  type ILoadNumberOptions
} from './RecipeCalculator'
import { recipeDataService } from './RecipeDataService'
import { ENERGY_DATA, SPACE_DATA } from '../config/machineConfig'
import type { IRawRecipe } from '../types/settings'
import type { IDemand } from '../types/recipe'
import { logger } from '../../utils/logger'
import { cocoMessageProxy } from '../../composables/useToast'

export interface IMachineInfo {
  name: string
  speed: number
  time: number
  t: number
  isChange?: boolean
}

export interface ICalculationResult {
  items: IResultItem[]
  items0: IResultItem[]
  items2: IResultItem[]
  total: ITotalItem[]
  totalEnergy: string
  totalSpace: number
  totalAcc: string
  xqs: Array<{ name: string; number: number; item: { name: string } }>
  igNames: string[]
}

export interface IMachineOptionItem {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

export interface IAccOptionItem {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

export interface IResultItem {
  name: string
  number1: string
  number2: string
  number2full?: string
  number2img?: string
  time: string
  t: string
  speed: string
  speedClass?: string
  rowClass?: string
  machineName: string
  m: IMachineOptionItem[]
  pf: IMachineOptionItem[]
  accType: IAccOptionItem[]
  accValue: IAccOptionItem[]
  accTotal: string
  numberOther?: string
}

export interface ITotalItem {
  name: string
  value: number
  energy?: number
  space?: number
}

export interface IUpdateAllOptions {
  demands: IDemand[]
  excludes: string[]
  singleMakes?: Array<{ id: number; number: number }>
  settings?: Record<string, { m?: string; accType?: string; accValue?: string }>
  settingsTime?: Record<string, number>
  settingsPf?: Record<string, string | number>
  defaultAccType?: string
  defaultAccValue?: string
  hideSource?: boolean
  pointLength?: number
  selfAcc?: boolean
  isAddSelfAccP?: boolean
}

export class UpdateAllService {
  private calculator: RecipeCalculator | null = null
  private recipes: IRawRecipe[] = []
  private recipeIndexByProduct: Record<string, number[]> = {}
  private pointLength: number = 3
  private isInitialized: boolean = false
  private initPromise: Promise<void> | null = null
  // P7-3修复：添加singleList存储独立生产结果
  private singleList: Array<{
    id: number
    number: number
    name: string
    mName: string
    value: number
  }> = []
  // P10-1修复：添加临界光子t值缓存，解决fixCriticalPhotonSpeed修改克隆对象无效的问题
  // 老代码直接修改data数组，新代码使用缓存机制
  private criticalPhotonTCache: number | null = null
  private criticalPhotonLensNCache: number | null = null

  constructor() {
    // 延迟初始化：不在构造函数中初始化，避免 window.data 未加载问题
  }

  private async initializeCalculator(): Promise<void> {
    if (this.isInitialized && this.calculator) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        await recipeDataService.initialize()

        this.recipes = recipeDataService.getRecipes()
        this.recipeIndexByProduct = recipeDataService.getIndexByProduct()
        this.calculator = new RecipeCalculator(this.recipes, this.recipeIndexByProduct)
        this.isInitialized = true

        logger.log('[UpdateAllService] Calculator initialized successfully')
      } catch (error) {
        logger.error('[UpdateAllService] Failed to initialize calculator:', error)
        throw error
      } finally {
        this.initPromise = null
      }
    })()

    return this.initPromise
  }

  private async ensureCalculator(): Promise<void> {
    if (!this.calculator || !this.isInitialized) {
      await this.initializeCalculator()
    }
    if (!this.calculator) {
      throw new Error('RecipeCalculator not initialized')
    }
  }

  async updateAll(options: IUpdateAllOptions): Promise<ICalculationResult> {
    await this.ensureCalculator()

    const {
      demands,
      excludes,
      singleMakes = [],
      settings = {},
      settingsTime = {},
      settingsPf = {},
      defaultAccType = '增产剂Mk.Ⅰ',
      defaultAccValue = '无',
      hideSource = false,
      pointLength = 3,
      selfAcc = false,
      isAddSelfAccP = false
    } = options

    this.pointLength = pointLength
    this.calculator!.clearState()
    this.calculator!.setIgNames(excludes)
    // P7-3修复：清空singleList
    this.singleList = []

    // P0-3修复：doSpeed1必须在loadNumber之前调用，与老代码对齐
    // 老代码在f_init中调用doSpeed1，修改data数组的t值
    // 新代码使用缓存机制，需要在loadNumber之前初始化缓存
    this.doSpeed1(settingsTime)

    // P6-1修复：fixCriticalPhotonSpeed必须在loadNumber之前调用
    // 老代码Scripts/data.js update_all函数第一行就是fixGzSpeed()
    // 它修改临界光子配方的t值和引力透镜需求，loadNumber使用修改后的值
    // 新代码原位置在loadNumber之后，导致计算结果错误
    // P6-4修复：传入settings和defaultAccType/defaultAccValue，使用配方级设置
    // P9-1修复：传入settingsPf参数，支持用户选择的配方
    this.fixCriticalPhotonSpeed(settingsTime, settings, defaultAccType, defaultAccValue, settingsPf)

    // P10-1修复：将临界光子缓存值传递给RecipeCalculator
    // RecipeCalculator的find方法会使用这些缓存值
    this.calculator!.setCriticalPhotonCache(
      this.criticalPhotonTCache,
      this.criticalPhotonLensNCache
    )

    // P0-1修复：将轨道采集器缓存值传递给RecipeCalculator
    // 老代码doSpeed1直接修改data数组的t值，新代码使用缓存机制
    this.calculator!.setOrbitalCollectorCache(this.orbitalCollectorTCache)

    // P3-2修复：添加递归深度超限回调，通知用户
    let depthExceededShown = false
    const loadOptions: ILoadNumberOptions = {
      settings,
      settingsPf,
      defaultAccType,
      defaultAccValue,
      selfAcc,
      isAddSelfAccP,
      onDepthExceeded: (itemName: string, _depth: number) => {
        if (!depthExceededShown) {
          depthExceededShown = true
          cocoMessageProxy(`配方递归深度超限，可能存在循环依赖: ${itemName}`, 'warning')
        }
      }
    }

    try {
      for (const sm of singleMakes) {
        const recipe = this.recipes[sm.id]
        if (!recipe || !recipe.s) continue

        const machineInfo = this.getMachineInfo(recipe, settings, settingsTime)
        const times = parseFloat(
          ((60 * sm.number * machineInfo.speed) / (recipe.t || 1)).toFixed(6)
        )

        // P7-3修复：填充singleList，与老代码data.js update_all函数对齐
        for (const output of recipe.s) {
          this.singleList.push({
            id: sm.id,
            number: sm.number,
            name: output.name,
            mName: machineInfo.name,
            value: times * (output.n || 1)
          })
          this.calculator!.loadNumber(output.name, -1 * times * (output.n || 1), loadOptions)
        }
        if (recipe.q) {
          for (const input of recipe.q) {
            this.calculator!.loadNumber(input.name, times * (input.n || 1), loadOptions)
          }
        }
      }

      for (const demand of demands) {
        this.calculator!.loadNumber(demand.name, demand.num, loadOptions)
      }

      // P2-3修复：fixGzSpeed在loadNumber之后、checkResult之前调用
      // 老代码calculator.js中的fixGzSpeed处理光栅石的采矿机速度
      // 注意：临界光子的fixGzSpeed已在loadNumber之前调用，此处只处理光栅石
      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      this.fixGzSpeed(settingsTime, settingsPf)

      // P0-1修复：mergeMul已被老代码注释掉，checkResult会处理这种情况
      // 老代码注释：//mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
      // this.calculator!.mergeMul()

      // P5-1修复：时序问题 - value2必须在checkResult之前计算
      // 老代码顺序：计算value2 -> checkResult
      // 新代码原顺序：checkResult -> buildResult中计算value2（错误！）
      // 修复：先计算value2，再调用checkResult
      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      this.calculateValue2(settings, settingsTime, defaultAccType, defaultAccValue, settingsPf)

      // P3-1修复：使用checkResultWithMachineInfo，传入机器信息
      // 老代码checkResult需要访问机器信息(speed, time)
      // P9-1修复：传入settingsPf、settings、defaultAccValue参数，确保使用用户选择的配方
      this.calculator!.checkResultWithMachineInfo(
        recipe => {
          return this.getMachineInfo(recipe, settings, settingsTime)
        },
        settingsPf,
        settings,
        defaultAccValue
      )

      // P6-3修复：checkResult后的value2修正，与老代码data.js对齐
      // 老代码在checkResult之后遍历xh_list，将value<0的条目的value2设为0
      const state = this.calculator!.getState()
      for (const xh of state.xhList) {
        if (!xh.value) continue
        if (xh.value < 0) {
          xh.value2 = 0
        }
      }

      return this.buildResult(
        demands,
        excludes,
        settings,
        settingsTime,
        defaultAccType,
        defaultAccValue,
        hideSource,
        settingsPf
      )
    } catch (error) {
      this.calculator!.clearState()
      logger.error('[UpdateAllService] Calculation error:', error)
      throw error
    }
  }

  private orbitalCollectorTCache: Map<string, number> = new Map()

  private doSpeed1(settingsTime: Record<string, number>): void {
    const st = settingsTime || {}
    // P13-1修复：键名与老代码data.js doSpeed1函数完全对齐
    // 老代码data.js: speed1_3 = st['轨道采集器(巨冰)_氢'], speed1_4 = st['轨道采集器(巨冰)_可燃冰']
    // 注意：老代码变量命名与HTML注释不一致，以实际代码为准
    const speed1_1 = st['轨道采集器(气态)_氢'] || 1
    const speed1_2 = st['轨道采集器(气态)_重氢'] || 0.02
    const speed1_3 = st['轨道采集器(巨冰)_氢'] || 0.5
    const speed1_4 = st['轨道采集器(巨冰)_可燃冰'] || 0.5
    const ore = st['采矿机_效率'] || 100

    const getSum = (value1: number, value2: number, p1: number, p2: number): number => {
      let sum = 60 * value1 * 0.01 * ore * 8
      const per = (value1 * p1) / (value1 * p1 + value2 * p2)
      sum -= (60 * 30 * per) / p1
      return sum
    }

    this.orbitalCollectorTCache.clear()

    for (const recipe of this.recipes) {
      if (
        recipe.s &&
        (recipe.s[0]?.name === '氢' ||
          recipe.s[0]?.name === '重氢' ||
          recipe.s[0]?.name === '可燃冰')
      ) {
        if (recipe.m && Array.isArray(recipe.m)) {
          for (let i = 0; i < recipe.m.length; i++) {
            const cacheKey = `${recipe.id}-${recipe.s[0].name}`
            if (recipe.m[i].name === '轨道采集器(气态)') {
              if (recipe.s[0].name === '氢') {
                this.orbitalCollectorTCache.set(
                  cacheKey,
                  1 / (getSum(speed1_1, speed1_2, 8, 8) / 60)
                )
              } else if (recipe.s[0].name === '重氢') {
                this.orbitalCollectorTCache.set(
                  cacheKey,
                  1 / (getSum(speed1_2, speed1_1, 8, 8) / 60)
                )
              }
            }
            if (recipe.m[i].name === '轨道采集器(巨冰)') {
              if (recipe.s[0].name === '氢') {
                this.orbitalCollectorTCache.set(
                  cacheKey,
                  1 / (getSum(speed1_4, speed1_3, 8, 4.8) / 60)
                )
              } else if (recipe.s[0].name === '可燃冰') {
                this.orbitalCollectorTCache.set(
                  cacheKey,
                  1 / (getSum(speed1_3, speed1_4, 4.8, 8) / 60)
                )
              }
            }
          }
        }
      }
    }
  }

  getOrbitalCollectorT(recipeId: number | undefined, productName: string): number | undefined {
    if (recipeId === undefined) return undefined
    return this.orbitalCollectorTCache.get(`${recipeId}-${productName}`)
  }

  // P2-2修复：处理临界光子的射线接收塔配方
  // 老代码Scripts/data.js中的fixGzSpeed函数
  // P6-4修复：老代码使用临界光子配方的增产剂设置，而非全局默认设置
  // P9-1修复：使用calculator.find查找临界光子配方，支持settingsPf用户选择
  // P10-1修复：使用缓存机制，解决修改克隆对象无效的问题
  private fixCriticalPhotonSpeed(
    settingsTime: Record<string, number>,
    settings: Record<string, { m?: string; accType?: string; accValue?: string }>,
    defaultAccType: string,
    defaultAccValue: string,
    settingsPf: Record<string, string | number> = {}
  ): void {
    // 老代码逻辑：根据增产剂设置计算fixedGzSpeed，修改配方的t值和引力透镜需求
    // 每分钟需求: 引力透镜=0.1*接收塔=0.1*光子需求量/光子产量
    // 光子产量: 12(透镜×200%)/15(增产Ⅰ×250%)/18(增产Ⅱ×300%)/24(增产Ⅲ×400%)

    // P10-1修复：重置缓存
    this.criticalPhotonTCache = null
    this.criticalPhotonLensNCache = null

    // P9-1修复：使用calculator.find查找临界光子配方，支持settingsPf用户选择
    // 老代码：item = find("临界光子", true);
    const criticalPhotonRecipe = this.calculator!.find('临界光子', {
      normalizeRecipe: true,
      settingsPf,
      settings,
      defaultAccValue
    })
    if (!criticalPhotonRecipe || !criticalPhotonRecipe.m) return

    const mArray = Array.isArray(criticalPhotonRecipe.m) ? criticalPhotonRecipe.m : []
    const rayReceiver = mArray.find(m => m.name === '射线接收塔')
    if (!rayReceiver) return

    // 检查是否有引力透镜输入
    const lensInput = criticalPhotonRecipe.q?.find(q => q.name === '引力透镜')
    const hasLensInput = !!lensInput

    // P6-4修复：老代码使用临界光子配方的增产剂设置
    // 老代码：item = find("临界光子", true);
    //        accType = (settings[item.id] || {}).accType || defaultAccType;
    //        accValue = (settings[item.id] || {}).accValue || defaultAccValue;
    const recipeSettings = settings[criticalPhotonRecipe.id?.toString() || '']
    const accType = recipeSettings?.accType || defaultAccType
    const accValue = recipeSettings?.accValue || defaultAccValue

    // P14-1修复：支持manualGzSpeed手动输入临界光子速度
    // 老代码：if (manualGzSpeed) { fixedGzSpeed = parseFloat($("#gzSpeed").val()); }
    // P8-修复：键名对齐，使用'射线接收塔'而非'临界光子_手动速度'
    // bridge.ts中legacyUpdateSpeedSettings将criticalPhotonSpeed写入'射线接收塔'
    const gzSpeedSetting = settingsTime['射线接收塔']
    let fixedGzSpeed: number
    if (gzSpeedSetting !== undefined && gzSpeedSetting > 0) {
      // P14-1修复：用户手动输入临界光子每分钟产量
      fixedGzSpeed = gzSpeedSetting
    } else {
      // 根据增产剂设置计算
      if (accValue === '加速') {
        switch (accType) {
          case '增产剂Mk.Ⅰ':
            fixedGzSpeed = 15
            break
          case '增产剂Mk.Ⅱ':
            fixedGzSpeed = 18
            break
          case '增产剂Mk.Ⅲ':
            fixedGzSpeed = 24
            break
          default:
            fixedGzSpeed = 12
        }
      } else {
        fixedGzSpeed = 12
      }
    }

    // P10-1修复：使用缓存机制，而非修改克隆对象
    // 老代码直接修改data数组，新代码使用缓存
    // P15-1修复：老代码逻辑 this.t = this.q && this.q.length ? 60 / fixedGzSpeed : 10;
    // 无原料时t值默认为10
    if (hasLensInput) {
      this.criticalPhotonLensNCache = parseFloat((0.1 / fixedGzSpeed).toFixed(6))
      this.criticalPhotonTCache = 60 / fixedGzSpeed
    } else {
      this.criticalPhotonLensNCache = null
      this.criticalPhotonTCache = 10
    }
  }

  // P10-1修复：获取临界光子配方的缓存t值
  getCriticalPhotonT(): number | null {
    return this.criticalPhotonTCache
  }

  // P10-1修复：获取临界光子配方的缓存引力透镜需求
  getCriticalPhotonLensN(): number | null {
    return this.criticalPhotonLensNCache
  }

  // P2-3修复：处理光栅石的采矿机速度
  // 老代码calculator.js中的fixGzSpeed函数
  // P9-1修复：添加settingsPf参数，确保使用用户选择的配方
  private fixGzSpeed(
    settingsTime: Record<string, number>,
    settingsPf: Record<string, string | number> = {}
  ): void {
    // 委托给RecipeCalculator的fixGzSpeed方法
    // 光栅石由采矿机生产时，需要根据采矿机速度修正计算结果
    this.calculator!.fixGzSpeed(settingsTime, settingsPf)
  }

  private getMachineInfo(
    recipe: IRawRecipe,
    settings: Record<string, { m?: string }>,
    settingsTime: Record<string, number>
  ): IMachineInfo {
    const recipeSettings = settings[recipe.id?.toString() || '']
    const mArray = Array.isArray(recipe.m) ? recipe.m : []
    const machineName = recipeSettings?.m || mArray[0]?.name || recipe.mName || ''
    const machine =
      mArray.find((m: { name: string; speed: number }) => m.name === machineName) || mArray[0]

    const baseSpeed = machine?.speed || 1
    const customSpeed = settingsTime[machineName]
    const speed = customSpeed !== undefined ? customSpeed : baseSpeed

    let recipeT = recipe.t || 1
    if (machineName === '轨道采集器(气态)' || machineName === '轨道采集器(巨冰)') {
      const cachedT = this.getOrbitalCollectorT(recipe.id, recipe.s?.[0]?.name || '')
      if (cachedT !== undefined) {
        recipeT = cachedT
      }
    }
    // P10-1修复：使用缓存的临界光子t值
    // 老代码直接修改data数组，新代码使用缓存机制
    // P12-1修复：使用recipe.s[0].name检查临界光子，因为IRawRecipe.name是可选属性
    const mainProductName = recipe.s?.[0]?.name
    if (mainProductName === '临界光子' && machineName === '射线接收塔') {
      const cachedT = this.criticalPhotonTCache
      if (cachedT !== null) {
        recipeT = cachedT
      }
    }

    return {
      name: machineName,
      speed,
      time: recipeT / speed,
      t: recipeT,
      isChange: customSpeed !== undefined
    }
  }

  // P5-1修复：添加calculateValue2方法，在checkResult之前计算value2
  // 老代码在checkResult之前计算value2，checkResult依赖value2进行溢出检测
  // P9-1修复：添加settingsPf参数，确保使用用户选择的配方
  private calculateValue2(
    settings: Record<string, { m?: string; accType?: string; accValue?: string }>,
    settingsTime: Record<string, number>,
    defaultAccType: string,
    defaultAccValue: string,
    settingsPf: Record<string, string | number> = {}
  ): void {
    const state = this.calculator!.getState()

    for (const xh of state.xhList) {
      if (!xh.value || xh.value <= 0) continue

      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      const recipe = this.calculator!.find(xh.name, { settingsPf, settings, defaultAccValue })
      if (!recipe) continue

      const recipeSettings = settings[recipe.id?.toString() || '']
      const machineInfo = this.getMachineInfo(recipe, settings, settingsTime)

      const accType = recipeSettings?.accType || defaultAccType
      let accValue = recipeSettings?.accValue || defaultAccValue

      // 架构师注：accValue 修正逻辑与老代码 data.js update_all 函数对齐
      // 老代码在value2计算时只检查item.q.length == 0，不检查noExtra === null
      if (accValue === '增产' && recipe.noExtra) {
        accValue = '无'
      }
      if (!recipe.q || recipe.q.length === 0) {
        accValue = '无'
      }

      // P16-1修复：fixValue2Times计算逻辑与老代码完全对齐
      // 老代码：检查item.q[j].name === item.name（item.name是find返回的主产物名称）
      // find返回的recipe通过Object.assign获得name属性
      let fixValue2Times = 1
      if (recipe.q) {
        const recipeName = recipe.name || xh.name
        for (let j = 0; j < recipe.q.length; j++) {
          if (recipe.q[j].name === recipeName) {
            const recipeN = recipe.n || 1
            const inputN = recipe.q[j].n || 0
            if (recipeN > inputN) {
              fixValue2Times = recipeN / (recipeN - inputN)
            }
          }
        }
      }

      // P7-4修复：value2计算逻辑与老代码data.js完全对齐
      // 老代码：先计算基础value2，再根据条件应用getAccSpeed和fixValue2Times
      xh.value2 = xh.value / (1 / machineInfo.time) / 60 / (recipe.n || 1)

      // P12-1修复：使用recipe.s[0].name检查临界光子，因为IRawRecipe.name是可选属性
      const mainProductName = recipe.s?.[0]?.name
      if (mainProductName !== '临界光子' || recipe.mName !== '射线接收塔') {
        xh.value2 = (xh.value2 / RecipeCalculator.getAccSpeed(accType, accValue)) * fixValue2Times
      }
      // 临界光子（射线接收塔）不应用getAccSpeed和fixValue2Times，保持基础value2
    }
  }

  private buildResult(
    demands: IDemand[],
    excludes: string[],
    settings: Record<string, { m?: string; accType?: string; accValue?: string }>,
    settingsTime: Record<string, number>,
    defaultAccType: string,
    defaultAccValue: string,
    hideSource: boolean,
    settingsPf: Record<string, string | number> = {}
  ): ICalculationResult {
    const state = this.calculator!.getState()
    const items: IResultItem[] = []
    const items0: IResultItem[] = []
    const items2: IResultItem[] = []
    const total: ITotalItem[] = []

    const isXqs = (name: string): boolean => {
      return demands.some(d => d.name === name)
    }

    const getEnergyMultiplier = (accType: string, accValue: string): number => {
      if (accValue === '无') return 1
      if (accType === '增产剂Mk.Ⅰ') return 1.3
      if (accType === '增产剂Mk.Ⅱ') return 1.7
      if (accType === '增产剂Mk.Ⅲ') return 2.5
      return 1
    }

    for (const xh of state.xhList) {
      if (!xh.value) continue

      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      const recipe = this.calculator!.find(xh.name, { settingsPf, settings, defaultAccValue })
      if (!recipe) continue

      const recipeSettings = settings[recipe.id?.toString() || '']
      const machineInfo = this.getMachineInfo(recipe, settings, settingsTime)

      if (hideSource && (!recipe.q || recipe.q.length === 0)) {
        continue
      }

      // P5-1修复：value2已在calculateValue2中计算，此处不再重复计算
      // 原代码在此处计算value2，但checkResult需要使用value2，导致时序错误

      const specialItems = ['精炼油', '氢', '石墨烯', '重氢']
      const number2Value = xh.value2
        ? xh.value2.toFixed(this.pointLength)
        : specialItems.includes(xh.name)
          ? (0.0).toFixed(this.pointLength)
          : ''

      const item: IResultItem = {
        name: xh.name,
        number1: xh.value.toFixed(this.pointLength),
        number2: number2Value,
        number2full: number2Value,
        number2img: '',
        time: machineInfo.time.toFixed(this.pointLength),
        t: machineInfo.t.toFixed(this.pointLength),
        speed: machineInfo.speed.toFixed(this.pointLength),
        speedClass: machineInfo.isChange ? 'time time2' : 'time',
        rowClass: isXqs(xh.name) ? 'xqsrow' : '',
        machineName: machineInfo.name,
        m: [],
        pf: [],
        accType: [],
        accValue: [],
        accTotal: (xh.accTotal || 0).toFixed(2)
      }

      // P7-1修复：填充pf数组（可选配方列表）
      const pfRecipes = this.calculator!.getPfs(xh.name)
      for (const pfRecipe of pfRecipes) {
        const isSelected = recipe.id === pfRecipe.id
        item.pf.push({
          class: isSelected ? 'pf selected' : 'pf',
          itemName: xh.name,
          href: isSelected
            ? 'javascript:void(0)'
            : `javascript:selectPf("${xh.name}","${pfRecipe.id}")`,
          name: pfRecipe.name || '',
          title: this.getPfTitle(pfRecipe, isSelected ? machineInfo : null),
          showName: pfRecipe.name || ''
        })
      }

      // P7-1修复：填充m数组（可选设备列表）
      const mArray = Array.isArray(recipe.m) ? recipe.m : []
      for (const m of mArray) {
        const isSelected = machineInfo.name === m.name
        let title = `设备速度:${(m.speed || 1).toFixed(this.pointLength)}`
        const showName = (m.name || '').replace('制作台', '')
        if (showName === '采矿机') {
          title += ' 采矿机按6个矿脉计算(因所限传送带速度最高30)'
        }
        if (showName === '大型采矿机') {
          title += ' 大型采矿机按20个矿脉计算'
        }
        if (showName === '矿脉') {
          title += ' (速度最高30)'
        }
        item.m.push({
          class: isSelected ? 'm selected' : 'm',
          itemName: xh.name,
          href: isSelected
            ? 'javascript:void(0)'
            : `javascript:selectM("${recipe.id}","${m.name}")`,
          name: m.name || '',
          title,
          showName
        })
      }

      // P7-1修复：填充accType数组（增产剂类型选项）
      const currentAccType = recipeSettings?.accType || defaultAccType
      const currentAccValue = recipeSettings?.accValue || defaultAccValue
      const accTypes = ['增产剂Mk.Ⅰ', '增产剂Mk.Ⅱ', '增产剂Mk.Ⅲ']
      for (const accT of accTypes) {
        const isSelected = accT === currentAccType
        item.accType.push({
          class: isSelected ? 'm selected' : 'm',
          itemName: xh.name,
          href: isSelected
            ? 'javascript:void(0)'
            : `javascript:selectAccType("${recipe.id}","${accT}")`,
          name: accT,
          title: accT,
          showName: accT.replace('增产剂', '')
        })
      }

      // P7-1修复：填充accValue数组（增产剂效果选项）
      const accValues = ['无', '加速', '增产']
      let effectiveAccValue = currentAccValue
      if (effectiveAccValue === '增产' && recipe.noExtra) {
        effectiveAccValue = '无'
      }
      if (!recipe.q || recipe.q.length === 0 || recipe.noExtra === null) {
        effectiveAccValue = '无'
      }
      for (const accV of accValues) {
        if (accV !== '无' && (!recipe.q || recipe.q.length === 0 || recipe.noExtra === null))
          continue
        if (accV === '增产' && recipe.noExtra) continue
        const isSelected = accV === effectiveAccValue
        item.accValue.push({
          class: isSelected ? 'm selected' : 'm',
          itemName: xh.name,
          href: isSelected
            ? 'javascript:void(0)'
            : `javascript:selectAccValue("${recipe.id}","${accV}")`,
          name: accV,
          title: accV,
          showName: accV
        })
      }

      if (xh.name === '太阳帆') {
        item.numberOther = `(可供 ${(xh.value / 20).toFixed(this.pointLength)} 电磁轨道弹射器)`
      } else if (xh.name === '小型运载火箭') {
        item.numberOther = `(可供 ${(xh.value / 5).toFixed(this.pointLength)} 垂直发射井)`
      }

      items.push(item)

      const baseEnergy = ENERGY_DATA[machineInfo.name] || 0
      const space = SPACE_DATA[machineInfo.name] || 0

      const accType = recipeSettings?.accType || defaultAccType
      const accValue = recipeSettings?.accValue || defaultAccValue
      const energyMultiplier = getEnergyMultiplier(accType, accValue)
      const energy = baseEnergy * energyMultiplier

      // P7-2修复：total计算使用Math.ceil，与老代码对齐
      const totalValue2 = Math.ceil(xh.value2 || 0)
      const totalItem = total.find(t => t.name === machineInfo.name)
      if (totalItem) {
        totalItem.value += totalValue2
        totalItem.energy = (totalItem.energy || 0) + energy * totalValue2
        totalItem.space = (totalItem.space || 0) + space * totalValue2
      } else {
        total.push({
          name: machineInfo.name,
          value: totalValue2,
          energy: energy * totalValue2,
          space: space * totalValue2
        })
      }
    }

    const totalEnergy = total.reduce((sum, t) => sum + (t.energy || 0), 0)
    const totalSpace = total.reduce((sum, t) => sum + (t.space || 0), 0)
    // P8-1修复：totalAcc计算逻辑与老代码data.js对齐
    // 老代码：只有当accValue != "无"时才累加accTotal
    // 新代码原逻辑：无条件累加所有accTotal，导致增产剂消耗计算错误
    let totalAcc = 0
    for (const xh of state.xhList) {
      if (!xh.value) continue
      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      const recipe = this.calculator!.find(xh.name, { settingsPf, settings, defaultAccValue })
      if (!recipe) continue
      const recipeSettings = settings[recipe.id?.toString() || '']
      const accValue = recipeSettings?.accValue || defaultAccValue
      // 架构师注：老代码检查info.accValue，info是getValue的结果
      // getValue返回的accValue已经过修正（noExtra、q.length等）
      // 此处需要使用修正后的effectiveAccValue
      let effectiveAccValue = accValue
      if (effectiveAccValue === '增产' && recipe.noExtra) {
        effectiveAccValue = '无'
      }
      if (!recipe.q || recipe.q.length === 0 || recipe.noExtra === null) {
        effectiveAccValue = '无'
      }
      if (effectiveAccValue !== '无') {
        totalAcc += xh.accTotal || 0
      }
    }

    // 架构师注：items2 处理 out_list（副产品/多余产出）
    // 老代码逻辑：遍历 out_list，生成 items2 用于显示多余产出
    for (const out of state.outList) {
      if (!out.value) continue
      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      const recipe = this.calculator!.find(out.name, { settingsPf, settings, defaultAccValue })
      if (!recipe) continue
      const machineInfo = this.getMachineInfo(recipe, settings, settingsTime)

      const outItem: IResultItem = {
        name: out.name,
        number1: out.value.toFixed(this.pointLength),
        number2: '',
        time: machineInfo.time.toFixed(this.pointLength),
        t: machineInfo.t.toFixed(this.pointLength),
        speed: machineInfo.speed.toFixed(this.pointLength),
        speedClass: machineInfo.isChange ? 'time time2' : 'time',
        rowClass: 'outrow',
        machineName: machineInfo.name,
        m: [],
        pf: [],
        accType: [],
        accValue: [],
        accTotal: '0.00'
      }
      items2.push(outItem)
    }

    // P7-3修复：处理items0（独立生产结果），与老代码data.js update_all函数对齐
    for (const single of this.singleList) {
      if (!single.value) continue
      const recipe = this.recipes[single.id]
      if (!recipe) continue
      const machineInfo = this.getMachineInfo(recipe, settings, settingsTime)

      const singleItem: IResultItem = {
        name: single.name,
        number1: single.value.toFixed(this.pointLength),
        number2: single.number.toFixed(this.pointLength),
        number2full: single.number.toFixed(this.pointLength),
        number2img: '',
        time: machineInfo.time.toFixed(this.pointLength),
        t: machineInfo.t.toFixed(this.pointLength),
        speed: machineInfo.speed.toFixed(this.pointLength),
        speedClass: machineInfo.isChange ? 'time time2' : 'time',
        rowClass: 'singlerow',
        machineName: single.mName,
        m: [],
        pf: [],
        accType: [],
        accValue: [],
        accTotal: '0.00'
      }
      items0.push(singleItem)
    }

    return {
      items,
      items0,
      items2,
      total,
      totalEnergy: totalEnergy.toFixed(0),
      totalSpace,
      totalAcc: totalAcc.toFixed(2),
      xqs: demands.map(d => ({
        name: d.name,
        number: d.num,
        item: { name: d.name }
      })),
      igNames: excludes
    }
  }

  // P7-1修复：添加getPfTitle方法，生成配方标题
  // 与老代码data.js getPfTitle函数对齐
  private getPfTitle(recipe: IRawRecipe, machineInfo: IMachineInfo | null): string {
    const parts: string[] = []

    // 原料
    if (recipe.q) {
      for (const q of recipe.q) {
        parts.push(`${q.name}×${q.n || 1}`)
      }
    }

    if (recipe.q && recipe.q.length > 0) {
      parts.push('→')
    }

    // 产出
    if (recipe.s) {
      for (const s of recipe.s) {
        parts.push(`${s.name}×${s.n || 1}`)
      }
    }

    parts.push(`(${(recipe.t || 1).toFixed(1)}s)`)

    if (machineInfo) {
      parts.push(`[${machineInfo.name}]`)
    }

    return parts.join(' ')
  }

  getState(): ICalculationState | null {
    return this.calculator?.getState() || null
  }

  clearState(): void {
    this.calculator?.clearState()
  }
}

export const updateAllService = new UpdateAllService()
