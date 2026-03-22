const _bpGlobal = typeof globalThis !== "undefined" ? globalThis : window;
const { itemMap, productionCategory, buildingType, buildingMap, recipeMap } = _bpGlobal.DSQBlueprintConstants || {};
const modelFactory = _bpGlobal.DSQBlueprintModel;
const layoutFactory = _bpGlobal.DSQBlueprintLayout;

if (!_bpGlobal.DSQBlueprintConstants) {
  throw new Error("Missing DSQBlueprintConstants. Load Scripts/blueprint.constants.js before blueprint.js.");
}
if (!modelFactory) {
  throw new Error("Missing DSQBlueprintModel. Load Scripts/blueprint.model.js before blueprint.js.");
}
if (!layoutFactory) {
  throw new Error("Missing DSQBlueprintLayout. Load Scripts/blueprint.layout.js before blueprint.js.");
}

class Blueprint {
  constructor(title, iconId, recipe, config) {
    // this.name = target.name
    this.recipe = recipe;
    this.buildingIndex = -1;
    this.blueprintSize = { x: 0, y: 0 };
    this.occupiedArea = [];
    this.buildings = [];
    // this.config = {
    //     maxSorterNumOneBelt: 8,  // 一个传送带节点连接的最大分拣器数量
    //     conveyorBeltStackLayer: 4,  // 传送带物品最大堆叠层数
    //     x_y_ratio: 2,  // 长宽比
    //     compactLayout: false,  // 是否采用紧凑布局（紧凑布局的蓝图中炼油厂、化工厂和对撞机在布局上会更紧凑，适合摆放在赤道带，在高纬度可能会出现碰撞问题）
    //     upgradeConveyorBelt: false,  // 360/min的运力时使用3级传送带（无带流情况下，原料的需求和供应都是集中处理，1级传送带满运力情况下可能会有运送不及时问题导致产量低于预期
    //     onlyConveyorBeltMk3: false,  // 是否只使用三级传送带
    //     onlySorterMk3: false,  // 是否只使用三级分拣器
    //     maxLabLayers: 15,  // 研究站最大层数
    //     selfSpray: true,  // 增产剂是否自喷涂
    // }
    this.config = config;
    this.buildingArray = [];
    this.sorters = {};
    this.sprayCoaterOffsetList = [];
    this.itemSummary = {};
    this.conveyorStartOffsetX = 0;
    this.lastProductionBuildingType = -1;
    this.blueprintTemplate = modelFactory.createBlueprintTemplate(title, iconId);
  }

  mapRecipeID() {
    for (let subRecipe of this.recipe.subRecipes) {
      if (!subRecipe.input) {
        // 原料
        continue;
      }
      let recipeStr = "";
      let isFirst = true;
      for (let item of subRecipe.input) {
        if (isFirst) {
          recipeStr = item.name;
          isFirst = false;
        } else {
          recipeStr += "+" + item.name;
        }
      }
      isFirst = true;
      for (let item of subRecipe.output) {
        if (isFirst) {
          recipeStr += "=" + item.name;
          isFirst = false;
        } else {
          recipeStr += "+" + item.name;
        }
      }
      if (!recipeMap[recipeStr] || recipeMap[recipeStr] === -1) {
        const warnMsg = `包含不支持的配方: ${recipeStr.replace("=", "->")}，<br/>请排除对应物品（目前只支持通过(位面)熔炉、制造台、精炼厂、对撞机、（量子）化工厂、研究站六类生产设施进行制造的物品）`;
        // 纵深防崩：UI 组件跨线程不可达。通过全局作用域探测降级至事件总线。
        if (typeof window !== "undefined" && window.cocoMessage) {
          cocoMessage.warning(warnMsg, 5000);
        } else if (typeof postMessage === "function") {
          postMessage({ type: "WARNING", payload: warnMsg });
        } else {
          console.warn(warnMsg);
        }
        throw `unknown recipe - ${recipeStr} ${subRecipe}`;
      }
      if ([58, 121].includes(recipeMap[recipeStr])) {
        const warnMsg2 = `X射线裂解(制氢)与重整精炼(制精炼油)可能需手动提供初始启动的精炼油/氢`;
        if (typeof window !== "undefined" && window.cocoMessage) {
          cocoMessage.warning(warnMsg2, 5000);
        } else if (typeof postMessage === "function") {
          postMessage({ type: "WARNING", payload: warnMsg2 });
        }
        //throw `unknown recipe - ${recipeStr} ${subRecipe}`;
      }
      subRecipe.recipeID = recipeMap[recipeStr];
    }
  }

  getBuildingTemplate() {
    this.buildingIndex++;
    return modelFactory.createBuildingTemplate(this.buildingIndex);
  }

  newSprayCoater(offset, yaw) {
    // 在offset位置生成一个喷涂机， direction<0 表示沿y轴负方向，否则为y轴正方向
    return modelFactory.createSprayCoater(this.getBuildingTemplate(), offset, yaw, buildingMap.sprayCoater);
  }

  newConveyorNode(offset, yaw, conveyor, outputObjIdx, outputToSlot, parameters) {
    return modelFactory.createConveyorNode(
      ++this.buildingIndex,
      offset,
      yaw,
      conveyor,
      outputObjIdx,
      outputToSlot,
      parameters
    );
  }

