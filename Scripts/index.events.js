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

  function handleOpActionLink(link) {
    var action = link.getAttribute("data-action");
    if (!action) return;
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

  function resolveQuoteIncludePath(name) {
    var locale = root.DSQI18n && typeof root.DSQI18n.getLocale === "function" ? root.DSQI18n.getLocale() : "zh-CN";
    var localized = "quote/" + name + "." + locale + ".html";
    var fallback = "quote/" + name + ".html";
    if (locale === "zh-CN") {
      return { primary: fallback, fallback: null };
    }
    return { primary: localized, fallback: fallback };
  }

  async function fetchHtml(pathname) {
    var response = await fetch(pathname, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("include load failed: " + response.status + " " + pathname);
    }
    return response.text();
  }

  async function loadIncludeNode(node) {
    var includeName = node.getAttribute("data-include");
    if (!includeName) return;
    var pathInfo = resolveQuoteIncludePath(includeName);
    try {
      node.innerHTML = await fetchHtml(pathInfo.primary);
      return;
    } catch (error) {
      if (!pathInfo.fallback) {
        console.warn("index.events: include load failed.", includeName, error);
        node.innerHTML = "";
        return;
      }
    }

    try {
      node.innerHTML = await fetchHtml(pathInfo.fallback);
    } catch (error) {
      console.warn("index.events: include fallback load failed.", includeName, error);
      node.innerHTML = "";
    }
  }

  async function loadQuoteIncludes() {
    var includes = Array.from(document.querySelectorAll("[data-include]"));
    for (var i = 0; i < includes.length; i++) {
      await loadIncludeNode(includes[i]);
    }
  }

  function handleClickAction(action) {
    if (action === "addRequirement" && typeof root.f_add === "function") {
      trackBusinessAction("add_requirement_click", { action: action });
      root.f_add();
      return;
    }
    if (action === "resetRequirement" && typeof root.f_reset === "function") {
      trackBusinessAction("reset_requirement_click", { action: action });
      root.f_reset();
      return;
    }
    if (action === "saveProject" && typeof root.f_save === "function") {
      trackBusinessAction("save_project_click", { action: action });
      root.f_save();
      return;
    }
    if (action === "generateBlueprint" && typeof root.generateBlueprint === "function") {
      trackBusinessAction("generate_blueprint_click", { action: action });
      root.generateBlueprint();
      return;
    }
    if (action === "resetExclude" && typeof root.f_reset_ig === "function") {
      trackBusinessAction("reset_exclude_click", { action: action });
      root.f_reset_ig();
      return;
    }
    if (action === "excludeAccLine" && typeof root.f_ig_acc === "function") {
      trackBusinessAction("exclude_acc_line_click", { action: action });
      root.f_ig_acc();
    }
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
    loadQuoteIncludes();
    trackPageView();

    bindMutualExclusiveCheckbox("onlySorterMk3", "useSorterMk4");
    bindMutualExclusiveCheckbox("useSorterMk4", "onlySorterMk3");

    document.addEventListener("click", function (event) {
      var link = event.target.closest("a[data-action]");
      if (!link) {
        var actionNode = event.target.closest("[data-click-action]");
        if (!actionNode) return;
        event.preventDefault();
        handleClickAction(actionNode.getAttribute("data-click-action"));
        return;
      }
      event.preventDefault();
      handleOpActionLink(link);
    });

    document.addEventListener("change", function (event) {
      var versionSelect = event.target.closest("select[data-version-select]");
      if (!versionSelect) return;
      handleVersionSelectChange(versionSelect);
    });

    root.addEventListener("dsq:locale-changed", function () {
      loadQuoteIncludes();
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
