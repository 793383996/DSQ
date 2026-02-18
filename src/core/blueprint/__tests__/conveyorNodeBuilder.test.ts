import { describe, it, expect, beforeEach } from 'vitest'
import {
  ConveyorNodeBuilder,
  type IBuildingMapForConveyor,
  type IConveyorBelt
} from '../generators/conveyor/ConveyorNodeBuilder'

describe('ConveyorNodeBuilder', () => {
  let builder: ConveyorNodeBuilder
  const mockBuildingMap: IBuildingMapForConveyor = {
    conveyorBeltMk1: { itemId: 2001, modelIndex: 1, transportSpeed: 6 },
    conveyorBeltMK3: { itemId: 2003, modelIndex: 3, transportSpeed: 30 }
  }

  beforeEach(() => {
    builder = new ConveyorNodeBuilder(mockBuildingMap, {})
  })

  describe('buildNode', () => {
    it('should build a conveyor node with correct properties', () => {
      const conveyor: IConveyorBelt = {
        itemId: 2001,
        modelIndex: 1,
        transportSpeed: 6
      }

      const node = builder.buildNode({
        offset: { x: 5, y: 10, z: 1 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: 10,
        outputToSlot: 1,
        parameters: null
      })

      expect(node.index).toBe(0)
      expect(node.areaIndex).toBe(0)
      expect(node.localOffset).toEqual([
        { x: 5, y: 10, z: 1 },
        { x: 5, y: 10, z: 1 }
      ])
      expect(node.yaw).toEqual([0, 0])
      expect(node.itemId).toBe(2001)
      expect(node.modelIndex).toBe(1)
      expect(node.outputObjIdx).toBe(10)
      expect(node.outputToSlot).toBe(1)
      expect(node.parameters).toBeNull()
    })

    it('should increment building index for each node', () => {
      const conveyor: IConveyorBelt = {
        itemId: 2001,
        modelIndex: 1,
        transportSpeed: 6
      }

      const node1 = builder.buildNode({
        offset: { x: 0, y: 0, z: 0 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: 1,
        outputToSlot: 1,
        parameters: null
      })

      const node2 = builder.buildNode({
        offset: { x: 1, y: 0, z: 0 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: 2,
        outputToSlot: 1,
        parameters: null
      })

      expect(node1.index).toBe(0)
      expect(node2.index).toBe(1)
      expect(builder.getBuildingIndex()).toBe(1)
    })

    it('should include parameters when provided', () => {
      const conveyor: IConveyorBelt = {
        itemId: 2001,
        modelIndex: 1,
        transportSpeed: 6
      }

      const node = builder.buildNode({
        offset: { x: 0, y: 0, z: 0 },
        yaw: [0, 0],
        conveyor,
        outputObjIdx: 1,
        outputToSlot: 1,
        parameters: { iconId: 100 }
      })

      expect(node.parameters).toEqual({ iconId: 100 })
    })
  })

  describe('buildNodeSequence', () => {
    it('should build a sequence of nodes in a direction', () => {
      const conveyor: IConveyorBelt = {
        itemId: 2001,
        modelIndex: 1,
        transportSpeed: 6
      }

      const nodes = builder.buildNodeSequence(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0 },
        3,
        conveyor,
        null
      )

      expect(nodes).toHaveLength(3)
      expect(nodes[0].localOffset![0]).toEqual({ x: 0, y: 0, z: 0 })
      expect(nodes[1].localOffset![0]).toEqual({ x: 1, y: 0, z: 0 })
      expect(nodes[2].localOffset![0]).toEqual({ x: 2, y: 0, z: 0 })
    })

    it('should build nodes in y direction', () => {
      const conveyor: IConveyorBelt = {
        itemId: 2001,
        modelIndex: 1,
        transportSpeed: 6
      }

      const nodes = builder.buildNodeSequence(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1 },
        2,
        conveyor,
        null
      )

      expect(nodes).toHaveLength(2)
      expect(nodes[0].localOffset![0]).toEqual({ x: 0, y: 0, z: 0 })
      expect(nodes[1].localOffset![0]).toEqual({ x: 0, y: 1, z: 0 })
    })
  })

  describe('setBuildingIndex', () => {
    it('should set building index', () => {
      builder.setBuildingIndex(100)
      expect(builder.getBuildingIndex()).toBe(100)
    })
  })
})
