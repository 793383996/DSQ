// Scripts/data.ui-bindings.js
// 从 data.js 抽离的 UI 初始化、事件绑定与页面交互逻辑。

var app = null;
// 这里加入了一些用法和一些变量，用于处理“设备数量”处的输入框
function f_init() {
  app = new Vue({
    el: "#result",
    data: {
      totalEnergy: 0,
      totalSpace: 0,
      totalAcc: 0,
      total: [],
      xqs: [],
      icons: icons,
      items: [],
      items2: [],
      items0: [],
      ig_names: [],
      xps_editor_index: -1,
      xps_editor_number: 0,
      items_editor_index: -1,
      items_editor_number: 0,
    },
    methods: {
      speedChange: function (item) {
        settings_time[item.machineName] = parseFloat(item.speed);
        saveSettingTime();
        update_all();
      },

      onClickNumber: function (index) {
        if (this.xqs && this.xqs[index]) {
          this.xps_editor_index = index;
          this.xps_editor_number = this.xqs[index].number;
          Vue.nextTick(() => {
            if (this.$refs.input && this.$refs.input[0]) {
              let input = this.$refs.input[0];
              input.focus();
            }
          });
        }
      },

      onClickNumberItem: function (index_item) {
        if (this.items && this.items[index_item]) {
          this.items_editor_index = index_item;
          this.items_editor_number = this.items[index_item].number2;
          Vue.nextTick(() => {
            if (this.$refs.input && this.$refs.input[0]) {
              let input = this.$refs.input[0];
              input.focus();
            }
          });
        }
      },

      submitEditorNumber: function () {
        if (this.xqs && this.xqs[this.xps_editor_index]) {
          if (
            //   去掉了检查输入为整数的逻辑
            // Number.isInteger(this.number_editor_number) &&
            this.xps_editor_number > 0
          ) {
            this.xqs[this.xps_editor_index].number = this.xps_editor_number;
            update_all();
          }
          this.xps_editor_index = -1;
        }
      },
      // 运行两遍可以防止1.999或2.001这种数值错误
      submitEditorNumberItem: function () {
        if (this.items && this.items[this.items_editor_index]) {
          if (
            // Number.isInteger(this.number_editor_number) &&
            this.items_editor_number > 0
          ) {
            multiple = this.items_editor_number / this.items[this.items_editor_index].number2;

            for (var i = 0; i < this.xqs.length; i++) {
              this.xqs[i].number *= multiple;
            }
            update_all();
            multiple = this.items_editor_number / this.items[this.items_editor_index].number2;

            for (var i = 0; i < this.xqs.length; i++) {
              this.xqs[i].number *= multiple;
            }
            update_all();
          }
          this.items_editor_index = -1;
        }
      },

      cancelEditorNumber: function () {
        this.xps_editor_index = -1;
      },
      cancelEditorNumberItem: function () {
        this.items_editor_index = -1;
      },

      removeItem: function (index) {
        if (this.xqs && this.xqs[index]) {
          this.xqs.splice(index, 1);
          update_all();
        }
      },
    },
    computed: {
      totalDisplay: function () {
        if (!this.total || !this.total.length) return [];
        return this.total.map(function (item) {
          return {
            name: item.name,
            value: item.value,
            energy: item.energy ? item.energy.toFixed(2) : "0.00",
            space: item.space ? Math.round(item.space) : 0,
          };
        });
      },
    },
  });
  f_initData();
  f_fillData();
  doSpeed1();
  update_all();
  loadSetting();
  loadSettingTime();
  loadSettingPf();
  loadSettingProjects();

  projectsUpdate();

  $("#speed1_6").change(function () {
    $(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].name == "大型采矿机") {
            this.m[i].speed = 1 * 20 * 0.01 * parseFloat($("#selore").val()) * 0.01 * parseFloat($("#speed1_6").val());
          }
        }
      }
    });
    doSpeed1();
    update_all();
  });
  $("#selore").change(function () {
    $(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].name == "矿脉") {
            this.m[i].speed = Math.min(0.5 * 1 * 0.01 * parseFloat($("#selore").val()), 30);
          }
          if (this.m[i].name == "采矿机") {
            this.m[i].speed = Math.min(0.5 * 6 * 0.01 * parseFloat($("#selore").val()), 30);
          }
          if (this.m[i].name == "大型采矿机") {
            this.m[i].speed = 1 * 20 * 0.01 * parseFloat($("#selore").val()) * 0.01 * parseFloat($("#speed1_6").val());
          }
          if (this.m[i].name == "抽水机") {
            this.m[i].speed = Math.min((50 * 0.01 * parseFloat($("#selore").val())) / 60, 30);
          }
        }
      }
    });
    doSpeed1();
    update_all();
  });
  $("#btnSetting").click(function () {
    var $moreSetting = $("#MoreSetting");
    if ($moreSetting.hasClass("show")) {
      $moreSetting.removeClass("show");
      setTimeout(function () {
        $moreSetting.hide();
      }, 300);
    } else {
      $moreSetting.show();
      setTimeout(function () {
        $moreSetting.addClass("show");
      }, 10);
    }
  });
  $("#showMaxOneBelt").change(function () {
    update_all();
  });
  $("#pointLength").change(function () {
    pointLength = parseInt($(this).val());
    update_all();
  });
  $("#isAddSelfAccP").change(function () {
    update_all();
  });
  $("#fractionatorSpeed").change(function () {
    $(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].name == "分馏塔") {
            this.m[i].speed = parseFloat($("#fractionatorSpeed").val()) / (0.01 * 60);
          }
        }
      }
    });
    update_all();
  });
  $("#oilSpeed").change(function () {
    $(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].name == "原油萃取站") {
            this.m[i].speed = parseFloat($("#oilSpeed").val());
          }
        }
      }
    });
    update_all();
  });
  $("#gzSpeed").change(function () {
    manualGzSpeed = true;
    update_all();
    manualGzSpeed = false;
  });

  /*产量：可燃冰 0.65/s 氢0.25/s
每分钟采集物=60*产量*采矿作业速度*8（这是大佬量化表的现状）
可燃冰 60*0.65*110%*8=343.2
氢气 60*0.25*110%*8=132
供电消耗是按产出物的总能量占比计算的
供电占比=产量*能量/总能量
可燃冰占比=0.65*4.8/（0.65*4.8+0.25*8）=60.9%
氢气占比=0.25*8/（0.65*4.8+0.25*8）=39.1%
每分钟供电消耗=60*采集器功率*供电占比/采集物能量
可燃冰供电消耗=60*30*60.9%/4.8=228.5
氢气供电消耗=60*30*39.1%/8=87.9
实际产出=每分钟采集-供电消耗
可燃冰=343.2-228.5=114.7
氢气=132-87.9=44.1*/

  function doSpeed1() {
    var speed1_1 = parseFloat($("#speed1_1").val());
    var speed1_2 = parseFloat($("#speed1_2").val());
    var speed1_3 = parseFloat($("#speed1_3").val());
    var speed1_4 = parseFloat($("#speed1_4").val());
    var ore = parseFloat($("#selore").val());

    function getSum(value1, value2, p1, p2) {
      var sum = 0;

      sum = 60 * value1 * 0.01 * ore * 8;
      var per = (value1 * p1) / (value1 * p1 + value2 * p2);
      sum -= (60 * 30 * per) / p1;

      return sum;
    }
    $(data).each(function () {
      if (this.s && (this.s[0].name == "氢" || this.s[0].name == "重氢" || this.s[0].name == "可燃冰")) {
        if (this.m) {
          for (var i = 0; i < this.m.length; i++) {
            if (this.m[i].name == "轨道采集器(气态)") {
              if (this.s[0].name == "氢") {
                this.t = 1 / (getSum(speed1_1, speed1_2, 8, 8) / 60);
                // console.log("T1:" + this.t);
              } else if (this.s[0].name == "重氢") {
                this.t = 1 / (getSum(speed1_2, speed1_1, 8, 8) / 60);
                // console.log("T2:" + this.t);
              }
            }
            if (this.m[i].name == "轨道采集器(巨冰)") {
              if (this.s[0].name == "氢") {
                this.t = 1 / (getSum(speed1_4, speed1_3, 8, 4.8) / 60);
                // console.log("T3:" + this.t);
              } else if (this.s[0].name == "可燃冰") {
                this.t = 1 / (getSum(speed1_3, speed1_4, 4.8, 8) / 60);
                // console.log("T4:" + this.t);
              }
            }
          }
        }
      }
    });
  }

  $(".speed1").change(function () {
    doSpeed1();
    update_all();
  });

  $("#btnReset1").click(function () {
    if (confirm("该操作将清除配方并刷新页面！")) {
      //重置设备
      settings = {};
      saveSetting();
      //重置速度
      settings_time = {};
      saveSettingTime();
      //重置配方
      settings_pf = {};
      saveSettingPf();
      //刷新数据
      update_all();
      //清空localStorage
      localStorage.clear();
      localStorage;
      //刷新页面
      location.reload();
      return true;
    }
    return false;
  });

  $("#btnReset2").click(function () {
    settings = {};
    saveSetting();
    update_all();
  });

  $("#btnReset3").click(function () {
    settings_time = {};
    saveSettingTime();
    update_all();
  });

  $("#btnReset4").click(function () {
    settings_pf = {};
    saveSettingPf();
    update_all();
  });
  $("#btnReset5").click(function () {
    projects = [];
    saveSettingProjects();
    projectsUpdate();
  });
  $("#btnLoadProject").click(function () {
    var value = $("#selprojects").val();
    if (!value) return;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].name == value) {
        xqs = projects[i].value;
        singleMake = projects[i].singleMake || [];
        ig_names = projects[i].ig_names || [];
        settings = projects[i].settings || {};
        update_all();
        return;
      }
    }
  });
  $("#selmodein").change(function () {
    var value = $("#selmodein").val();
    $(data).each(function () {
      if (this.mName == "制作台") {
        // TODO: 下面的初始化代码还能优化一下
        settingsLocal[this.id] = settingsLocal[this.id] || {};
        settingsLocal[this.id].m = value;
      }
    });

    saveSetting();
    update_all();
  });
  $("#furnace").change(function () {
    var value = $("#furnace").val();
    $(data).each(function () {
      if (this.mName == "冶炼设备") {
        // TODO: 下面的初始化代码还能优化一下
        settingsLocal[this.id] = settingsLocal[this.id] || {};
        settingsLocal[this.id].m = value;
      }
    });

    saveSetting();
    update_all();
  });
  $("#chemical").change(function () {
    var value = $("#chemical").val();
    $(data).each(function () {
      if (this.mName == "化工设备") {
        // TODO: 下面的初始化代码还能优化一下
        settingsLocal[this.id] = settingsLocal[this.id] || {};
        settingsLocal[this.id].m = value;
      }
    });

    saveSetting();
    update_all();
  });
  $("#research").change(function () {
    var value = $("#research").val();
    $(data).each(function () {
      if (this.mName == "研究站") {
        // TODO: 下面的初始化代码还能优化一下
        settingsLocal[this.id] = settingsLocal[this.id] || {};
        settingsLocal[this.id].m = value;
      }
    });

    saveSetting();
    update_all();
  });
  $("#accType").change(function () {
    defaultAccType = $("#accType").val();
    // 不知道为啥要写这个for
    for (var i in settings) {
      delete settings[i].accType;
    }
    $(data).each(function () {
      // TODO: 下面的初始化代码还能优化一下
      settingsLocal[this.id] = settingsLocal[this.id] || {};
      settingsLocal[this.id].accType = defaultAccType;
    });
    saveSetting();
    update_all();
  });
  $("#accValue").change(function () {
    defaultAccValue = $("#accValue").val();
    for (var i in settings) {
      delete settings[i].accValue;
    }
    $(data).each(function () {
      // TODO: 下面的初始化代码还能优化一下
      settingsLocal[this.id] = settingsLocal[this.id] || {};
      settingsLocal[this.id].accValue = defaultAccValue;
    });
    saveSetting();
    update_all();
  });
  $("#isMerge").change(function () {
    update_all();
  });
  $("#hideSource").change(function () {
    update_all();
  });
  $("#selfAcc").change(update_all);
  $(document).click(function (e) {
    var jname = null;
    if ($(e.target).is(".cell-name")) {
      jname = $(e.target);
    }
    if ($(e.target).parent().is(".cell-name")) {
      jname = $(e.target).parent();
    }
    if ($(e.target).parent().parent().is(".cell-name")) {
      jname = $(e.target).parent().parent();
    }
    if (jname) {
      var msgs = [];
      var name = jname.attr("data-name");
      msgs.push("<p>" + name + "</p>");
      msgs.push("<p>生产于：</p>");
      var pfs = getPfs(name);
      for (var i = 0; i < pfs.length; i++) {
        var title = getPfTitle(pfs[i]);
        msgs.push("<p><a class='pf pf2'>" + title + "</a></p>");
      }
      pfs = getPfsByQ(name);
      if (pfs && pfs.length) {
        msgs.push("<p>作为原料可生产：</p>");

        for (var i = 0; i < pfs.length; i++) {
          var title = getPfTitle(pfs[i]);
          msgs.push("<p><a class='pf pf2'>" + title + "</a></p>");
        }
      }

      jname.tips({
        side: 3, //1,2,3,4 分别代表 上右下左
        msg: msgs.join(""),
        color: "#FFF", //文字颜色，默认为白色
        bg: "#4A5C72", //背景色，默认为红色
        time: 2,
        x: 0,
        y: 0,
      });
    }
  });
}

