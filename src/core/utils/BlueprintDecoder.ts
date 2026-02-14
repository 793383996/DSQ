import pako from 'pako'
import { BinaryReader } from './BinaryReader'
import type { 
  IBlueprintData, 
  IBlueprintBuilding, 
  IBlueprintArea, 
  IBlueprintHeader,
  ICoordinate 
} from '../types/blueprint'
import {
  ALL_ASSEMBLERS,
  STATION_DESC,
  INTERSTELLAR_STATION_DESC,
  ADVANCED_MINING_MACHINE_DESC,
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
  type IUnknownParams,
  type BuildingParams
} from './BlueprintEncoder'

const TIME_BASE = new Date(0).setUTCFullYear(1)

const STATION_PARAMS_META = {
  base: 320,
  storage: { base: 0, stride: 6 },
  slots: { base: 192, stride: 4 }
}

function getParam(view: DataView, pos: number, defaultValue?: number): number {
  const p = pos * Int32Array.BYTES_PER_ELEMENT
  if (p >= view.byteLength) {
    if (defaultValue === undefined) {
      throw new Error('Parameter parse error: data segment too short')
    }
    return defaultValue
  }
  return view.getInt32(p, true)
}

function binaryStringToUint8Array(b: string): Uint8Array {
  const arr = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) {
    arr[i] = b.charCodeAt(i)
  }
  return arr
}

function decodeStationParams(view: DataView, maxItemKind: number): IStationParams {
  const base = STATION_PARAMS_META.base
  const result: IStationParams = {
    storage: [],
    slots: [],
    workEnergyPerTick: getParam(view, base),
    tripRangeOfDrones: getParam(view, base + 1) / 100000000.0,
    tripRangeOfShips: getParam(view, base + 2) * 100.0,
    includeOrbitCollector: getParam(view, base + 3) > 0,
    warpEnableDistance: getParam(view, base + 4),
    warperNecessary: getParam(view, base + 5) > 0,
    deliveryAmountOfDrones: getParam(view, base + 6),
    deliveryAmountOfShips: getParam(view, base + 7),
    pilerCount: getParam(view, base + 8)
  }
  
  const { base: storageBase, stride } = STATION_PARAMS_META.storage
  for (let i = 0; i < maxItemKind; i++) {
    result.storage.push({
      itemId: getParam(view, storageBase + i * stride),
      localRole: getParam(view, storageBase + i * stride + 1),
      remoteRole: getParam(view, storageBase + i * stride + 2),
      max: getParam(view, storageBase + i * stride + 3)
    })
  }
  
  const { base: slotsBase, stride: slotsStride } = STATION_PARAMS_META.slots
  for (let i = 0; i < 12; i++) {
    result.slots.push({
      dir: getParam(view, slotsBase + i * slotsStride),
      storageIdx: getParam(view, slotsBase + i * slotsStride + 1)
    })
  }
  
  return result
}

function decodeAdvancedMiningMachineParams(view: DataView): IStationParams {
  const p = decodeStationParams(view, ADVANCED_MINING_MACHINE_DESC.maxItemKind)
  const base = STATION_PARAMS_META.base
  p.miningSpeed = getParam(view, base + 9)
  return p
}

function decodeSplitterParams(view: DataView): ISplitterParams {
  const result: ISplitterParams = { priority: [] }
  for (let i = 0; i < 4; i++) {
    result.priority[i] = getParam(view, i) > 0
  }
  return result
}

function decodeLabParams(view: DataView): ILabParams {
  return {
    researchMode: getParam(view, 0),
    acceleratorMode: getParam(view, 1)
  }
}

function decodeAssemblerParams(view: DataView): IAssemblerParams {
  return {
    acceleratorMode: getParam(view, 0)
  }
}

function decodeBeltParams(view: DataView): IBeltParams {
  return {
    iconId: getParam(view, 0),
    count: getParam(view, 1, 0)
  }
}

function decodeInserterParams(view: DataView): IInserterParams {
  return {
    length: getParam(view, 0)
  }
}

function decodeTankParams(view: DataView): ITankParams {
  return {
    output: getParam(view, 0) > 0,
    input: getParam(view, 1) > 0
  }
}

function decodeStorageParams(view: DataView): IStorageParams {
  return {
    automationLimit: getParam(view, 0)
  }
}

