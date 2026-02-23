/**
 * MachineConfig - 机器配置数据
 *
 * 功能：
 * - 能量消耗数据 (ENERGY_DATA) - 单位: kW (由 MW 转换，1 MW = 1000 kW)
 * - 占用空间数据 (SPACE_DATA) - 单位: 格子数
 * - 图标名称映射 (ITEM_NAME_LIST)
 *
 * 数据来源：
 * - 从 legacy/configData.js 迁移
 * - 数据已与游戏实际数据对齐验证
 *
 * 上游使用：
 * - core/services/UpdateAllService.ts: 计算能量和空间
 * - core/adapters/BlueprintAdapter.ts: 蓝图生成
 *
 * 注意：此数据必须与 legacy/configData.js 保持一致
 */

export const ENERGY_DATA: Record<string, number> = {
  研究站: 480,
  矩阵研究站: 480,
  自演化研究站: 480,
  '制作台Mk.Ⅰ': 270,
  '制作台Mk.Ⅱ': 540,
  '制作台Mk.Ⅲ': 1080,
  重组式制造台: 2700,
  电弧熔炉: 360,
  位面熔炉: 1440,
  负熵熔炉: 2880,
  矿脉: 70,
  采矿机: 420,
  大型采矿机: 2940,
  原油萃取站: 840,
  抽水机: 300,
  原油精炼机: 960,
  原油精炼厂: 960,
  化工厂: 720,
  量子化工厂: 2160,
  粒子对撞机: 12000,
  轨道采集器: 0,
  射线接收塔: 0,
  能量枢纽: 0,
  分馏塔: 720
} as const

export const SPACE_DATA: Record<string, number> = {
  研究站: 2.4,
  矩阵研究站: 2.4,
  自演化研究站: 2.4,
  '制作台Mk.Ⅰ': 16,
  '制作台Mk.Ⅱ': 16,
  '制作台Mk.Ⅲ': 16,
  重组式制造台: 16,
  电弧熔炉: 16,
  位面熔炉: 16,
  负熵熔炉: 16,
  原油精炼机: 28,
  原油精炼厂: 28,
  化工厂: 35,
  量子化工厂: 35,
  射线接收塔: 24,
  能量枢纽: 64,
  分馏塔: 16,
  粒子对撞机: 45
} as const

export const ICONS_DEFINE: Record<string, [number, number, number, string]> = {
  氢: [-1, 3, 7, '氢'],
  可燃冰: [-1, 2, 7, '可燃冰']
} as const

export interface ItemNameEntry {
  displayName: string
  internalName: string
}