var single_list = []; //独立生产
var xh_list = [];
var out_list = [];

function addXH(name, value) {
  for (var i = 0; i < xh_list.length; i++) {
    var item = xh_list[i];
    if (item.name == name) {
      item.value += value; //需求
      return;
    }
  }
  xh_list.push({ name: name, value: value });
}
function addAccTotal(name, value) {
  for (var i = 0; i < xh_list.length; i++) {
    var item = xh_list[i];
    if (item.name == name) {
      item.accTotal = (item.accTotal || 0) + value; //需求
      return;
    }
  }
}
function addOut(name, value) {
  for (var i = 0; i < out_list.length; i++) {
    var item = out_list[i];
    if (item.name == name) {
      item.value += value; //需求
      return;
    }
  }
  out_list.push({ name: name, value: value });
}
function findOut(name) {
  for (var i = 0; i < out_list.length; i++) {
    var item = out_list[i];
    if (item.name == name) {
      return item.value;
    }
  }
  return null;
}
var ig_names = []; //排除的物品
//加载需求
function loadNumber(itemName, n) {
  try {
    if ($.inArray(itemName, ig_names) != -1) {
      return;
    }
    if ((itemName == "增产剂Mk.Ⅰ" || itemName == "增产剂Mk.Ⅱ" || itemName == "增产剂Mk.Ⅲ") && n < 0.1) {
      return;
    }
    var item = find(itemName, true); // [normalize_recipe=true]
    var info = getValue(itemName);

    addXH(itemName, n);
    for (var i = 0; i < item.s.length; i++) {
      if (item.s[i].name != itemName) {
        if (item.s[i].n === 0) continue;
        addOut(item.s[i].name, (-1 * n * (item.s[i].n || 1)) / (item.n || 1));
      }
    }
    var accType = (settings[item.id] || {}).accType || defaultAccType;
    var accValue = (settings[item.id] || {}).accValue || defaultAccValue;
    var accTotal = 0;
    for (var i = 0; item.q && i < item.q.length; i++) {
      var q = item.q[i];
      if ($.inArray(q.name, ig_names) != -1) {
        continue;
      }
      if (q.n === 0) continue;
      //如果配方产物和原料有相同的
      if (q.name == itemName) {
        //addXH(itemName, -1 * n * (q.n || 1) / (item.n || 1));
      } else {
        var r = (n * (q.n || 1)) / (item.n || 1);
        var v = 1,
          tm = 0;
        if (accType == "增产剂Mk.Ⅰ") ((v = 1.125), (tm = 12));
        else if (accType == "增产剂Mk.Ⅱ") ((v = 1.2), (tm = 24));
        else if (accType == "增产剂Mk.Ⅲ") ((v = 1.25), (tm = 60));
        // 自喷涂
        if ($("#selfAcc")[0].checked) tm = tm * v - 1;
        if (accValue == "增产" && item.noExtra) accValue = "无";
        if (item.q.length == 0 || item.noExtra === null) accValue = "无";

        // if (accValue == "加速") {
        // accTotal += r / tm;
        // loadNumber(accType, r / tm);
        // } else if (accValue == "增产") {
        // r /= v;
        // accTotal += r / tm;
        // loadNumber(accType, r / tm);
        // }

        if (accValue == "加速") {
          accTotal += r / tm;
          if (!$("#isAddSelfAccP").get(0).checked) {
            loadNumber(accType, r / tm);
          }
        } else if (accValue == "增产") {
          r /= v;
          accTotal += r / tm;
          if (!$("#isAddSelfAccP").get(0).checked) {
            loadNumber(accType, r / tm);
          }
        }

        loadNumber(q.name, r);
      }
    }
    addAccTotal(itemName, accTotal);
  } catch (e) {
    // console.log(itemName);
    throw e;
  }
}
//处理多产出
function getXhs(itemId) {
  var xhs = [];
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    if (item.id == itemId) xhs.push(xh);
  }
  return xhs;
}
function doMergeMul(xhs) {
  var maxValue2Index = -1;
  var max = 0;
  for (var i = 0; i < xhs.length; i++) {
    if (xhs[i].value2 > max) maxValue2Index = i;
  }

  for (var i = 0; i < xhs.length; i++) {
    if (i != maxValue2Index && xhs[i].value2 > 0) {
      var number = xhs[i].value;
      xhs[i].value2 = 0;
      var item = find(xhs[i].name);
      for (var j = 0; j < item.s.length; j++) {
        addOut(item.s[j].name, (number * (item.s[j].n || 1)) / (item.n || 1));
      }
    }
  }
}
function mergeMul() {
  var gs = [];
  var ids = [];
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    if ($.inArray(item.id, ids) != -1) continue;
    var xhs = getXhs(item.id);

    if (xhs.length > 1) {
      gs.push(xhs);
      ids.push(item.id);
    }
  }
  // console.log(gs); //gs:分组
  for (var i = 0; i < gs.length; i++) {
    doMergeMul(gs[i]);
  }
}