  newConveyor(conveyor, direction, inputData, outputData, parameters = null, needSprayCoater = false) {
    // needSprayCoater = false
    // 在y轴方向生成一条长度为length的传送带, direction = -1 表示y轴负方向， 1表示y轴正方向
    if (conveyor.type !== buildingType.conveyor) {
      throw `newConveyor error: error conveyor - ${conveyor}`;
    }
    let nodeNum = 0;
    // 修复：无条件从 occupiedArea 初始化坐标，防止 inputData/outputData 为空时坐标留在 (0,0,0) 导致节点错位
    let buildingX = this.occupiedArea[this.occupiedArea.length - 1].x2 + 1;
    let buildingY = this.occupiedArea[this.occupiedArea.length - 2].y2;
    let buildingZ = 0;
    this.occupiedArea[this.occupiedArea.length - 1].x2 += 1;
    for (let i = 0; i < inputData.length; i++) {
      if (direction < 0) {
        // 输入带不需要处理input，在最后加一个节点即可
        break;
      }
      buildingY += 1;
      let outputObjIdx = this.buildingIndex + 2;
      let outputToSlot = 1;
      this.buildings.push(
        this.newConveyorNode(
          { x: buildingX, y: buildingY, z: buildingZ },
          [0, 0],
          conveyor,
          outputObjIdx,
          outputToSlot,
          null
        )
      );
      nodeNum++;
      // 修改分拣器指向这个传送带节点
      let toChangeNum = inputData[i].length;
      for (let b of this.buildings) {
        if (toChangeNum <= 0) {
          break;
        }
        if (inputData[i].includes(b.index)) {
          b.outputObjIdx = this.buildingIndex;
          toChangeNum--;
        }
      }
    }
    let sprayCoaterOffset = {};
    if (needSprayCoater && direction > 0) {
      // 添加节点用于放置喷涂机
      // 为避免供料口被堵，喷涂机只放在第偶数个节点上
      if (nodeNum % 2 === 0) {
        this.buildings.push(
          this.newConveyorNode(
            { x: buildingX, y: buildingY, z: buildingZ },
            [0, 0],
            conveyor,
            this.buildingIndex + 2,
            1,
            null
          )
        );
      }
      sprayCoaterOffset = { x: buildingX, y: ++buildingY, z: buildingZ };
      this.sprayCoaterOffsetList.push({
        x: buildingX,
        y: buildingY - 1,
        z: buildingZ,
      });
      this.buildings.push(this.newConveyorNode(sprayCoaterOffset, [0, 0], conveyor, this.buildingIndex + 2, 1, null));
    }

    for (let i = 0; i < outputData.length; i++) {
      let outputObjIdx = -1;
      let outputToSlot = 0;
      buildingY += 1;
      if (!(direction > 0 && i === outputData.length - 1)) {
        if (!(direction < 0 && i === 0)) {
          outputObjIdx = this.buildingIndex + 1 + direction;
        }
      }
      let nodeParameters = null;
      if (direction > 0 && i === outputData.length - 1) {
        nodeParameters = parameters;
      }
      if (outputObjIdx !== -1) {
        outputToSlot = 1;
      }
      let nodeYaw = [0, 0];
      if (direction < 0) {
        nodeYaw = [180, 180];
      }
      this.buildings.push(
        this.newConveyorNode(
          { x: buildingX, y: buildingY, z: buildingZ },
          nodeYaw,
          conveyor,
          outputObjIdx,
          outputToSlot,
          nodeParameters
        )
      );
      nodeNum++;
      // 修改分拣器指向这个传送带节点
      let toChangeNum = outputData[i].length;
      for (let b of this.buildings) {
        if (toChangeNum <= 0) {
          break;
        }
        if (outputData[i].includes(b.index)) {
          b.inputObjIdx = this.buildingIndex;
          b.inputFromSlot = -1;
          toChangeNum--;
        }
      }
    }
    // 修复：outputData为空时，最后一个节点的outputObjIdx仍指向buildingIndex+2，
    // 会错误连接到下一个物品的传送带或喷涂机，导致跨物品粘连。此处将其终结为-1。
    if (direction > 0 && outputData.length === 0 && nodeNum > 0) {
      this.buildings[this.buildings.length - 1].outputObjIdx = -1;
      this.buildings[this.buildings.length - 1].outputToSlot = 0;
    }
    if (direction < 0) {
      // let outputObjIdx = this.buildingIndex
      if (needSprayCoater) {
        if (nodeNum % 2 === 0) {
          this.buildings.push(
            this.newConveyorNode(
              { x: buildingX, y: ++buildingY, z: buildingZ },
              [0, 0],
              conveyor,
              this.buildingIndex,
              1,
              null
            )
          );
        }
        sprayCoaterOffset = { x: buildingX, y: ++buildingY, z: buildingZ };
        this.sprayCoaterOffsetList.push({
          x: buildingX,
          y: buildingY + 1,
          z: buildingZ,
        });
        this.buildings.push(this.newConveyorNode(sprayCoaterOffset, [180, 180], conveyor, this.buildingIndex, 1, null));
        this.buildings.push(
          this.newConveyorNode(
            { x: buildingX, y: ++buildingY, z: buildingZ },
            [180, 180],
            conveyor,
            this.buildingIndex,
            1,
            null
          )
        );
      }
      this.buildings.push(
        this.newConveyorNode(
          { x: buildingX, y: ++buildingY, z: buildingZ },
          [180, 180],
          conveyor,
          this.buildingIndex,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          { x: buildingX, y: ++buildingY, z: buildingZ },
          [180, 180],
          conveyor,
          this.buildingIndex,
          1,
          parameters
        )
      );
    }
    if (needSprayCoater) {
      let sprayYaw = [0, 0];
      if (direction < 0) {
        sprayYaw = [180, 180];
      }
      this.buildings.push(this.newSprayCoater(sprayCoaterOffset, sprayYaw));
    }

    // 修复：更新占地区域X坐标，防止下一条传送带粘连
    // 每条传送带占据1列X坐标，更新x2确保下条传送带从新列开始
    if (buildingX > 0 && this.occupiedArea.length > 0) {
      this.occupiedArea[this.occupiedArea.length - 1].x2 = buildingX;
    }
  }

