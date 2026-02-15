import { describe, it, expect } from 'vitest'
import itemMapData from '../data/itemMap.json'
import buildingMapData from '../data/buildingMap.json'
import productionCategoryData from '../data/productionCategory.json'
import buildingTypeData from '../data/buildingType.json'

describe('data consistency', () => {
  describe('itemMap', () => {
    it('should have required fields for all items', () => {
      for (const key in itemMapData) {
        const item = itemMapData[key as keyof typeof itemMapData]
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('iconId')
        expect(item).toHaveProperty('remark')
        expect(typeof item.name).toBe('string')
        expect(typeof item.iconId).toBe('number')
        expect(typeof item.remark).toBe('string')
      }
    })

    it('should have proliferator items with extra_rate and accelerate', () => {
      const proliferatorKeys = ['proliferatorMk1', 'proliferatorMk2', 'proliferatorMk3']
      for (const key of proliferatorKeys) {
        const item = itemMapData[key as keyof typeof itemMapData]
        expect(item).toBeDefined()
        expect(item).toHaveProperty('extra_rate')
        expect(item).toHaveProperty('accelerate')
      }
    })

    it('should have templateItem', () => {
      expect(itemMapData).toHaveProperty('templateItem')
      expect(itemMapData.templateItem.iconId).toBe(0)
    })
  })

  describe('buildingMap', () => {
    it('should have required fields for all buildings', () => {
      const requiredFields = ['name', 'itemId', 'modelIndex', 'remark']
      for (const key in buildingMapData) {
        const building = buildingMapData[key as keyof typeof buildingMapData]
        for (const field of requiredFields) {
          expect(building).toHaveProperty(field)
        }
      }
    })

    it('should have production buildings with category', () => {
      const productionBuildings = ['arcSmelter', 'assemblingMachineMk1', 'lab', 'chemicalPlant']
      for (const key of productionBuildings) {
        const building = buildingMapData[key as keyof typeof buildingMapData]
        expect(building).toBeDefined()
        expect(building).toHaveProperty('category')
        expect(building).toHaveProperty('type')
      }
    })

    it('should have sorter buildings with sortingSpeed', () => {
      const sorterKeys = ['sorterMk1', 'sorterMk3', 'sorterMk4']
      for (const key of sorterKeys) {
        const building = buildingMapData[key as keyof typeof buildingMapData]
        expect(building).toBeDefined()
        expect(building).toHaveProperty('sortingSpeed')
      }
    })

    it('should have conveyor buildings with transportSpeed', () => {
      const conveyorKeys = ['conveyorBeltMk1', 'conveyorBeltMK3']
      for (const key of conveyorKeys) {
        const building = buildingMapData[key as keyof typeof buildingMapData]
        expect(building).toBeDefined()
        expect(building).toHaveProperty('transportSpeed')
      }
    })

    it('should have lab buildings with height', () => {
      const labKeys = ['lab', '自演化研究站']
      for (const key of labKeys) {
        const building = buildingMapData[key as keyof typeof buildingMapData]
        expect(building).toBeDefined()
        expect(building).toHaveProperty('height')
      }
    })
  })

  describe('productionCategory', () => {
    it('should have all required categories', () => {
      const requiredCategories = ['smelter', 'assembling', 'plant', 'refinery', 'collider', 'lab']
      for (const cat of requiredCategories) {
        expect(productionCategoryData).toHaveProperty(cat)
        expect(typeof productionCategoryData[cat as keyof typeof productionCategoryData]).toBe(
          'number'
        )
      }
    })

    it('should have sequential values starting from 0', () => {
      const values = Object.values(productionCategoryData)
      expect(values.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
    })
  })

  describe('buildingType', () => {
    it('should have all required types', () => {
      const requiredTypes = ['production', 'sorter', 'conveyor']
      for (const type of requiredTypes) {
        expect(buildingTypeData).toHaveProperty(type)
        expect(typeof buildingTypeData[type as keyof typeof buildingTypeData]).toBe('number')
      }
    })

    it('should have sequential values starting from 0', () => {
      const values = Object.values(buildingTypeData)
      expect(values.sort((a, b) => a - b)).toEqual([0, 1, 2])
    })
  })
})
