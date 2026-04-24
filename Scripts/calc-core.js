(function (root) {
  var ACC_SPEED = {
    inc: [1.125, 1.2, 1.25],
    acc: [1.25, 1.5, 2],
  };

  var BELT_SPEED_MAP = {
    conveyorBeltMk1: 360,
    conveyorBeltMk2: 720,
    conveyorBeltMk3: 1800,
    传送带: 360,
    高速传送带: 720,
    极速传送带: 1800,
  };
  var ACC_TYPE_INDEX_MAP = {
    proliferatorMk1: 0,
    proliferatorMk2: 1,
    proliferatorMk3: 2,
    "增产剂Mk.Ⅰ": 0,
    "增产剂Mk.Ⅱ": 1,
    "增产剂Mk.Ⅲ": 2,
  };
  var ACC_VALUE_MAP = {
    extra: "extra",
    speedup: "speedup",
    增产: "extra",
    加速: "speedup",
  };

  function normalizeTypeIndex(type) {
    return ACC_TYPE_INDEX_MAP[type] >= 0 ? ACC_TYPE_INDEX_MAP[type] : 0;
  }

  function normalizeAccValue(value) {
    return ACC_VALUE_MAP[value] || value;
  }

  function getAccSpeed(type, value) {
    var normalizedValue = normalizeAccValue(value);
    if (["extra", "speedup"].indexOf(normalizedValue) === -1) {
      return 1;
    }
    var typeIndex = normalizeTypeIndex(type);
    return normalizedValue === "extra" ? ACC_SPEED.inc[typeIndex] : ACC_SPEED.acc[typeIndex];
  }

  function getBeltSpeed(beltName) {
    return BELT_SPEED_MAP[beltName] || BELT_SPEED_MAP.conveyorBeltMk3;
  }

  function calculateBaseMachineCount(params) {
    var recipeTime = params.recipeTime || 1;
    var machineSpeed = params.machineSpeed || 1;
    var itemCount = params.itemCount || 1;
    var beltSpeed = params.beltSpeed || 1800;
    var stackLayer = params.stackLayer || 1;

    return (beltSpeed / ((60 / recipeTime) * machineSpeed * itemCount)) * stackLayer;
  }

  function calculateMaxMachinesPerBelt(params) {
    var baseCount = calculateBaseMachineCount(params);
    var effectSpeed = getAccSpeed(params.accType, params.accValue);
    var direction = params.direction || "input";
    var accValue = normalizeAccValue(params.accValue);

    if (direction === "input" && accValue === "extra") {
      return baseCount;
    }
    return baseCount / effectSpeed;
  }

  root.DSQCalcCore = {
    getAccSpeed: getAccSpeed,
    getBeltSpeed: getBeltSpeed,
    calculateBaseMachineCount: calculateBaseMachineCount,
    calculateMaxMachinesPerBelt: calculateMaxMachinesPerBelt,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
