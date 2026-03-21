// Scripts/blueprint.layout.js
// 从 blueprint.js 抽离的布局计算逻辑。
(function (root) {
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

  root.DSQBlueprintLayout = {
    calculateSorterLocalOffsetAndYaw,
    calculateTeslaTowerOffset,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