function checkResult() {
  //当前设备数量是否会 出现几个产出都多余，比如氢-120 精炼油-120，那么应该把设备调整到合适数量
  function isOverflow(item, info, nn) {
    for (var j = 0; j < item.s.length; j++) {
      var x = findOut(item.s[j].name);
      if (x == null) return false;
      var mn = ((nn * 60) / item.t) * info.speed * (item.s[j].n || 1); //1分钟1个设备产量
      if (x > -1 * mn) return false;
    }
    return true;
  }

  for (var i = 0; i < xh_list.length; i++) {
    var number = xh_list[i].value;
    var item = find(xh_list[i].name);
    var info = getValue(item);
    var nn = 1;
    if (xh_list[i].value2 < 1) {
      nn = xh_list[i].value2;
    }

    while (isOverflow(item, info, nn) && xh_list[i].value2 > 0) {
      //直到满足条件

      if (xh_list[i].value2 < 1) {
        nn = xh_list[i].value2;
      }
      xh_list[i].value2 = xh_list[i].value2 - nn; //调整数量
      for (var j = 0; j < item.s.length; j++) {
        var mn = ((nn * 60) / item.t) * info.speed * (item.s[j].n || 1); //1分钟1个设备产量
        addOut(item.s[j].name, mn);
      }
      if (xh_list[i].value2 < 1) {
        nn = xh_list[i].value2;
      }
      //console.log(JSON.stringify(out_list));
    }
  }
}