  calculateBuildingArea(subRecipe) {
    // 计算某个配方中单个生产建筑的占地面积
    if (!subRecipe.building) {
      return { area: 0, x: 0, y: 0, centerPoint: [0, 0, 0, 0] };
    }
    switch (buildingMap[subRecipe.building.name].category) {
      case productionCategory.smelter:
        if (subRecipe.output.length + subRecipe.input.length <= 2) {
          return {
            area: 12,
            x: 3,
            y: 4,
            centerPoint: [2, 1, 1, 1],
            yaw: [0, 0],
          }; // centerPoint中数值依次为中心点到y轴负边界、x轴正边界、y轴正边界和x轴负边界的距离
        } else {
          return {
            area: 16,
            x: 4,
            y: 4,
            centerPoint: [2, 2, 1, 1],
            yaw: [0, 0],
          };
        }
      case productionCategory.assembling:
        return { area: 16, x: 4, y: 4, centerPoint: [2, 2, 1, 1], yaw: [0, 0] };
      case productionCategory.plant:
        return { area: 48, x: 8, y: 6, centerPoint: [2, 4, 3, 3], yaw: [0, 0] };
      case productionCategory.refinery:
        if (this.config.compactLayout) {
          return {
            area: 30,
            x: 7,
            y: 5,
            centerPoint: [2, 3, 2, 3],
            yaw: [90, 90],
          };
        }
        return {
          area: 40,
          x: 8,
          y: 5,
          centerPoint: [2, 3, 2, 4],
          yaw: [90, 90],
        };
      case productionCategory.collider:
        if (this.config.compactLayout) {
          return {
            area: 66,
            x: 11,
            y: 6,
            centerPoint: [3, 5, 2, 5],
            yaw: [0, 0],
          };
        }
        return {
          area: 77,
          x: 11,
          y: 7,
          centerPoint: [3, 5, 3, 5],
          yaw: [0, 0],
        };
      case productionCategory.lab:
        return { area: 42, x: 7, y: 6, centerPoint: [3, 3, 2, 3], yaw: [0, 0] };
      default:
        throw `unknown production build type - ${buildingMap[subRecipe.building.name].type}`;
    }
  }

  calculateBlueprintArea() {
    let totalArea = 0;
    for (let subRecipe of this.recipe.subRecipes) {
      if (!subRecipe.building) {
        continue;
      }
      totalArea += this.calculateBuildingArea(subRecipe).area * Math.ceil(subRecipe.building.num);
    }
    // console.log(`total area ${totalArea}`)
    let y = Math.ceil(Math.sqrt(totalArea / this.config.x_y_ratio));
    // let x = Math.ceil(Math.sqrt(totalArea))
    this.blueprintSize = {
      x: Math.ceil(this.config.x_y_ratio * y),
      y: y,
    };
    this.occupiedArea = [{ x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 }];
  }

  calculateSorterLocalOffsetAndYaw(buildingOffset, type, slotIndex, rotate = 0) {
    return layoutFactory.calculateSorterLocalOffsetAndYaw(buildingOffset, type, slotIndex, rotate, productionCategory);
  }

  calculateProductionBuildingPlacement(buildingArea) {
    return layoutFactory.calculateProductionBuildingPlacement(this.blueprintSize, this.occupiedArea, buildingArea);
  }

  calculateTeslaTowerOffset(buildingOffset, category) {
    return layoutFactory.calculateTeslaTowerOffset(
      buildingOffset,
      category,
      productionCategory,
      typeof cocoMessage !== "undefined" ? cocoMessage : null
    );
  }

  upsertSorterRecord(itemName, flowType, sorterIndex, rate, ownerObjIdx, ownerName, ownerOffset, recipeID) {
    const entry = modelFactory.createSorterOwnerRecord(
      sorterIndex,
      rate,
      ownerObjIdx,
      ownerName,
      ownerOffset,
      recipeID
    );
    layoutFactory.upsertSorterFlow(this.sorters, itemName, flowType, entry);
  }

  createConfiguredSorter(sorterDef, buildingOffset, category, slotIndex, rotate, options) {
    const offsetInfo = this.calculateSorterLocalOffsetAndYaw(buildingOffset, category, slotIndex, rotate);
    const sorterOptions = Object.assign({}, options, {
      localOffset: offsetInfo.offset,
      yaw: offsetInfo.yaw,
    });
    return modelFactory.createSorter(this.getBuildingTemplate(), sorterDef, sorterOptions);
  }

  planProductionSorters(actualRate, slotIndex, isInput, category) {
    return layoutFactory.planProductionSorters(
      actualRate,
      slotIndex,
      isInput,
      category,
      this.config,
      buildingMap,
      productionCategory
    );
  }

  appendPlannedSorter(
    sorterDef,
    ownerOffset,
    buildingCategory,
    planEntry,
    sorterOptions,
    itemName,
    nowBuildingIndex,
    ownerName,
    recipeID,
    sorterList
  ) {
    const newSorter = this.createConfiguredSorter(
      sorterDef,
      ownerOffset,
      buildingCategory,
      planEntry.slotIndex,
      planEntry.rotate,
      sorterOptions
    );
    this.buildings.push(newSorter);
    sorterList.push(newSorter.index);
    this.upsertSorterRecord(
      itemName,
      planEntry.flowType,
      newSorter.index,
      planEntry.rate,
      nowBuildingIndex,
      ownerName,
      ownerOffset,
      recipeID
    );
  }

  moveBuildingGroupRight(buildingGroupEntry) {
    const indexesToMove = layoutFactory.collectBuildingGroupIndexes(buildingGroupEntry);
    let toMoveNum = indexesToMove.length;
    for (let b of this.buildings) {
      if (indexesToMove.includes(b.index)) {
        b.localOffset[0].x += 1;
        b.localOffset[1].x += 1;
        toMoveNum--;
      }
      if (toMoveNum <= 0) {
        break;
      }
    }
  }