function decodeEjectorParams(view: DataView): IEjectorParams {
  return {
    orbitId: getParam(view, 0)
  }
}

function decodePowerGeneratorParams(view: DataView): IPowerGeneratorParams {
  return {
    productId: getParam(view, 0)
  }
}

function decodeEnergyExchangerParams(view: DataView): IEnergyExchangerParams {
  return {
    mode: getParam(view, 0)
  }
}

function decodeMonitorParams(view: DataView): IMonitorParams {
  return {
    targetBeltId: getParam(view, 0),
    offset: getParam(view, 1),
    targetCargoAmount: getParam(view, 2),
    periodTicksCount: getParam(view, 3),
    passOperator: getParam(view, 4),
    passColorId: getParam(view, 5),
    failColorId: getParam(view, 6),
    cargoFilter: getParam(view, 14),
    tone: getParam(view, 7),
    volume: getParam(view, 8),
    pitch: getParam(view, 9),
    repeat: getParam(view, 11) > 0,
    length: getParam(view, 13) / 10000,
    falloffRadius: [getParam(view, 18) / 10, getParam(view, 19) / 10],
    systemWarningMode: getParam(view, 10),
    systemWarningIconId: getParam(view, 17),
    alarmMode: getParam(view, 12)
  }
}

function decodeUnknownParams(view: DataView): IUnknownParams {
  const params = new Int32Array(view.byteLength / Int32Array.BYTES_PER_ELEMENT)
  for (let i = 0; i < params.length; i++) {
    params[i] = getParam(view, i)
  }
  return { parameters: params }
}

function decodeParams(itemId: number, view: DataView): BuildingParams {
  if (itemId === 2103) {
    return decodeStationParams(view, STATION_DESC.maxItemKind)
  } else if (itemId === 2104) {
    return decodeStationParams(view, INTERSTELLAR_STATION_DESC.maxItemKind)
  } else if (itemId === 2316) {
    return decodeAdvancedMiningMachineParams(view)
  } else if (itemId === 2020) {
    return decodeSplitterParams(view)
  } else if (itemId === 2901 || itemId === 2902) {
    return decodeLabParams(view)
  } else if (itemId === 2001 || itemId === 2002 || itemId === 2003) {
    return decodeBeltParams(view)
  } else if (itemId === 2011 || itemId === 2012 || itemId === 2013 || itemId === 2014) {
    return decodeInserterParams(view)
  } else if (itemId === 2101 || itemId === 2102) {
    return decodeStorageParams(view)
  } else if (itemId === 2106) {
    return decodeTankParams(view)
  } else if (itemId === 2311) {
    return decodeEjectorParams(view)
  } else if (itemId === 2208) {
    return decodePowerGeneratorParams(view)
  } else if (itemId === 2209) {
    return decodeEnergyExchangerParams(view)
  } else if (itemId === 2030) {
    return decodeMonitorParams(view)
  } else if (ALL_ASSEMBLERS.has(itemId)) {
    return decodeAssemblerParams(view)
  }
  return decodeUnknownParams(view)
}

function readArea(reader: BinaryReader): IBlueprintArea {
  return {
    index: reader.getInt8(),
    parentIndex: reader.getInt8(),
    tropicAnchor: reader.getInt16(),
    areaSegments: reader.getInt16(),
    anchorLocalOffset: {
      x: reader.getInt16(),
      y: reader.getInt16()
    },
    size: {
      x: reader.getInt16(),
      y: reader.getInt16()
    }
  }
}

function readCoordinate(reader: BinaryReader): ICoordinate {
  return {
    x: reader.getFloat32(),
    y: reader.getFloat32(),
    z: reader.getFloat32()
  }
}

