/**
 * 配置数据模块 - 从 data.js 拆分
 *
 * 职责：
 * - 能量消耗数据 (energyData)
 * - 占用空间数据 (spaceData)
 * - 图标名称映射 (itemNameList)
 *
 * 架构师注：
 * - 此模块仅包含静态配置数据，不包含业务逻辑
 * - 数据为常量，不需要状态管理
 */

var energyData = {}
energyData['研究站'] = 0.48
energyData['制作台Mk.Ⅰ'] = 0.27
energyData['制作台Mk.Ⅱ'] = 0.54
energyData['制作台Mk.Ⅲ'] = 1.08
energyData['重组式制造台'] = 2.7
energyData['电弧熔炉'] = 0.36
energyData['位面熔炉'] = 1.44
energyData['负熵熔炉'] = 2.88
energyData['矿脉'] = 0.42 / 6
energyData['采矿机'] = 0.42
energyData['大型采矿机'] = 2.94
energyData['原油萃取站'] = 0.84
energyData['抽水机'] = 0.3
energyData['原油精炼机'] = 0.96
energyData['化工厂'] = 0.72
energyData['量子化工厂'] = 2.16
energyData['粒子对撞机'] = 12
energyData['轨道采集器'] = 0
energyData['射线接收塔'] = 0
energyData['能量枢纽'] = 0
energyData['分馏塔'] = 0.72

var spaceData = {}
spaceData['研究站'] = 36 / 15
spaceData['制作台Mk.Ⅰ'] =
  spaceData['制作台Mk.Ⅱ'] =
  spaceData['制作台Mk.Ⅲ'] =
  spaceData['重组式制造台'] =
    16
spaceData['电弧熔炉'] = spaceData['位面熔炉'] = spaceData['负熵熔炉'] = 16
spaceData['原油精炼机'] = 28
spaceData['化工厂'] = 35
spaceData['量子化工厂'] = 35
spaceData['射线接收塔'] = 24
spaceData['能量枢纽'] = 64
spaceData['分馏塔'] = 16
spaceData['粒子对撞机'] = 45

var icons_define = {
  氢: [-1, 3, 7, '氢'],
  可燃冰: [-1, 2, 7, '可燃冰']
}

