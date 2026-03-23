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

  createProductionBuildingAtOffset(subRecipe, buildingDef, buildingArea, buildingOffset, acceleratorMode) {
    return modelFactory.createProductionBuilding(
      this.buildingIndex,
      { x: buildingOffset.x, y: buildingOffset.y, z: buildingOffset.z },
      buildingArea.yaw,
      buildingDef,
      subRecipe.recipeID,
      acceleratorMode
    );
  }

  createLabStackGroup(subRecipe, buildingDef, buildingOffset, newBuilding, acceleratorMode, currentIndex) {
    if (buildingDef.category !== productionCategory.lab) {
      return {
        stackLabBuildingIndexList: [],
        consumedCount: 0,
      };
    }

    modelFactory.configureLabBuilding(newBuilding);
    const stackResult = modelFactory.createStackedLabChain(
      () => this.getBuildingTemplate(),
      subRecipe.building.num,
      currentIndex,
      this.config.maxLabLayers,
      buildingOffset,
      newBuilding.yaw,
      buildingDef,
      buildingMap.lab.height,
      subRecipe.recipeID,
      acceleratorMode,
      newBuilding.index
    );
    for (const labBuilding of stackResult.stackedBuildings) {
      this.buildings.push(labBuilding);
    }
    return {
      stackLabBuildingIndexList: stackResult.stackedIndexes,
      consumedCount: stackResult.consumedCount,
    };
  }

  maybeCreateTeslaTower(buildingOffset, buildingCategory, needNewLine, teslaState) {
    if (!layoutFactory.shouldEvaluateTeslaTowerPlacement(this.config, this.buildingArray.length, needNewLine)) {
      return;
    }

    const teslaTowerOffset = this.calculateTeslaTowerOffset(buildingOffset, buildingCategory);
    teslaState.teslaTowerDistance += teslaTowerOffset.distance;
    const remainingX = this.blueprintSize.x - buildingOffset.x;
    if (
      !layoutFactory.shouldPlaceTeslaTowerForDistance(
        teslaState.hasTeslaTowerThisLine,
        teslaState.teslaTowerDistance,
        this.config.teslaTowerInterval,
        remainingX
      )
    ) {
      return;
    }

    const teslaTower = modelFactory.createSinglePointBuilding(
      this.getBuildingTemplate(),
      buildingMap.teslaTower,
      teslaTowerOffset.offset
    );
    teslaState.teslaTowerDistance = 0;
    teslaState.hasTeslaTowerThisLine = true;
    const currentRow = this.buildingArray[this.buildingArray.length - 1];
    if (currentRow) {
      currentRow.push({
        index: teslaTower.index,
        sorterList: [],
      });
    }
    this.buildings.push(teslaTower);
  }

  appendOutputSortersForProduction(subRecipe, ownerContext, productionContext, slotIndex, sorterList) {
    for (const outputItem of subRecipe.output) {
      const actualRate = layoutFactory.calculateOutputActualRate(
        outputItem.rate,
        productionContext.productionSpeed,
        productionContext.actualBuildingNum,
        productionContext.extraRate
      );
      const sortPlan = this.planProductionSorters(actualRate, slotIndex, false, ownerContext.buildingCategory);
      for (const planEntry of sortPlan.entries) {
        this.appendPlannedSorter(
          sortPlan.sorter,
          ownerContext.ownerOffset,
          ownerContext.buildingCategory,
          planEntry,
          {
            inputObjIdx: ownerContext.nowBuildingIndex,
            outputToSlot: -1,
            inputToSlot: 1,
            inputFromSlot: planEntry.slotIndex,
            filterId: itemMap[outputItem.name].iconId,
            parameters: { length: 1 },
          },
          outputItem.name,
          ownerContext.nowBuildingIndex,
          ownerContext.ownerName,
          ownerContext.recipeID,
          sorterList
        );
      }
      slotIndex = sortPlan.nextSlotIndex;
    }
    return slotIndex;
  }

  appendInputSortersForProduction(subRecipe, ownerContext, productionContext, slotIndex, sorterList) {
    for (const inputItem of subRecipe.input) {
      const actualRate = layoutFactory.calculateInputActualRate(
        inputItem.rate,
        productionContext.productionSpeed,
        productionContext.actualBuildingNum,
        productionContext.extraRate,
        subRecipe.acceleratorMode
      );
      const sortPlan = this.planProductionSorters(actualRate, slotIndex, true, ownerContext.buildingCategory);
      for (const planEntry of sortPlan.entries) {
        const sorterOptions = {
          outputToSlot: planEntry.slotIndex,
          inputToSlot: 1,
          filterId: itemMap[inputItem.name].iconId,
          parameters: { length: 1 },
        };
        if (planEntry.linkMode === "input_extra") {
          sorterOptions.inputObjIdx = ownerContext.nowBuildingIndex;
        } else {
          sorterOptions.outputObjIdx = ownerContext.nowBuildingIndex;
        }
        this.appendPlannedSorter(
          sortPlan.sorter,
          ownerContext.ownerOffset,
          ownerContext.buildingCategory,
          planEntry,
          sorterOptions,
          inputItem.name,
          ownerContext.nowBuildingIndex,
          ownerContext.ownerName,
          ownerContext.recipeID,
          sorterList
        );
      }
      slotIndex = sortPlan.nextSlotIndex;
    }
    return slotIndex;
  }

  appendProductionBuildingGroup(needNewLine, nowBuildingIndex, sorterList, stackLabBuildingIndexList) {
    const currentEntry = {
      index: nowBuildingIndex,
      sorterList,
    };
    if (needNewLine || this.buildingArray.length === 0) {
      this.buildingArray.push([currentEntry]);
    } else {
      this.buildingArray[this.buildingArray.length - 1].push(currentEntry);
    }

    const currentRow = this.buildingArray[this.buildingArray.length - 1];
    for (const labIndex of stackLabBuildingIndexList) {
      currentRow.push({
        index: labIndex,
        sorterList: [],
      });
    }
  }

  newProductionBuilding(subRecipe) {
    const buildingDef = buildingMap[subRecipe.building.name];
    this.lastProductionBuildingType = buildingDef.category;
    const teslaState = {
      hasTeslaTowerThisLine: false,
      teslaTowerDistance: 0,
    };

    for (let i = 0; i < subRecipe.building.num; i++) {
      this.buildingIndex++;
      const buildingArea = this.calculateBuildingArea(subRecipe);
      const placement = this.calculateProductionBuildingPlacement(buildingArea);
      const needNewLine = placement.needNewLine;
      const buildingOffset = placement.offset;
      if (needNewLine) {
        teslaState.hasTeslaTowerThisLine = false;
        teslaState.teslaTowerDistance = 0;
      }

      const acceleratorMode = layoutFactory.resolveAcceleratorMode(subRecipe.acceleratorMode);
      const newBuilding = this.createProductionBuildingAtOffset(
        subRecipe,
        buildingDef,
        buildingArea,
        buildingOffset,
        acceleratorMode
      );
      this.buildings.push(newBuilding);

      const stackResult = this.createLabStackGroup(
        subRecipe,
        buildingDef,
        buildingOffset,
        newBuilding,
        acceleratorMode,
        i
      );
      i += stackResult.consumedCount;
      const nowBuildingIndex = newBuilding.index;
      this.maybeCreateTeslaTower(buildingOffset, buildingDef.category, needNewLine, teslaState);

      // 添加分拣器
      let slotIndex = buildingDef.slotMaxIndex;
      const productionContext = layoutFactory.calculateProductionContext(
        subRecipe.building.num,
        i,
        buildingDef.category === productionCategory.lab ? stackResult.stackLabBuildingIndexList.length : 0,
        buildingDef.productionSpeed,
        this.recipe.proliferator,
        subRecipe.acceleratorMode,
        itemMap
      );
      const sorterList = [];
      const ownerContext = {
        nowBuildingIndex,
        ownerOffset: { x: buildingOffset.x, y: buildingOffset.y, z: buildingOffset.z },
        ownerName: subRecipe.building.name,
        recipeID: subRecipe.recipeID,
        buildingCategory: buildingDef.category,
      };
      slotIndex = this.appendOutputSortersForProduction(
        subRecipe,
        ownerContext,
        productionContext,
        slotIndex,
        sorterList
      );
      this.appendInputSortersForProduction(subRecipe, ownerContext, productionContext, slotIndex, sorterList);
      this.appendProductionBuildingGroup(
        needNewLine,
        nowBuildingIndex,
        sorterList,
        stackResult.stackLabBuildingIndexList
      );
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
    const cloneExecutionPlan = layoutFactory.buildCloneStackExecutionPlan(
      baseBuildings,
      buildingMap,
      stackLayers,
      zStep,
      this.buildingIndex + stackLayers + 1
    );

    // --- 2. 生成地基（每层独立地基）---
    for (const foundationZ of cloneExecutionPlan.foundationZOffsets) {
      const foundationBuilding = modelFactory.createFoundationBuilding(this.getBuildingTemplate(), foundationZ);
      this.buildings.push(foundationBuilding);
    }

    // --- 4. 逐层克隆 ---
    for (const clonePlan of cloneExecutionPlan.clonePlans) {
      const clone = modelFactory.cloneBuildingForLayer(
        this.getBuildingTemplate(),
        clonePlan.base,
        clonePlan.zOffset,
        clonePlan.outputObjIdx,
        clonePlan.inputObjIdx
      );
      this.buildings.push(clone);
    }

    // 修复：添加克隆后验证机制，检查传送带节点负载
    this.validateBeltLoad();
  }

  validateBeltLoad() {
    const warnings = layoutFactory.validateBeltLoad(this.buildings, this.config.maxSorterNumOneBelt);

    if (warnings.length > 0) {
      console.warn(`[蓝图验证] 发现${warnings.length}个传送带超载问题:`);
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    return warnings;
  }

  sortItemSummary(itemSummary) {
    return layoutFactory.sortItemSummary(itemSummary);
  }

  buildConveyorItemSummary() {
    let itemSummary = layoutFactory.buildConveyorItemSummary(
      this.recipe.subRecipes,
      this.recipe.proliferator,
      this.config.maxLabLayers,
      itemMap,
      buildingMap,
      productionCategory
    );
    itemSummary = this.sortItemSummary(itemSummary);
    this.itemSummary = itemSummary;
    return itemSummary;
  }

  prepareConveyorRoutingSpace() {
    this.conveyorStartOffsetX = this.occupiedArea[this.occupiedArea.length - 1].x2;
    this.occupiedArea[this.occupiedArea.length - 1].x2++; // x轴方向空一格用于喷涂剂走线
    this.occupiedArea[this.occupiedArea.length - 2].y2++; // y轴方向空一格避免喷涂机和建筑碰撞
  }

  applyConveyorSupplementPlan(roundPlan, sorterBucket) {
    if (!roundPlan.supplementPlan) {
      return;
    }
    const sourceSorter = roundPlan.supplementPlan.sourceSorter;
    const newSorterRate = roundPlan.supplementPlan.newSorterRate;
    const newSorter = this.createSupplementInputSorter(sourceSorter, newSorterRate);
    const supplementRecord = modelFactory.createSupplementSorterOwnerRecord(
      newSorter.index,
      newSorterRate,
      sourceSorter
    );
    layoutFactory.applySupplementSorterToInputBucket(sorterBucket.input, supplementRecord);
  }

  executeConveyorRound(item, conveyorBelt, roundPlan) {
    const direction = layoutFactory.getConveyorDirection(item.fromBuildingNum); // 终产物/中间产物为+1，原料为-1
    this.newConveyor(
      conveyorBelt,
      direction,
      roundPlan.inputData,
      roundPlan.outputData,
      roundPlan.parameters,
      roundPlan.needSprayCoater
    );
  }

  processConveyorItem(itemName, item, stackLayers, sortersPerNode, zero) {
    const conveyorBelt = layoutFactory.selectConveyorForRate(
      item.rate,
      this.config.onlyConveyorBeltMk3,
      this.config.upgradeConveyorBelt,
      buildingMap.conveyorBeltMk1,
      buildingMap.conveyorBeltMK3
    );
    const maxTransportSpeed = layoutFactory.calculateMaxTransportSpeed(
      item.fromBuildingNum,
      buildingMap.conveyorBeltMK3.transportSpeed,
      this.config.conveyorBeltStackLayer
    );
    const sorterBucket = this.sorters[itemName];

    for (let totalDoneRate = 0; item.rate - totalDoneRate > zero; ) {
      const roundPlan = layoutFactory.planConveyorRound(
        itemName,
        item,
        totalDoneRate,
        maxTransportSpeed,
        sorterBucket,
        stackLayers,
        sortersPerNode,
        zero,
        itemMap
      );
      if (roundPlan.abortReason === "missing_sorters") {
        console.warn(`[蓝图警告] 物品 ${itemName} 没有对应的分拣器数据`);
        break;
      }
      if (roundPlan.abortReason) {
        break;
      }
      totalDoneRate = roundPlan.nextTotalDoneRate;
      this.applyConveyorSupplementPlan(roundPlan, sorterBucket);
      this.executeConveyorRound(item, conveyorBelt, roundPlan);
    }
  }

  generateConveyorBelts() {
    const itemSummary = this.buildConveyorItemSummary();

    // 堆叠模式：设备垂直堆叠，传送带只在一层
    // 每层设备数量 = 普通模式/stackLayers，总设备数量 ≈ 普通模式
    // 传送带需要支撑的产能和普通模式一样，所以rate不需要放大
    const stackLayers = this.config.stackLayers || 1;

    this.prepareConveyorRoutingSpace();
    // 生成传送带并连接到分拣器
    const zero = 0.0000000001; // rate是每秒生产量，除不尽时会有精度误差，小数点后16位都是准确的，取0.0000000001为判断标准足够了。
    // 堆叠模式：z=0 层每个传送带节点的分拣器在 cloneToStackLayers 后被克隆 stackLayers 倍
    // 为保证克隆后每节点不超过 maxSorterNumOneBelt，z=0 层每节点只分配 floor(max/stackLayers) 个
    // 例：stackLayers=4, max=8 → z=0 每节点 2 个分拣器 → 克隆后 2×4=8 ≤ 8
    // 修复：确保sortersPerNode至少为2，这样克隆后每个节点可以连接8个分拣器（2×4）
    // 满足普通模式下所有节点的需求（普通模式有节点需要连接8个分拣器）
    const sortersPerNode = layoutFactory.calculateSortersPerNode(this.config.maxSorterNumOneBelt, stackLayers);
    for (const [itemName, item] of Object.entries(itemSummary)) {
      this.processConveyorItem(itemName, item, stackLayers, sortersPerNode, zero);
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
    const sprayExecutionPlan = layoutFactory.planSprayCoaterConveyorExecution(
      this.sprayCoaterOffsetList,
      firstSprayOffset,
      this.config.selfSpray,
      this.conveyorStartOffsetX,
      this.lastProductionBuildingType,
      productionCategory
    );

    const sprayMainLineError = layoutFactory.resolveSprayCoaterMainLineError(sprayExecutionPlan.mainLinePlan.error);
    if (sprayMainLineError) {
      cocoMessage.error(sprayMainLineError.message, sprayMainLineError.duration);
      throw sprayMainLineError.throwReason;
    }

    const sprayActionPlan = layoutFactory.buildSprayConveyorActionPlan(sprayExecutionPlan, proliferatorParameters);
    for (const action of sprayActionPlan) {
      if (action.type === "sprayCoater") {
        this.buildings.push(this.newSprayCoater(action.offset, action.yaw));
        continue;
      }
      const outputObjIdx = layoutFactory.resolveSprayNodeOutputObjIdx(action, this.buildingIndex);
      this.buildings.push(
        this.newConveyorNode(action.offset, action.yaw, conveyor, outputObjIdx, action.outputToSlot, action.parameters)
      );
    }
  }

  toStr() {
    const serializer = _bpGlobal.DSQBlueprintSerializer;
    if (!serializer || typeof serializer.toStr !== "function") {
      throw new Error("Missing DSQBlueprintSerializer. Load Scripts/blueprint.serializer.js before blueprint.js.");
    }
    return serializer.toStr(this.blueprintTemplate);
  }
}
