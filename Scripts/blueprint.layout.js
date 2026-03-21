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

  root.DSQBlueprintLayout = {
    calculateProductionBuildingPlacement,
    calculateSorterLocalOffsetAndYaw,
    calculateTeslaTowerOffset,
    selectSorterByRate,
    upsertSorterFlow,
    getNextSorterSlotIndex,
    planProductionSorters,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