function readBuilding(reader: BinaryReader): IBlueprintBuilding {
  const index = reader.getInt32()
  const areaIndex = reader.getInt8()
  const localOffset0 = readCoordinate(reader)
  const localOffset1 = readCoordinate(reader)
  const yaw0 = reader.getFloat32()
  const yaw1 = reader.getFloat32()
  const itemId = reader.getInt16()
  const modelIndex = reader.getInt16()
  const outputObjIdx = reader.getInt32()
  const inputObjIdx = reader.getInt32()
  const outputToSlot = reader.getInt8()
  const inputFromSlot = reader.getInt8()
  const outputFromSlot = reader.getInt8()
  const inputToSlot = reader.getInt8()
  const outputOffset = reader.getInt8()
  const inputOffset = reader.getInt8()
  const recipeId = reader.getInt16()
  const filterId = reader.getInt16()
  const paramLength = reader.getInt16()
  
  let parameters: BuildingParams = null
  if (paramLength > 0) {
    const paramView = reader.getView(paramLength * Int32Array.BYTES_PER_ELEMENT)
    parameters = decodeParams(itemId, paramView)
  }
  
  return {
    index,
    areaIndex,
    localOffset: [localOffset0, localOffset1],
    yaw: [yaw0, yaw1],
    itemId,
    modelIndex,
    outputObjIdx,
    inputObjIdx,
    outputToSlot,
    inputFromSlot,
    outputFromSlot,
    inputToSlot,
    outputOffset,
    inputOffset,
    recipeId,
    filterId,
    parameters
  }
}

function parseHeader(headerStr: string): IBlueprintHeader {
  const parts = headerStr.split(',')
  if (parts.length < 8) {
    throw new Error('Invalid blueprint header format')
  }
  
  const layout = parseInt(parts[1], 10)
  const icons: number[] = []
  
  let i = 2
  while (parts[i] !== '0' && i < parts.length) {
    const iconId = parseInt(parts[i], 10)
    if (!isNaN(iconId)) {
      icons.push(iconId)
    }
    i++
  }
  
  const zeroIndex = parts.indexOf('0', 2)
  if (zeroIndex === -1) {
    throw new Error('Invalid blueprint header: missing zero marker')
  }
  
  const timeValue = parseInt(parts[zeroIndex + 1], 10)
  const time = new Date(TIME_BASE + timeValue / 10000)
  const gameVersion = parts[zeroIndex + 2]
  
  let shortDesc = ''
  let desc = ''
  
  const restParts = parts.slice(zeroIndex + 3).join(',')
  const descMatch = restParts.match(/^(.*?),"(.*?)$/)
  if (descMatch) {
    shortDesc = decodeURIComponent(descMatch[1])
    desc = decodeURIComponent(descMatch[2] || '')
  } else {
    shortDesc = decodeURIComponent(restParts)
  }
  
  return {
    layout,
    icons,
    time,
    gameVersion,
    shortDesc,
    desc
  }
}

export function decodeBlueprint(blueprintStr: string): IBlueprintData {
  if (!blueprintStr.startsWith('BLUEPRINT:')) {
    throw new Error('Invalid blueprint string: must start with BLUEPRINT:')
  }
  
  const content = blueprintStr.substring('BLUEPRINT:'.length)
  
  const quoteIndex = content.indexOf('"')
  if (quoteIndex === -1) {
    throw new Error('Invalid blueprint string: missing data marker')
  }
  
  const headerStr = content.substring(0, quoteIndex)
  const header = parseHeader(headerStr)
  
  const afterFirstQuote = content.substring(quoteIndex + 1)
  const secondQuoteIndex = afterFirstQuote.indexOf('"')
  if (secondQuoteIndex === -1) {
    throw new Error('Invalid blueprint string: missing end marker')
  }
  
  const base64Data = afterFirstQuote.substring(0, secondQuoteIndex)
  
  const gzipped = binaryStringToUint8Array(atob(base64Data))
  const pakoImpl = (pako as any).default ? (pako as any).default : pako
  const decompressed = pakoImpl.ungzip(gzipped)
  
  const reader = new BinaryReader(decompressed.buffer as ArrayBuffer)
  
  const version = reader.getInt32()
  const cursorOffset = {
    x: reader.getInt32(),
    y: reader.getInt32()
  }
  const cursorTargetArea = reader.getInt32()
  const dragBoxSize = {
    x: reader.getInt32(),
    y: reader.getInt32()
  }
  const primaryAreaIdx = reader.getInt32()
  const numAreas = reader.getUint8()
  
  const areas: IBlueprintArea[] = []
  for (let i = 0; i < numAreas; i++) {
    areas.push(readArea(reader))
  }
  
  const numBuildings = reader.getInt32()
  const buildings: IBlueprintBuilding[] = []
  for (let i = 0; i < numBuildings; i++) {
    buildings.push(readBuilding(reader))
  }
  
  return {
    version,
    cursorOffset,
    cursorTargetArea,
    dragBoxSize,
    primaryAreaIdx,
    areas,
    buildings,
    header
  }
}
