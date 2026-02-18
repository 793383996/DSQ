/**
 * BlueprintEncoder - 蓝图编码器
 *
 * 功能：
 * - 将蓝图数据结构编码为游戏可识别的字符串
 * - 使用pako进行gzip压缩
 * - 使用BinaryWriter写入二进制数据
 * - 计算MD5校验和
 *
 * 主要方法：
 * - encodeBlueprintData(data): 编码蓝图数据
 * - encodeBuilding(building, writer): 编码单个建筑
 * - encodeArea(area, writer): 编码区域
 * - encodeHeader(header, writer): 编码头信息
 *
 * 上游调用：
 * - core/adapters/BlueprintAdapter.ts: 蓝图适配器
 *
 * 下游依赖：
 * - utils/BinaryWriter.ts: 二进制写入器
 * - utils/md5.ts: MD5计算
 * - types/blueprint.ts: 蓝图类型定义
 *
 * 编码格式：
 * - 头信息：版本、时间戳、建筑数量等
 * - 区域信息：区域索引、大小等
 * - 建筑信息：位置、朝向、配方等
 */
import pako from 'pako'
import { BinaryWriter } from './BinaryWriter'
import { md5Hex } from './md5'
import type {
  IBlueprintData,
  IBlueprintBuilding,
  IBlueprintArea,
  IBlueprintHeader
} from '../types/blueprint'

const TIME_BASE = new Date(0).setUTCFullYear(1)

type PakoModule = typeof pako

function getPakoImpl(): PakoModule {
  const pakoModule = (pako as unknown as { default?: PakoModule }).default || pako
  return {
    ...pakoModule,
    gzip: pakoModule.deflate
  } as PakoModule
}

const ALL_ASSEMBLERS = new Set([2303, 2304, 2305, 2302, 2315, 2308, 2309, 2310, 2317, 2318, 2319])

const STATION_DESC = { maxItemKind: 3, numSlots: 12 }
const INTERSTELLAR_STATION_DESC = { maxItemKind: 5, numSlots: 12 }
const ADVANCED_MINING_MACHINE_DESC = { maxItemKind: 1, numSlots: 9 }

const STATION_PARAMS_META = {
  base: 320,
  storage: { base: 0, stride: 6 },
  slots: { base: 192, stride: 4 }
}

function setParam(view: DataView, pos: number, value: number): void {
  view.setInt32(pos * Int32Array.BYTES_PER_ELEMENT, value, true)
}

function uint8ArrayToBinaryString(arr: Uint8Array): string {
  let out = ''
  for (let i = 0; i < arr.length; i++) {
    out += String.fromCharCode(arr[i])
  }
  return out
}

function binaryStringToUint8Array(b: string): Uint8Array {
  const arr = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) {
    arr[i] = b.charCodeAt(i)
  }
  return arr
}

interface IStationStorage {
  itemId: number
  localRole: number
  remoteRole: number
  max: number
}

interface IStationSlot {
  dir: number
  storageIdx: number
}

interface IStationParams {
  storage: IStationStorage[]
  slots: IStationSlot[]
  workEnergyPerTick: number
  tripRangeOfDrones: number
  tripRangeOfShips: number
  includeOrbitCollector: boolean
  warpEnableDistance: number
  warperNecessary: boolean
  deliveryAmountOfDrones: number
  deliveryAmountOfShips: number
  pilerCount: number
  miningSpeed?: number
}

interface ISplitterParams {
  priority: boolean[]
}

interface ILabParams {
  researchMode: number
  acceleratorMode: number
}

interface IAssemblerParams {
  acceleratorMode: number
}

interface IBeltParams {
  iconId: number
  count: number
}

interface IInserterParams {
  length: number
}

interface ITankParams {
  output: boolean
  input: boolean
}

interface IStorageParams {
  automationLimit: number
}

interface IEjectorParams {
  orbitId: number
}

interface IPowerGeneratorParams {
  productId: number
}

interface IEnergyExchangerParams {
  mode: number
}

interface IMonitorParams {
  targetBeltId: number
  offset: number
  targetCargoAmount: number
  periodTicksCount: number
  passOperator: number
  passColorId: number
  failColorId: number
  cargoFilter: number
  tone: number
  volume: number
  pitch: number
  repeat: boolean
  length: number
  falloffRadius: [number, number]
  systemWarningMode: number
  systemWarningIconId: number
  alarmMode: number
}

