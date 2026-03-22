// Scripts/blueprint.layout.js
// 从 blueprint.js 抽离的布局计算逻辑。
(function (root) {
  function calculateProductionBuildingPlacement(blueprintSize, occupiedArea, buildingArea) {
    const lastIndex = occupiedArea.length - 1;
    let buildingX;
    let buildingY;
    const buildingZ = 0;
    let needNewLine = false;

    if (blueprintSize.x - occupiedArea[lastIndex].x2 >= buildingArea.x / 2) {
      buildingX = occupiedArea[lastIndex].x2 + 1 + buildingArea.centerPoint[3];
      buildingY = occupiedArea[lastIndex - 1].y2 + 1 + buildingArea.centerPoint[0];
      occupiedArea[lastIndex].x2 += buildingArea.x;
      if (buildingY + buildingArea.centerPoint[2] > occupiedArea[lastIndex].y2) {
        occupiedArea[lastIndex].y2 = buildingY + buildingArea.centerPoint[2];
      }
    } else {
      needNewLine = true;
      buildingX = buildingArea.centerPoint[3];
      buildingY = buildingArea.centerPoint[0] + occupiedArea[lastIndex].y2 + 1;
      occupiedArea.push({
        x1: 0,
        y1: buildingY - buildingArea.centerPoint[0],
        x2: buildingX + buildingArea.centerPoint[1],
        y2: buildingY + buildingArea.centerPoint[2],
      });
    }

    return {
      needNewLine,
      offset: {
        x: buildingX,
        y: buildingY,
        z: buildingZ,
      },
    };
  }

  function calculateSorterLocalOffsetAndYaw(buildingOffset, type, slotIndex, rotate, productionCategory) {
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

  function calculateTeslaTowerOffset(buildingOffset, category, productionCategory, cocoMessageRef) {
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
        if (cocoMessageRef && typeof cocoMessageRef.error === "function") cocoMessageRef.error("未知的建筑类型", 4000);
        throw `unknown building category: ${category}`;
    }
    return {
      offset: offset,
      distance: distance,
    };
  }

  function selectSorterByRate(actualRate, config, buildingMap) {
    let sorter = buildingMap.sorterMk1;
    if (config.useSorterMk4 || config.onlySorterMk3 || actualRate > sorter.sortingSpeed) {
      sorter = config.useSorterMk4 ? buildingMap.sorterMk4 : buildingMap.sorterMk3;
    }
    return sorter;
  }

  function upsertSorterFlow(sorters, itemName, flowType, entry) {
    if (!sorters[itemName]) {
      sorters[itemName] = {};
    }
    if (!sorters[itemName][flowType]) {
      sorters[itemName][flowType] = [];
    }
    sorters[itemName][flowType].push(entry);
  }

  function getNextSorterSlotIndex(slotIndex, category, compactLayout, productionCategory) {
    let nextSlotIndex = slotIndex - 1;
    if (!compactLayout && category === productionCategory.collider && nextSlotIndex === 5) {
      nextSlotIndex = 2;
    }
    return nextSlotIndex;
  }

  function planProductionSorters(actualRate, slotIndex, isInput, category, config, buildingMap, productionCategory) {
    const sorter = selectSorterByRate(actualRate, config, buildingMap);
    const rotate = isInput ? 1 : 0;
    const entries = [];
    let remainingRate = actualRate;

    if (category === productionCategory.lab && actualRate > sorter.sortingSpeed) {
      entries.push({
        slotIndex: slotIndex - 3,
        rotate,
        rate: sorter.sortingSpeed,
        // 保持原有行为：研究站额外输入分拣器也登记到 output 侧。
        flowType: "output",
        linkMode: isInput ? "input_extra" : "output",
      });
      remainingRate -= sorter.sortingSpeed;
    }

    entries.push({
      slotIndex,
      rotate,
      rate: remainingRate,
      flowType: isInput ? "input" : "output",
      linkMode: isInput ? "input" : "output",
    });

    return {
      sorter,
      entries,
      nextSlotIndex: getNextSorterSlotIndex(slotIndex, category, config.compactLayout, productionCategory),
    };
  }

  function calculateProductionContext(
    buildingNum,
    currentBuildingIndex,
    stackLabCount,
    productionSpeed,
    recipeProliferator,
    acceleratorMode,
    itemMap
  ) {
    let actualBuildingNum = Math.min(1, buildingNum - currentBuildingIndex);
    actualBuildingNum += stackLabCount;

    let extraRate = 1;
    if (recipeProliferator) {
      if (acceleratorMode === 0) {
        extraRate += itemMap[recipeProliferator].extra_rate;
      } else if (acceleratorMode === 1) {
        extraRate += itemMap[recipeProliferator].accelerate;
      }
    }

    return {
      actualBuildingNum,
      productionSpeed,
      extraRate,
    };
  }

  function calculateOutputActualRate(itemRate, productionSpeed, actualBuildingNum, extraRate) {
    return itemRate * productionSpeed * actualBuildingNum * extraRate;
  }

  function calculateInputActualRate(itemRate, productionSpeed, actualBuildingNum, extraRate, acceleratorMode) {
    let rate = itemRate * productionSpeed * actualBuildingNum;
    if (acceleratorMode === 1) {
      rate *= extraRate;
    }
    return rate;
  }

  function calculateSortersPerNode(maxSorterNumOneBelt, stackLayers) {
    if (stackLayers > 1) {
      return Math.max(2, Math.floor((maxSorterNumOneBelt - 1) / stackLayers));
    }
    return maxSorterNumOneBelt;
  }

  function selectConveyorForRate(itemRate, onlyConveyorBeltMk3, upgradeConveyorBelt, conveyorBeltMk1, conveyorBeltMk3) {
    let conveyorBelt = conveyorBeltMk1;
    if (onlyConveyorBeltMk3) {
      conveyorBelt = conveyorBeltMk3;
    } else if (itemRate >= conveyorBelt.transportSpeed) {
      if (itemRate === conveyorBelt.transportSpeed && upgradeConveyorBelt) {
        conveyorBelt = conveyorBeltMk3;
      } else if (itemRate > conveyorBelt.transportSpeed) {
        conveyorBelt = conveyorBeltMk3;
      }
    }
    return conveyorBelt;
  }

  function calculateMaxTransportSpeed(fromBuildingNum, mk3TransportSpeed, conveyorBeltStackLayer) {
    if (fromBuildingNum === 0) {
      return mk3TransportSpeed * conveyorBeltStackLayer;
    }
    return mk3TransportSpeed;
  }

  function createItemCountParameter(itemName, ratePerSecond, itemMap) {
    return {
      iconId: itemMap[itemName].iconId,
      count: (ratePerSecond * 60).toFixed(0),
    };
  }

  function getConveyorDirection(fromBuildingNum) {
    if (fromBuildingNum === 0) {
      return -1;
    }
    return 1;
  }

  function selectSprayCoaterConveyor(
    itemSummary,
    proliferatorName,
    onlyConveyorBeltMk3,
    conveyorBeltMk1,
    conveyorBeltMk3
  ) {
    if (onlyConveyorBeltMk3) {
      return conveyorBeltMk3;
    }
    if (itemSummary[proliferatorName] && itemSummary[proliferatorName].rate > conveyorBeltMk1.transportSpeed) {
      return conveyorBeltMk3;
    }
    if (!itemSummary[proliferatorName]) {
      return conveyorBeltMk3;
    }
    return conveyorBeltMk1;
  }

  function findFirstSprayOffset(sprayCoaterOffsetList) {
    let firstSprayOffset = sprayCoaterOffsetList[0];
    for (let spray of sprayCoaterOffsetList) {
      if (spray.y > firstSprayOffset.y) {
        firstSprayOffset = spray;
        continue;
      }
      if (spray.y === firstSprayOffset.y && spray.x < firstSprayOffset.x) {
        firstSprayOffset = spray;
      }
    }
    return firstSprayOffset;
  }

  function calculateSelfSprayStartOffset(firstSprayOffset, lastProductionBuildingType, productionCategory) {
    const selfSprayConveyorStartOffset = {
      x: firstSprayOffset.x,
      y: firstSprayOffset.y,
      z: firstSprayOffset.z,
    };
    switch (lastProductionBuildingType) {
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
    return selfSprayConveyorStartOffset;
  }

  function buildSelfSprayCoreNodeOffsets(conveyorStartOffsetX, selfSprayConveyorStartOffset) {
    const y = selfSprayConveyorStartOffset.y;
    return [
      { x: conveyorStartOffsetX - 1, y: y + 6, z: 0 },
      { x: conveyorStartOffsetX - 1, y: y + 5, z: 0 },
      { x: conveyorStartOffsetX - 1, y: y + 4, z: 0 },
      { x: conveyorStartOffsetX - 1, y: y + 3, z: 0 },
      { x: conveyorStartOffsetX - 1, y: y + 2, z: 0 },
      { x: conveyorStartOffsetX - 2, y: y + 2, z: 0 },
      { x: conveyorStartOffsetX - 2, y: y + 3, z: 0 },
      { x: conveyorStartOffsetX - 2, y: y + 4, z: 0.5 },
      { x: conveyorStartOffsetX - 2, y: y + 5, z: 1 },
      { x: conveyorStartOffsetX - 2, y: y + 6, z: 1 },
      { x: conveyorStartOffsetX - 1, y: y + 6, z: 1 },
      { x: conveyorStartOffsetX, y: y + 6, z: 1 },
      { x: conveyorStartOffsetX, y: y + 5, z: 1 },
      { x: conveyorStartOffsetX, y: y + 4, z: 1 },
      { x: conveyorStartOffsetX, y: y + 3, z: 1 },
      { x: conveyorStartOffsetX - 1, y: y + 3, z: 1 },
      { x: conveyorStartOffsetX - 2, y: y + 3, z: 1 },
      { x: conveyorStartOffsetX - 2, y: y + 2, z: 1 },
      { x: conveyorStartOffsetX - 2, y: y + 1, z: 1 },
      { x: conveyorStartOffsetX - 1, y: y + 1, z: 1 },
    ];
  }

  function buildSelfSprayHorizontalBridgeOffsets(conveyorStartOffsetX, selfSprayConveyorStartOffset) {
    const offsets = [];
    for (let i = 0; i < selfSprayConveyorStartOffset.x - conveyorStartOffsetX; i++) {
      offsets.push({
        x: conveyorStartOffsetX + i,
        y: selfSprayConveyorStartOffset.y + 1,
        z: 1,
      });
    }
    return offsets;
  }

  function buildSelfSprayVerticalBridgeOffsets(selfSprayConveyorStartOffset, firstSprayOffset) {
    const offsets = [];
    for (let i = 0; i < selfSprayConveyorStartOffset.y - firstSprayOffset.y; i++) {
      offsets.push({
        x: selfSprayConveyorStartOffset.x - 1,
        y: selfSprayConveyorStartOffset.y - i,
        z: 1,
      });
    }
    return offsets;
  }

  function buildSelfSprayStructurePlan(conveyorStartOffsetX, selfSprayConveyorStartOffset, firstSprayOffset) {
    const sprayCoaterOffset = {
      x: conveyorStartOffsetX - 1,
      y: selfSprayConveyorStartOffset.y + 4,
      z: 0,
    };
    const conveyorNodeOffsets = [
      ...buildSelfSprayCoreNodeOffsets(conveyorStartOffsetX, selfSprayConveyorStartOffset),
      ...buildSelfSprayHorizontalBridgeOffsets(conveyorStartOffsetX, selfSprayConveyorStartOffset),
      ...buildSelfSprayVerticalBridgeOffsets(selfSprayConveyorStartOffset, firstSprayOffset),
    ];
    return {
      sprayCoaterOffset,
      conveyorNodeOffsets,
    };
  }

  function reorderPriorityInputSorters(itemName, inputSorters) {
    if (!["hydrogen", "refinedOil"].includes(itemName)) {
      return inputSorters;
    }
    const reordered = [];
    for (let i = inputSorters.length - 1; i >= 0; i--) {
      const sorter = inputSorters[i];
      if (
        !((itemName === "hydrogen" && sorter.recipeID === 58) || (itemName === "refinedOil" && sorter.recipeID === 121))
      ) {
        reordered.push(sorter);
      }
    }
    for (let i = inputSorters.length - 1; i >= 0; i--) {
      const sorter = inputSorters[i];
      if (
        (itemName === "hydrogen" && sorter.recipeID === 58) ||
        (itemName === "refinedOil" && sorter.recipeID === 121)
      ) {
        reordered.push(sorter);
      }
    }
    return reordered;
  }

  function calculateColumnLoad(actualSorterRate, fromBuildingNum, stackLayers) {
    if (fromBuildingNum === 0 && stackLayers > 1) {
      return actualSorterRate * stackLayers;
    }
    return actualSorterRate;
  }

  function shouldCreateSupplementSorter(totalDoneRate, itemRate, outputRate, columnLoad, zero) {
    return totalDoneRate + zero < itemRate && outputRate + zero < columnLoad;
  }

  function calculateSupplementSorterRate(columnLoad, outputRate, fromBuildingNum, stackLayers) {
    const newColumnLoad = columnLoad - outputRate;
    if (fromBuildingNum === 0 && stackLayers > 1) {
      return newColumnLoad / stackLayers;
    }
    return newColumnLoad;
  }

  function selectSupplementSorterOutputSlot(ownerCategory, productionCategory) {
    if ([productionCategory.assembling, productionCategory.smelter, productionCategory.lab].includes(ownerCategory)) {
      return 3;
    }
    if (ownerCategory === productionCategory.collider) {
      return 2;
    }
    return 0;
  }

  function shouldStartShiftAfterSupplement(ownerCategory, sorterListLength, productionCategory) {
    return ownerCategory === productionCategory.smelter && sorterListLength === 3;
  }

  function appendSorterIndexToNodeData(nodeData, sorterIndex, doneSorterNum, sortersPerNode) {
    if (doneSorterNum % sortersPerNode === 0) {
      nodeData.push([sorterIndex]);
    } else {
      nodeData[nodeData.length - 1].push(sorterIndex);
    }
  }

  function shouldContinueAfterOutputRateDepleted(j, totalDoneRate, itemRate) {
    return j > 0 && totalDoneRate >= itemRate;
  }

  function attachSorterToOwnerAndPlanShift(rowEntries, ownerObjIdx, ownerCategory, newSorterIndex, productionCategory) {
    let found = false;
    let startMove = false;
    const entriesToShift = [];
    for (const entry of rowEntries) {
      if (entry.index === ownerObjIdx) {
        entry.sorterList.push(newSorterIndex);
        found = true;
        startMove = shouldStartShiftAfterSupplement(ownerCategory, entry.sorterList.length, productionCategory);
        if (!startMove) {
          break;
        }
      } else if (startMove) {
        entriesToShift.push(entry);
      }
    }
    return {
      found,
      entriesToShift,
    };
  }

  function collectBuildingGroupIndexes(buildingGroupEntry) {
    const indexes = [buildingGroupEntry.index];
    for (const sorterIndex of buildingGroupEntry.sorterList) {
      indexes.push(sorterIndex);
    }
    return indexes;
  }

  function calculateRecipeExtraRate(recipeProliferator, acceleratorMode, itemMap) {
    let extraRate = 1;
    if (recipeProliferator) {
      if (acceleratorMode === 0) {
        extraRate += itemMap[recipeProliferator].extra_rate;
      } else if (acceleratorMode === 1) {
        extraRate += itemMap[recipeProliferator].accelerate;
      }
    }
    return extraRate;
  }

  function calculateRecipeBuildingCount(subRecipe, maxLabLayers, buildingMap, productionCategory) {
    if (!subRecipe || !subRecipe.building) {
      return 0;
    }
    if (buildingMap[subRecipe.building.name].category === productionCategory.lab) {
      return Math.ceil(subRecipe.building.num / maxLabLayers);
    }
    return subRecipe.building.num;
  }

  function collectCloneableBuildings(baseBuildings, buildingMap) {
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
    return baseBuildings.filter(b => {
      if (labItemIds.has(b.itemId)) return false;
      if (labIndices.has(b.inputObjIdx) || labIndices.has(b.outputObjIdx)) return false;
      if (beltItemIds.has(b.itemId)) return false;
      if (b.itemId === sprayCoaterItemId) return false;
      if (b.itemId === teslaTowerItemId) return false;
      return true;
    });
  }

  function createCloneLayerIndexMap(cloneableBuildings, nextIndexStart) {
    const indexMap = new Map();
    let nextIndex = nextIndexStart;
    for (const base of cloneableBuildings) {
      indexMap.set(base.index, nextIndex);
      nextIndex++;
    }
    return indexMap;
  }

  function resolveClonedOutputObjIdx(baseOutputObjIdx, indexMap) {
    if (indexMap.has(baseOutputObjIdx)) {
      return indexMap.get(baseOutputObjIdx);
    }
    return baseOutputObjIdx;
  }

  function resolveClonedInputObjIdx(baseInputObjIdx, indexMap, foundationStartIndex, layer) {
    if (baseInputObjIdx === -1) {
      return foundationStartIndex + layer;
    }
    if (indexMap.has(baseInputObjIdx)) {
      return indexMap.get(baseInputObjIdx);
    }
    return baseInputObjIdx;
  }

  function createFoundationZOffsets(stackLayers, zStep) {
    const offsets = [];
    for (let layer = 0; layer < stackLayers; layer++) {
      offsets.push((layer - 1) * zStep);
    }
    return offsets;
  }

  function planCloneLayers(cloneableBuildings, stackLayers, zStep, foundationStartIndex, firstCloneIndex) {
    const layerPlans = [];
    let nextIndexStart = firstCloneIndex;

    for (let layer = 1; layer < stackLayers; layer++) {
      const indexMap = createCloneLayerIndexMap(cloneableBuildings, nextIndexStart);
      const clones = [];

      for (const base of cloneableBuildings) {
        clones.push({
          base,
          zOffset: layer * zStep,
          outputObjIdx: resolveClonedOutputObjIdx(base.outputObjIdx, indexMap),
          inputObjIdx: resolveClonedInputObjIdx(base.inputObjIdx, indexMap, foundationStartIndex, layer),
        });
      }

      layerPlans.push({
        layer,
        clones,
      });
      nextIndexStart += cloneableBuildings.length;
    }

    return layerPlans;
  }

  function buildConveyorItemSummary(
    subRecipes,
    recipeProliferator,
    maxLabLayers,
    itemMap,
    buildingMap,
    productionCategory
  ) {
    const itemSummary = {};
    for (const subRecipe of subRecipes) {
      const extraRate = calculateRecipeExtraRate(recipeProliferator, subRecipe.acceleratorMode, itemMap);
      for (const outputItem of subRecipe.output) {
        let outputRate = 0;
        let fromBuildingNum = 0;
        if (subRecipe.input === null) {
          outputRate = outputItem.rate;
        } else {
          fromBuildingNum = calculateRecipeBuildingCount(subRecipe, maxLabLayers, buildingMap, productionCategory);
          outputRate =
            outputItem.rate * buildingMap[subRecipe.building.name].productionSpeed * subRecipe.building.num * extraRate;
        }
        if (itemSummary[outputItem.name]) {
          itemSummary[outputItem.name].fromBuildingNum += fromBuildingNum;
          itemSummary[outputItem.name].rate += outputRate;
        } else {
          itemSummary[outputItem.name] = {
            rate: outputRate,
            fromBuildingNum,
            toBuildingNum: 0,
          };
        }
      }

      if (subRecipe.input === null) {
        continue;
      }

      const toBuildingNum = calculateRecipeBuildingCount(subRecipe, maxLabLayers, buildingMap, productionCategory);
      const actualNum = subRecipe.building.originalNum || subRecipe.building.num;
      for (const inputItem of subRecipe.input) {
        const inputRateBase = inputItem.rate * buildingMap[subRecipe.building.name].productionSpeed * actualNum;
        const itemInputRate = subRecipe.acceleratorMode === 1 ? inputRateBase * extraRate : inputRateBase;
        const needProliferator = subRecipe.acceleratorMode !== -1;

        if (itemSummary[inputItem.name]) {
          itemSummary[inputItem.name].toBuildingNum += toBuildingNum;
          if (!itemSummary[inputItem.name].needProliferator && needProliferator) {
            itemSummary[inputItem.name].needProliferator = true;
          }
          itemSummary[inputItem.name].inputRate += itemInputRate;
        } else {
          itemSummary[inputItem.name] = {
            rate: 0,
            inputRate: itemInputRate,
            fromBuildingNum: 0,
            toBuildingNum,
            needProliferator,
          };
        }
      }
    }

    for (const key in itemSummary) {
      if (itemSummary[key].rate === 0 && itemSummary[key].inputRate !== 0) {
        itemSummary[key].rate = itemSummary[key].inputRate;
      }
    }
    return itemSummary;
  }

  function getConveyorIterationAbortReason(item, sorterBucket) {
    if (!sorterBucket) {
      return "missing_sorters";
    }
    if (item.fromBuildingNum !== 0 && (!sorterBucket.output || sorterBucket.output.length === 0)) {
      return "no_output_sorters";
    }
    if (
      item.fromBuildingNum === 0 &&
      item.toBuildingNum !== 0 &&
      sorterBucket.input &&
      sorterBucket.input.length === 0
    ) {
      return "no_input_sorters";
    }
    return null;
  }

  function shouldConnectSourceSorter(sourceSorterRate, inputRate, zero) {
    return !(sourceSorterRate - inputRate > zero);
  }

  function createConveyorRoundState(item, totalDoneRate, maxTransportSpeed) {
    return {
      needSprayCoater: item.needProliferator,
      doneRate: 0,
      parameters: null,
      inputRate: Math.min(maxTransportSpeed, item.rate - totalDoneRate),
      inputData: [],
      outputData: [],
      doneSorterNum: 0,
    };
  }

  function consumeSourceOutputSorters(outputSorters, inputRate, zero, sortersPerNode) {
    const inputData = [];
    let doneRate = 0;
    let doneSorterNum = 0;
    let remainingInputRate = inputRate;
    for (let j = outputSorters.length - 1; j >= 0; j--) {
      if (!shouldConnectSourceSorter(outputSorters[j].rate, remainingInputRate, zero)) {
        break;
      }
      appendSorterIndexToNodeData(inputData, outputSorters[j].index, doneSorterNum, sortersPerNode);
      remainingInputRate -= outputSorters[j].rate;
      doneRate += outputSorters[j].rate;
      outputSorters.pop();
      doneSorterNum++;
    }
    return {
      inputData,
      doneRate,
      doneSorterNum,
      remainingInputRate,
    };
  }

  function applyRawInputRound(itemName, inputRate, itemMap) {
    return {
      inputData: [[]],
      parameters: createItemCountParameter(itemName, inputRate, itemMap),
      doneRate: inputRate,
    };
  }

  function consumeOutputInputSortersForRound(
    inputSorters,
    fromBuildingNum,
    itemRate,
    totalDoneRate,
    outputRateStart,
    stackLayers,
    zero,
    sortersPerNode
  ) {
    const outputData = [];
    let outputRate = outputRateStart;
    let doneSorterNum = 0;

    for (let j = inputSorters.length - 1; j >= 0; j--) {
      const sourceSorter = inputSorters[j];
      const columnLoad = calculateColumnLoad(sourceSorter.rate, fromBuildingNum, stackLayers);

      if (shouldCreateSupplementSorter(totalDoneRate, itemRate, outputRate, columnLoad, zero)) {
        outputData.push([sourceSorter.index]);
        return {
          outputData,
          outputRate,
          doneSorterNum,
          supplementPlan: {
            sourceSorter,
            newSorterRate: calculateSupplementSorterRate(columnLoad, outputRate, fromBuildingNum, stackLayers),
          },
        };
      }

      appendSorterIndexToNodeData(outputData, sourceSorter.index, doneSorterNum, sortersPerNode);
      outputRate -= columnLoad;
      inputSorters.pop();
      doneSorterNum++;

      if (outputRate <= 0) {
        if (shouldContinueAfterOutputRateDepleted(j, totalDoneRate, itemRate)) {
          continue;
        }
        break;
      }
    }

    return {
      outputData,
      outputRate,
      doneSorterNum,
      supplementPlan: null,
    };
  }

  function createFinalProductOutputRound(itemName, outputRate, itemMap) {
    return {
      outputData: [[]],
      parameters: createItemCountParameter(itemName, outputRate, itemMap),
      needSprayCoater: false,
    };
  }

  function applySupplementSorterToInputBucket(inputSorters, newSorterRecord) {
    if (!Array.isArray(inputSorters) || !newSorterRecord) {
      return;
    }
    inputSorters.unshift(newSorterRecord);
    if (inputSorters.length > 0) {
      inputSorters.pop();
    }
  }

  function planConveyorRound(
    itemName,
    item,
    totalDoneRate,
    maxTransportSpeed,
    sorterBucket,
    stackLayers,
    sortersPerNode,
    zero,
    itemMap
  ) {
    const abortReason = getConveyorIterationAbortReason(item, sorterBucket);
    if (abortReason) {
      return { abortReason };
    }

    const roundState = createConveyorRoundState(item, totalDoneRate, maxTransportSpeed);
    let needSprayCoater = roundState.needSprayCoater;
    let doneRate = roundState.doneRate;
    let parameters = roundState.parameters;
    let inputRate = roundState.inputRate;
    let inputData = roundState.inputData;
    let outputData = roundState.outputData;

    if (item.fromBuildingNum !== 0) {
      const sourceResult = consumeSourceOutputSorters(sorterBucket.output, inputRate, zero, sortersPerNode);
      inputData = sourceResult.inputData;
      inputRate = sourceResult.remainingInputRate;
      doneRate = sourceResult.doneRate;
    } else {
      const rawInputResult = applyRawInputRound(itemName, inputRate, itemMap);
      inputData = rawInputResult.inputData;
      parameters = rawInputResult.parameters;
      doneRate = rawInputResult.doneRate;
    }

    const nextTotalDoneRate = totalDoneRate + doneRate;
    let outputRate = doneRate;
    if (["hydrogen", "refinedOil"].includes(itemName) && item.toBuildingNum !== 0) {
      sorterBucket.input = reorderPriorityInputSorters(itemName, sorterBucket.input);
    }

    if (item.toBuildingNum !== 0) {
      const outputResult = consumeOutputInputSortersForRound(
        sorterBucket.input,
        item.fromBuildingNum,
        item.rate,
        nextTotalDoneRate,
        outputRate,
        stackLayers,
        zero,
        sortersPerNode
      );
      outputData = outputResult.outputData;
      outputRate = outputResult.outputRate;
      return {
        abortReason: null,
        inputData,
        outputData,
        parameters,
        needSprayCoater,
        nextTotalDoneRate,
        outputRate,
        supplementPlan: outputResult.supplementPlan,
      };
    }

    const finalOutput = createFinalProductOutputRound(itemName, outputRate, itemMap);
    outputData = finalOutput.outputData;
    parameters = finalOutput.parameters;
    needSprayCoater = finalOutput.needSprayCoater;

    return {
      abortReason: null,
      inputData,
      outputData,
      parameters,
      needSprayCoater,
      nextTotalDoneRate,
      outputRate,
      supplementPlan: null,
    };
  }

  function sortItemSummary(itemSummary) {
    const newSummary = {};
    const proliferator = ["proliferatorMk3", "proliferatorMk2", "proliferatorMk1"];
    const outItems = ["refinedOil", "hydrogen", "graphene", "deuterium"];
    for (let i = 0; i < proliferator.length; i++) {
      if (itemSummary[proliferator[i]] && itemSummary[proliferator[i]].toBuildingNum === 0) {
        newSummary[proliferator[i]] = itemSummary[proliferator[i]];
        break;
      }
    }
    for (const key in itemSummary) {
      if (itemSummary[key].fromBuildingNum === 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    for (const key in itemSummary) {
      if (itemSummary[key].toBuildingNum === 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    for (let i = 0; i < outItems.length; i++) {
      const outItem = outItems[i];
      if (itemSummary[outItem] && itemSummary[outItem].fromBuildingNum - itemSummary[outItem].toBuildingNum > 0) {
        newSummary[outItem] = itemSummary[outItem];
      }
    }
    for (const key in itemSummary) {
      if (itemSummary[key].toBuildingNum !== 0 && itemSummary[key].fromBuildingNum !== 0) {
        newSummary[key] = itemSummary[key];
      }
    }
    return newSummary;
  }

  root.DSQBlueprintLayout = {
    calculateProductionBuildingPlacement,
    calculateSorterLocalOffsetAndYaw,
    calculateTeslaTowerOffset,
    selectSorterByRate,
    upsertSorterFlow,
    getNextSorterSlotIndex,
    planProductionSorters,
    calculateProductionContext,
    calculateOutputActualRate,
    calculateInputActualRate,
    calculateSortersPerNode,
    selectConveyorForRate,
    calculateMaxTransportSpeed,
    createItemCountParameter,
    getConveyorDirection,
    selectSprayCoaterConveyor,
    findFirstSprayOffset,
    calculateSelfSprayStartOffset,
    buildSelfSprayStructurePlan,
    reorderPriorityInputSorters,
    calculateColumnLoad,
    shouldCreateSupplementSorter,
    calculateSupplementSorterRate,
    selectSupplementSorterOutputSlot,
    shouldStartShiftAfterSupplement,
    appendSorterIndexToNodeData,
    shouldContinueAfterOutputRateDepleted,
    attachSorterToOwnerAndPlanShift,
    collectBuildingGroupIndexes,
    calculateRecipeExtraRate,
    calculateRecipeBuildingCount,
    collectCloneableBuildings,
    createCloneLayerIndexMap,
    resolveClonedOutputObjIdx,
    resolveClonedInputObjIdx,
    createFoundationZOffsets,
    planCloneLayers,
    buildConveyorItemSummary,
    getConveyorIterationAbortReason,
    shouldConnectSourceSorter,
    createConveyorRoundState,
    consumeSourceOutputSorters,
    applyRawInputRound,
    consumeOutputInputSortersForRound,
    createFinalProductOutputRound,
    applySupplementSorterToInputBucket,
    planConveyorRound,
    sortItemSummary,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
