# 方案B - 重新布局堆叠预研文档

## 背景

方案A实现简单，但存在一个限制：所有层的设备在同一个x-y位置堆叠，占地面积不会减少。

方案B旨在实现真正的占地面积缩减：60个设备分散到4层，每层有独立的x-y布局。

---

## 核心差异

| 特性 | 方案A（当前） | 方案B（目标） |
|------|---------------|---------------|
| 设备布局 | 15个设备在z=0，克隆到3层 | 60个设备分散到4层 |
| x-y位置 | 所有层共享同一x-y位置 | 每层独立x-y布局 |
| 占地面积 | 不减少 | 减少为1/4 |
| 实现复杂度 | 低 | 高 |
| 风险 | 低 | 中 |

---

## 方案A完整流程（当前）

```
1. init(): num=ceil(60/4)=15（缩减）
2. generateBuildings(): 15个设备在z=0布局
3. generateConveyorBelts(): rate×4放大
4. cloneToStackLayers():
   - 复制15个设备到z=10,20,30
   - x-y位置不变
   - 高层分拣器 → outputObjIdx → z=0传送带
```

**优点：**
- 实现简单，风险低
- 4层并行工作，产能×4
- 传送带网络只需一套

**缺点：**
- 占地面积不减少
- 设备堆叠在一起

---

## 方案B设计目标

```
1. init(): num=60（完整产能）
2. generateBuildings(): 60个设备在z=0布局
3. generateConveyorBelts(): 60个设备的传送带网络
4. cloneToStackLayers():
   - 重新分配60个设备到4层（每层15个）
   - 每层独立x-y布局
   - 重新计算蓝图尺寸
   - 高层分拣器 → outputObjIdx → z=0传送带
```

**优点：**
- 占地面积减少为1/4
- 每层独立布局，更整洁

**缺点：**
- 实现复杂度高
- 需要重写布局算法
- 风险较高

---

## 方案B实现难点

### 难点1：布局算法重写

当前布局算法在 `generateBuildings()` 中实现，用于计算设备的x-y位置。

```javascript
// 简化版布局逻辑
for (let subRecipe of this.recipe.subRecipes) {
  if (subRecipe.building === null) {
    continue;
  }
  this.newProductionBuilding(subRecipe); // 布局算法在这里
}
```

**问题：**
- 布局算法与蓝图尺寸计算紧密耦合
- 需要拆分或重写
- `occupiedArea` 记录占用区域，需要重新计算

### 难点2：index引用重映射

方案B需要重新映射index引用：

```
设备outputObjIdx → 分拣器
分拣器outputObjIdx → 传送带
```

**需要处理的场景：**

| 场景 | 原引用 | 新引用 |
|------|--------|--------|
| 设备→同层分拣器 | indexMap重映射 | indexMap重映射 |
| 分拣器→z=0传送带 | 保持原值 | 保持原值 |
| 设备→z=0传送带 | N/A | 不应该出现 |

### 难点3：蓝图尺寸重新计算

当前 `calculateBlueprintArea()` 计算蓝图尺寸：

```javascript
calculateBlueprintArea() {
  let totalArea = 0;
  for (let subRecipe of this.recipe.subRecipes) {
    if (!subRecipe.building) {
      continue;
    }
    totalArea +=
      this.calculateBuildingArea(subRecipe).area *
      Math.ceil(subRecipe.building.num);
  }
  // ...
}
```

**问题：**
- 60个设备的总面积 → 蓝图尺寸
- 堆叠后应该是15个设备的面积
- 需要在堆叠后重新计算

---

## 方案B详细实现步骤

### 步骤1：修改init()

```javascript
init() {
  this.mapRecipeID();
  
  // 方案B：num保持完整产能
  // 不缩减num，generateBuildings()生成60个设备
  // cloneToStackLayers()中重新分配到4层
  
  this.calculateBlueprintArea();
  // ...
}
```

### 步骤2：重写generateBuildings()或cloneToStackLayers()

**选项B1：在generateBuildings()中实现分层布局**

```javascript
generateBuildings() {
  for (let subRecipe of this.recipe.subRecipes) {
    if (subRecipe.building === null) {
      continue;
    }
    
    // 根据堆叠层数分配设备到不同z层
    const totalNum = subRecipe.building.num;
    const stackLayers = this.config.stackLayers || 1;
    const numPerLayer = Math.ceil(totalNum / stackLayers);
    
    for (let layer = 0; layer < stackLayers; layer++) {
      const zOffset = layer * 10;
      const startIndex = layer * numPerLayer;
      const endIndex = Math.min(startIndex + numPerLayer, totalNum);
      
      // 为该层的设备计算布局
      for (let i = startIndex; i < endIndex; i++) {
        this.newProductionBuilding(subRecipe, zOffset);
      }
    }
  }
}
```

**选项B2：在cloneToStackLayers()中重新布局**