interface IUnknownParams {
  parameters: Int32Array
}

type BuildingParams =
  | IStationParams
  | ISplitterParams
  | ILabParams
  | IAssemblerParams
  | IBeltParams
  | IInserterParams
  | ITankParams
  | IStorageParams
  | IEjectorParams
  | IPowerGeneratorParams
  | IEnergyExchangerParams
  | IMonitorParams
  | IUnknownParams
  | null

function getEncodedSize(params: BuildingParams): number {
  if (params === null) return 0

  if ('parameters' in params && params.parameters instanceof Int32Array) {
    return params.parameters.length
  }

  if ('storage' in params) {
    return 2048
  }

  if ('priority' in params) return 4
  if ('researchMode' in params && 'acceleratorMode' in params) return 2
  if ('acceleratorMode' in params && !('researchMode' in params)) return 1
  if ('iconId' in params) return 2
  if ('length' in params && !('falloffRadius' in params)) return 1
  if ('output' in params) return 2
  if ('automationLimit' in params) return 1
  if ('orbitId' in params) return 1
  if ('productId' in params) return 1
  if ('mode' in params && !('researchMode' in params)) return 1
  if ('falloffRadius' in params) return 128

  return 0
}

function encodeStationParams(params: IStationParams, view: DataView, maxItemKind: number): void {
  const base = STATION_PARAMS_META.base
  setParam(view, base, params.workEnergyPerTick)
  setParam(view, base + 1, params.tripRangeOfDrones * 100000000.0)
  setParam(view, base + 2, params.tripRangeOfShips / 100.0)
  setParam(view, base + 3, params.includeOrbitCollector ? 1 : -1)
  setParam(view, base + 4, params.warpEnableDistance)
  setParam(view, base + 5, params.warperNecessary ? 1 : -1)
  setParam(view, base + 6, params.deliveryAmountOfDrones)
  setParam(view, base + 7, params.deliveryAmountOfShips)
  setParam(view, base + 8, params.pilerCount)

  const { base: storageBase, stride } = STATION_PARAMS_META.storage
  for (let i = 0; i < maxItemKind; i++) {
    const s = params.storage[i]
    setParam(view, storageBase + i * stride, s.itemId)
    setParam(view, storageBase + i * stride + 1, s.localRole)
    setParam(view, storageBase + i * stride + 2, s.remoteRole)
    setParam(view, storageBase + i * stride + 3, s.max)
  }

  const { base: slotsBase, stride: slotsStride } = STATION_PARAMS_META.slots
  for (let i = 0; i < 12; i++) {
    const s = params.slots[i]
    setParam(view, slotsBase + i * slotsStride, s.dir)
    setParam(view, slotsBase + i * slotsStride + 1, s.storageIdx)
  }
}

function encodeAdvancedMiningMachineParams(params: IStationParams, view: DataView): void {
  encodeStationParams(params, view, ADVANCED_MINING_MACHINE_DESC.maxItemKind)
  const base = STATION_PARAMS_META.base
  setParam(view, base + 9, params.miningSpeed ?? 0)
}

function encodeSplitterParams(params: ISplitterParams, view: DataView): void {
  for (let i = 0; i < 4; i++) {
    setParam(view, i, params.priority[i] ? 1 : 0)
  }
}

function encodeLabParams(params: ILabParams, view: DataView): void {
  setParam(view, 0, params.researchMode)
  setParam(view, 1, params.acceleratorMode)
}

function encodeAssemblerParams(params: IAssemblerParams, view: DataView): void {
  setParam(view, 0, params.acceleratorMode)
}

function encodeBeltParams(params: IBeltParams, view: DataView): void {
  setParam(view, 0, params.iconId)
  setParam(view, 1, params.count)
}

function encodeInserterParams(params: IInserterParams, view: DataView): void {
  setParam(view, 0, params.length)
}

function encodeTankParams(params: ITankParams, view: DataView): void {
  setParam(view, 0, params.output ? 1 : -1)
  setParam(view, 1, params.input ? 1 : -1)
}

