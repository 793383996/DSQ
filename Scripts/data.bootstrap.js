(function (root) {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function i18nBootstrapText(key, fallback) {
    if (root.DSQI18n && typeof root.DSQI18n.t === "function") {
      return root.DSQI18n.t(key, null, fallback);
    }
    return fallback;
  }

  async function loadGameData() {
    try {
      var response = await fetch("./Scripts/data.json?v" + root.version, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("data.json request failed: " + response.status);
      }
      var data = await response.json();
      root.game_data = data;
      root.isDataLoaded = true;
      if (typeof root.f_initIcons === "function") {
        root.f_initIcons({ mapOnly: true });
      }
    } catch (error) {
      console.error("data.bootstrap: failed to load game data.", error);
      alert(i18nBootstrapText("alert.data_load_failed", "游戏资源加载失败，图标将无法显示正常，请刷新再试"));
    }
  }

  onReady(function () {
    loadGameData()
      .catch(function () {
        // loadGameData already handles user-facing errors.
      })
      .finally(function () {
        if (typeof root.f_init === "function") {
          root.f_init();
        }
      });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