//每分钟需求: 引力透镜=0.1*接收塔=0.1*光子需求量/光子产量, 光子产量: 12(透镜×200%)/15(增产Ⅰ×250%)/18(增产Ⅱ×300%)/24(增产Ⅲ×400%)
function fixGzSpeed() {
  let fixedGzSpeed;
  $(data).each(function () {
    if (this.s && this.s[0].name == "临界光子") {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].name == "射线接收塔") {
            for (var j = 0; j < this.q.length; j++) {
              if (this.q[j].name == "引力透镜") {
                if (manualGzSpeed) {
                  fixedGzSpeed = parseFloat($("#gzSpeed").val());
                } else {
                  item = find("临界光子", true);
                  accType = (settings[item.id] || {}).accType || defaultAccType;
                  accValue = (settings[item.id] || {}).accValue || defaultAccValue;
                  if (accValue === "加速") {
                    switch (accType) {
                      case "增产剂Mk.Ⅰ":
                        fixedGzSpeed = 15;
                        break;
                      case "增产剂Mk.Ⅱ":
                        fixedGzSpeed = 18;
                        break;
                      case "增产剂Mk.Ⅲ":
                        fixedGzSpeed = 24;
                        break;
                    }
                  } else {
                    fixedGzSpeed = 12;
                  }
                }
                this.q[j].n = (0.1 / fixedGzSpeed).toFixed(6);
              }
            }
            this.t = this.q && this.q.length ? 60 / fixedGzSpeed : 10;
          }
        }
      }
    }
  });
}