var itemNameList = [
  ['矩阵研究站', 'lab'],
  ['配送运输机', '配送运输机'],
  ['水', 'water'],
  ['铁矿', 'ironOre'],
  ['铜矿', 'copperOre'],
  ['硅石', 'siliconOre'],
  ['钛石', 'titaniumOre'],
  ['煤矿', 'coal'],
  ['铁块', 'ironIngot'],
  ['钛块', 'titaniumIngot'],
  ['高级石墨', 'energeticGraphite'],
  ['金刚石', 'diamond'],
  ['增产剂Mk.Ⅰ', 'proliferatorMk1'],
  ['增产剂Mk.Ⅱ', 'proliferatorMk2'],
  ['增产剂Mk.Ⅲ', 'proliferatorMk3'],
  ['齿轮', 'gear'],
  ['石矿', 'stone'],
  ['原油', 'oil'],
  ['精炼油', 'refinedOil'],
  ['硫酸', 'sulfuricAcid'],
  ['氢', 'hydrogen'],
  ['可燃冰', 'fireIce'],
  ['木材', 'wood'],
  ['植物燃料', 'plant_fuel'],
  ['金伯利矿石', 'kimberliteOre'],
  ['分形硅石', 'fractalSilicon'],
  ['光栅石', 'opticalGratingCrystal'],
  ['刺笋结晶', 'spiniformStalagmiteCrystal'],
  ['单极磁石', 'unipolarMagnet'],
  ['铜块', 'copperIngot'],
  ['高纯硅块', 'highPuritySilicon'],
  ['石材', 'stoneBrick'],
  ['钢材', 'steel'],
  ['钛合金', 'titaniumAlloy'],
  ['玻璃', 'glass'],
  ['钛化玻璃', 'titaniumGlass'],
  ['棱镜', 'prism'],
  ['晶格硅', 'crystalSilicon'],
  ['磁铁', 'magnet'],
  ['磁线圈', 'magneticCoil'],
  ['电动机', 'electricMotor'],
  ['电磁涡轮', 'electromagneticTurbine'],
  ['超级磁场环', 'superMagneticRing'],
  ['粒子容器', 'particleContainer'],
  ['奇异物质', 'strangeMatter'],
  ['电路板', 'circuitBoard'],
  ['处理器', 'processor'],
  ['量子芯片', 'quantumChip'],
  ['微晶元件', 'microcrystallineComponent'],
  ['位面过滤器', 'planeFilter'],
  ['粒子带宽', 'particleBroadband'],
  ['电浆激发器', 'plasmaExciter'],
  ['光子合并器', 'photonCombiner'],
  ['太阳帆', 'solarSail'],
  ['重氢', 'deuterium'],
  ['反物质', 'antimatter'],
  ['临界光子', 'criticalPhoton'],
  ['液氢燃料棒', 'hydrogenFuelRod'],
  ['氘核燃料棒', 'deuteriumFuelRod'],
  ['反物质燃烧棒', 'antimatterFuelRod'],
  ['塑料', 'plastic'],
  ['石墨烯', 'graphene'],
  ['碳纳米管', 'carbonNanotube'],
  ['有机晶体', 'organicCrystal'],
  ['钛晶石', 'titaniumCrystal'],
  ['卡西米尔晶片', 'casimirCrystal'],
  ['引力透镜', 'gravitonLens'],
  ['空间翘曲器', 'spaceWarper'],
  ['湮灭约束球', 'annihilationConstraintSphere'],
  ['推进器', 'thruster'],
  ['加力推进器', 'reinforcedThruster'],
  ['物流运输机', 'logisticDrone'],
  ['星际物流运输机', 'logisticVessel'],
  ['框架材料', 'frameMaterial'],
  ['戴森球组件', 'dysonSphereComponent'],
  ['小型运载火箭', 'smallCarrierRocket'],
  ['地基', 'foundation'],
  ['传送带', 'conveyorBeltMk1'],
  ['高速传送带', 'conveyorBeltMk2'],
  ['极速传送带', 'conveyorBeltMk3'],
  ['分拣器', 'sorterMk1'],
  ['高速分拣器', 'sorterMk2'],
  ['极速分拣器', 'sorterMk3'],
  ['集装分拣器', 'sorterMk4'],
  ['四向分流器', 'splitter'],
  ['自动集装机', 'autoPiler'],
  ['流速监测器', 'trafficMonitor'],
  ['喷涂机', 'sprayCoater'],
  ['小型储物仓', 'storageMk1'],
  ['大型储物仓', 'storageMk2'],
  ['储液灌', 'storageTank'],
  ['制作台Mk.Ⅰ', 'assemblingMachineMk1'],
  ['制作台Mk.Ⅱ', 'assemblingMachineMk2'],
  ['制作台Mk.Ⅲ', 'assemblingMachineMk3'],
  ['电力感应塔', 'teslaTower'],
  ['无线输电塔', 'wirelessPowerTower'],
  ['卫星配电站', 'satelliteSubstation'],
  ['风力涡轮机', 'windTurbine'],
  ['火力发电机', 'thermalPowerPlant'],
  ['微型聚变发电站', 'miniFusionPowerPlant'],
  ['地热发电站', 'geothermalPowerStation'],
  ['采矿机', 'miningMachine'],
  ['大型采矿机', 'advancedMiningMachine'],
  ['抽水机', 'waterPump'],
  ['电弧熔炉', 'arcSmelter'],
  ['位面熔炉', 'planeSmelter'],
  ['原油萃取站', 'oilExtractor'],
  ['原油精炼厂', 'oilRefinery'],
  ['化工厂', 'chemicalPlant'],
  ['分馏塔', 'fractionator'],
  ['量子化工厂', '量子化工厂'],
  ['太阳能板', '太阳能板'],
  ['蓄电池', '蓄电池'],
  ['蓄电池满', '蓄电池满'],
  ['电磁轨道弹射器', '电磁轨道弹射器'],
  ['射线接收站', '射线接收站'],
  ['垂直发射井', '垂直发射井'],
  ['能量枢纽', 'energyExchanger'],
  ['微型粒子对撞机', '微型粒子对撞机'],
  ['人造恒星', '人造恒星'],
  ['物流配送器', '物流配送器'],
  ['行星内物流运输站', '行星内物流运输站'],
  ['星际物流运输站', '星际物流运输站'],
  ['轨道采集器', '轨道采集器'],
  ['蓝矩阵', '蓝矩阵'],
  ['红矩阵', '红矩阵'],
  ['黄矩阵', '黄矩阵'],
  ['紫矩阵', '紫矩阵'],
  ['绿矩阵', '绿矩阵'],
  ['宇宙矩阵', '宇宙矩阵'],
  ['燃烧单元', '燃烧单元'],
  ['爆破单元', '爆破单元'],
  ['晶石爆破单元', '晶石爆破单元'],
  ['机枪弹箱', '机枪弹箱'],
  ['钛化弹箱', '钛化弹箱'],
  ['超合金弹箱', '超合金弹箱'],
  ['导弹组', '导弹组'],
  ['超音速导弹组', '超音速导弹组'],
  ['引力导弹组', '引力导弹组'],
  ['炮弹组', '炮弹组'],
  ['高爆炮弹组', '高爆炮弹组'],
  ['晶石炮弹组', '晶石炮弹组'],
  ['原型机', '原型机'],
  ['精准无人机', '精准无人机'],
  ['攻击无人机', '攻击无人机'],
  ['护卫舰', '护卫舰'],
  ['驱逐舰', '驱逐舰'],
  ['等离子胶囊', '等离子胶囊'],
  ['反物质胶囊', '反物质胶囊'],
  ['重组式制造台', '重组式制造台'],
  ['自演化研究站', '自演化研究站'],
  ['负熵熔炉', '负熵熔炉'],
  ['高斯机枪塔', '高斯机枪塔'],
  ['导弹防御塔', '导弹防御塔'],
  ['聚爆加农炮', '聚爆加农炮'],
  ['高频激光塔', '高频激光塔'],
  ['磁化电浆炮', '磁化电浆炮'],
  ['战场分析基站', '战场分析基站'],
  ['信号塔', '信号塔'],
  ['行星护盾发生器', '行星护盾发生器'],
  ['动力引擎', '动力引擎'],
  ['奇异湮灭燃料棒', '奇异湮灭燃料棒'],
  ['负熵奇点', '负熵奇点'],
  ['能量碎片', '能量碎片'],
  ['硅基神经元', '硅基神经元'],
  ['核心素', '核心素'],
  ['黑雾矩阵', '黑雾矩阵'],
  ['物质重组器', '物质重组器'],
  ['矿脉', '矿脉'],
  ['干扰胶囊', '干扰胶囊'],
  ['压制胶囊', '压制胶囊'],
  ['近程电浆炮', '近程电浆炮'],
  ['干扰塔', '干扰塔'],
  ['全息信标', '全息信标'],
  ['None', 'None']
]

window.energyData = energyData
window.spaceData = spaceData

export { energyData, spaceData, icons_define, itemNameList }
