(function (root) {
  var ACC_SPEED = {
    inc: [1.125, 1.2, 1.25],
    acc: [1.25, 1.5, 2],
  };

  var BELT_SPEED_MAP = {
    传送带: 360,
    高速传送带: 720,
    极速传送带: 1800,
  };

  function normalizeTypeIndex(type) {
    var typeIndex = ["增产剂Mk.Ⅰ", "增产剂Mk.Ⅱ", "增产剂Mk.Ⅲ"].indexOf(type);
    return typeIndex >= 0 ? typeIndex : 0;
  }

  function getAccSpeed(type, value) {
    if (["增产", "加速"].indexOf(value) === -1) {
      return 1;
    }
    var typeIndex = normalizeTypeIndex(type);
    return value === "增产" ? ACC_SPEED.inc[typeIndex] : ACC_SPEED.acc[typeIndex];
  }

  function getBeltSpeed(beltName) {
    return BELT_SPEED_MAP[beltName] || BELT_SPEED_MAP["极速传送带"];
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

    if (direction === "input" && params.accValue === "增产") {
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