export const ITEM_NAME_LIST: ItemNameEntry[] = [
  { displayName: '矩阵研究站', internalName: 'lab' },
  { displayName: '配送运输机', internalName: '配送运输机' },
  { displayName: '水', internalName: 'water' },
  { displayName: '铁矿', internalName: 'ironOre' },
  { displayName: '铜矿', internalName: 'copperOre' },
  { displayName: '硅石', internalName: 'siliconOre' },
  { displayName: '钛石', internalName: 'titaniumOre' },
  { displayName: '煤矿', internalName: 'coal' },
  { displayName: '铁块', internalName: 'ironIngot' },
  { displayName: '钛块', internalName: 'titaniumIngot' },
  { displayName: '高级石墨', internalName: 'energeticGraphite' },
  { displayName: '金刚石', internalName: 'diamond' },
  { displayName: '增产剂Mk.Ⅰ', internalName: 'proliferatorMk1' },
  { displayName: '增产剂Mk.Ⅱ', internalName: 'proliferatorMk2' },
  { displayName: '增产剂Mk.Ⅲ', internalName: 'proliferatorMk3' },
  { displayName: '齿轮', internalName: 'gear' },
  { displayName: '石矿', internalName: 'stone' },
  { displayName: '原油', internalName: 'oil' },
  { displayName: '精炼油', internalName: 'refinedOil' },
  { displayName: '硫酸', internalName: 'sulfuricAcid' },
  { displayName: '氢', internalName: 'hydrogen' },
  { displayName: '可燃冰', internalName: 'fireIce' },
  { displayName: '木材', internalName: 'wood' },
  { displayName: '植物燃料', internalName: 'plant_fuel' },
  { displayName: '金伯利矿石', internalName: 'kimberliteOre' },
  { displayName: '分形硅石', internalName: 'fractalSilicon' },
  { displayName: '光栅石', internalName: 'opticalGratingCrystal' },
  { displayName: '刺笋结晶', internalName: 'spiniformStalagmiteCrystal' },
  { displayName: '单极磁石', internalName: 'unipolarMagnet' },
  { displayName: '铜块', internalName: 'copperIngot' },
  { displayName: '高纯硅块', internalName: 'highPuritySilicon' },
  { displayName: '石材', internalName: 'stoneBrick' },
  { displayName: '钢材', internalName: 'steel' },
  { displayName: '钛合金', internalName: 'titaniumAlloy' },
  { displayName: '玻璃', internalName: 'glass' },
  { displayName: '钛化玻璃', internalName: 'titaniumGlass' },
  { displayName: '棱镜', internalName: 'prism' },
  { displayName: '晶格硅', internalName: 'crystalSilicon' },
  { displayName: '磁铁', internalName: 'magnet' },
  { displayName: '磁线圈', internalName: 'magneticCoil' },
  { displayName: '电动机', internalName: 'electricMotor' },
  { displayName: '电磁涡轮', internalName: 'electromagneticTurbine' },
  { displayName: '超级磁场环', internalName: 'superMagneticRing' },
  { displayName: '粒子容器', internalName: 'particleContainer' },
  { displayName: '奇异物质', internalName: 'strangeMatter' },
  { displayName: '电路板', internalName: 'circuitBoard' },
  { displayName: '处理器', internalName: 'processor' },
  { displayName: '量子芯片', internalName: 'quantumChip' },
  { displayName: '微晶元件', internalName: 'microcrystallineComponent' },
  { displayName: '位面过滤器', internalName: 'planeFilter' },
  { displayName: '粒子带宽', internalName: 'particleBroadband' },
  { displayName: '电浆激发器', internalName: 'plasmaExciter' },
  { displayName: '光子合并器', internalName: 'photonCombiner' },
  { displayName: '太阳帆', internalName: 'solarSail' },
  { displayName: '重氢', internalName: 'deuterium' },
  { displayName: '反物质', internalName: 'antimatter' },
  { displayName: '临界光子', internalName: 'criticalPhoton' },
  { displayName: '液氢燃料棒', internalName: 'hydrogenFuelRod' },
  { displayName: '氘核燃料棒', internalName: 'deuteriumFuelRod' },
  { displayName: '反物质燃烧棒', internalName: 'antimatterFuelRod' },
  { displayName: '塑料', internalName: 'plastic' },
  { displayName: '石墨烯', internalName: 'graphene' },
  { displayName: '碳纳米管', internalName: 'carbonNanotube' },
  { displayName: '有机晶体', internalName: 'organicCrystal' },
  { displayName: '钛晶石', internalName: 'titaniumCrystal' },
  { displayName: '卡西米尔晶片', internalName: 'casimirCrystal' },
  { displayName: '引力透镜', internalName: 'gravitonLens' },
  { displayName: '空间翘曲器', internalName: 'spaceWarper' },
  { displayName: '湮灭约束球', internalName: 'annihilationConstraintSphere' },
  { displayName: '推进器', internalName: 'thruster' },
  { displayName: '加力推进器', internalName: 'reinforcedThruster' },
  { displayName: '物流运输机', internalName: 'logisticDrone' },
  { displayName: '星际物流运输机', internalName: 'logisticVessel' },
  { displayName: '框架材料', internalName: 'frameMaterial' },
  { displayName: '戴森球组件', internalName: 'dysonSphereComponent' },
  { displayName: '小型运载火箭', internalName: 'smallCarrierRocket' },
  { displayName: '地基', internalName: 'foundation' },
  { displayName: '传送带', internalName: 'conveyorBeltMk1' },
  { displayName: '高速传送带', internalName: 'conveyorBeltMk2' },
  { displayName: '极速传送带', internalName: 'conveyorBeltMk3' },
  { displayName: '分拣器', internalName: 'sorterMk1' },
  { displayName: '高速分拣器', internalName: 'sorterMk2' },
  { displayName: '极速分拣器', internalName: 'sorterMk3' },
  { displayName: '集装分拣器', internalName: 'sorterMk4' },
  { displayName: '四向分流器', internalName: 'splitter' },
  { displayName: '自动集装机', internalName: 'autoPiler' },
  { displayName: '流速监测器', internalName: 'trafficMonitor' },
  { displayName: '喷涂机', internalName: 'sprayCoater' },
  { displayName: '小型储物仓', internalName: 'storageMk1' },
  { displayName: '大型储物仓', internalName: 'storageMk2' },
  { displayName: '储液灌', internalName: 'storageTank' },
  { displayName: '制作台Mk.Ⅰ', internalName: 'assemblingMachineMk1' },
  { displayName: '制作台Mk.Ⅱ', internalName: 'assemblingMachineMk2' },
  { displayName: '制作台Mk.Ⅲ', internalName: 'assemblingMachineMk3' },
  { displayName: '电力感应塔', internalName: 'teslaTower' },
  { displayName: '无线输电塔', internalName: 'wirelessPowerTower' },
  { displayName: '卫星配电站', internalName: 'satelliteSubstation' },
  { displayName: '风力涡轮机', internalName: 'windTurbine' },
  { displayName: '火力发电机', internalName: 'thermalPowerPlant' },
  { displayName: '微型聚变发电站', internalName: 'miniFusionPowerPlant' },
  { displayName: '地热发电站', internalName: 'geothermalPowerStation' },
  { displayName: '采矿机', internalName: 'miningMachine' },
  { displayName: '大型采矿机', internalName: 'advancedMiningMachine' },
  { displayName: '抽水机', internalName: 'waterPump' },
  { displayName: '电弧熔炉', internalName: 'arcSmelter' },
  { displayName: '位面熔炉', internalName: 'planeSmelter' },
  { displayName: '原油萃取站', internalName: 'oilExtractor' },
  { displayName: '原油精炼厂', internalName: 'oilRefinery' },
  { displayName: '化工厂', internalName: 'chemicalPlant' },
  { displayName: '分馏塔', internalName: 'fractionator' },
  { displayName: '量子化工厂', internalName: 'quantumChemicalPlant' },
  { displayName: '太阳能板', internalName: 'solarPanel' },
  { displayName: '蓄电池', internalName: 'accumulator' },
  { displayName: '蓄电池满', internalName: 'accumulatorFull' },
  { displayName: '电磁轨道弹射器', internalName: 'railgun' },
  { displayName: '射线接收站', internalName: 'rayReceiver' },
  { displayName: '垂直发射井', internalName: 'verticalLaunchingSilo' },
  { displayName: '能量枢纽', internalName: 'energyExchanger' },
  { displayName: '微型粒子对撞机', internalName: 'miniatureParticleCollider' },
  { displayName: '人造恒星', internalName: 'artificialStar' },
  { displayName: '物流配送器', internalName: 'logisticsStation' },
  { displayName: '行星内物流运输站', internalName: 'planetaryLogisticsStation' },
  { displayName: '星际物流运输站', internalName: 'interstellarLogisticsStation' },
  { displayName: '轨道采集器', internalName: 'orbitalCollector' },
  { displayName: '蓝矩阵', internalName: 'blueMatrix' },
  { displayName: '红矩阵', internalName: 'redMatrix' },
  { displayName: '黄矩阵', internalName: 'yellowMatrix' },
  { displayName: '紫矩阵', internalName: 'purpleMatrix' },
  { displayName: '绿矩阵', internalName: 'greenMatrix' },
  { displayName: '宇宙矩阵', internalName: 'universeMatrix' },
  { displayName: '燃烧单元', internalName: 'combustionUnit' },
  { displayName: '爆破单元', internalName: 'explosiveUnit' },
  { displayName: '晶石爆破单元', internalName: 'crystalExplosiveUnit' },
  { displayName: '机枪弹箱', internalName: 'machineGunAmmo' },
  { displayName: '钛化弹箱', internalName: 'titaniumAmmo' },
  { displayName: '超合金弹箱', internalName: 'superAlloyAmmo' },
  { displayName: '导弹组', internalName: 'missileSet' },
  { displayName: '超音速导弹组', internalName: 'supersonicMissileSet' },
  { displayName: '引力导弹组', internalName: 'gravityMissileSet' },
  { displayName: '炮弹组', internalName: 'shellSet' },
  { displayName: '高爆炮弹组', internalName: 'highExplosiveShellSet' },
  { displayName: '晶石炮弹组', internalName: 'crystalShellSet' },
  { displayName: '原型机', internalName: 'prototype' },
  { displayName: '精准无人机', internalName: 'precisionDrone' },
  { displayName: '攻击无人机', internalName: 'attackDrone' },
  { displayName: '护卫舰', internalName: 'frigate' },
  { displayName: '驱逐舰', internalName: 'destroyer' },
  { displayName: '等离子胶囊', internalName: 'plasmaCapsule' },
  { displayName: '反物质胶囊', internalName: 'antimatterCapsule' },
  { displayName: '重组式制造台', internalName: 'recombinantAssembler' },
  { displayName: '自演化研究站', internalName: 'selfEvolutionLab' },
  { displayName: '负熵熔炉', internalName: 'negativeEntropySmelter' },
  { displayName: '高斯机枪塔', internalName: 'gaussTurret' },
  { displayName: '导弹防御塔', internalName: 'missileTurret' },
  { displayName: '聚爆加农炮', internalName: 'fusionCannon' },
  { displayName: '高频激光塔', internalName: 'highFrequencyLaserTower' },
  { displayName: '磁化电浆炮', internalName: 'magnetizedPlasmaCannon' },
  { displayName: '战场分析基站', internalName: 'battlefieldAnalysisBase' },
  { displayName: '信号塔', internalName: 'signalTower' },
  { displayName: '行星护盾发生器', internalName: 'planetaryShieldGenerator' },
  { displayName: '动力引擎', internalName: 'propulsionEngine' },
  { displayName: '奇异湮灭燃料棒', internalName: 'strangeAnnihilationFuelRod' },
  { displayName: '负熵奇点', internalName: 'negativeEntropySingularity' },
  { displayName: '能量碎片', internalName: 'energyFragment' },
  { displayName: '硅基神经元', internalName: 'siliconNeuron' },
  { displayName: '核心素', internalName: 'coreElement' },
  { displayName: '黑雾矩阵', internalName: 'darkFogMatrix' },
  { displayName: '物质重组器', internalName: 'matterReorganizer' },
  { displayName: '矿脉', internalName: 'vein' },
  { displayName: '干扰胶囊', internalName: 'interferenceCapsule' },
  { displayName: '压制胶囊', internalName: 'suppressionCapsule' },
  { displayName: '近程电浆炮', internalName: 'shortRangePlasmaCannon' },
  { displayName: '干扰塔', internalName: 'interferenceTower' },
  { displayName: '全息信标', internalName: 'holographicBeacon' },
  { displayName: 'None', internalName: 'None' }
] as const

export const DISPLAY_NAME_TO_INTERNAL: Record<string, string> = ITEM_NAME_LIST.reduce(
  (acc, item) => {
    acc[item.displayName] = item.internalName
    return acc
  },
  {} as Record<string, string>
)

export const INTERNAL_TO_DISPLAY: Record<string, string> = ITEM_NAME_LIST.reduce(
  (acc, item) => {
    acc[item.internalName] = item.displayName
    return acc
  },
  {} as Record<string, string>
)

export function getEnergyConsumption(machineName: string): number {
  return ENERGY_DATA[machineName] ?? 0
}

export function getSpaceOccupied(machineName: string): number {
  return SPACE_DATA[machineName] ?? 0
}

export function getInternalName(displayName: string): string {
  return DISPLAY_NAME_TO_INTERNAL[displayName] ?? displayName
}

export function getDisplayName(internalName: string): string {
  return INTERNAL_TO_DISPLAY[internalName] ?? internalName
}
