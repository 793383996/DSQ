const _bpGlobal = typeof globalThis !== "undefined" ? globalThis : window;
const { itemMap, productionCategory, buildingType, buildingMap, recipeMap } = _bpGlobal.DSQBlueprintConstants || {};

if (!_bpGlobal.DSQBlueprintConstants) {
  throw new Error("Missing DSQBlueprintConstants. Load Scripts/blueprint.constants.js before blueprint.js.");
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
    this.blueprintTemplate = {
      header: {
        layout: 10,
        icons: iconId,
        time: new Date(),
        gameVersion: "0.9.26.13026",
        shortDesc: title,
        desc: "",
      },
      version: 1,
      cursorOffset: { x: 0, y: 0 },
      cursorTargetArea: 0,
      dragBoxSize: { x: 1, y: 1 },
      primaryAreaIdx: 0,
      areas: [
        {
          index: 0,
          parentIndex: -1,
          tropicAnchor: 0,
          areaSegments: 200,
          anchorLocalOffset: { x: 0, y: 0 },
          size: { x: 1, y: 1 },
          // size: this.blueprintSize
        },
      ],
      buildings: [],
    };
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
    return {
      index: this.buildingIndex,
      areaIndex: 0,
      localOffset: null,
      yaw: [0, 0],
      itemId: 0,
      modelIndex: 0,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 0,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 0,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: null,
    };
  }

  newSprayCoater(offset, yaw) {
    // 在offset位置生成一个喷涂机， direction<0 表示沿y轴负方向，否则为y轴正方向
    let sc = this.getBuildingTemplate();
    sc.localOffset = [offset, offset];
    sc.yaw = yaw;
    sc.itemId = buildingMap.sprayCoater.itemId;
    sc.modelIndex = buildingMap.sprayCoater.modelIndex;
    sc.outputToSlot = 14;
    sc.inputFromSlot = 15;
    sc.outputFromSlot = 15;
    sc.inputToSlot = 14;
    return sc;
  }

  newConveyorNode(offset, yaw, conveyor, outputObjIdx, outputToSlot, parameters) {
    return {
      index: ++this.buildingIndex,
      areaIndex: 0,
      localOffset: [offset, offset],
      yaw: yaw,
      itemId: conveyor.itemId,
      modelIndex: conveyor.modelIndex,
      outputObjIdx: outputObjIdx,
      inputObjIdx: -1,
      outputToSlot: outputToSlot,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 1,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: parameters,
    };
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
    // rotate = 0 表示分拣器出货， 1 表示进货
    let data = {
      offset: [],
      yaw: [],
    };
    if (type === productionCategory.smelter || type === productionCategory.assembling) {
      switch (slotIndex) {
        case 8:
          data.offset = [
            { x: buildingOffset.x - 0.9, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x - 0.9, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 7:
          data.offset = [
            { x: buildingOffset.x, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 6:
          data.offset = [
            { x: buildingOffset.x + 0.9, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x + 0.9, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 5:
          data.offset = [
            { x: buildingOffset.x + 1, y: buildingOffset.y - 0.8, z: 0 },
            { x: buildingOffset.x + 2, y: buildingOffset.y - 0.8, z: 0 },
          ];
          data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360];
          break;
        case 4:
          data.offset = [
            { x: buildingOffset.x + 1, y: buildingOffset.y, z: 0 },
            { x: buildingOffset.x + 2, y: buildingOffset.y, z: 0 },
          ];
          data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360];
          break;
        case 3:
          data.offset = [
            { x: buildingOffset.x + 1, y: buildingOffset.y + 0.8, z: 0 },
            { x: buildingOffset.x + 2, y: buildingOffset.y + 0.8, z: 0 },
          ];
          data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360];
          break;
        default:
          throw `calculateSorterLocalOffset error: unsupported slotIndex < 3 for smelter or assembling - ${slotIndex}`;
      }
    } else if (type === productionCategory.plant) {
      switch (slotIndex) {
        case 6:
          // data.offset = [{x: buildingOffset.x-1, y: buildingOffset.y-1, z: 0}, {x: buildingOffset.x-1, y: buildingOffset.y-2, z: 0}]
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 5:
          data.offset = [
            { x: buildingOffset.x, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 4:
          // data.offset = [{x: buildingOffset.x+1, y: buildingOffset.y-1, z: 0}, {x: buildingOffset.x+1, y: buildingOffset.y-2, z: 0}]
          data.offset = [
            { x: buildingOffset.x + 0.8, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x + 0.8, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 3:
          // data.offset = [{x: buildingOffset.x+2, y: buildingOffset.y-1, z: 0}, {x: buildingOffset.x+2, y: buildingOffset.y-2, z: 0}]
          data.offset = [
            { x: buildingOffset.x + 1.6, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x + 1.6, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360];
          break;
        case 2:
          data.offset = [
            { x: buildingOffset.x + 0.8, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x + 0.8, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 1:
          data.offset = [
            { x: buildingOffset.x, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 0:
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        default:
          throw `unsupported: plant slot < 0`;
      }
    } else if (type === productionCategory.refinery) {
      switch (slotIndex) {
        case 8:
          data.offset = [
            { x: buildingOffset.x - 3, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x - 4, y: buildingOffset.y - 1, z: 0 },
          ];
          data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360];
          break;
        case 7:
          data.offset = [
            { x: buildingOffset.x - 3, y: buildingOffset.y, z: 0 },
            { x: buildingOffset.x - 4, y: buildingOffset.y, z: 0 },
          ];
          data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360];
          break;
        case 6:
          data.offset = [
            { x: buildingOffset.x - 3, y: buildingOffset.y + 1, z: 0 },
            { x: buildingOffset.x - 4, y: buildingOffset.y + 1, z: 0 },
          ];
          data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360];
          break;
        case 5:
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 1, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 2, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 4:
          data.offset = [
            { x: buildingOffset.x, y: buildingOffset.y + 1, z: 0 },
            { x: buildingOffset.x, y: buildingOffset.y + 2, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 3:
          data.offset = [
            { x: buildingOffset.x + 0.8, y: buildingOffset.y + 1, z: 0 },
            { x: buildingOffset.x + 0.8, y: buildingOffset.y + 2, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 2:
          data.offset = [
            { x: buildingOffset.x + 0.8, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x + 0.8, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 1:
          data.offset = [
            { x: buildingOffset.x, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 0:
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 2, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        default:
          throw `unsupported: refinery slot < 0`;
      }
    } else if (type === productionCategory.collider) {
      switch (slotIndex) {
        case 8:
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 2, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y - 3, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 7:
          data.offset = [
            { x: buildingOffset.x - 1.6, y: buildingOffset.y - 2, z: 0 },
            { x: buildingOffset.x - 1.6, y: buildingOffset.y - 3, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 6:
          data.offset = [
            { x: buildingOffset.x - 2.4, y: buildingOffset.y - 2, z: 0 },
            { x: buildingOffset.x - 2.4, y: buildingOffset.y - 3, z: 0 },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 5:
          data.offset = [
            { x: buildingOffset.x - 4, y: buildingOffset.y - 1, z: 0 },
            { x: buildingOffset.x - 5, y: buildingOffset.y - 1, z: 0 },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 270) % 360)];
          break;
        case 4:
          data.offset = [
            { x: buildingOffset.x - 4, y: buildingOffset.y, z: 0 },
            { x: buildingOffset.x - 5, y: buildingOffset.y, z: 0 },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 270) % 360)];
          break;
        case 3:
          data.offset = [
            { x: buildingOffset.x - 4, y: buildingOffset.y + 1, z: 0 },
            { x: buildingOffset.x - 5, y: buildingOffset.y + 1, z: 0 },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 270) % 360)];
          break;
        case 2:
          data.offset = [
            { x: buildingOffset.x - 2.4, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x - 2.4, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 1:
          data.offset = [
            { x: buildingOffset.x - 1.6, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x - 1.6, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        case 0:
          data.offset = [
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 2, z: 0 },
            { x: buildingOffset.x - 0.8, y: buildingOffset.y + 3, z: 0 },
          ];
          data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360];
          break;
        default:
          throw `unsupported: collider slot < 0`;
      }
    } else if (type === productionCategory.lab) {
      switch (slotIndex) {
        case 11:
          data.offset = [
            {
              x: buildingOffset.x + 2,
              y: buildingOffset.y + 0.8,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x + 3,
              y: buildingOffset.y + 0.8,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [90 + ((rotate * 180) % 360), 90 + ((rotate * 180) % 360)];
          break;
        case 10:
          data.offset = [
            {
              x: buildingOffset.x + 2,
              y: buildingOffset.y,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x + 3,
              y: buildingOffset.y,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [90 + ((rotate * 180) % 360), 90 + ((rotate * 180) % 360)];
          break;
        case 9:
          data.offset = [
            {
              x: buildingOffset.x + 2,
              y: buildingOffset.y - 0.8,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x + 3,
              y: buildingOffset.y - 0.8,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [90 + ((rotate * 180) % 360), 90 + ((rotate * 180) % 360)];
          break;
        case 8:
          data.offset = [
            {
              x: buildingOffset.x + 0.8,
              y: buildingOffset.y - 2,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x + 0.8,
              y: buildingOffset.y - 3,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 7:
          data.offset = [
            {
              x: buildingOffset.x,
              y: buildingOffset.y - 2,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x,
              y: buildingOffset.y - 3,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 6:
          data.offset = [
            {
              x: buildingOffset.x - 0.8,
              y: buildingOffset.y - 2,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x - 0.8,
              y: buildingOffset.y - 3,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [180 + ((rotate * 180) % 360), 180 + ((rotate * 180) % 360)];
          break;
        case 5:
          data.offset = [
            {
              x: buildingOffset.x - 2,
              y: buildingOffset.y - 0.8,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x - 3,
              y: buildingOffset.y - 0.8,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 180) % 360)];
          break;
        case 4:
          data.offset = [
            {
              x: buildingOffset.x - 2,
              y: buildingOffset.y,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x - 3,
              y: buildingOffset.y,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 180) % 360)];
          break;
        case 3:
          data.offset = [
            {
              x: buildingOffset.x - 2,
              y: buildingOffset.y + 0.8,
              z: buildingOffset.z,
            },
            {
              x: buildingOffset.x - 3,
              y: buildingOffset.y + 0.8,
              z: buildingOffset.z,
            },
          ];
          data.yaw = [270 + ((rotate * 180) % 360), 270 + ((rotate * 180) % 360)];
          break;
        default:
          throw `unsupported: lab slot < 3`;
      }
    } else {
      throw `calculateSorterLocalOffset error: unsupported production category - ${type}`;
    }
    if (rotate === 1) {
      data.offset.reverse();
    }
    return data;
  }

  calculateTeslaTowerOffset(buildingOffset, category) {
    let offset = {};
    let distance = 0;
    switch (category) {
      case productionCategory.smelter:
        offset = { x: buildingOffset.x - 1, y: buildingOffset.y - 2, z: 0 };
        distance = 3;
        break;
      case productionCategory.assembling:
        offset = { x: buildingOffset.x + 2, y: buildingOffset.y - 2, z: 0 };
        distance = 3;
        break;
      case productionCategory.plant:
        offset = { x: buildingOffset.x + 3, y: buildingOffset.y - 2, z: 0 };
        distance = 7;
        break;
      case productionCategory.refinery:
        offset = { x: buildingOffset.x - 3, y: buildingOffset.y - 2, z: 0 };
        distance = 7;
        break;
      case productionCategory.collider:
        offset = { x: buildingOffset.x + 1, y: buildingOffset.y - 3, z: 0 };
        distance = 10;
        break;
      case productionCategory.lab:
        offset = { x: buildingOffset.x + 3, y: buildingOffset.y - 3, z: 0 };
        distance = 6;
        break;
      default:
        cocoMessage.error("未知的建筑类型", 4000);
        throw `unknown building category: ${category}`;
    }
    return {
      offset: offset,
      distance: distance,
    };
  }

  newProductionBuilding(subRecipe) {
    let hasTeslaTowerThisLine = false;
    let teslaTowerDistance = 0;
    for (let i = 0; i < subRecipe.building.num; i++) {
      this.buildingIndex++;
      this.lastProductionBuildingType = buildingMap[subRecipe.building.name].category;
      let buildingArea, buildingX, buildingY, buildingZ;
      buildingArea = this.calculateBuildingArea(subRecipe);
      // }
      let needNewLine = false;
      // console.log(this.occupiedArea)
      // console.log(this.blueprintSize)
      if (this.blueprintSize.x - this.occupiedArea[this.occupiedArea.length - 1].x2 >= buildingArea.x / 2) {
        // 在当前行继续添加
        // this.buildingArray[this.buildingArray.length-1].push({index: this.buildingIndex, sorterList: sorterList})
        buildingX = this.occupiedArea[this.occupiedArea.length - 1].x2 + 1 + buildingArea.centerPoint[3];
        buildingY = this.occupiedArea[this.occupiedArea.length - 2].y2 + 1 + buildingArea.centerPoint[0];
        buildingZ = 0;
        this.occupiedArea[this.occupiedArea.length - 1].x2 += buildingArea.x;
        if (buildingY + buildingArea.centerPoint[2] > this.occupiedArea[this.occupiedArea.length - 1].y2) {
          // 当一行中出现更宽（y轴方向为宽度）的建筑时，占地区域的y2需要更新
          this.occupiedArea[this.occupiedArea.length - 1].y2 = buildingY + buildingArea.centerPoint[2];
        }
      } else {
        // 新的一行
        needNewLine = true;
        hasTeslaTowerThisLine = false;
        teslaTowerDistance = 0;
        // this.buildingArray.push([{index: this.buildingIndex, sorterList: sorterList}])
        buildingX = buildingArea.centerPoint[3];
        buildingY = buildingArea.centerPoint[0] + this.occupiedArea[this.occupiedArea.length - 1].y2 + 1;
        buildingZ = 0;
        this.occupiedArea.push({
          x1: 0,
          y1: buildingY - buildingArea.centerPoint[0],
          x2: buildingX + buildingArea.centerPoint[1],
          y2: buildingY + buildingArea.centerPoint[2],
        });
      }
      let acceleratorMode = 0;
      if (subRecipe.acceleratorMode === 1) {
        acceleratorMode = 1;
      }
      let newBuilding = {
        index: this.buildingIndex,
        areaIndex: 0,
        localOffset: [
          {
            x: buildingX,
            y: buildingY,
            z: buildingZ,
          },
          {
            x: buildingX,
            y: buildingY,
            z: buildingZ,
          },
        ],
        yaw: buildingArea.yaw,
        itemId: buildingMap[subRecipe.building.name].itemId,
        modelIndex: buildingMap[subRecipe.building.name].modelIndex,
        outputObjIdx: -1,
        inputObjIdx: -1,
        outputToSlot: 0,
        inputFromSlot: 0,
        outputFromSlot: 0,
        inputToSlot: 0,
        outputOffset: 0,
        inputOffset: 0,
        recipeId: parseInt(subRecipe.recipeID),
        filterId: 0,
        parameters: {
          acceleratorMode: acceleratorMode,
        },
      };

      let stackLabBuildingIndexList = [];
      let layers = 1;
      if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
        // 堆叠处理研究站
        newBuilding.outputToSlot = 14;
        newBuilding.inputFromSlot = 15;
        newBuilding.outputFromSlot = 15;
        newBuilding.inputToSlot = 14;
        newBuilding.parameters.researchMode = 1;
        this.buildings.push(newBuilding);
        for (i++; i < subRecipe.building.num && layers < this.config.maxLabLayers; i++, layers++) {
          let labBuilding = this.getBuildingTemplate();
          labBuilding.localOffset = [
            { x: buildingX, y: buildingY, z: buildingZ },
            { x: buildingX, y: buildingY, z: buildingZ },
          ];
          labBuilding.localOffset[0].z = buildingMap.lab.height * layers;
          labBuilding.localOffset[1].z = buildingMap.lab.height * layers;
          labBuilding.yaw = newBuilding.yaw;
          labBuilding.itemId = buildingMap[subRecipe.building.name].itemId;
          labBuilding.modelIndex = buildingMap[subRecipe.building.name].modelIndex;
          labBuilding.recipeId = parseInt(subRecipe.recipeID);
          labBuilding.inputObjIdx = this.buildingIndex - 1;
          labBuilding.outputToSlot = 14;
          labBuilding.inputFromSlot = 15;
          labBuilding.outputFromSlot = 15;
          labBuilding.inputToSlot = 14;
          labBuilding.parameters = {
            acceleratorMode: acceleratorMode,
            researchMode: 1,
          };
          this.buildings.push(labBuilding);
          stackLabBuildingIndexList.push(this.buildingIndex);
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
            let teslaTower = this.getBuildingTemplate();
            teslaTower.itemId = buildingMap.teslaTower.itemId;
            teslaTower.modelIndex = buildingMap.teslaTower.modelIndex;
            teslaTower.localOffset = [teslaTowerOffset.offset, teslaTowerOffset.offset];
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
      let productionSpeed = buildingMap[subRecipe.building.name].productionSpeed;
      let sorterList = [];
      let actual_building_num = Math.min(1, subRecipe.building.num - i); // 建筑不是整数的时候，最后一个建筑分拣器实际rate会更低
      if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
        actual_building_num += stackLabBuildingIndexList.length;
      }

      let extra_rate = 1;
      if (this.recipe.proliferator) {
        if (subRecipe.acceleratorMode === 0) {
          extra_rate += itemMap[this.recipe.proliferator].extra_rate;
        } else if (subRecipe.acceleratorMode === 1) {
          extra_rate += itemMap[this.recipe.proliferator].accelerate;
        }
      }

      for (let outputItem of subRecipe.output) {
        let actual_rate = outputItem.rate * productionSpeed * actual_building_num * extra_rate;
        let sorter = buildingMap.sorterMk1;
        if (this.config.useSorterMk4 || this.config.onlySorterMk3 || actual_rate > sorter.sortingSpeed) {
          // 一级分拣器不够用时升级，useSorterMk4时使用四级集装分拣器，否则使用三级
          sorter = this.config.useSorterMk4 ? buildingMap.sorterMk4 : buildingMap.sorterMk3;
        }
        if (
          buildingMap[subRecipe.building.name].category === productionCategory.lab &&
          actual_rate > sorter.sortingSpeed
        ) {
          // 研究站层数过高时会出现一个分拣器无法满足运力的问题，追加额外分拣器
          let newSorter2 = this.getBuildingTemplate();
          newSorter2.itemId = sorter.itemId;
          newSorter2.modelIndex = sorter.modelIndex;
          newSorter2.inputObjIdx = nowBuildingIndex;
          newSorter2.outputToSlot = -1;
          newSorter2.inputToSlot = 1;
          newSorter2.inputFromSlot = slotIndex - 3;
          newSorter2.filterId = itemMap[outputItem.name].iconId;
          newSorter2.parameters = { length: 1 };
          const offsetInfo2 = this.calculateSorterLocalOffsetAndYaw(
            { x: buildingX, y: buildingY, z: buildingZ },
            buildingMap[subRecipe.building.name].category,
            slotIndex - 3
          );
          newSorter2.localOffset = offsetInfo2.offset;
          newSorter2.yaw = offsetInfo2.yaw;
          this.buildings.push(newSorter2);
          sorterList.push(this.buildingIndex);
          if (this.sorters[outputItem.name]) {
            // 已存在就append
            if (this.sorters[outputItem.name].output) {
              this.sorters[outputItem.name].output.push({
                index: newSorter2.index,
                rate: sorter.sortingSpeed,
                ownerObjIdx: nowBuildingIndex, // 分拣器附属生产建筑的index
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              });
            } else {
              this.sorters[outputItem.name].output = [
                {
                  index: newSorter2.index,
                  rate: sorter.sortingSpeed,
                  ownerObjIdx: nowBuildingIndex,
                  ownerName: subRecipe.building.name,
                  ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                  recipeID: parseInt(subRecipe.recipeID),
                },
              ];
            }
          } else {
            // 不存在就新建
            this.sorters[outputItem.name] = {
              output: [
                {
                  index: newSorter2.index,
                  rate: sorter.sortingSpeed,
                  ownerObjIdx: nowBuildingIndex,
                  ownerName: subRecipe.building.name,
                  ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                  recipeID: parseInt(subRecipe.recipeID),
                },
              ],
            };
          }
          actual_rate -= sorter.sortingSpeed;
        }
        let newSorter = this.getBuildingTemplate();
        newSorter.itemId = sorter.itemId;
        newSorter.modelIndex = sorter.modelIndex;
        newSorter.inputObjIdx = nowBuildingIndex;
        newSorter.outputToSlot = -1;
        newSorter.inputToSlot = 1;
        newSorter.inputFromSlot = slotIndex;
        newSorter.filterId = itemMap[outputItem.name].iconId;
        newSorter.parameters = { length: 1 };
        const offsetInfo = this.calculateSorterLocalOffsetAndYaw(
          { x: buildingX, y: buildingY, z: buildingZ },
          buildingMap[subRecipe.building.name].category,
          slotIndex
        );
        newSorter.localOffset = offsetInfo.offset;
        newSorter.yaw = offsetInfo.yaw;
        this.buildings.push(newSorter);
        sorterList.push(this.buildingIndex);
        // this.buildingArray[this.buildingArray.length-1].push({index: this.buildingIndex, type: buildingType.sorter})
        if (this.sorters[outputItem.name]) {
          // 已存在就append
          if (this.sorters[outputItem.name].output) {
            this.sorters[outputItem.name].output.push({
              index: newSorter.index,
              rate: actual_rate,
              ownerObjIdx: nowBuildingIndex, // 分拣器附属生产建筑的index
              ownerName: subRecipe.building.name,
              ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
              recipeID: parseInt(subRecipe.recipeID),
            });
          } else {
            this.sorters[outputItem.name].output = [
              {
                index: newSorter.index,
                rate: actual_rate,
                ownerObjIdx: nowBuildingIndex,
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              },
            ];
          }
        } else {
          // 不存在就新建
          this.sorters[outputItem.name] = {
            output: [
              {
                index: newSorter.index,
                rate: actual_rate,
                ownerObjIdx: nowBuildingIndex,
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              },
            ],
          };
        }
        slotIndex--;
        if (!this.config.compactLayout) {
          // 非紧凑布局，调整对撞机的分拣器连接点
          if (buildingMap[subRecipe.building.name].category === productionCategory.collider && slotIndex === 5) {
            slotIndex = 2;
          }
        }
      }
      for (let inputItem of subRecipe.input) {
        let actual_rate = inputItem.rate * productionSpeed * actual_building_num;
        if (subRecipe.acceleratorMode === 1) {
          // 加速时原料也要加速；增产时则不需要
          actual_rate *= extra_rate;
        }
        let sorter = buildingMap.sorterMk1;
        if (this.config.useSorterMk4 || this.config.onlySorterMk3 || actual_rate > sorter.sortingSpeed) {
          // 一级分拣器不够用时升级，useSorterMk4时使用四级集装分拣器，否则使用三级
          sorter = this.config.useSorterMk4 ? buildingMap.sorterMk4 : buildingMap.sorterMk3;
        }

        if (
          buildingMap[subRecipe.building.name].category === productionCategory.lab &&
          actual_rate > sorter.sortingSpeed
        ) {
          // 研究站层数过高时会出现一个分拣器无法满足运力的问题，追加额外分拣器
          let newSorter2 = this.getBuildingTemplate();
          newSorter2.itemId = sorter.itemId;
          newSorter2.modelIndex = sorter.modelIndex;
          newSorter2.inputObjIdx = nowBuildingIndex;
          newSorter2.outputToSlot = slotIndex - 3;
          newSorter2.inputToSlot = 1;
          newSorter2.filterId = itemMap[inputItem.name].iconId;
          newSorter2.parameters = { length: 1 };
          const offsetInfo2 = this.calculateSorterLocalOffsetAndYaw(
            { x: buildingX, y: buildingY, z: buildingZ },
            buildingMap[subRecipe.building.name].category,
            slotIndex - 3,
            1
          );
          newSorter2.localOffset = offsetInfo2.offset;
          newSorter2.yaw = offsetInfo2.yaw;
          this.buildings.push(newSorter2);
          sorterList.push(this.buildingIndex);
          if (this.sorters[inputItem.name]) {
            // 已存在就append
            if (this.sorters[inputItem.name].output) {
              this.sorters[inputItem.name].output.push({
                index: newSorter2.index,
                rate: sorter.sortingSpeed,
                ownerObjIdx: nowBuildingIndex, // 分拣器附属生产建筑的index
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              });
            } else {
              this.sorters[inputItem.name].output = [
                {
                  index: newSorter2.index,
                  rate: sorter.sortingSpeed,
                  ownerObjIdx: nowBuildingIndex,
                  ownerName: subRecipe.building.name,
                  ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                  recipeID: parseInt(subRecipe.recipeID),
                },
              ];
            }
          } else {
            // 不存在就新建
            this.sorters[inputItem.name] = {
              output: [
                {
                  index: newSorter2.index,
                  rate: sorter.sortingSpeed,
                  ownerObjIdx: nowBuildingIndex,
                  ownerName: subRecipe.building.name,
                  ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                  recipeID: parseInt(subRecipe.recipeID),
                },
              ],
            };
          }
          actual_rate -= sorter.sortingSpeed;
        }

        let newSorter = this.getBuildingTemplate();
        newSorter.itemId = sorter.itemId;
        newSorter.modelIndex = sorter.modelIndex;
        newSorter.outputObjIdx = nowBuildingIndex;
        newSorter.outputToSlot = slotIndex;
        newSorter.inputToSlot = 1;
        newSorter.filterId = itemMap[inputItem.name].iconId;
        newSorter.parameters = { length: 1 };
        const offsetInfo = this.calculateSorterLocalOffsetAndYaw(
          { x: buildingX, y: buildingY, z: buildingZ },
          buildingMap[subRecipe.building.name].category,
          slotIndex,
          1
        );
        newSorter.localOffset = offsetInfo.offset;
        newSorter.yaw = offsetInfo.yaw;
        this.buildings.push(newSorter);
        sorterList.push(this.buildingIndex);
        // this.buildingArray[this.buildingArray.length-1].push({index: this.buildingIndex, type: buildingType.sorter})
        if (this.sorters[inputItem.name]) {
          // 已存在就append
          if (this.sorters[inputItem.name].input) {
            this.sorters[inputItem.name].input.push({
              index: newSorter.index,
              rate: actual_rate,
              ownerObjIdx: nowBuildingIndex, // 分拣器附属生产建筑的index
              ownerName: subRecipe.building.name,
              ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
              recipeID: parseInt(subRecipe.recipeID),
            });
          } else {
            this.sorters[inputItem.name].input = [
              {
                index: newSorter.index,
                rate: actual_rate,
                ownerObjIdx: nowBuildingIndex,
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              },
            ];
          }
        } else {
          // 不存在就新建
          this.sorters[inputItem.name] = {
            input: [
              {
                index: newSorter.index,
                rate: actual_rate,
                ownerObjIdx: nowBuildingIndex,
                ownerName: subRecipe.building.name,
                ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
                recipeID: parseInt(subRecipe.recipeID),
              },
            ],
          };
        }
        slotIndex--;
        if (!this.config.compactLayout) {
          // 非紧凑布局，调整对撞机的分拣器连接点
          if (buildingMap[subRecipe.building.name].category === productionCategory.collider && slotIndex === 5) {
            slotIndex = 2;
          }
        }
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
    for (let layer = 0; layer < stackLayers; layer++) {
      const foundationZ = (layer - 1) * zStep; // z=-10, 0, 10, 20
      const foundationBuilding = this.getBuildingTemplate();
      foundationBuilding.itemId = 1131;
      foundationBuilding.modelIndex = 37;
      foundationBuilding.localOffset = [
        { x: 0, y: 0, z: foundationZ },
        { x: 0, y: 0, z: foundationZ },
      ];
      foundationBuilding.inputToSlot = 1;
      foundationBuilding.parameters = null;
      this.buildings.push(foundationBuilding);
    }

    // --- 3. 识别需跳过的建筑类型 ---
    const labItemIds = new Set([buildingMap.lab.itemId, buildingMap["自演化研究站"].itemId]);
    const beltItemIds = new Set([2001, 2002, 2003]);
    const sprayCoaterItemId = buildingMap.sprayCoater.itemId;
    const teslaTowerItemId = 2201; // 电力感应塔

    const labIndices = new Set();
    for (const b of baseBuildings) {
      if (labItemIds.has(b.itemId)) {
        labIndices.add(b.index);
      }
    }

    // 过滤出需要克隆的建筑（排除Lab、传送带、喷涂机、电力感应塔）
    // 电力感应塔只保留z=0层，克隆层不需要（z=0层的电杆可以为所有层供电）
    const cloneableBuildings = baseBuildings.filter(b => {
      if (labItemIds.has(b.itemId)) return false;
      if (labIndices.has(b.inputObjIdx) || labIndices.has(b.outputObjIdx)) return false;
      if (beltItemIds.has(b.itemId)) return false;
      if (b.itemId === sprayCoaterItemId) return false;
      if (b.itemId === teslaTowerItemId) return false;
      return true;
    });

    // --- 4. 逐层克隆 ---
    for (let layer = 1; layer < stackLayers; layer++) {
      const zOffset = layer * zStep;

      // 预分配index映射表
      const indexMap = new Map();
      let nextIndex = this.buildingIndex + 1;
      for (const base of cloneableBuildings) {
        indexMap.set(base.index, nextIndex);
        nextIndex++;
      }

      // 创建克隆体
      for (const base of cloneableBuildings) {
        const clone = this.getBuildingTemplate();

        // 复制基础属性
        clone.itemId = base.itemId;
        clone.modelIndex = base.modelIndex;
        clone.areaIndex = base.areaIndex;
        clone.recipeId = base.recipeId;
        clone.filterId = base.filterId;
        clone.outputToSlot = base.outputToSlot;
        clone.inputFromSlot = base.inputFromSlot;
        clone.outputFromSlot = base.outputFromSlot;
        clone.inputToSlot = base.inputToSlot;
        clone.outputOffset = base.outputOffset;
        clone.inputOffset = base.inputOffset;

        // 应用z偏移
        clone.localOffset = base.localOffset
          ? base.localOffset.map(o => ({
              x: o.x,
              y: o.y,
              z: (o.z || 0) + zOffset,
            }))
          : null;

        clone.yaw = base.yaw ? base.yaw.slice() : [0, 0];

        if (base.parameters !== null && base.parameters !== undefined) {
          clone.parameters = JSON.parse(JSON.stringify(base.parameters));
        } else {
          clone.parameters = null;
        }

        // index引用重映射
        // outputObjIdx：所有克隆体的outputObjIdx指向z=0的传送带（不通过indexMap）
        //           这样4层都连接到同一套传送带网络
        // inputObjIdx：设备的inputObjIdx需要指向该层对应的地基
        if (indexMap.has(base.outputObjIdx)) {
          clone.outputObjIdx = indexMap.get(base.outputObjIdx);
        } else {
          clone.outputObjIdx = base.outputObjIdx;
        }

        // 设备（生产建筑）的inputObjIdx指向该层对应的地基
        // 分拣器的inputObjIdx保持指向同层设备
        if (base.inputObjIdx === -1) {
          // 如果base设备没有连接地基（inputObjIdx = -1），则指向该层对应的地基
          // 地基索引计算：foundationStartIndex + layer
          // layer=1 → z=10 设备 → z=0 地基 (foundationStartIndex + 1)
          // layer=2 → z=20 设备 → z=10 地基 (foundationStartIndex + 2)
          // layer=3 → z=30 设备 → z=20 地基 (foundationStartIndex + 3)
          clone.inputObjIdx = foundationStartIndex + layer;
        } else if (indexMap.has(base.inputObjIdx)) {
          // 分拣器等指向同层克隆设备
          clone.inputObjIdx = indexMap.get(base.inputObjIdx);
        } else {
          clone.inputObjIdx = base.inputObjIdx;
        }

        this.buildings.push(clone);
      }
    }

    // 修复：添加克隆后验证机制，检查传送带节点负载
    this.validateBeltLoad();
  }

  validateBeltLoad() {
    const beltItemIds = new Set([2001, 2002, 2003]);
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
    // 排序，增产剂(取最高等级)、原料、终产物、多余产物(精炼油、氢、石墨烯、重氢)、其余中间产物
    let newSummary = {};
    let proliferator = ["proliferatorMk3", "proliferatorMk2", "proliferatorMk1"];
    let outItem = ["refinedOil", "hydrogen", "graphene", "deuterium"];
    for (let key in proliferator) {
      if (itemSummary[proliferator[key]] && itemSummary[proliferator[key]].toBuildingNum === 0) {
        newSummary[proliferator[key]] = itemSummary[proliferator[key]];
        break;
      }
    }
    for (let key in itemSummary) {
      if (itemSummary[key].fromBuildingNum === 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    for (let key in itemSummary) {
      if (itemSummary[key].toBuildingNum === 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    for (let key in outItem) {
      if (
        itemSummary[outItem[key]] &&
        itemSummary[outItem[key]].fromBuildingNum - itemSummary[outItem[key]].toBuildingNum > 0
      ) {
        newSummary[outItem[key]] = itemSummary[outItem[key]];
      }
    }
    for (let key in itemSummary) {
      if (itemSummary[key].toBuildingNum !== 0 && itemSummary[key].fromBuildingNum !== 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    return newSummary;
  }

  generateConveyorBelts() {
    let itemSummary = {};
    // 计算物料统计信息，每个物料的产出速率、从多少个建筑产出、供给多少个建筑使用
    for (let subRecipe of this.recipe.subRecipes) {
      let extra_rate = 1;
      if (this.recipe.proliferator) {
        if (subRecipe.acceleratorMode === 0) {
          extra_rate += itemMap[this.recipe.proliferator].extra_rate;
        } else if (subRecipe.acceleratorMode === 1) {
          extra_rate += itemMap[this.recipe.proliferator].accelerate;
        }
      }
      for (let outputItem of subRecipe.output) {
        let outputRate = 0;
        let fromBuildingNum = 0;
        if (subRecipe.input === null) {
          outputRate = outputItem.rate;
        } else {
          if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
            // 研究站可堆叠，需特殊处理
            fromBuildingNum = Math.ceil(subRecipe.building.num / this.config.maxLabLayers);
          } else {
            fromBuildingNum = subRecipe.building.num;
          }
          outputRate =
            outputItem.rate *
            buildingMap[subRecipe.building.name].productionSpeed *
            subRecipe.building.num *
            extra_rate;
        }
        if (itemSummary[outputItem.name]) {
          itemSummary[outputItem.name].fromBuildingNum += fromBuildingNum;
          itemSummary[outputItem.name].rate += outputRate;
        } else {
          itemSummary[outputItem.name] = {
            rate: outputRate,
            fromBuildingNum: fromBuildingNum,
            toBuildingNum: 0,
          };
        }
      }
      if (subRecipe.input === null) {
        continue;
      }
      for (let inputItem of subRecipe.input) {
        let toBuildingNum = 0;
        if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
          toBuildingNum = Math.ceil(subRecipe.building.num / this.config.maxLabLayers);
        } else {
          toBuildingNum = subRecipe.building.num;
        }
        // 堆叠模式：使用原始设备数量计算原料需求
        // 因为所有层的设备共享 z=0 层的传送带，原料需要满足所有层的需求
        const actualNum = subRecipe.building.originalNum || subRecipe.building.num;
        if (itemSummary[inputItem.name]) {
          itemSummary[inputItem.name].toBuildingNum += toBuildingNum;
          if (!itemSummary[inputItem.name].needProliferator && subRecipe.acceleratorMode !== -1) {
            itemSummary[inputItem.name].needProliferator = true;
          }
          if (subRecipe.acceleratorMode === 1) {
            // 加速时原料额外消耗
            itemSummary[inputItem.name].inputRate +=
              inputItem.rate * buildingMap[subRecipe.building.name].productionSpeed * actualNum * extra_rate;
          } else {
            // 无增产剂或增产时原料速率不变
            itemSummary[inputItem.name].inputRate +=
              inputItem.rate * buildingMap[subRecipe.building.name].productionSpeed * actualNum;
          }
        } else {
          let itemInputRate = inputItem.rate * buildingMap[subRecipe.building.name].productionSpeed * actualNum;
          if (subRecipe.acceleratorMode === 1) {
            itemInputRate *= extra_rate;
          }
          let needProliferator = false;
          if (subRecipe.acceleratorMode !== -1) {
            needProliferator = true;
          }
          itemSummary[inputItem.name] = {
            rate: 0,
            inputRate: itemInputRate,
            fromBuildingNum: 0,
            toBuildingNum: toBuildingNum,
            needProliferator: needProliferator,
          };
        }
      }
    }
    for (let key in itemSummary) {
      // rate为0（rate是按output计算的）但inputRate不为0，说明该物品是被排除的中间产物， 把inputRate赋值给rate，生成蓝图时该产物就会被当作原料
      if (itemSummary[key].rate === 0 && itemSummary[key].inputRate !== 0) {
        itemSummary[key].rate = itemSummary[key].inputRate;
      }
    }
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
    const sortersPerNode =
      stackLayers > 1
        ? Math.max(2, Math.floor((this.config.maxSorterNumOneBelt - 1) / stackLayers))
        : this.config.maxSorterNumOneBelt;
    for (let item in itemSummary) {
      const itemName = item;
      // console.log(itemName)
      item = itemSummary[item];

      let conveyorBelt = buildingMap.conveyorBeltMk1;
      if (this.config.onlyConveyorBeltMk3) {
        conveyorBelt = buildingMap.conveyorBeltMK3;
      } else if (item.rate >= conveyorBelt.transportSpeed) {
        if (item.rate === conveyorBelt.transportSpeed && this.config.upgradeConveyorBelt) {
          conveyorBelt = buildingMap.conveyorBeltMK3; // 直接使用三级传送带，跳过二级
        } else if (item.rate > conveyorBelt.transportSpeed) {
          conveyorBelt = buildingMap.conveyorBeltMK3;
        }
      }

      let maxTransportSpeed = buildingMap.conveyorBeltMK3.transportSpeed;
      if (item.fromBuildingNum === 0) {
        // 只有原料可以堆叠，中间产物不支持堆叠
        maxTransportSpeed = buildingMap.conveyorBeltMK3.transportSpeed * this.config.conveyorBeltStackLayer;
      }

      for (let totalDoneRate = 0; item.rate - totalDoneRate > zero; ) {
        let needSprayCoater = item.needProliferator;
        let doneRate = 0;
        let parameters = null;
        let inputRate = Math.min(maxTransportSpeed, item.rate - totalDoneRate);
        let inputData = [];
        let outputData = [];
        let doneSorterNum = 0;
        // 修复：添加空值检查，防止 this.sorters[itemName] 不存在时抛出异常
        if (!this.sorters[itemName]) {
          console.warn(`[蓝图警告] 物品 ${itemName} 没有对应的分拣器数据`);
          break;
        }
        // 修复：浮点精度导致所有分拣器已消耗但循环未终止，安全退出防止死循环或错位节点
        if (item.fromBuildingNum !== 0 && this.sorters[itemName].output.length === 0) {
          break;
        }
        if (
          item.fromBuildingNum === 0 &&
          item.toBuildingNum !== 0 &&
          this.sorters[itemName].input &&
          this.sorters[itemName].input.length === 0
        ) {
          break;
        }
        if (item.fromBuildingNum !== 0) {
          for (let j = this.sorters[itemName].output.length - 1; j >= 0; j--) {
            if (this.sorters[itemName].output[j].rate - inputRate > zero) {
              // 当前带接受运力不能满足分拣器，则该分拣器连接下一个带上的节点
              break;
            }
            // 修复：改进分配算法，确保每个节点均匀分配分拣器
            // 当 doneSorterNum 是 sortersPerNode 的倍数时创建新节点
            if (doneSorterNum % sortersPerNode === 0) {
              inputData.push([this.sorters[itemName].output[j].index]);
            } else {
              inputData[inputData.length - 1].push(this.sorters[itemName].output[j].index);
            }
            inputRate -= this.sorters[itemName].output[j].rate;
            doneRate += this.sorters[itemName].output[j].rate;
            this.sorters[itemName].output.pop();
            doneSorterNum++;
          }
        } else {
          // 说明是原料
          inputData.push([]);
          parameters = {
            iconId: itemMap[itemName].iconId,
            count: (inputRate * 60).toFixed(0),
          };
          doneRate += inputRate;
          // inputRate = 0
        }
        totalDoneRate += doneRate;
        let outputRate = doneRate; // 当前传送带实际运力
        doneSorterNum = 0;
        let refineryNum = 0; // X射线裂解/重整精炼工厂数量
        // 重新排序以提高输出传送带中，X射线裂解(氢)和重整精炼(精炼油)的输入优先级
        if (["hydrogen", "refinedOil"].includes(itemName) && item.toBuildingNum !== 0) {
          let input2 = [];
          for (let j = this.sorters[itemName].input.length - 1; j >= 0; j--) {
            if (
              !(
                (itemName === "hydrogen" && this.sorters[itemName].input[j].recipeID === 58) ||
                (itemName === "refinedOil" && this.sorters[itemName].input[j].recipeID === 121)
              )
            ) {
              input2.push(this.sorters[itemName].input[j]);
            }
          }
          refineryNum = this.sorters[itemName].input.length - input2.length;
          for (let j = this.sorters[itemName].input.length - 1; j >= 0; j--) {
            if (
              (itemName === "hydrogen" && this.sorters[itemName].input[j].recipeID === 58) ||
              (itemName === "refinedOil" && this.sorters[itemName].input[j].recipeID === 121)
            ) {
              input2.push(this.sorters[itemName].input[j]);
            }
          }
          this.sorters[itemName].input = input2;
        }
        if (item.toBuildingNum !== 0) {
          for (let j = this.sorters[itemName].input.length - 1; j >= 0; j--) {
            // 核心修复：防崩与运力对齐
            // 堆叠模式下，分拣器数组内记录的 rate 是单层设备的需求。
            // 但在物理上，该节点将被克隆 stackLayers 份，Mk4 的总拿取速率是单层的 stackLayers 倍。
            // 必须将扣除的实际运力放大，否则会导致将所有机器挂载在第一条传送带上，造成尾部严重饥饿。
            let actualSorterRate = this.sorters[itemName].input[j].rate;
            let columnLoad =
              item.fromBuildingNum === 0 && stackLayers > 1 ? actualSorterRate * stackLayers : actualSorterRate;

            if (totalDoneRate + zero < item.rate && outputRate + zero < columnLoad) {
              // 当前带输出运力不能满足分拣器且还会生成新的传送带，则传送带新增一个节点单独该分拣器连接上，同时给对应建筑增加一个分拣器连到下一个节点
              // console.log(`${itemName}: need add sorter`)
              outputData.push([this.sorters[itemName].input[j].index]);
              const newColumnLoad = columnLoad - outputRate;
              const newSorterRate =
                item.fromBuildingNum === 0 && stackLayers > 1 ? newColumnLoad / stackLayers : newColumnLoad;
              let sorter = buildingMap.sorterMk1;
              if (this.config.useSorterMk4 || this.config.onlySorterMk3 || newSorterRate > sorter.sortingSpeed) {
                // 一级分拣器不够用时升级，useSorterMk4时使用四级集装分拣器，否则使用三级
                sorter = this.config.useSorterMk4 ? buildingMap.sorterMk4 : buildingMap.sorterMk3;
              }
              let newSorter = this.getBuildingTemplate();
              // console.log(`new sorter: ${newSorter.index}`)
              newSorter.itemId = sorter.itemId;
              newSorter.modelIndex = sorter.modelIndex;
              newSorter.outputObjIdx = this.sorters[itemName].input[j].ownerObjIdx;
              if (
                [productionCategory.assembling, productionCategory.smelter, productionCategory.lab].includes(
                  buildingMap[this.sorters[itemName].input[j].ownerName].category
                )
              ) {
                // 熔炉、制造台和研究站追加到3号槽位
                newSorter.outputToSlot = 3;
              } else if (
                buildingMap[this.sorters[itemName].input[j].ownerName].category === productionCategory.collider
              ) {
                newSorter.outputToSlot = 2;
              } else {
                // 其他追加到0号槽位
                newSorter.outputToSlot = 0;
              }
              newSorter.inputToSlot = 1;
              newSorter.parameters = { length: 1 };
              const offsetInfo = this.calculateSorterLocalOffsetAndYaw(
                this.sorters[itemName].input[j].ownerOffset,
                buildingMap[this.sorters[itemName].input[j].ownerName].category,
                newSorter.outputToSlot,
                1
              );
              newSorter.localOffset = offsetInfo.offset;
              newSorter.yaw = offsetInfo.yaw;
              // console.log(newSorter)
              this.buildings.push(newSorter);
              // console.log(`add sorter for ${this.sorters[itemName].input[j].ownerObjIdx}`)
              let startMove = false;
              let findTargetBuilding = false;
              for (let i = 0; i < this.buildingArray.length; i++) {
                for (let k = 0; k < this.buildingArray[i].length; k++) {
                  if (this.buildingArray[i][k].index === this.sorters[itemName].input[j].ownerObjIdx) {
                    this.buildingArray[i][k].sorterList.push(newSorter.index);
                    findTargetBuilding = true;
                    if (
                      buildingMap[this.sorters[itemName].input[j].ownerName].category === productionCategory.smelter &&
                      this.buildingArray[i][k].sorterList.length === 3
                    ) {
                      // 熔炉加入新分拣器后分拣器总数为3，则之前分拣器总数为2，需要扩展熔炉侧边空间，即对后续建筑进行建筑位移
                      startMove = true;
                    } else {
                      break;
                    }
                  } else if (startMove) {
                    // move building and sorters
                    let toMoveNum = 1 + this.buildingArray[i][k].sorterList.length;
                    for (let b of this.buildings) {
                      if (b.index === this.buildingArray[i][k].index) {
                        // console.log(`move ${b.index}`)
                        b.localOffset[0].x += 1;
                        b.localOffset[1].x += 1;
                        toMoveNum--;
                      } else if (this.buildingArray[i][k].sorterList.includes(b.index)) {
                        b.localOffset[0].x += 1;
                        b.localOffset[1].x += 1;
                        toMoveNum--;
                      }
                      if (toMoveNum <= 0) {
                        break;
                      }
                    }
                  }
                }
                if (findTargetBuilding) {
                  break;
                }
              }
              this.sorters[itemName].input.unshift({
                index: newSorter.index,
                rate: newSorterRate,
                ownerObjIdx: this.sorters[itemName].input[j].ownerObjIdx,
                ownerName: this.sorters[itemName].input[j].ownerName,
                ownerOffset: this.sorters[itemName].input[j].ownerOffset,
                recipeID: this.sorters[itemName].input[j].recipeID,
              });
              this.sorters[itemName].input.pop();
              break;
            }

            // 当前传送带连接分拣器达到上限，连接下一个传送带
            // 修复：移除refineryNum修正，避免节点提前创建导致换列时粘连
            // 修复：当 totalDoneRate >= item.rate 但 outputData 还未覆盖所有 inputData 时，仍需继续生成
            // 修复：使用与输出分拣器相同的均匀分配策略
            if (doneSorterNum % sortersPerNode === 0) {
              outputData.push([this.sorters[itemName].input[j].index]);
            } else {
              outputData[outputData.length - 1].push(this.sorters[itemName].input[j].index);
            }
            outputRate -= columnLoad;
            this.sorters[itemName].input.pop();
            doneSorterNum++;
            if (outputRate <= 0) {
              if (j > 0 && totalDoneRate >= item.rate) {
                // 有分拣器还未连接 并且 不会再生成新的传送带了
                // 这种情况就是建筑非整数时计算误差导致的，继续处理未连接的分拣器就可以了
                continue;
              }
              break;
            }
          }
        } else {
          // 说明是终产物
          outputData.push([]);
          parameters = {
            iconId: itemMap[itemName].iconId,
            count: (outputRate * 60).toFixed(0),
          };
          needSprayCoater = false;
        }

        let direction = 1; // 表示传送带方向沿y轴正方向，用于终产物和中间产物
        if (item.fromBuildingNum === 0) {
          direction = -1; // y轴负方向，用于原料
        }
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
    let conveyor = buildingMap.conveyorBeltMk1;
    if (this.config.onlyConveyorBeltMk3) {
      conveyor = buildingMap.conveyorBeltMK3;
    } else if (
      this.itemSummary[this.recipe.proliferator] &&
      this.itemSummary[this.recipe.proliferator].rate > conveyor.transportSpeed
    ) {
      conveyor = buildingMap.conveyorBeltMK3;
    } else if (!this.itemSummary[this.recipe.proliferator]) {
      conveyor = buildingMap.conveyorBeltMK3;
    }
    let firstSprayOffset = this.sprayCoaterOffsetList[0];
    for (let spray of this.sprayCoaterOffsetList) {
      if (spray.y > firstSprayOffset.y) {
        firstSprayOffset = spray;
        continue;
      }
      if (spray.y === firstSprayOffset.y && spray.x < firstSprayOffset.x) {
        firstSprayOffset = spray;
      }
    }
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
    // convert blueprint from json format to string
    // original author https://github.com/huww98/dsp_blueprint_editor
    let allAssemblers = new Set([
      // 如果要追加支持新建筑，就在这里追加对应建筑的id
      2303,
      2304,
      2305,
      2302,
      2315,
      2308,
      2309,
      2310,
      2317, // 追加量子化工厂
      2318, // 重组式制造台
      2319, // 负熵熔炉
    ]);
    const K = Int32Array.of(
      0xd76aa478,
      0xe8d7b756,
      0x242070db,
      0xc1bdceee,
      0xf57c0faf,
      0x4787c62a,
      0xa8304623,
      0xfd469501,
      0x698098d8,
      0x8b44f7af,
      0xffff5bb1,
      0x895cd7be,
      0x6b9f1122,
      0xfd987193,
      0xa679438e,
      0x39b40821,
      0xf61e2562,
      0xc040b340,
      0x265e5a51,
      0xc9b6c7aa,
      0xd62f105d,
      0x02443453,
      0xd8a1e681,
      0xe7d3fbc8,
      0x21f1cde6,
      0xc33707d6,
      0xf4d50d87,
      0x475a14ed,
      0xa9e3e905,
      0xfcefa3f8,
      0x676f02d9,
      0x8d2a4c8a,
      0xfffa3942,
      0x8771f681,
      0x6d9d6122,
      0xfde5380c,
      0xa4beea44,
      0x4bdecfa9,
      0xf6bb4b60,
      0xbebfbc70,
      0x289b7ec6,
      0xeaa127fa,
      0xd4ef3085,
      0x04881d05,
      0xd9d4d039,
      0xe6db99e5,
      0x1fa27cf8,
      0xc4ac5665,
      0xf4292244,
      0x432aff97,
      0xab9423a7,
      0xfc93a039,
      0x655b59c3,
      0x8f0ccc92,
      0xffeff47d,
      0x85845dd1,
      0x6fa87e4f,
      0xfe2ce6e0,
      0xa3014314,
      0x4e0811a1,
      0xf7537e82,
      0xbd3af235,
      0x2ad7d2bb,
      0xeb86d391
    );
    const S = Uint8Array.of(
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21
    );
    const INIT_MD5F = new DataView(
      Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xdc, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x46, 0x57, 0x32, 0x10)
        .buffer
    );
    const MASK32 = -1;
    function rotateLeft(x, s) {
      return ((x << s) | (x >>> (32 - s))) & MASK32;
    }
    function updateBlock(s, buf) {
      let a = s[0];
      let b = s[1];
      let c = s[2];
      let d = s[3];
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) {
          f = (b & c) | (~b & d);
          g = i;
        } else if (i < 32) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
        }
        f = (f + a + K[i] + buf.getInt32(g * Int32Array.BYTES_PER_ELEMENT, true)) & MASK32;
        a = d;
        d = c;
        c = b;
        b = b + rotateLeft(f, S[i]);
      }
      s[0] = (s[0] + a) & MASK32;
      s[1] = (s[1] + b) & MASK32;
      s[2] = (s[2] + c) & MASK32;
      s[3] = (s[3] + d) & MASK32;
    }
    const BLOCK_SIZE = 64;
    function digest(data) {
      const s = Int32Array.of(
        INIT_MD5F.getInt32(0, true),
        INIT_MD5F.getInt32(Int32Array.BYTES_PER_ELEMENT, true),
        INIT_MD5F.getInt32(2 * Int32Array.BYTES_PER_ELEMENT, true),
        INIT_MD5F.getInt32(3 * Int32Array.BYTES_PER_ELEMENT, true)
      );
      let i = 0;
      for (; i <= data.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(data, i, BLOCK_SIZE));
      }
      const last = new ArrayBuffer(Math.ceil((data.byteLength - i + 9) / BLOCK_SIZE) * BLOCK_SIZE);
      const dataView = new Uint8Array(data);
      const lastView = new DataView(last);
      let j = 0;
      for (; i + j < data.byteLength; j++) {
        lastView.setUint8(j, dataView[i + j]);
      }
      lastView.setUint8(j, 0x80);
      lastView.setUint32(last.byteLength - 8, data.byteLength * 8, true);
      for (i = 0; i <= last.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(last, i, BLOCK_SIZE));
      }
      const result = new ArrayBuffer(16);
      const resultView = new DataView(result);
      for (let i = 0; i < s.length; i++) {
        resultView.setInt32(i * Int32Array.BYTES_PER_ELEMENT, s[i], true);
      }
      return result;
    }
    // digest = digest;
    class BufferIO {
      constructor(view) {
        this.view = view;
        this.pos = 0;
      }
      getView(length) {
        const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length);
        this.pos += length;
        return r;
      }
    }
    class BufferWriter extends BufferIO {
      setUint8(value) {
        this.view.setUint8(this.pos, value);
        this.pos += 1;
      }
      setInt8(value) {
        this.view.setInt8(this.pos, value);
        this.pos += 1;
      }
      setInt16(value) {
        this.view.setInt16(this.pos, value, true);
        this.pos += 2;
      }
      setInt32(value) {
        this.view.setInt32(this.pos, value, true);
        this.pos += 4;
      }
      setFloat32(value) {
        this.view.setFloat32(this.pos, value, true);
        this.pos += 4;
      }
    }
    function btoUint8Array(b) {
      const arr = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) {
        arr[i] = b.charCodeAt(i);
      }
      return arr;
    }
    function Uint8ArrayTob(a) {
      let out = "";
      for (let i = 0; i < a.length; i++) {
        out += String.fromCharCode(a[i]);
      }
      return out;
    }
    const uint8ToHex = new Array(0x100);
    for (let i = 0; i < uint8ToHex.length; i++) {
      uint8ToHex[i] = i.toString(16).toUpperCase().padStart(2, "0");
    }
    function hex(buffer) {
      const view = new Uint8Array(buffer);
      const hexBytes = new Array(view.length);
      for (let i = 0; i < view.length; i++) {
        hexBytes[i] = uint8ToHex[view[i]];
      }
      return hexBytes.join("");
    }
    function exportArea(w, area) {
      w.setInt8(area.index);
      w.setInt8(area.parentIndex);
      w.setInt16(area.tropicAnchor);
      w.setInt16(area.areaSegments);
      w.setInt16(area.anchorLocalOffset.x);
      w.setInt16(area.anchorLocalOffset.y);
      w.setInt16(area.size.x);
      w.setInt16(area.size.y);
    }
    function getParam(v, pos, defaultValue) {
      const p = pos * Int32Array.BYTES_PER_ELEMENT;
      if (p >= v.byteLength) {
        if (defaultValue === undefined) {
          throw new Error("参数解析错误：数据段太短");
        } else {
          return defaultValue;
        }
      }
      return v.getInt32(p, true);
    }
    function setParam(v, pos, value) {
      v.setInt32(pos * Int32Array.BYTES_PER_ELEMENT, value, true);
    }
    const stationDesc = {
      maxItemKind: 3,
      numSlots: 12,
    };
    const interstellarStationDesc = {
      maxItemKind: 5,
      numSlots: 12,
    };
    const AdvancedMiningMachineDesc = {
      maxItemKind: 1,
      numSlots: 9,
    };
    const stationParamsMeta = {
      base: 320,
      storage: { base: 0, stride: 6 },
      slots: { base: 192, stride: 4 },
    };
    function stationParamsParser(desc) {
      return {
        encodedSize() {
          return 2048;
        },
        encode(p, a) {
          const base = stationParamsMeta.base;
          setParam(a, base, p.workEnergyPerTick);
          setParam(a, base + 1, p.tripRangeOfDrones * 100000000.0);
          setParam(a, base + 2, p.tripRangeOfShips / 100.0);
          setParam(a, base + 3, p.includeOrbitCollector ? 1 : -1);
          setParam(a, base + 4, p.warpEnableDistance);
          setParam(a, base + 5, p.warperNecessary ? 1 : -1);
          setParam(a, base + 6, p.deliveryAmountOfDrones);
          setParam(a, base + 7, p.deliveryAmountOfShips);
          setParam(a, base + 8, p.pilerCount);
          {
            const { base, stride } = stationParamsMeta.storage;
            for (let i = 0; i < desc.maxItemKind; i++) {
              const s = p.storage[i];
              setParam(a, base + i * stride, s.itemId);
              setParam(a, base + i * stride + 1, s.localRole);
              setParam(a, base + i * stride + 2, s.remoteRole);
              setParam(a, base + i * stride + 3, s.max);
            }
          }
          {
            const { base, stride } = stationParamsMeta.slots;
            for (let i = 0; i < 12; i++) {
              const s = p.slots[i];
              setParam(a, base + i * stride, s.dir);
              setParam(a, base + i * stride + 1, s.storageIdx);
            }
          }
        },
        decode(a) {
          const base = stationParamsMeta.base;
          const result = {
            storage: [],
            slots: [],
            workEnergyPerTick: getParam(a, base),
            tripRangeOfDrones: getParam(a, base + 1) / 100000000.0,
            tripRangeOfShips: getParam(a, base + 2) * 100.0,
            includeOrbitCollector: getParam(a, base + 3) > 0,
            warpEnableDistance: getParam(a, base + 4),
            warperNecessary: getParam(a, base + 5) > 0,
            deliveryAmountOfDrones: getParam(a, base + 6),
            deliveryAmountOfShips: getParam(a, base + 7),
            pilerCount: getParam(a, base + 8),
          };
          {
            const { base, stride } = stationParamsMeta.storage;
            for (let i = 0; i < desc.maxItemKind; i++) {
              result.storage.push({
                itemId: getParam(a, base + i * stride),
                localRole: getParam(a, base + i * stride + 1),
                remoteRole: getParam(a, base + i * stride + 2),
                max: getParam(a, base + i * stride + 3),
              });
            }
          }
          {
            const { base, stride } = stationParamsMeta.slots;
            for (let i = 0; i < 12; i++) {
              result.slots.push({
                dir: getParam(a, base + i * stride),
                storageIdx: getParam(a, base + i * stride + 1),
              });
            }
          }
          return result;
        },
      };
    }
    function advancedMiningMachineParamParser() {
      const stationParser = stationParamsParser(AdvancedMiningMachineDesc);
      return {
        encodedSize: stationParser.encodedSize,
        encode(p, a) {
          stationParser.encode(p, a);
          const base = stationParamsMeta.base;
          setParam(a, base + 9, p.miningSpeed);
        },
        decode(a) {
          const p = stationParser.decode(a);
          const base = stationParamsMeta.base;
          return Object.assign(p, {
            miningSpeed: getParam(a, base + 9),
          });
        },
      };
    }
    const splitterParamParser = {
      encodedSize() {
        return 4;
      },
      encode(p, a) {
        for (let i = 0; i < 4; i++) {
          setParam(a, i, p.priority[i] ? 1 : 0);
        }
      },
      decode(a) {
        const result = {
          priority: [],
        };
        for (let i = 0; i < 4; i++) {
          result.priority[i] = getParam(a, i) > 0;
        }
        return result;
      },
    };
    const labParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.researchMode);
        setParam(a, 1, p.acceleratorMode);
      },
      decode(a) {
        return {
          researchMode: getParam(a, 0),
          acceleratorMode: getParam(a, 1),
        };
      },
    };
    const assembleParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.acceleratorMode);
      },
      decode(a) {
        return {
          acceleratorMode: getParam(a, 0),
        };
      },
    };
    const beltParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.iconId);
        setParam(a, 1, p.count);
      },
      decode(a) {
        return {
          iconId: getParam(a, 0),
          count: getParam(a, 1, 0),
        };
      },
    };
    const inserterParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.length);
      },
      decode(a) {
        return {
          length: getParam(a, 0),
        };
      },
    };
    const tankParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.output ? 1 : -1);
        setParam(a, 1, p.input ? 1 : -1);
      },
      decode(a) {
        return {
          output: getParam(a, 0) > 0,
          input: getParam(a, 1) > 0,
        };
      },
    };
    const storageParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.automationLimit);
      },
      decode(a) {
        return {
          automationLimit: getParam(a, 0),
        };
      },
    };
    const ejectorParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.orbitId);
      },
      decode(a) {
        return {
          orbitId: getParam(a, 0),
        };
      },
    };
    const powerGeneratorParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.productId);
      },
      decode(a) {
        return {
          productId: getParam(a, 0),
        };
      },
    };
    const energyExchangerParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.mode);
      },
      decode(a) {
        return {
          mode: getParam(a, 0),
        };
      },
    };
    const MonitorParamParser = {
      encodedSize() {
        return 128;
      },
      encode(p, a) {
        setParam(a, 0, p.targetBeltId);
        setParam(a, 1, p.offset);
        setParam(a, 2, p.targetCargoAmount);
        setParam(a, 3, p.periodTicksCount);
        setParam(a, 4, p.passOperator);
        setParam(a, 5, p.passColorId);
        setParam(a, 6, p.failColorId);
        setParam(a, 14, p.cargoFilter);
        setParam(a, 7, p.tone);
        setParam(a, 8, p.volume);
        setParam(a, 9, p.pitch);
        setParam(a, 11, p.repeat ? 1 : 0);
        setParam(a, 13, p.length * 10000);
        setParam(a, 18, p.falloffRadius[0] * 10);
        setParam(a, 19, p.falloffRadius[1] * 10);
        setParam(a, 10, p.systemWarningMode);
        setParam(a, 17, p.systemWarningIconId);
        setParam(a, 12, p.alarmMode);
      },
      decode(a) {
        return {
          targetBeltId: getParam(a, 0),
          offset: getParam(a, 1),
          targetCargoAmount: getParam(a, 2),
          periodTicksCount: getParam(a, 3),
          passOperator: getParam(a, 4),
          passColorId: getParam(a, 5),
          failColorId: getParam(a, 6),
          cargoFilter: getParam(a, 14),
          tone: getParam(a, 7),
          volume: getParam(a, 8),
          pitch: getParam(a, 9),
          repeat: getParam(a, 11) > 0,
          length: getParam(a, 13) / 10000,
          falloffRadius: [getParam(a, 18) / 10, getParam(a, 19) / 10],
          systemWarningMode: getParam(a, 10),
          systemWarningIconId: getParam(a, 17),
          alarmMode: getParam(a, 12),
        };
      },
    };
    const unknownParamParser = {
      encodedSize(p) {
        return p.parameters.length;
      },
      encode(p, a) {
        for (let i = 0; i < p.parameters.length; i++) setParam(a, i, p.parameters[i]);
      },
      decode(a) {
        const p = {
          parameters: new Int32Array(a.byteLength / Int32Array.BYTES_PER_ELEMENT),
        };
        for (let i = 0; i < p.parameters.length; i++) p.parameters[i] = getParam(a, i);
        return p;
      },
    };
    const parameterParsers = new Map([
      //支持增产的设备
      [2103, stationParamsParser(stationDesc)],
      [2104, stationParamsParser(interstellarStationDesc)],
      [2316, advancedMiningMachineParamParser()],
      [2020, splitterParamParser],
      [2901, labParamParser],
      [2902, labParamParser],
      [2001, beltParamParser],
      [2002, beltParamParser],
      [2003, beltParamParser],
      [2011, inserterParamParser],
      [2012, inserterParamParser],
      [2013, inserterParamParser],
      [2014, inserterParamParser],
      [2101, storageParamParser],
      [2102, storageParamParser],
      [2106, tankParamParser],
      [2311, ejectorParamParser],
      [2208, powerGeneratorParamParser],
      [2209, energyExchangerParamParser],
      [2030, MonitorParamParser],
    ]);
    for (const id of allAssemblers) {
      parameterParsers.set(id, assembleParamParser);
    }
    function parserFor(itemId) {
      const parser = parameterParsers.get(itemId);
      if (parser !== undefined) return parser;
      return unknownParamParser;
    }
    function exportBuilding(w, b) {
      function writeXYZ(v) {
        w.setFloat32(v.x);
        w.setFloat32(v.y);
        w.setFloat32(v.z);
      }
      w.setInt32(b.index);
      w.setInt8(b.areaIndex);
      writeXYZ(b.localOffset[0]);
      writeXYZ(b.localOffset[1]);
      w.setFloat32(b.yaw[0]);
      w.setFloat32(b.yaw[1]);
      w.setInt16(b.itemId);
      w.setInt16(b.modelIndex);
      w.setInt32(b.outputObjIdx);
      w.setInt32(b.inputObjIdx);
      w.setInt8(b.outputToSlot);
      w.setInt8(b.inputFromSlot);
      w.setInt8(b.outputFromSlot);
      w.setInt8(b.inputToSlot);
      w.setInt8(b.outputOffset);
      w.setInt8(b.inputOffset);
      w.setInt16(b.recipeId);
      w.setInt16(b.filterId);
      if (b.parameters !== null) {
        const parser = parserFor(b.itemId);
        const length = parser.encodedSize(b.parameters);
        w.setInt16(length);
        parser.encode(b.parameters, w.getView(length * Int32Array.BYTES_PER_ELEMENT));
      } else {
        w.setInt16(0);
      }
    }
    function encodedSize(bp) {
      let result =
        28 + // meta
        1 + // numAreas
        14 * bp.areas.length +
        4 + // numBuildings
        61 * bp.buildings.length;
      for (const b of bp.buildings) {
        if (b.parameters === null) continue;
        const parser = parserFor(b.itemId);
        result += parser.encodedSize(b.parameters) * Int32Array.BYTES_PER_ELEMENT;
      }
      return result;
    }

    let bp = this.blueprintTemplate;
    let result = "BLUEPRINT:";
    const TIME_BASE = new Date(0).setUTCFullYear(1);
    result += "0,";
    result += bp.header.layout;
    result += ",";
    for (const i of bp.header.icons) {
      result += i;
      result += ",";
    }
    result += "0,";
    result += (bp.header.time.getTime() - TIME_BASE) * 10000;
    result += ",";
    result += bp.header.gameVersion;
    result += ",";
    result += encodeURIComponent(bp.header.shortDesc);
    result += ",";
    result += encodeURIComponent(bp.header.desc);
    result += '"';
    const decoded = new Uint8Array(encodedSize(bp));
    const writer = new BufferWriter(new DataView(decoded.buffer));
    writer.setInt32(bp.version);
    writer.setInt32(bp.cursorOffset.x);
    writer.setInt32(bp.cursorOffset.y);
    writer.setInt32(bp.cursorTargetArea);
    writer.setInt32(bp.dragBoxSize.x);
    writer.setInt32(bp.dragBoxSize.y);
    writer.setInt32(bp.primaryAreaIdx);
    writer.setUint8(bp.areas.length);
    for (const a of bp.areas) exportArea(writer, a);
    writer.setInt32(bp.buildings.length);
    for (const b of bp.buildings) exportBuilding(writer, b);
    result += btoa(Uint8ArrayTob(pako.default.gzip(decoded)));
    const d = hex(digest(btoUint8Array(result).buffer));
    result += '"';
    result += d;
    return result;
  }
}
