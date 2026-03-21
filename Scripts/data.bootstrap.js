$(function () {
  $.ajax({
    url: "./Scripts/data.json?v" + window.version,
    dataType: "json",
    timeout: 1000000,
    success: function (data) {
      window.game_data = data;
      window.isDataLoaded = true;
      window.f_initIcons();
    },
    error: function () {
      alert("游戏资源加载失败，图标将无法显示正常，请刷新再试");
    },
  });

  window.f_init();
});
