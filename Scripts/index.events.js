(function (root) {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function adjustInputWidth(input) {
    const value = Number.parseFloat(input.value);
    input.style.width = Number.isFinite(value) && value >= 999 ? "150px" : "70px";
  }

  function bindInputWidthById(id) {
    const input = document.getElementById(id);
    if (!input) {
      return;
    }
    adjustInputWidth(input);
    input.addEventListener("input", () => {
      adjustInputWidth(input);
    });
  }

  function bindMutualExclusiveCheckbox(primaryId, secondaryId) {
    const primary = document.getElementById(primaryId);
    const secondary = document.getElementById(secondaryId);
    if (!primary || !secondary) {
      return;
    }
    primary.addEventListener("change", () => {
      if (primary.checked) {
        secondary.checked = false;
      }
    });
  }

  function handleOpActionLink(link) {
    const action = link.getAttribute("data-action");
    if (!action) {
      return;
    }
    if (action === "ig" && typeof root.f_ig === "function") {
      root.f_ig(link);
      return;
    }
    if (action === "split" && typeof root.f_split === "function") {
      root.f_split(link);
      return;
    }
    if (action === "tag" && typeof root.f_tag === "function") {
      root.f_tag(link);
    }
  }

  function trackBusinessAction(eventName, attributes = {}) {
    const tracker = root.PerformanceTracker;
    if (!tracker || typeof tracker.trackBusinessEvent !== "function") {
      return;
    }
    tracker.trackBusinessEvent(eventName, attributes, "ui_funnel");
  }

  function trackPageView() {
    const locale = root.DSQI18n && typeof root.DSQI18n.getLocale === "function" ? root.DSQI18n.getLocale() : "unknown";
    trackBusinessAction("page_view", {
      path: location.pathname,
      locale,
    });
  }

  function handleClickAction(action) {
    if (action === "addRequirement" && typeof root.f_add === "function") {
      trackBusinessAction("add_requirement_click", { action });
      root.f_add();
      return;
    }
    if (action === "resetRequirement" && typeof root.f_reset === "function") {
      trackBusinessAction("reset_requirement_click", { action });
      root.f_reset();
      return;
    }
    if (action === "saveProject" && typeof root.f_save === "function") {
      trackBusinessAction("save_project_click", { action });
      root.f_save();
      return;
    }
    if (action === "generateBlueprint" && typeof root.generateBlueprint === "function") {
      trackBusinessAction("generate_blueprint_click", { action });
      root.generateBlueprint();
      return;
    }
    if (action === "resetExclude" && typeof root.f_reset_ig === "function") {
      trackBusinessAction("reset_exclude_click", { action });
      root.f_reset_ig();
      return;
    }
    if (action === "excludeAccLine" && typeof root.f_ig_acc === "function") {
      trackBusinessAction("exclude_acc_line_click", { action });
      root.f_ig_acc();
    }
  }

  function handleVersionSelectChange(selectNode) {
    const url = selectNode.value;
    if (!url) {
      return;
    }
    if (typeof root.actions === "function") {
      root.actions(selectNode);
      return;
    }
    if (typeof root.open === "function") {
      root.open(url, "_blank");
    }
  }

  onReady(() => {
    bindInputWidthById("txtnumber");
    bindInputWidthById("selmaince");
    trackPageView();

    bindMutualExclusiveCheckbox("onlySorterMk3", "useSorterMk4");
    bindMutualExclusiveCheckbox("useSorterMk4", "onlySorterMk3");

    document.addEventListener("click", event => {
      const link = event.target.closest("a[data-action]");
      if (!link) {
        const actionNode = event.target.closest("[data-click-action]");
        if (!actionNode) {
          return;
        }
        event.preventDefault();
        handleClickAction(actionNode.getAttribute("data-click-action"));
        return;
      }
      event.preventDefault();
      handleOpActionLink(link);
    });

    document.addEventListener("change", event => {
      const versionSelect = event.target.closest("select[data-version-select]");
      if (!versionSelect) {
        return;
      }
      handleVersionSelectChange(versionSelect);
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