function encodeStorageParams(params: IStorageParams, view: DataView): void {
  setParam(view, 0, params.automationLimit)
}

function encodeEjectorParams(params: IEjectorParams, view: DataView): void {
  setParam(view, 0, params.orbitId)
}

function encodePowerGeneratorParams(params: IPowerGeneratorParams, view: DataView): void {
  setParam(view, 0, params.productId)
}

function encodeEnergyExchangerParams(params: IEnergyExchangerParams, view: DataView): void {
  setParam(view, 0, params.mode)
}

function encodeMonitorParams(params: IMonitorParams, view: DataView): void {
  setParam(view, 0, params.targetBeltId)
  setParam(view, 1, params.offset)
  setParam(view, 2, params.targetCargoAmount)
  setParam(view, 3, params.periodTicksCount)
  setParam(view, 4, params.passOperator)
  setParam(view, 5, params.passColorId)
  setParam(view, 6, params.failColorId)
  setParam(view, 14, params.cargoFilter)
  setParam(view, 7, params.tone)
  setParam(view, 8, params.volume)
  setParam(view, 9, params.pitch)
  setParam(view, 11, params.repeat ? 1 : 0)
  setParam(view, 13, params.length * 10000)
  setParam(view, 18, params.falloffRadius[0] * 10)
  setParam(view, 19, params.falloffRadius[1] * 10)
  setParam(view, 10, params.systemWarningMode)
  setParam(view, 17, params.systemWarningIconId)
  setParam(view, 12, params.alarmMode)
}

function encodeUnknownParams(params: IUnknownParams, view: DataView): void {
  for (let i = 0; i < params.parameters.length; i++) {
    setParam(view, i, params.parameters[i])
  }
}

function encodeParams(itemId: number, params: BuildingParams, view: DataView): void {
  if (params === null) return

  if (itemId === 2103) {
    encodeStationParams(params as IStationParams, view, STATION_DESC.maxItemKind)
  } else if (itemId === 2104) {
    encodeStationParams(params as IStationParams, view, INTERSTELLAR_STATION_DESC.maxItemKind)
  } else if (itemId === 2316) {
    encodeAdvancedMiningMachineParams(params as IStationParams, view)
  } else if (itemId === 2020) {
    encodeSplitterParams(params as ISplitterParams, view)
  } else if (itemId === 2901 || itemId === 2902) {
    encodeLabParams(params as ILabParams, view)
  } else if (itemId === 2001 || itemId === 2002 || itemId === 2003) {
    encodeBeltParams(params as IBeltParams, view)
  } else if (itemId === 2011 || itemId === 2012 || itemId === 2013 || itemId === 2014) {
    encodeInserterParams(params as IInserterParams, view)
  } else if (itemId === 2101 || itemId === 2102) {
    encodeStorageParams(params as IStorageParams, view)
  } else if (itemId === 2106) {
    encodeTankParams(params as ITankParams, view)
  } else if (itemId === 2311) {
    encodeEjectorParams(params as IEjectorParams, view)
  } else if (itemId === 2208) {
    encodePowerGeneratorParams(params as IPowerGeneratorParams, view)
  } else if (itemId === 2209) {
    encodeEnergyExchangerParams(params as IEnergyExchangerParams, view)
  } else if (itemId === 2030) {
    encodeMonitorParams(params as IMonitorParams, view)
  } else if (ALL_ASSEMBLERS.has(itemId)) {
    encodeAssemblerParams(params as IAssemblerParams, view)
  } else if ('parameters' in params && params.parameters instanceof Int32Array) {
    encodeUnknownParams(params, view)
  }
}

function exportArea(w: BinaryWriter, area: IBlueprintArea): void {
  w.setInt8(area.index)
  w.setInt8(area.parentIndex)
  w.setInt16(area.tropicAnchor)
  w.setInt16(area.areaSegments)
  w.setInt16(area.anchorLocalOffset.x)
  w.setInt16(area.anchorLocalOffset.y)
  w.setInt16(area.size.x)
  w.setInt16(area.size.y)
}

