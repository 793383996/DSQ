import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import { ConveyorNodeBuilder, type IBuildingMapForConveyor } from './ConveyorNodeBuilder'
import type { IConveyorGeneratorConfig } from '../../types/conveyorGenerator'
import { DEFAULT_CONVEYOR_GENERATOR_CONFIG } from '../../types/conveyorGenerator'
import { PRODUCTION_CATEGORY } from '../SorterGenerator'

export interface ISprayCoaterBuildParams {
  sprayCoaterOffsetList: ICoordinate[]
  lastProductionBuildingType: number
  proliferator: string | undefined
  itemMap: Record<string, { iconId: number; rate?: number }>
  selfSpray: boolean
  conveyorStartOffsetX: number
}

export interface ISprayCoaterResult {
  buildings: IBlueprintBuilding[]
}

export class SprayCoaterConveyorBuilder {
  private nodeBuilder: ConveyorNodeBuilder
  private buildingMap: IBuildingMapForConveyor & {
    sprayCoater: { itemId: number; modelIndex: number }
  }
  private config: IConveyorGeneratorConfig

  constructor(
    buildingMap: IBuildingMapForConveyor & { sprayCoater: { itemId: number; modelIndex: number } },
    config: Partial<IConveyorGeneratorConfig> = {}
  ) {
    this.buildingMap = buildingMap
    this.config = { ...DEFAULT_CONVEYOR_GENERATOR_CONFIG, ...config }
    this.nodeBuilder = new ConveyorNodeBuilder(buildingMap, config)
  }

  setBuildingIndex(index: number): void {
    this.nodeBuilder.setBuildingIndex(index)
  }

  getBuildingIndex(): number {
    return this.nodeBuilder.getBuildingIndex()
  }

  buildSprayCoaterConveyors(params: ISprayCoaterBuildParams): ISprayCoaterResult {
    const {
      sprayCoaterOffsetList,
      lastProductionBuildingType,
      proliferator,
      itemMap,
      selfSpray,
      conveyorStartOffsetX
    } = params

    if (sprayCoaterOffsetList.length === 0) {
      return { buildings: [] }
    }

    const buildings: IBlueprintBuilding[] = []
    const conveyor = this.selectConveyorForSprayCoater(proliferator, itemMap)

    const firstSprayOffset = this.findFirstSprayCoater(sprayCoaterOffsetList)
    const proliferatorParameters =
      proliferator && itemMap[proliferator] ? { iconId: itemMap[proliferator].iconId } : null

    if (selfSpray) {
      const selfSprayBuildings = this.buildSelfSprayStructure(
        firstSprayOffset,
        lastProductionBuildingType,
        conveyor,
        proliferatorParameters,
        conveyorStartOffsetX
      )
      buildings.push(...selfSprayBuildings)
    }

    const mainConveyorBuildings = this.buildMainSprayCoaterConveyor(
      sprayCoaterOffsetList,
      firstSprayOffset,
      conveyor,
      selfSpray ? null : proliferatorParameters
    )
    buildings.push(...mainConveyorBuildings)

    return { buildings }
  }

