$(function () {
  function i18nBootstrapText(key, fallback) {
    if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
      return window.DSQI18n.t(key, null, fallback);
    }
    return fallback;
  }

  $.ajax({
    url: "./Scripts/data.json?v" + window.version,
    dataType: "json",
    timeout: 1000000,
    success: function (data) {
      window.game_data = data;
      window.isDataLoaded = true;
      window.f_initIcons({ mapOnly: true });
    },
    error: function () {
      alert(i18nBootstrapText("alert.data_load_failed", "游戏资源加载失败，图标将无法显示正常，请刷新再试"));
    },
  });

  window.f_init();
});