  attachSupplementSorterAndShift(ownerObjIdx, ownerName, newSorterIndex) {
    const ownerCategory = buildingMap[ownerName].category;
    for (let i = 0; i < this.buildingArray.length; i++) {
      const plan = layoutFactory.attachSorterToOwnerAndPlanShift(
        this.buildingArray[i],
        ownerObjIdx,
        ownerCategory,
        newSorterIndex,
        productionCategory
      );
      if (plan.found) {
        for (const entry of plan.entriesToShift) {
          this.moveBuildingGroupRight(entry);
        }
        break;
      }
    }
  }

  createSupplementInputSorter(sourceSorter, newSorterRate) {
    const sorterDef = layoutFactory.selectSorterByRate(newSorterRate, this.config, buildingMap);
    const ownerCategory = buildingMap[sourceSorter.ownerName].category;
    const outputToSlot = layoutFactory.selectSupplementSorterOutputSlot(ownerCategory, productionCategory);
    const newSorter = this.createConfiguredSorter(sorterDef, sourceSorter.ownerOffset, ownerCategory, outputToSlot, 1, {
      outputObjIdx: sourceSorter.ownerObjIdx,
      outputToSlot,
      inputToSlot: 1,
      parameters: { length: 1 },
    });
    this.buildings.push(newSorter);
    this.attachSupplementSorterAndShift(sourceSorter.ownerObjIdx, sourceSorter.ownerName, newSorter.index);
    return newSorter;
  }