  private selectConveyorForSprayCoater(
    proliferator: string | undefined,
    itemMap: Record<string, { iconId: number; rate?: number }>
  ): { itemId: number; modelIndex: number; transportSpeed: number } {
    const mk1 = this.buildingMap.conveyorBeltMk1
    const mk3 = this.buildingMap.conveyorBeltMK3

    if (this.config.onlyConveyorBeltMk3) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || 30
      }
    }

    if (proliferator && itemMap[proliferator]?.rate && itemMap[proliferator].rate! > 6) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || 30
      }
    }

    if (!proliferator) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || 30
      }
    }

    return {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed || 6
    }
  }

  private findFirstSprayCoater(sprayCoaterOffsetList: ICoordinate[]): ICoordinate {
    let firstSprayOffset = sprayCoaterOffsetList[0]
    for (const spray of sprayCoaterOffsetList) {
      if (spray.y > firstSprayOffset.y) {
        firstSprayOffset = spray
        continue
      }
      if (spray.y === firstSprayOffset.y && spray.x < firstSprayOffset.x) {
        firstSprayOffset = spray
      }
    }
    return firstSprayOffset
  }

  private buildSelfSprayStructure(
    firstSprayOffset: ICoordinate,
    lastProductionBuildingType: number,
    conveyor: { itemId: number; modelIndex: number; transportSpeed: number },
    proliferatorParameters: { iconId?: number } | null,
    conveyorStartOffsetX: number
  ): IBlueprintBuilding[] {
    const buildings: IBlueprintBuilding[] = []
    const selfSprayStartOffset = { ...firstSprayOffset }

    switch (lastProductionBuildingType) {
      case PRODUCTION_CATEGORY.lab:
      case PRODUCTION_CATEGORY.collider:
        selfSprayStartOffset.y += 2
        break
      case PRODUCTION_CATEGORY.plant:
        selfSprayStartOffset.y += 1
        break
    }

    const sprayCoaterBuilding = this.buildSprayCoater({
      x: conveyorStartOffsetX - 1,
      y: selfSprayStartOffset.y + 4,
      z: 0
    })
    buildings.push(sprayCoaterBuilding)

    const nodePositions = [
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 6, z: 0 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 5, z: 0 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 4, z: 0 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 3, z: 0 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 2, z: 0 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 2, z: 0 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 3, z: 0 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 4, z: 0.5 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 5, z: 1 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: conveyorStartOffsetX, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: conveyorStartOffsetX, y: selfSprayStartOffset.y + 5, z: 1 },
      { x: conveyorStartOffsetX, y: selfSprayStartOffset.y + 4, z: 1 },
      { x: conveyorStartOffsetX, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 2, z: 1 },
      { x: conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 1, z: 1 },
      { x: conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 1, z: 1 }
    ]

    for (let i = 0; i < nodePositions.length; i++) {
      const node = this.nodeBuilder.buildNode({
        offset: nodePositions[i],
        yaw: [0, 0],
        conveyor,
        outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
        outputToSlot: 1,
        parameters: i === 0 ? proliferatorParameters : null
      })
      buildings.push(node)
    }

    for (let i = 0; i < selfSprayStartOffset.x - conveyorStartOffsetX; i++) {
      const node = this.nodeBuilder.buildNode({
        offset: { x: conveyorStartOffsetX + i, y: selfSprayStartOffset.y + 1, z: 1 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
        outputToSlot: 1,
        parameters: null
      })
      buildings.push(node)
    }

    for (let i = 0; i < selfSprayStartOffset.y - firstSprayOffset.y; i++) {
      const node = this.nodeBuilder.buildNode({
        offset: { x: selfSprayStartOffset.x - 1, y: selfSprayStartOffset.y - i, z: 1 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
        outputToSlot: 1,
        parameters: null
      })
      buildings.push(node)
    }

    return buildings
  }

  private buildMainSprayCoaterConveyor(
    sprayCoaterOffsetList: ICoordinate[],
    firstSprayOffset: ICoordinate,
    conveyor: { itemId: number; modelIndex: number; transportSpeed: number },
    proliferatorParameters: { iconId?: number } | null
  ): IBlueprintBuilding[] {
    const buildings: IBlueprintBuilding[] = []

    const startNode = this.nodeBuilder.buildNode({
      offset: { x: firstSprayOffset.x - 1, y: firstSprayOffset.y, z: 1 },
      yaw: [0, 0],
      conveyor,
      outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
      outputToSlot: 1,
      parameters: proliferatorParameters
    })
    buildings.push(startNode)

    const secondNode = this.nodeBuilder.buildNode({
      offset: { x: firstSprayOffset.x, y: firstSprayOffset.y, z: 1 },
      yaw: [0, 0],
      conveyor,
      outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
      outputToSlot: 1,
      parameters: null
    })
    buildings.push(secondNode)

    let doneNum = 1
    let nowSpray = firstSprayOffset
    let direction = 1
    let reversedList = [...sprayCoaterOffsetList]

    while (doneNum < sprayCoaterOffsetList.length) {
      let foundInRow = false
      for (const spray of sprayCoaterOffsetList) {
        if (spray.y === nowSpray.y) {
          if (direction === 1 && spray.x > nowSpray.x) {
            for (let x = nowSpray.x + 1; x <= spray.x; x++) {
              const node = this.nodeBuilder.buildNode({
                offset: { x, y: nowSpray.y, z: 1 },
                yaw: [0, 0],
                conveyor,
                outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                outputToSlot: 1,
                parameters: null
              })
              buildings.push(node)
            }
            nowSpray = spray
            doneNum++
            foundInRow = true
          } else if (direction === -1 && spray.x < nowSpray.x) {
            for (let x = nowSpray.x - 1; x >= spray.x; x--) {
              const node = this.nodeBuilder.buildNode({
                offset: { x, y: nowSpray.y, z: 1 },
                yaw: [0, 0],
                conveyor,
                outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                outputToSlot: 1,
                parameters: null
              })
              buildings.push(node)
            }
            nowSpray = spray
            doneNum++
            foundInRow = true
          }
        }
      }

      if (doneNum === sprayCoaterOffsetList.length) {
        break
      }

      if (!foundInRow) {
        reversedList = reversedList.reverse()
        let findNext = false
        for (let delta = 2; !findNext; delta += 2) {
          if (delta > nowSpray.y) {
            throw new Error('generate sprayCoater error: cannot find next spray coater')
          }
          for (const spray of reversedList) {
            if (spray.y === nowSpray.y - delta) {
              let lastNodeOffset = { x: nowSpray.x, y: nowSpray.y, z: 1 }

              if (direction === 1 && spray.x > nowSpray.x) {
                for (let x = nowSpray.x + 1; x <= spray.x; x++) {
                  lastNodeOffset = { x, y: nowSpray.y, z: 1 }
                  const node = this.nodeBuilder.buildNode({
                    offset: lastNodeOffset,
                    yaw: [0, 0],
                    conveyor,
                    outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                    outputToSlot: 1,
                    parameters: null
                  })
                  buildings.push(node)
                }
              } else if (direction === -1 && spray.x < nowSpray.x) {
                for (let x = nowSpray.x - 1; x >= spray.x; x--) {
                  lastNodeOffset = { x, y: nowSpray.y, z: 1 }
                  const node = this.nodeBuilder.buildNode({
                    offset: lastNodeOffset,
                    yaw: [0, 0],
                    conveyor,
                    outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                    outputToSlot: 1,
                    parameters: null
                  })
                  buildings.push(node)
                }
              }

              lastNodeOffset = {
                x: lastNodeOffset.x + direction,
                y: lastNodeOffset.y,
                z: 1
              }
              const turnNode = this.nodeBuilder.buildNode({
                offset: lastNodeOffset,
                yaw: [0, 0],
                conveyor,
                outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                outputToSlot: 1,
                parameters: null
              })
              buildings.push(turnNode)

              for (let i = 1; i <= delta; i++) {
                lastNodeOffset = { x: lastNodeOffset.x, y: nowSpray.y - i, z: 1 }
                const vertNode = this.nodeBuilder.buildNode({
                  offset: lastNodeOffset,
                  yaw: [0, 0],
                  conveyor,
                  outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                  outputToSlot: 1,
                  parameters: null
                })
                buildings.push(vertNode)
              }

              lastNodeOffset = { x: lastNodeOffset.x, y: lastNodeOffset.y, z: 1 }
              if (direction === -1 && spray.x > lastNodeOffset.x + 1) {
                for (let x = lastNodeOffset.x + 1; x < spray.x; x++) {
                  const horNode = this.nodeBuilder.buildNode({
                    offset: { x, y: lastNodeOffset.y, z: 1 },
                    yaw: [0, 0],
                    conveyor,
                    outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                    outputToSlot: 1,
                    parameters: null
                  })
                  buildings.push(horNode)
                }
              } else if (direction === 1 && spray.x < lastNodeOffset.x - 1) {
                for (let x = lastNodeOffset.x - 1; x > spray.x; x--) {
                  const horNode = this.nodeBuilder.buildNode({
                    offset: { x, y: lastNodeOffset.y, z: 1 },
                    yaw: [0, 0],
                    conveyor,
                    outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                    outputToSlot: 1,
                    parameters: null
                  })
                  buildings.push(horNode)
                }
              }

              nowSpray = spray
              doneNum++
              findNext = true

              const sprayNode = this.nodeBuilder.buildNode({
                offset: { x: spray.x, y: spray.y, z: 1 },
                yaw: [0, 0],
                conveyor,
                outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
                outputToSlot: 1,
                parameters: null
              })
              buildings.push(sprayNode)
            }
          }
        }
      }
      direction *= -1
    }

    const finalNode = this.nodeBuilder.buildNode({
      offset: { x: nowSpray.x + direction, y: nowSpray.y, z: 1 },
      yaw: [0, 0],
      conveyor,
      outputObjIdx: -1,
      outputToSlot: -1,
      parameters: null
    })
    buildings.push(finalNode)

    return buildings
  }

  private buildSprayCoater(offset: ICoordinate): IBlueprintBuilding {
    const index = this.nodeBuilder.getBuildingIndex() + 1
    this.nodeBuilder.setBuildingIndex(index)

    return {
      index,
      areaIndex: 0,
      localOffset: [offset, offset],
      yaw: [0, 0],
      itemId: this.buildingMap.sprayCoater.itemId,
      modelIndex: this.buildingMap.sprayCoater.modelIndex,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 14,
      inputFromSlot: 15,
      outputFromSlot: 15,
      inputToSlot: 14,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: null
    }
  }
}