function update_all() {
  var outResult = [];
  xh_list = [];
  out_list = [];
  single_list = [];

  fixGzSpeed();
  for (var m = 0; m < singleMake.length; m++) {
    var item = data[singleMake[m].id]; //配方
    var info = getValue(item);
    var times = parseFloat(((60 * parseInt(singleMake[m].number) * info.speed) / (item.t || 1)).toFixed(6));
    // (60 * parseInt(singleMake[m].number) * info.speed) / (item.t || 1);

    for (var i = 0; i < item.s.length; i++) {
      single_list.push({
        id: singleMake[m].id,
        number: singleMake[m].number,
        name: item.s[i].name,
        mName: info.name,
        value: times * (item.s[i].n || 1),
      });
      loadNumber(item.s[i].name, -1 * times * (item.s[i].n || 1));
    }
    for (var j = 0; item.q && j < item.q.length; j++) {
      loadNumber(item.q[j].name, times * (item.q[j].n || 1));
    }
  }
  for (var m = 0; m < xqs.length; m++) {
    var currentItem = xqs[m].item;
    loadNumber(currentItem.name, xqs[m].number);
  }

  function isXqs(name) {
    for (var m = 0; m < xqs.length; m++) {
      if (xqs[m].item.name == name) return true;
    }
    return false;
  }
  var items0 = [];
  var items = [];
  var items2 = [];

  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    var info = getValue(itemName);
    if (xh.value > 0) {
      xh.value2 = xh.value / (1 / info.time) / 60 / (item.n || 1);
      var accType = (settings[item.id] || {}).accType || defaultAccType;
      var accValue = (settings[item.id] || {}).accValue || defaultAccValue;
      if (accValue == "增产" && item.noExtra) accValue = "无";
      if (item.q.length == 0) accValue = "无";

      if (item.name !== "临界光子" || item.mName !== "射线接收塔") {
        // 修正产物与需求物相同时，生产设备计算偏少
        let fixValue2Times = 1;
        for (let j = 0; j < item.q.length; j++) {
          if (item.q[j].name === item.name) {
            fixValue2Times = item.n / (item.n - item.q[j].n);
          }
        }
        xh.value2 = (xh.value2 / getAccSpeed(accType, accValue)) * fixValue2Times;
      }
    }
  }
  //mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
  checkResult(); //优化当前结果，遍历配方，如果 出现几个产出都多余，比如氢-120 精炼油-120，那么应该把设备调整到合适数量

  for (var i = 0; i < single_list.length; i++) {
    if (!single_list[i].value) continue;
    var item = data[single_list[i].id];
    var info = getValue(single_list[i].name);
    var outitem = {
      name: single_list[i].name,
      number1: single_list[i].value,
      number2: single_list[i].number,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      pfTitle: getPfTitle(item, info),
      mName: single_list[i].mName,
    };
    items0.push(outitem);
  }

  //for (var i = 0; i < out_list.length; i++) {
  //    addXH(out_list[i].name, out_list[i].value);
  //    out_list[i].value = 0;
  //}
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    var info = getValue(itemName);
    if (xh.value < 0) {
      xh.value2 = 0;
    }
  }
  var total = [];
  var totalAcc = 0;
  function addTotal(name, value, s) {
    var energy = energyData[name] || 0;
    var space = spaceData[name] || 0;

    var accType = (s || {}).accType || defaultAccType;
    var accValue = (s || {}).accValue || defaultAccValue;
    if (accValue != "无") {
      if (accType == "增产剂Mk.Ⅰ") energy *= 1.3;
      else if (accType == "增产剂Mk.Ⅱ") energy *= 1.7;
      else if (accType == "增产剂Mk.Ⅲ") energy *= 2.5;
    }

    for (var i = 0; i < total.length; i++) {
      var item = total[i];

      if (!item.energy) item.energy = 0;
      if (!item.space) item.space = 0;
      if (item.name == name) {
        item.value += value;
        item.energy += energy * (value || 0);
        item.space += space * (value || 0);
        return;
      }
    }

    total.push({
      name: name,
      value: value,
      energy: energy * (value || 0),
      space: space * (value || 0),
    });
  }

  for (var i = 0; i < xh_list.length; i++) {
    if (!xh_list[i].value) continue;

    var item = find(xh_list[i].name);
    var info = getValue(xh_list[i].name);
    if ($("#hideSource").get(0).checked) {
      if (!item.q || !item.q.length) {
        continue;
      }
    }
    var img = getIconImg(info.name);
    if (img.indexOf("<img") == -1) {
      img = "X" + img;
    }
    // 当生产精炼油/氢/石墨烯/重氢的生产设施为空时，显示0生产设施以跳过“存在生产设施为空的配方”检验
    var outitem = {
      name: xh_list[i].name,
      number1: xh_list[i].value.toFixed(pointLength),
      number2: xh_list[i].value2
        ? xh_list[i].value2.toFixed(pointLength)
        : ["精炼油", "氢", "石墨烯", "重氢"].includes(xh_list[i].name)
          ? (0.0).toFixed(pointLength)
          : "",
      number2full:
        img +
        (xh_list[i].value2
          ? xh_list[i].value2.toFixed(pointLength)
          : ["精炼油", "氢", "石墨烯", "重氢"].includes(xh_list[i].name)
            ? (0.0).toFixed(pointLength)
            : ""),
      number2img: img,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: isXqs(xh_list[i].name) ? "xqsrow" : "",
      machineName: info.name,
      m: [],
      pf: [],
      accType: [],
      accValue: [],
      accTotal: (xh_list[i].accTotal || 0).toFixed(2),
    };
    if (!outitem.number2) outitem.number2full = "";
    if (xh_list[i].name == "太阳帆") {
      outitem.numberOther = "(可供" + getIconShow("电磁轨道弹射器", outitem.number1 / 20) + ")";
    }
    if (xh_list[i].name == "小型运载火箭") {
      outitem.numberOther = "(可供" + getIconShow("垂直发射井", outitem.number1 / 5) + ")";
    }
    addTotal(info.name, Math.ceil(outitem.number2), settings[item.id]);
    // 增产剂总和
    if (info.accValue != "无") {
      // TODO: 这里调用Math.ceil未必合理，增产剂一般放在总线起始处，所以应该在最终算出的总和处调用Math.ceil
      totalAcc += xh_list[i].accTotal || 0;
    }
    var pfds = getPfs(xh_list[i].name);

    for (var j = 0; j < pfds.length; j++) {
      var pf = {
        class: item.id == pfds[j].id ? "pf selected" : "pf",
        href:
          item.id == pfds[j].id
            ? "javascript:void(0)"
            : 'javascript: selectPf("' + item.name + '","' + pfds[j].id + '")',
        title: getPfTitle(pfds[j], item.id == pfds[j].id ? info : null),
      };
      outitem.pf.push(pf);
    }
    for (var j = 0; j < item.m.length; j++) {
      var m = {
        class: info.name == item.m[j].name ? "m selected" : "m",
        itemName: item.name,
        href:
          info.name == item.m[j].name
            ? "javascript:void(0)"
            : 'javascript: selectM("' + item.id + '","' + item.m[j].name + '")',
        name: item.m[j].name,
        title: "设备速度:" + item.m[j].speed.toFixed(pointLength),
        showName: item.m[j].name.replace("制作台", ""),
      };
      if (m.showName == "采矿机") {
        m.title += " 采矿机按6个矿脉计算(因所限传送带速度最高30)";
      }
      if (m.showName == "大型采矿机") {
        m.title += " 大型采矿机按20个矿脉计算";
      }
      if (m.showName == "矿脉") {
        m.title += " (速度最高30)";
      }
      outitem.m.push(m);
    }
    var accType = (settings[item.id] || {}).accType || defaultAccType;
    var accValue = (settings[item.id] || {}).accValue || defaultAccValue;
    if (accValue == "增产" && item.noExtra) accValue = "无";
    if (item.q.length == 0 || item.noExtra === null) accValue = "无";

    ["增产剂Mk.Ⅰ", "增产剂Mk.Ⅱ", "增产剂Mk.Ⅲ"].forEach(function (one) {
      outitem.accType.push({
        class: one == accType ? "m selected" : "m",
        itemName: item.name,
        href: one == accType ? "javascript:void(0)" : 'javascript: selectAccType("' + item.id + '","' + one + '")',
        name: one,
        title: one,
        showName: one.replace("增产剂", ""),
      });
    });

    ["无", "加速", "增产"].forEach(function (one) {
      if (one != "无" && (item.q.length == 0 || item.noExtra === null)) return;
      if (one == "增产" && item.noExtra) return;
      outitem.accValue.push({
        class: one == accValue ? "m selected" : "m",
        itemName: item.name,
        href: one == accValue ? "javascript:void(0)" : 'javascript: selectAccValue("' + item.id + '","' + one + '")',
        name: one,
        title: one,
        showName: one,
      });
    });

    items.push(outitem);
  }

  for (var i = 0; i < out_list.length; i++) {
    if (!out_list[i].value) continue;
    var item = find(out_list[i].name);
    var info = getValue(out_list[i].name);
    var outitem = {
      name: out_list[i].name,
      number1: out_list[i].value.toFixed(pointLength),
      number2: out_list[i].value2 ? out_list[i].value2.toFixed(pointLength) : "",
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: "outrow",
      m: [],
      pf: [],
    };
    items2.push(outitem);
  }
  app.items0 = items0;
  app.xqs = xqs;
  app.items = items;
  app.items2 = items2;
  app.total = total;
  app.ig_names = ig_names;
  var energy = 0;
  for (var i = 0; i < total.length; i++) {
    energy += total[i].energy || 0;
  }
  app.totalEnergy = energy.toFixed(pointLength);
  var space = 0;
  for (var i = 0; i < total.length; ++i) {
    space += total[i].space || 0;
  }
  app.totalSpace = space;
  app.totalAcc = totalAcc.toFixed(2);
}
function selectM(id, m) {
  settings[id] = settings[id] || {};
  settings[id].m = m;
  saveSetting();
  update_all();
}
function selectAccType(id, accType) {
  settings[id] = settings[id] || {};
  settings[id].accType = accType;
  saveSetting();
  update_all();
}
function selectAccValue(id, accValue) {
  settings[id] = settings[id] || {};
  settings[id].accValue = accValue;
  saveSetting();
  update_all();
}
function selectPf(name, value) {
  let old_settings_pf = $.extend(true, {}, settings_pf);
  try {
    settings_pf[name] = parseInt(value);
    update_all();
  } catch (e) {
    settings_pf = old_settings_pf;
    update_all();
    if (e.name == "RangeError") {
      cocoMessage.warning(
        "无法切换到X射线裂解(制氢)/重整精炼(制精炼油)公式？请尝试先将对应的另一条(分别为制精炼油/制氢)默认公式切换为其他公式。",
        6000
      );
    }
    throw e;
  }
  saveSettingPf();
}
function f_tag(obj) {
  var jrow = $(obj).parents("tr:first");
  if (jrow.hasClass("row-tag")) {
    jrow.removeClass("row-tag");
  } else {
    jrow.addClass("row-tag");
  }
}
function f_ig(obj) {
  var name = $(obj).attr("data-name");
  ig_names.push(name);

  update_all();
}
function f_ig_acc() {
  ["增产剂Mk.Ⅰ", "增产剂Mk.Ⅱ", "增产剂Mk.Ⅲ"].forEach(function (one) {
    if (ig_names.indexOf(one) < 0) ig_names.push(one);
  });
  update_all();
}
function f_reset() {
  xqs = [];
  singleMake = [];
  app.xps_editor_index = -1;
  app.items_editor_index = -1;

  update_all();
}
function f_reset_ig() {
  ig_names = [];

  update_all();
}
function f_remove_ig(name) {
  ig_names = ig_names.filter(function (one) {
    return one != name;
  });
  update_all();
}
function projectsUpdate() {
  $("#selprojects").html("");
  $(projects).each(function () {
    $("#selprojects").append("<option value='" + this.name + "'>" + this.name + "</option>");
  });
  if (projects.length) {
    $("#projectdiv").show();
  } else {
    $("#projectdiv").hide();
  }
}
function f_save() {
  let index = 0;
  let product_settings = {};
  var name = prompt("输入方案名");
  if (!name) return;
  for (index = 0; index < projects.length; index++) {
    // 存在相同名称的方案
    if (projects[index].name == name) {
      // 用户取消保存
      if (!confirm(`已存在名为${name}的方案，继续保存将覆盖原方案`)) {
        return;
      }
      break;
    }
  }
  // TODO: 优化处理方案
  for (let item of app.items) {
    let product_setting = {};
    for (let accType of item.accType) {
      if (accType.class === "m selected") {
        product_setting.accType = accType.name;
      }
    }
    for (let accValue of item.accValue) {
      if (accValue.class === "m selected") {
        product_setting.accValue = accValue.name;
      }
    }
    for (let m of item.m) {
      if (m.class === "m selected") {
        product_setting.m = m.name;
      }
    }
    product_settings[find(item.name).id] = product_setting;
  }
  projects[index] = {
    name: name,
    singleMake: singleMake,
    ig_names: ig_names || [],
    value: xqs,
    // 增产剂和工厂类型设置
    settings: product_settings,
  };
  saveSettingProjects();
  projectsUpdate();
}
function f_add() {
  if (!isDataLoaded) {
    alert("游戏资源尚未加载完毕");
  }
  var $uiSelector = $("#UIselector");
  if ($uiSelector.hasClass("show")) {
    $uiSelector.removeClass("show");
    setTimeout(function () {
      $uiSelector.hide();
    }, 250);
  } else {
    $uiSelector.show();
    setTimeout(function () {
      $uiSelector.addClass("show");
    }, 10);
  }
}
function actions(that) {
  // console.log(that.value)
  if (!that.value) {
    return false;
  } else {
    window.open(that.value);
  }
}
function f_split(obj) {
  var name = $(obj).attr("data-name");

  $("#Split").html("<p>选择配方：</p>");
  var pfs = getPfs(name);
  if (pfs.length == 1) {
    alert("不存在多配方");
    return;
  }
  var selected = null;
  for (var i = 0; i < pfs.length; i++) {
    (function (i) {
      var jlink = $("<div class='split-pf'></div>");
      jlink.html(getPfTitle(pfs[i]));
      jlink.appendTo($("#Split")).click(function () {
        selected = pfs[i];
        $("#Split .split-pf").removeClass("split-pf-selected");
        jlink.addClass("split-pf-selected");
      });
    })(i);
  }
  $("#Split").append("<p>设备数量：</p>");
  $("#Split").append("<div><input type='text' value='1' class='split-number' /></div>");
  $("#Split").append("<div><button>确定</button> </div>");
  $("#Split")
    .find("button")
    .click(function () {
      if (!selected) {
        alert("未选择配方");
        return;
      }
      singleMake.push({
        id: selected.id,
        number: parseFloat($("#Split").find(":text").val()),
      });
      update_all();
      $("#Split").hide();
    });

  setTimeout(function () {
    $("#Split").show();
  }, 50);
}
var icons_define = {
  氢: [-1, 3, 7, "氢"],
  可燃冰: [-1, 2, 7, "可燃冰"],
};
var icons = {};
function f_initIcons() {
  var reg = /^(\d)-(\d{1,2})-(.*)+/;
  for (var i = 0; i < game_data.icons1.length; i++) {
    var icon = game_data.icons1[i];
    if (reg.test(icon.name)) {
      var x = icon.name.match(reg);
      icons[x[3]] = icon.value;
    } else {
      icons[icon.name] = icon.value;
    }
  }
  for (var i = 0; i < game_data.icons2.length; i++) {
    var icon = game_data.icons2[i];
    if (reg.test(icon.name)) {
      var x = icon.name.match(reg);
      icons[x[3]] = icon.value;
    } else {
      icons[icon.name] = icon.value;
    }
  }
  app.icons = Object.freeze(icons);
  $(document).click(function (e) {
    if (!$(e.target).closest("#UIselector").length) {
      $("#UIselector").hide();
    }
    if (!$(e.target).closest("#Split").length) {
      $("#Split").hide();
    }
  });
  $("#UIselector")
    .html(
      '<div id="selector" class="selector" style="width: ' + w + "px; height: " + h + 'px"><div id="tabs"></div></div>'
    )
    .hide();
  var w = 900;
  var h = 700;

  var jimg1 = $("<div class='tab selected'><img src='./img/component-icon.png'/></div>").appendTo("#tabs");
  var jimg2 = $("<div class='tab'><img src='./img/factory-icon.png'/></div>").appendTo("#tabs");

  jimg1.click(function () {
    jicons2.removeClass("icons-selected");
    jicons.addClass("icons-selected");
    jimg2.removeClass("selected");
    jimg1.addClass("selected");
  });
  jimg2.click(function () {
    jicons.removeClass("icons-selected");
    jicons2.addClass("icons-selected");
    jimg1.removeClass("selected");
    jimg2.addClass("selected");
  });

  var jicons = $('<div class="icons icons-selected"></div>').appendTo("#selector");
  addIcons(jicons, game_data.icons1);
  var jicons2 = $('<div class="icons"></div>').appendTo("#selector");
  addIcons(jicons2, game_data.icons2);

  function addIcons(jicons, icons) {
    jicons.width(w - 80).height(h - 150); //调整图形框架宽度/高度

    for (var i = 0; i < 9; i++) {
      var jrow = $("<div class='iconrow'></div>").appendTo(jicons);
      for (var j = 0; j < 14; j++) {
        var jicon = $("<div class='icon'><div class='s'></div></div>").appendTo(jrow);
        jicon.click(function () {
          var name = $(this).attr("data-name");
          if (!name) return;
          f_add3(name);
          var $uiSelector = $("#UIselector");
          $uiSelector.removeClass("show");
          setTimeout(function () {
            $uiSelector.hide();
          }, 250);
        });
      }
    }

    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var reg = /^(\d)-(\d{1,2})-(.*)+/;
      var x = null;
      if (reg.test(icon.name)) {
        x = icon.name.match(reg);
      } else if (icons_define[icon.name]) {
        x = icons_define[icon.name];
      }
      if (x) {
        jicons
          .find(">.iconrow:eq(" + (parseInt(x[1]) - 1) + ")")
          .find(">.icon:eq(" + (parseInt(x[2]) - 1) + ")")
          .html("")
          .append("<img src='data:image/png;base64," + icon.value + "' />")
          .attr("data-name", x[3])
          .attr("title", x[3]);
      }
    }
  }
}
