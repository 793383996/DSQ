(function (root) {
  var includeBatchId = 0;
  var includeAbortController = null;
  var includeRetryTimer = null;
  var INCLUDE_RETRY_DELAY_MS = 400;
  var INCLUDE_MAX_ATTEMPTS = 2;

  function getQuoteIncludeState() {
    if (!root.__DSQQuoteIncludeState || typeof root.__DSQQuoteIncludeState !== "object") {
      root.__DSQQuoteIncludeState = {
        updata: "",
        explanation: "",
      };
    }
    return root.__DSQQuoteIncludeState;
  }

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

  function isAbortError(error) {
    return !!error && error.name === "AbortError";
  }

  async function fetchHtml(pathname, signal) {
    var response = await fetch(pathname, { signal: signal });
    if (!response.ok) {
      throw new Error("include load failed: " + response.status + " " + pathname);
    }
    return response.text();
  }

  async function loadIncludeNode(node, signal) {
    var includeName = node.getAttribute("data-include");
    if (!includeName) return { node: node, html: "", success: true };
    var pathInfo = resolveQuoteIncludePath(includeName);
    try {
      return {
        node: node,
        html: await fetchHtml(pathInfo.primary, signal),
        success: true,
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (!pathInfo.fallback) {
        console.warn("index.events: include load failed.", includeName, error);
        return { node: node, html: null, success: false };
      }
    }

    try {
      return {
        node: node,
        html: await fetchHtml(pathInfo.fallback, signal),
        success: true,
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.warn("index.events: include fallback load failed.", includeName, error);
      return { node: node, html: null, success: false };
    }
  }

  function commitIncludeHtml(node, html) {
    var includeName = node && typeof node.getAttribute === "function" ? node.getAttribute("data-include") : "";
    var state = getQuoteIncludeState();
    if (includeName) {
      state[includeName] = html;
    }
    if (root.app && root.app.quoteIncludes && includeName in root.app.quoteIncludes) {
      root.app.quoteIncludes[includeName] = html;
      return;
    }
    if (node) {
      node.innerHTML = html;
    }
  }

  function clearIncludeRetryTimer() {
    if (!includeRetryTimer) {
      return;
    }
    clearTimeout(includeRetryTimer);
    includeRetryTimer = null;
  }

  function scheduleQuoteIncludeRetry(attempt, batchId) {
    if (attempt >= INCLUDE_MAX_ATTEMPTS) {
      return;
    }
    clearIncludeRetryTimer();
    includeRetryTimer = setTimeout(function () {
      if (batchId !== includeBatchId) {
        return;
      }
      loadQuoteIncludes({ attempt: attempt + 1 });
    }, INCLUDE_RETRY_DELAY_MS);
  }

  async function loadQuoteIncludes(options) {
    var normalizedOptions = options && typeof options === "object" ? options : {};
    var attempt = typeof normalizedOptions.attempt === "number" ? normalizedOptions.attempt : 1;
    includeBatchId += 1;
    var batchId = includeBatchId;
    clearIncludeRetryTimer();
    if (includeAbortController) {
      includeAbortController.abort();
    }
    includeAbortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    var signal = includeAbortController ? includeAbortController.signal : undefined;
    var includes = Array.from(document.querySelectorAll("[data-include]"));
    try {
      var results = await Promise.all(
        includes.map(function (node) {
          return loadIncludeNode(node, signal);
        })
      );
      if (batchId !== includeBatchId) {
        return;
      }
      var hasFailures = false;
      for (var i = 0; i < results.length; i++) {
        if (results[i].success === false) {
          hasFailures = true;
          continue;
        }
        commitIncludeHtml(results[i].node, results[i].html);
      }
      if (hasFailures) {
        scheduleQuoteIncludeRetry(attempt, batchId);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.warn("index.events: include batch load failed.", error);
      scheduleQuoteIncludeRetry(attempt, batchId);
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