function exportBuilding(w: BinaryWriter, b: IBlueprintBuilding): void {
  if (!b.localOffset || b.localOffset.length < 2) {
    throw new Error('Building must have at least 2 local offsets')
  }

  w.setInt32(b.index)
  w.setInt8(b.areaIndex ?? 0)
  w.setFloat32(b.localOffset[0].x)
  w.setFloat32(b.localOffset[0].y)
  w.setFloat32(b.localOffset[0].z)
  w.setFloat32(b.localOffset[1].x)
  w.setFloat32(b.localOffset[1].y)
  w.setFloat32(b.localOffset[1].z)
  w.setFloat32(b.yaw[0])
  w.setFloat32(b.yaw[1])
  w.setInt16(b.itemId)
  w.setInt16(b.modelIndex ?? 0)
  w.setInt32(b.outputObjIdx)
  w.setInt32(b.inputObjIdx)
  w.setInt8(b.outputToSlot)
  w.setInt8(b.inputFromSlot)
  w.setInt8(b.outputFromSlot)
  w.setInt8(b.inputToSlot)
  w.setInt8(b.outputOffset)
  w.setInt8(b.inputOffset)
  w.setInt16(b.recipeId)
  w.setInt16(b.filterId)

  if (b.parameters !== null) {
    const size = getEncodedSize(b.parameters as BuildingParams)
    w.setInt16(size)
    if (size > 0) {
      const paramView = w.getView(size * Int32Array.BYTES_PER_ELEMENT)
      encodeParams(b.itemId, b.parameters as BuildingParams, paramView)
    }
  } else {
    w.setInt16(0)
  }
}

function calculateEncodedSize(bp: IBlueprintData): number {
  let result = 28
  result += 1
  result += 14 * bp.areas.length
  result += 4
  result += 61 * bp.buildings.length

  for (const b of bp.buildings) {
    if (b.parameters === null) continue
    const size = getEncodedSize(b.parameters as BuildingParams)
    result += size * Int32Array.BYTES_PER_ELEMENT
  }

  return result
}

function encodeHeader(header: IBlueprintHeader): string {
  let result = 'BLUEPRINT:'
  result += '0,'
  result += header.layout.toString()
  result += ','

  for (const icon of header.icons) {
    result += icon.toString()
    result += ','
  }

  result += '0,'
  result += ((header.time.getTime() - TIME_BASE) * 10000).toString()
  result += ','
  result += header.gameVersion
  result += ','
  result += encodeURIComponent(header.shortDesc)
  result += ','
  result += encodeURIComponent(header.desc)
  result += '"'

  return result
}

export function encodeBlueprint(data: IBlueprintData): string {
  let result = encodeHeader(data.header)

  const size = calculateEncodedSize(data)
  const decoded = new Uint8Array(size)
  const writer = new BinaryWriter(decoded.buffer as ArrayBuffer)

  writer.setInt32(data.version)
  writer.setInt32(data.cursorOffset.x)
  writer.setInt32(data.cursorOffset.y)
  writer.setInt32(data.cursorTargetArea)
  writer.setInt32(data.dragBoxSize.x)
  writer.setInt32(data.dragBoxSize.y)
  writer.setInt32(data.primaryAreaIdx)
  writer.setUint8(data.areas.length)

  for (const area of data.areas) {
    exportArea(writer, area)
  }

  writer.setInt32(data.buildings.length)

  for (const building of data.buildings) {
    exportBuilding(writer, building)
  }

  const pakoModule = (pako as unknown as { default?: typeof pako }).default || pako
  const gzipped = pakoModule.deflate(decoded)
  const base64 = btoa(uint8ArrayToBinaryString(gzipped))
  result += base64
  result += '"'

  const fullBytes = binaryStringToUint8Array(result)
  const hash = md5Hex(fullBytes.buffer as ArrayBuffer)
  result += hash

  return result
}

export {
  ALL_ASSEMBLERS,
  STATION_DESC,
  INTERSTELLAR_STATION_DESC,
  ADVANCED_MINING_MACHINE_DESC,
  type BuildingParams,
  type IStationParams,
  type ISplitterParams,
  type ILabParams,
  type IAssemblerParams,
  type IBeltParams,
  type IInserterParams,
  type ITankParams,
  type IStorageParams,
  type IEjectorParams,
  type IPowerGeneratorParams,
  type IEnergyExchangerParams,
  type IMonitorParams,
  type IUnknownParams
}
