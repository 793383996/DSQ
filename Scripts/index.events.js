(function (root) {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function adjustInputWidth(input) {
    var value = Number.parseFloat(input.value);
    input.style.width = Number.isFinite(value) && value >= 999 ? "150px" : "70px";
  }

  function bindInputWidthById(id) {
    var input = document.getElementById(id);
    if (!input) return;
    adjustInputWidth(input);
    input.addEventListener("input", function () {
      adjustInputWidth(input);
    });
  }

  function bindMutualExclusiveCheckbox(primaryId, secondaryId) {
    var primary = document.getElementById(primaryId);
    var secondary = document.getElementById(secondaryId);
    if (!primary || !secondary) return;
    primary.addEventListener("change", function () {
      if (primary.checked) {
        secondary.checked = false;
      }
    });
  }

  function trackBusinessAction(eventName, attributes) {
    var tracker = root.PerformanceTracker;
    if (!tracker || typeof tracker.trackBusinessEvent !== "function") return;
    tracker.trackBusinessEvent(eventName, attributes || {}, "ui_funnel");
  }

  function trackPageView() {
    var locale = root.DSQI18n && typeof root.DSQI18n.getLocale === "function" ? root.DSQI18n.getLocale() : "unknown";
    trackBusinessAction("page_view", {
      path: location.pathname,
      locale: locale,
    });
  }

  function resolveTrackedClickEvent(action) {
    switch (action) {
      case "addRequirement":
        return "add_requirement_click";
      case "saveProject":
        return "save_project_click";
      case "generateBlueprint":
        return "generate_blueprint_click";
      default:
        return "";
    }
  }

  function handleTrackedClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;
    var actionNode = target.closest("[data-click-action]");
    if (!actionNode) return;
    var action = actionNode.getAttribute("data-click-action");
    var eventName = resolveTrackedClickEvent(action);
    if (!eventName) return;
    trackBusinessAction(eventName, { action: action });
  }

  function handleVersionSelectChange(selectNode) {
    var url = selectNode.value;
    if (!url) return;
    if (typeof root.actions === "function") {
      root.actions(selectNode);
      return;
    }
    if (typeof root.open === "function") {
      root.open(url, "_blank");
    }
  }

  onReady(function () {
    bindInputWidthById("txtnumber");
    bindInputWidthById("selmaince");
    trackPageView();

    bindMutualExclusiveCheckbox("onlySorterMk3", "useSorterMk4");
    bindMutualExclusiveCheckbox("useSorterMk4", "onlySorterMk3");

    document.addEventListener("change", function (event) {
      var versionSelect = event.target.closest("select[data-version-select]");
      if (!versionSelect) return;
      handleVersionSelectChange(versionSelect);
    });

    document.addEventListener("click", handleTrackedClick, true);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