  newProductionBuilding(subRecipe) {
    let hasTeslaTowerThisLine = false;
    let teslaTowerDistance = 0;
    for (let i = 0; i < subRecipe.building.num; i++) {
      this.buildingIndex++;
      this.lastProductionBuildingType = buildingMap[subRecipe.building.name].category;
      let buildingArea, buildingX, buildingY, buildingZ;
      buildingArea = this.calculateBuildingArea(subRecipe);
      const placement = this.calculateProductionBuildingPlacement(buildingArea);
      let needNewLine = placement.needNewLine;
      buildingX = placement.offset.x;
      buildingY = placement.offset.y;
      buildingZ = placement.offset.z;
      if (needNewLine) {
        hasTeslaTowerThisLine = false;
        teslaTowerDistance = 0;
      }
      let acceleratorMode = 0;
      if (subRecipe.acceleratorMode === 1) {
        acceleratorMode = 1;
      }
      let newBuilding = modelFactory.createProductionBuilding(
        this.buildingIndex,
        { x: buildingX, y: buildingY, z: buildingZ },
        buildingArea.yaw,
        buildingMap[subRecipe.building.name],
        subRecipe.recipeID,
        acceleratorMode
      );

      let stackLabBuildingIndexList = [];
      let layers = 1;
      if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
        // 堆叠处理研究站
        modelFactory.configureLabBuilding(newBuilding);
        this.buildings.push(newBuilding);
        for (i++; i < subRecipe.building.num && layers < this.config.maxLabLayers; i++, layers++) {
          let labBuilding = modelFactory.createStackedLabBuilding(
            this.getBuildingTemplate(),
            { x: buildingX, y: buildingY, z: buildingZ },
            newBuilding.yaw,
            buildingMap[subRecipe.building.name],
            buildingMap.lab.height,
            subRecipe.recipeID,
            acceleratorMode,
            layers,
            this.buildingIndex - 1
          );
          this.buildings.push(labBuilding);
          stackLabBuildingIndexList.push(labBuilding.index);
        }
        i--;
      } else {
        this.buildings.push(newBuilding);
      }
      const nowBuildingIndex = newBuilding.index;
      if (this.config.generateTeslaTower) {
        if (
          (this.config.teslaTowerLineInterval > 1 &&
            ((this.buildingArray.length && this.buildingArray.length % 2 === 0) ||
              (needNewLine && this.buildingArray.length % 2 === 1))) ||
          (this.config.teslaTowerLineInterval === 1 && this.buildingArray.length)
        ) {
          let teslaTowerOffset = this.calculateTeslaTowerOffset(
            { x: buildingX, y: buildingY, z: buildingZ },
            buildingMap[subRecipe.building.name].category
          );
          teslaTowerDistance += teslaTowerOffset.distance;
          if (
            (hasTeslaTowerThisLine && teslaTowerDistance >= this.config.teslaTowerInterval) ||
            (!hasTeslaTowerThisLine && teslaTowerDistance >= this.config.teslaTowerInterval / 2) ||
            (teslaTowerDistance >= this.config.teslaTowerInterval / 2 &&
              this.blueprintSize.x - buildingX < this.config.teslaTowerInterval)
          ) {
            // 生成电力感应塔
            let teslaTower = modelFactory.createSinglePointBuilding(
              this.getBuildingTemplate(),
              buildingMap.teslaTower,
              teslaTowerOffset.offset
            );
            teslaTowerDistance = 0;
            hasTeslaTowerThisLine = true;
            this.buildingArray[this.buildingArray.length - 1].push({
              index: teslaTower.index,
              sorterList: [],
            });
            this.buildings.push(teslaTower);
          }
        }
      }

      // 添加分拣器
      let slotIndex = buildingMap[subRecipe.building.name].slotMaxIndex;
      const productionContext = layoutFactory.calculateProductionContext(
        subRecipe.building.num,
        i,
        buildingMap[subRecipe.building.name].category === productionCategory.lab ? stackLabBuildingIndexList.length : 0,
        buildingMap[subRecipe.building.name].productionSpeed,
        this.recipe.proliferator,
        subRecipe.acceleratorMode,
        itemMap
      );
      let sorterList = [];

      const ownerOffset = { x: buildingX, y: buildingY, z: buildingZ };
      const ownerName = subRecipe.building.name;
      const buildingCategory = buildingMap[ownerName].category;
      for (let outputItem of subRecipe.output) {
        let actual_rate = layoutFactory.calculateOutputActualRate(
          outputItem.rate,
          productionContext.productionSpeed,
          productionContext.actualBuildingNum,
          productionContext.extraRate
        );
        const sortPlan = this.planProductionSorters(actual_rate, slotIndex, false, buildingCategory);
        for (let planEntry of sortPlan.entries) {
          this.appendPlannedSorter(
            sortPlan.sorter,
            ownerOffset,
            buildingCategory,
            planEntry,
            {
              inputObjIdx: nowBuildingIndex,
              outputToSlot: -1,
              inputToSlot: 1,
              inputFromSlot: planEntry.slotIndex,
              filterId: itemMap[outputItem.name].iconId,
              parameters: { length: 1 },
            },
            outputItem.name,
            nowBuildingIndex,
            ownerName,
            subRecipe.recipeID,
            sorterList
          );
        }
        slotIndex = sortPlan.nextSlotIndex;
      }
      for (let inputItem of subRecipe.input) {
        let actual_rate = layoutFactory.calculateInputActualRate(
          inputItem.rate,
          productionContext.productionSpeed,
          productionContext.actualBuildingNum,
          productionContext.extraRate,
          subRecipe.acceleratorMode
        );
        const sortPlan = this.planProductionSorters(actual_rate, slotIndex, true, buildingCategory);
        for (let planEntry of sortPlan.entries) {
          const sorterOptions = {
            outputToSlot: planEntry.slotIndex,
            inputToSlot: 1,
            filterId: itemMap[inputItem.name].iconId,
            parameters: { length: 1 },
          };
          if (planEntry.linkMode === "input_extra") {
            sorterOptions.inputObjIdx = nowBuildingIndex;
          } else {
            sorterOptions.outputObjIdx = nowBuildingIndex;
          }
          this.appendPlannedSorter(
            sortPlan.sorter,
            ownerOffset,
            buildingCategory,
            planEntry,
            sorterOptions,
            inputItem.name,
            nowBuildingIndex,
            ownerName,
            subRecipe.recipeID,
            sorterList
          );
        }
        slotIndex = sortPlan.nextSlotIndex;
      }

      if (needNewLine) {
        // 新的一行
        this.buildingArray.push([{ index: nowBuildingIndex, sorterList: sorterList }]);
      } else {
        // 在当前行继续添加
        this.buildingArray[this.buildingArray.length - 1].push({
          index: nowBuildingIndex,
          sorterList: sorterList,
        });
      }
      for (let labIndex of stackLabBuildingIndexList) {
        // 把堆叠的研究站加进去
        this.buildingArray[this.buildingArray.length - 1].push({
          index: labIndex,
          sorterList: [],
        });
      }
    }
  }

  init() {
    this.mapRecipeID();
    // 堆叠模式：根据堆叠层数缩减num
    // 例如：60个设备，4层堆叠 → 每层15个设备
    // init(): num=ceil(60/4)=15
    // generateBuildings(): 15个设备在z=0
    // generateConveyorBelts(): rate×4放大（支撑4层产能）
    // cloneToStackLayers(): 复制15个设备到3层 → 总共60个设备
    // 核心：4层并行工作，总产能=60min
    //
    // 重要：研究站（Lab）特殊处理
    // - Lab 不参与克隆（布局复杂，暂不支持）
    // - Lab.num 不缩减，保持完整数量在 z=0 层工作
    // - 这样 Lab 的产能不会损失
    if (this.config.stackLayers > 1) {
      for (let subRecipe of this.recipe.subRecipes) {
        if (subRecipe.building) {
          // 排除 Lab（不缩减num，保持完整产能）
          if (buildingMap[subRecipe.building.name].category !== productionCategory.lab) {
            // 保存原始 num，用于 generateConveyorBelts 中计算原料需求
            subRecipe.building.originalNum = subRecipe.building.num;
            subRecipe.building.num = Math.ceil(subRecipe.building.num / this.config.stackLayers);
          }
        }
      }
    }
    this.calculateBlueprintArea();
    if (this.config.onlyConveyorBeltMk3Downgrade) {
      buildingMap.conveyorBeltMK3.transportSpeed = 28;
    } else {
      buildingMap.conveyorBeltMK3.transportSpeed = 30;
    }
    // console.log(buildingMap)
    // this.blueprintTemplate.areas[0].size = this.blueprintSize
  }

  /**
   * 将 z=0 层的全部建筑克隆到 z=10, z=20, ... 层，实现建筑垂直堆叠。
   * 必须在 generateBuildings + generateConveyorBelts + generateConveyorBeltsForSprayCoater 之后调用。
   *
   * 方案A - 正确的堆叠逻辑：
   * 1. init(): num=60（完整产能）
   * 2. generateBuildings(): 15个设备在z=0布局
   * 3. generateConveyorBelts(): 为60个设备生成传送带网络（rate × stackLayers）
   * 4. cloneToStackLayers():
   *    - 克隆设备和分拣器到z=10,20,30
   *    - 所有层共享z=0的传送带网络
   *    - 总产能 = 60min
   *
   * 核心：4层并行工作，所有层共享z=0传送带网络
   */
  cloneToStackLayers() {
    if (!this.config.stackLayers || this.config.stackLayers <= 1) {
      return;
    }
    const stackLayers = this.config.stackLayers;
    const zStep = 10;

    // --- 1. 记录z=0层的全部建筑 ---
    const baseBuildings = this.buildings.slice();
    const baseCount = baseBuildings.length;

    // --- 2. 生成地基（每层独立地基）---
    // 每层设备都需要连接到该层对应的地基
    // 注意：地基在 baseBuildings 之后生成，所以第一个地基的 index = baseCount + 1
    // 后续地基按顺序递增：baseCount+1, baseCount+2, baseCount+3, baseCount+4
    const foundationStartIndex = baseCount + 1;
    const foundationZOffsets = layoutFactory.createFoundationZOffsets(stackLayers, zStep);
    for (const foundationZ of foundationZOffsets) {
      const foundationBuilding = modelFactory.createFoundationBuilding(this.getBuildingTemplate(), foundationZ);
      this.buildings.push(foundationBuilding);
    }

    // --- 3. 识别需跳过的建筑类型 ---
    const cloneableBuildings = layoutFactory.collectCloneableBuildings(baseBuildings, buildingMap);

    // --- 4. 逐层克隆 ---
    const cloneLayerPlans = layoutFactory.planCloneLayers(
      cloneableBuildings,
      stackLayers,
      zStep,
      foundationStartIndex,
      this.buildingIndex + 1
    );
    for (const layerPlan of cloneLayerPlans) {
      for (const clonePlan of layerPlan.clones) {
        const clone = modelFactory.cloneBuildingForLayer(
          this.getBuildingTemplate(),
          clonePlan.base,
          clonePlan.zOffset,
          clonePlan.outputObjIdx,
          clonePlan.inputObjIdx
        );
        this.buildings.push(clone);
      }
    }

    // 修复：添加克隆后验证机制，检查传送带节点负载
    this.validateBeltLoad();
  }

  validateBeltLoad() {
    const beltLoad = new Map();

    for (const b of this.buildings) {
      if (b.itemId === 2014) {
        if (b.outputObjIdx >= 0) {
          beltLoad.set(b.outputObjIdx, (beltLoad.get(b.outputObjIdx) || 0) + 1);
        }
        if (b.inputObjIdx >= 0 && b.inputObjIdx !== b.outputObjIdx) {
          const beltIdx = this.findBeltIndex(b.inputObjIdx);
          if (beltIdx >= 0) {
            beltLoad.set(beltIdx, (beltLoad.get(beltIdx) || 0) + 1);
          }
        }
      }
    }

    const warnings = [];
    for (const [beltIdx, load] of beltLoad) {
      if (load > this.config.maxSorterNumOneBelt) {
        warnings.push(`传送带节点${beltIdx}超载: ${load}个分拣器 (限制: ${this.config.maxSorterNumOneBelt})`);
      }
    }

    if (warnings.length > 0) {
      console.warn(`[蓝图验证] 发现${warnings.length}个传送带超载问题:`);
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    return warnings;
  }

  findBeltIndex(objIdx) {
    const beltItemIds = new Set([2001, 2002, 2003]);
    for (const b of this.buildings) {
      if (b.index === objIdx && beltItemIds.has(b.itemId)) {
        return objIdx;
      }
    }
    return -1;
  }

  sortItemSummary(itemSummary) {
    return layoutFactory.sortItemSummary(itemSummary);
  }

  generateConveyorBelts() {
    let itemSummary = layoutFactory.buildConveyorItemSummary(
      this.recipe.subRecipes,
      this.recipe.proliferator,
      this.config.maxLabLayers,
      itemMap,
      buildingMap,
      productionCategory
    );
    // console.log(itemSummary)
    // throw `break`
    itemSummary = this.sortItemSummary(itemSummary);
    this.itemSummary = itemSummary;

    // 堆叠模式：设备垂直堆叠，传送带只在一层
    // 每层设备数量 = 普通模式/stackLayers，总设备数量 ≈ 普通模式
    // 传送带需要支撑的产能和普通模式一样，所以rate不需要放大
    const stackLayers = this.config.stackLayers || 1;

    this.conveyorStartOffsetX = this.occupiedArea[this.occupiedArea.length - 1].x2;
    this.occupiedArea[this.occupiedArea.length - 1].x2++; // x轴方向空一格用于喷涂剂走线
    this.occupiedArea[this.occupiedArea.length - 2].y2++; // y轴方向空一格避免喷涂机和建筑碰撞
    // 生成传送带并连接到分拣器
    const zero = 0.0000000001; // rate是每秒生产量，除不尽时会有精度误差，小数点后16位都是准确的，取0.0000000001为判断标准足够了。
    // 堆叠模式：z=0 层每个传送带节点的分拣器在 cloneToStackLayers 后被克隆 stackLayers 倍
    // 为保证克隆后每节点不超过 maxSorterNumOneBelt，z=0 层每节点只分配 floor(max/stackLayers) 个
    // 例：stackLayers=4, max=8 → z=0 每节点 2 个分拣器 → 克隆后 2×4=8 ≤ 8
    // 修复：确保sortersPerNode至少为2，这样克隆后每个节点可以连接8个分拣器（2×4）
    // 满足普通模式下所有节点的需求（普通模式有节点需要连接8个分拣器）
    const sortersPerNode = layoutFactory.calculateSortersPerNode(this.config.maxSorterNumOneBelt, stackLayers);
    for (let item in itemSummary) {
      const itemName = item;
      // console.log(itemName)
      item = itemSummary[item];

      let conveyorBelt = layoutFactory.selectConveyorForRate(
        item.rate,
        this.config.onlyConveyorBeltMk3,
        this.config.upgradeConveyorBelt,
        buildingMap.conveyorBeltMk1,
        buildingMap.conveyorBeltMK3
      );

      let maxTransportSpeed = layoutFactory.calculateMaxTransportSpeed(
        item.fromBuildingNum,
        buildingMap.conveyorBeltMK3.transportSpeed,
        this.config.conveyorBeltStackLayer
      );

      for (let totalDoneRate = 0; item.rate - totalDoneRate > zero; ) {
        const roundState = layoutFactory.createConveyorRoundState(item, totalDoneRate, maxTransportSpeed);
        let needSprayCoater = roundState.needSprayCoater;
        let doneRate = roundState.doneRate;
        let parameters = roundState.parameters;
        let inputRate = roundState.inputRate;
        let inputData = roundState.inputData;
        let outputData = roundState.outputData;
        const sorterBucket = this.sorters[itemName];
        const abortReason = layoutFactory.getConveyorIterationAbortReason(item, sorterBucket);
        if (abortReason === "missing_sorters") {
          console.warn(`[蓝图警告] 物品 ${itemName} 没有对应的分拣器数据`);
          break;
        }
        if (abortReason) {
          break;
        }
        if (item.fromBuildingNum !== 0) {
          const sourceResult = layoutFactory.consumeSourceOutputSorters(
            sorterBucket.output,
            inputRate,
            zero,
            sortersPerNode
          );
          inputData = sourceResult.inputData;
          inputRate = sourceResult.remainingInputRate;
          doneRate = sourceResult.doneRate;
        } else {
          // 说明是原料
          const rawInputResult = layoutFactory.applyRawInputRound(itemName, inputRate, itemMap);
          inputData = rawInputResult.inputData;
          parameters = rawInputResult.parameters;
          doneRate = rawInputResult.doneRate;
          // inputRate = 0
        }
        totalDoneRate += doneRate;
        let outputRate = doneRate; // 当前传送带实际运力
        // 重新排序以提高输出传送带中，X射线裂解(氢)和重整精炼(精炼油)的输入优先级
        if (["hydrogen", "refinedOil"].includes(itemName) && item.toBuildingNum !== 0) {
          sorterBucket.input = layoutFactory.reorderPriorityInputSorters(itemName, sorterBucket.input);
        }
        if (item.toBuildingNum !== 0) {
          const outputResult = layoutFactory.consumeOutputInputSortersForRound(
            sorterBucket.input,
            item.fromBuildingNum,
            item.rate,
            totalDoneRate,
            outputRate,
            stackLayers,
            zero,
            sortersPerNode
          );
          outputData = outputResult.outputData;
          outputRate = outputResult.outputRate;
          if (outputResult.supplementPlan) {
            const sourceSorter = outputResult.supplementPlan.sourceSorter;
            const newSorterRate = outputResult.supplementPlan.newSorterRate;
            let newSorter = this.createSupplementInputSorter(sourceSorter, newSorterRate);
            sorterBucket.input.unshift(
              modelFactory.createSorterOwnerRecord(
                newSorter.index,
                newSorterRate,
                sourceSorter.ownerObjIdx,
                sourceSorter.ownerName,
                sourceSorter.ownerOffset,
                sourceSorter.recipeID
              )
            );
            sorterBucket.input.pop();
          }
        } else {
          // 说明是终产物
          const finalOutput = layoutFactory.createFinalProductOutputRound(itemName, outputRate, itemMap);
          outputData = finalOutput.outputData;
          parameters = finalOutput.parameters;
          needSprayCoater = finalOutput.needSprayCoater;
        }

        let direction = layoutFactory.getConveyorDirection(item.fromBuildingNum); // 终产物/中间产物为+1，原料为-1
        // console.log(itemName, inputData, outputData, direction)
        this.newConveyor(conveyorBelt, direction, inputData, outputData, parameters, needSprayCoater);
      }
    }
  }

  generateBuildings() {
    for (let subRecipe of this.recipe.subRecipes) {
      if (subRecipe.building === null) {
        continue;
      }
      this.newProductionBuilding(subRecipe);
    }
  }

  generateConveyorBeltsForSprayCoater() {
    if (this.sprayCoaterOffsetList.length === 0) {
      return;
    }
    let conveyor = layoutFactory.selectSprayCoaterConveyor(
      this.itemSummary,
      this.recipe.proliferator,
      this.config.onlyConveyorBeltMk3,
      buildingMap.conveyorBeltMk1,
      buildingMap.conveyorBeltMK3
    );
    let firstSprayOffset = layoutFactory.findFirstSprayOffset(this.sprayCoaterOffsetList);
    // console.log(this.sprayCoaterOffsetList)
    // console.log(firstSprayOffset)

    let proliferatorParameters = {
      iconId: itemMap[this.recipe.proliferator].iconId,
    };

    if (this.config.selfSpray) {
      // 生成自喷涂结构
      let selfSprayConveyorStartOffset = {
        x: firstSprayOffset.x,
        y: firstSprayOffset.y,
        z: firstSprayOffset.z,
      };
      switch (this.lastProductionBuildingType) {
        case productionCategory.lab:
        case productionCategory.collider:
          selfSprayConveyorStartOffset.y += 2;
          break;
        case productionCategory.plant:
          selfSprayConveyorStartOffset.y += 1;
          break;
        default:
          break;
      }
      this.buildings.push(
        this.newSprayCoater(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 4,
            z: 0,
          },
          [0, 0]
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 6,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          proliferatorParameters
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 5,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 4,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 3,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 2,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 2,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 3,
            z: 0,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 4,
            z: 0.5,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 5,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 6,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 6,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX,
            y: selfSprayConveyorStartOffset.y + 6,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX,
            y: selfSprayConveyorStartOffset.y + 5,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX,
            y: selfSprayConveyorStartOffset.y + 4,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX,
            y: selfSprayConveyorStartOffset.y + 3,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 3,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 3,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 2,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 2,
            y: selfSprayConveyorStartOffset.y + 1,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      this.buildings.push(
        this.newConveyorNode(
          {
            x: this.conveyorStartOffsetX - 1,
            y: selfSprayConveyorStartOffset.y + 1,
            z: 1,
          },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
      );
      for (let i = 0; i < selfSprayConveyorStartOffset.x - this.conveyorStartOffsetX; i++) {
        this.buildings.push(
          this.newConveyorNode(
            {
              x: this.conveyorStartOffsetX + i,
              y: selfSprayConveyorStartOffset.y + 1,
              z: 1,
            },
            [0, 0],
            conveyor,
            this.buildingIndex + 2,
            1,
            null
          )
        );
      }
      for (let i = 0; i < selfSprayConveyorStartOffset.y - firstSprayOffset.y; i++) {
        this.buildings.push(
          this.newConveyorNode(
            {
              x: selfSprayConveyorStartOffset.x - 1,
              y: selfSprayConveyorStartOffset.y - i,
              z: 1,
            },
            [0, 0],
            conveyor,
            this.buildingIndex + 2,
            1,
            null
          )
        );
      }
      proliferatorParameters = null;
    }
    this.buildings.push(
      this.newConveyorNode(
        { x: firstSprayOffset.x - 1, y: firstSprayOffset.y, z: 1 },
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        proliferatorParameters
      )
    );
    this.buildings.push(
      this.newConveyorNode(
        { x: firstSprayOffset.x, y: firstSprayOffset.y, z: 1 },
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        null
      )
    );
    let doneNum = 1;
    let nowSpray = firstSprayOffset;
    let direction = 1;
    while (doneNum < this.sprayCoaterOffsetList.length) {
      for (let spray of this.sprayCoaterOffsetList) {
        if (spray.y === nowSpray.y) {
          if (direction === 1) {
            // x 轴正向
            if (spray.x > nowSpray.x) {
              for (let x = nowSpray.x + 1; x <= spray.x; x++) {
                // console.log({x: x, y: nowSpray.y, z: 1})
                this.buildings.push(
                  this.newConveyorNode({ x: x, y: nowSpray.y, z: 1 }, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
                );
              }
              nowSpray = spray;
              doneNum++;
            }
          } else {
            // x 轴负向
            if (spray.x < nowSpray.x) {
              for (let x = nowSpray.x - 1; x >= spray.x; x--) {
                // console.log({x: x, y: nowSpray.y, z: 1})
                this.buildings.push(
                  this.newConveyorNode({ x: x, y: nowSpray.y, z: 1 }, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
                );
              }
              nowSpray = spray;
              doneNum++;
            }
          }
        }
      }
      if (doneNum === this.sprayCoaterOffsetList.length) {
        break;
      }

      let findNext = false;
      this.sprayCoaterOffsetList.reverse();
      for (let delta = 2; !findNext; delta += 2) {
        if (delta > nowSpray.y) {
          cocoMessage.error("喷涂剂排线错误", 4000);
          throw `generate sprayCoater error`;
        }
        for (let spray of this.sprayCoaterOffsetList) {
          if (spray.y === nowSpray.y - delta) {
            let lastNodeOffset = nowSpray;
            if (direction === 1 && spray.x > nowSpray.x) {
              for (let x = nowSpray.x + 1; x <= spray.x; x++) {
                lastNodeOffset = { x: x, y: nowSpray.y, z: 1 };
                // console.log(lastNodeOffset)
                this.buildings.push(
                  this.newConveyorNode(lastNodeOffset, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
                );
              }
            } else if (direction === -1 && spray.x < nowSpray.x) {
              for (let x = nowSpray.x - 1; x >= spray.x; x--) {
                lastNodeOffset = { x: x, y: nowSpray.y, z: 1 };
                // console.log(lastNodeOffset)
                this.buildings.push(
                  this.newConveyorNode(lastNodeOffset, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
                );
              }
            }
            lastNodeOffset = {
              x: lastNodeOffset.x + direction,
              y: lastNodeOffset.y,
              z: 1,
            };
            this.buildings.push(
              this.newConveyorNode(lastNodeOffset, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
            );
            for (let i = 1; i <= delta; i++) {
              lastNodeOffset = { x: lastNodeOffset.x, y: nowSpray.y - i, z: 1 };
              this.buildings.push(
                this.newConveyorNode(lastNodeOffset, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
              );
            }
            lastNodeOffset = { x: lastNodeOffset.x, y: lastNodeOffset.y, z: 1 };
            if (direction === -1 && spray.x > lastNodeOffset.x + 1) {
              for (let x = lastNodeOffset.x + 1; x < spray.x; x++) {
                this.buildings.push(
                  this.newConveyorNode(
                    { x: x, y: lastNodeOffset.y, z: 1 },
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                );
              }
            } else if (direction === 1 && spray.x < lastNodeOffset.x - 1) {
              for (let x = lastNodeOffset.x - 1; x > spray.x; x--) {
                this.buildings.push(
                  this.newConveyorNode(
                    { x: x, y: lastNodeOffset.y, z: 1 },
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                );
              }
            }
            this.buildings.push(
              this.newConveyorNode({ x: spray.x, y: spray.y, z: 1 }, [0, 0], conveyor, this.buildingIndex + 2, 1, null)
            );
            doneNum++;
            nowSpray = spray;
            findNext = true;
            break;
          }
        }
      }
      // console.log(`next spray ${nowSpray}`)

      // console.log({x: nowSpray.x+direction, y: nowSpray.y, z: 1})
      direction = -direction;
      // break
    }
    this.buildings.push(
      this.newConveyorNode({ x: nowSpray.x + direction, y: nowSpray.y, z: 1 }, [0, 0], conveyor, -1, -1, null)
    );
  }

  toStr() {
    const serializer = _bpGlobal.DSQBlueprintSerializer;
    if (!serializer || typeof serializer.toStr !== "function") {
      throw new Error("Missing DSQBlueprintSerializer. Load Scripts/blueprint.serializer.js before blueprint.js.");
    }
    return serializer.toStr(this.blueprintTemplate);
  }
}