```javascript
cloneToStackLayers() {
  // ... 收集所有设备
  
  // 重新分配到4层
  const devicesPerLayer = Math.ceil(totalDevices / stackLayers);
  const layers = [];
  for (let layer = 0; layer < stackLayers; layer++) {
    layers.push(devices.slice(layer * devicesPerLayer, (layer + 1) * devicesPerLayer));
  }
  
  // 重新布局每层
  this.buildings = [];
  this.occupiedArea = [];
  
  for (let layer = 0; layer < stackLayers; layer++) {
    const zOffset = layer * 10;
    const layerDevices = layers[layer];
    
    for (const device of layerDevices) {
      // 重新计算x-y位置
      const pos = this.calculateNewPosition(layerDevices.indexOf(device));
      
      // 修改localOffset
      device.localOffset[0].x = pos.x;
      device.localOffset[0].y = pos.y;
      device.localOffset[0].z = zOffset;
      
      this.buildings.push(device);
    }
  }
  
  // 重新计算蓝图尺寸
  this.calculateBlueprintArea();
}
```

### 步骤3：index引用重映射

```javascript
cloneToStackLayers() {
  // ... 收集设备并重新布局
  
  // indexMap用于重映射
  const indexMap = new Map();
  
  // 重新分配后重建indexMap
  for (let i = 0; i < this.buildings.length; i++) {
    indexMap.set(this.buildings[i].index, i);
  }
  
  // 重映射outputObjIdx
  for (const building of this.buildings) {
    if (building.itemId === beltItemId) {
      // 传送带：outputObjIdx保持不变（z=0传送带）
      continue;
    }
    
    if (indexMap.has(building.outputObjIdx)) {
      // 指向同层设备/分拣器
      building.outputObjIdx = indexMap.get(building.outputObjIdx);
    }
    // 否则指向z=0传送带，保持原值
  }
}
```

### 步骤4：重新计算蓝图尺寸

```javascript
cloneToStackLayers() {
  // ... 重新布局和index重映射
  
  // 重新计算蓝图尺寸
  this.calculateBlueprintArea();
}

calculateBlueprintArea() {
  // 计算所有层的总占地面积
  let totalArea = 0;
  
  for (const building of this.buildings) {
    // 获取该设备的占地面积
    const buildingArea = this.calculateBuildingArea(building);
    totalArea += buildingArea.area;
  }
  
  // 只计算z=0层的占地面积
  const z0Buildings = this.buildings.filter(b => b.localOffset[0].z === 0);
  let z0Area = 0;
  for (const building of z0Buildings) {
    const buildingArea = this.calculateBuildingArea(building);
    z0Area += buildingArea.area;
  }
  
  // 蓝图尺寸基于z=0层面积
  const y = Math.ceil(Math.sqrt(z0Area / this.config.x_y_ratio));
  this.blueprintSize = {
    x: Math.ceil(this.config.x_y_ratio * y),
    y: y,
  };
  
  this.occupiedArea = [{ 
    x1: -1, 
    y1: -1, 
    x2: this.blueprintSize.x, 
    y2: -1 
  }];
}
```

---

## 风险评估

### 高风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 布局算法复杂 | 设备重叠、碰撞 | 中 | 充分测试 |
| index引用错误 | 连接断开 | 高 | 单元测试 |
| 蓝图尺寸计算错误 | 导出失败 | 中 | 对比测试 |

### 测试用例

```javascript
// 测试用例1：基础布局
test('4层堆叠，60个设备', () => {
  const blueprint = generateBlueprint({
    stackLayers: 4,
    num: 60
  });
  
  // 验证：60个设备分散到4层
  assert(blueprint.buildings.length === 60);
  
  // 验证：4层都有设备
  const layers = getUniqueZLevels(blueprint.buildings);
  assert(layers.length === 4);
  
  // 验证：每层15个设备
  for (const layer of layers) {
    const count = countBuildingsAtLayer(blueprint.buildings, layer);
    assert(count === 15);
  }
});

// 测试用例2：占地面积缩减
test('占地面积减少为1/4', () => {
  const normal = generateBlueprint({ stackLayers: 1, num: 60 });
  const stacked = generateBlueprint({ stackLayers: 4, num: 60 });
  
  // 堆叠后面积约为原来的1/4
  const ratio = stacked.area / normal.area;
  assert(ratio < 0.3); // 允许一定误差
});
```

---

## 推荐方案

### 短期：方案A（当前实现）

**理由：**
- 实现简单，风险低
- 已经实现并测试
- 满足基本需求

**后续优化：**
- 完善文档
- 添加更多测试用例
- 收集用户反馈

### 中期：方案B（可选优化）

**触发条件：**
- 用户反馈需要占地面积缩减
- 有足够开发资源
- 愿意承担风险

**准备工作：**
- 详细设计文档
- 单元测试框架
- 集成测试用例

---

## 总结

| 项目 | 方案A | 方案B |
|------|-------|-------|
| 实现状态 | 已完成 | 待开发 |
| 占地面积 | 不减少 | 减少1/4 |
| 实现复杂度 | 低 | 高 |
| 风险 | 低 | 中 |
| 建议 | 优先使用 | 后期优化 |

**当前推荐方案A**，待用户有明确需求后再实现方案B。
