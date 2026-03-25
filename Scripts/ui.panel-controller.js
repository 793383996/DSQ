(function (root) {
  var FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function toElement(value) {
    if (!value) return null;
    if (typeof value === "string") {
      return document.querySelector(value);
    }
    if (value.nodeType === 1) {
      return value;
    }
    return null;
  }

  function isVisible(node) {
    if (!node) return false;
    if (node.hidden) return false;
    var style = root.getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function isFocusable(node) {
    if (!node) return false;
    if (node.disabled) return false;
    if (node.tabIndex < 0) return false;
    return isVisible(node);
  }

  function getFocusableNodes(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusable);
  }

  function parseTimeToMs(value) {
    if (!value) return 0;
    var segments = String(value).split(",");
    var max = 0;
    for (var i = 0; i < segments.length; i++) {
      var one = segments[i].trim();
      if (!one) continue;
      if (one.endsWith("ms")) {
        max = Math.max(max, parseFloat(one) || 0);
        continue;
      }
      if (one.endsWith("s")) {
        max = Math.max(max, (parseFloat(one) || 0) * 1000);
      }
    }
    return max;
  }

  function getTransitionTotalMs(element) {
    var style = root.getComputedStyle(element);
    var durationMs = parseTimeToMs(style.transitionDuration);
    var delayMs = parseTimeToMs(style.transitionDelay);
    return durationMs + delayMs;
  }

  function isOrContains(parent, target) {
    if (!parent || !target) return false;
    return parent === target || parent.contains(target);
  }

  function createDescriptor(id, options) {
    var defaults = {
      element: null,
      openClass: "is-open",
      animated: true,
      closeOnOutsideClick: false,
      closeOnEscape: false,
      trapFocus: false,
      restoreFocus: true,
      triggerSelector: null,
      initialFocusSelector: null,
      isDialog: false,
    };
    var descriptor = Object.assign({}, defaults, options || {});
    descriptor.id = id;
    descriptor.element = toElement(descriptor.element);
    descriptor.state = "closed";
    descriptor.lastTrigger = null;
    descriptor.transitionToken = 0;
    return descriptor;
  }

  var PanelController = {
    _panels: {},
    _openOrder: [],
    _initialized: false,

    init: function () {
      if (this._initialized) return;
      var that = this;
      document.addEventListener("pointerdown", function (event) {
        that._handlePointerDown(event);
      });
      document.addEventListener("keydown", function (event) {
        that._handleKeydown(event);
      });
      this._initialized = true;
    },

    register: function (id, options) {
      this.init();
      var descriptor = createDescriptor(id, options);
      if (!descriptor.element) {
        return null;
      }
      descriptor.element.setAttribute("data-panel-id", id);
      descriptor.element.setAttribute("data-panel-managed", "true");
      if (!descriptor.element.hasAttribute("aria-hidden")) {
        descriptor.element.setAttribute("aria-hidden", "true");
      }
      if (descriptor.element.hidden !== true) {
        descriptor.element.hidden = true;
      }
      descriptor.element.classList.remove("show");
      descriptor.element.classList.remove(descriptor.openClass);
      descriptor.state = "closed";
      this._panels[id] = descriptor;
      this._syncTriggerAria(descriptor, false);
      return descriptor;
    },

    isOpen: function (id) {
      var descriptor = this._panels[id];
      if (!descriptor || !descriptor.element) return false;
      return descriptor.state === "open" || descriptor.state === "opening";
    },

    open: function (id, options) {
      var descriptor = this._panels[id];
      if (!descriptor || !descriptor.element) return false;
      this.init();

      var panel = descriptor.element;
      var triggerElement =
        toElement(options && options.triggerElement) || descriptor.lastTrigger || document.activeElement;
      if (triggerElement) {
        descriptor.lastTrigger = triggerElement;
      }

      if (descriptor.isDialog) {
        this._closeOtherDialogs(id);
      }

      descriptor.transitionToken += 1;
      panel.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      panel.classList.remove("show");
      panel.classList.remove("panel-closing");
      descriptor.state = "opening";
      this._ensureInOpenOrder(id);
      this._syncTriggerAria(descriptor, true);

      var token = descriptor.transitionToken;
      var that = this;
      root.requestAnimationFrame(function () {
        if (!that._panels[id] || that._panels[id].transitionToken !== token) {
          return;
        }
        panel.classList.add(descriptor.openClass);
        descriptor.state = "open";
        that._focusOnOpen(descriptor, options);
      });
      return true;
    },

    close: function (id, options) {
      var descriptor = this._panels[id];
      if (!descriptor || !descriptor.element) return false;
      var panel = descriptor.element;
      descriptor.transitionToken += 1;
      panel.setAttribute("aria-hidden", "true");
      this._removeFromOpenOrder(id);
      this._syncTriggerAria(descriptor, false);

      var shouldRestoreFocus =
        options && Object.prototype.hasOwnProperty.call(options, "restoreFocus")
          ? options.restoreFocus
          : descriptor.restoreFocus;
      var triggerToRestore = descriptor.lastTrigger;
      var that = this;
      var token = descriptor.transitionToken;

      function finalizeClose() {
        if (!that._panels[id] || that._panels[id].transitionToken !== token) {
          return;
        }
        panel.hidden = true;
        panel.classList.remove(descriptor.openClass);
        panel.classList.remove("show");
        panel.classList.remove("panel-closing");
        descriptor.state = "closed";
        if (
          shouldRestoreFocus &&
          triggerToRestore &&
          document.contains(triggerToRestore) &&
          typeof triggerToRestore.focus === "function"
        ) {
          triggerToRestore.focus();
        }
      }

      var hadOpenClass = panel.classList.contains(descriptor.openClass);
      panel.classList.remove(descriptor.openClass);
      panel.classList.remove("show");

      if (!descriptor.animated || !hadOpenClass) {
        finalizeClose();
        return true;
      }

      panel.classList.add("panel-closing");
      descriptor.state = "closing";

      if (getTransitionTotalMs(panel) <= 0) {
        finalizeClose();
        return true;
      }

      var done = false;
      var onTransitionEnd = function (event) {
        if (event.target !== panel) return;
        if (done) return;
        done = true;
        panel.removeEventListener("transitionend", onTransitionEnd);
        panel.removeEventListener("transitioncancel", onTransitionEnd);
        finalizeClose();
      };
      panel.addEventListener("transitionend", onTransitionEnd);
      panel.addEventListener("transitioncancel", onTransitionEnd);
      return true;
    },

    toggle: function (id, options) {
      if (this.isOpen(id)) {
        return this.close(id, options);
      }
      return this.open(id, options);
    },

    closeAll: function () {
      for (var id in this._panels) {
        if (!Object.prototype.hasOwnProperty.call(this._panels, id)) continue;
        this.close(id, { restoreFocus: false });
      }
    },

    _closeOtherDialogs: function (keepId) {
      for (var id in this._panels) {
        if (!Object.prototype.hasOwnProperty.call(this._panels, id)) continue;
        if (id === keepId) continue;
        var descriptor = this._panels[id];
        if (!descriptor.isDialog) continue;
        if (!this.isOpen(id)) continue;
        this.close(id, { restoreFocus: false });
      }
    },

    _focusOnOpen: function (descriptor, options) {
      if (!descriptor.trapFocus) return;
      var panel = descriptor.element;
      var initialSelector = (options && options.initialFocusSelector) || descriptor.initialFocusSelector;
      var target = initialSelector ? panel.querySelector(initialSelector) : null;
      if (!target || !isFocusable(target)) {
        var focusableNodes = getFocusableNodes(panel);
        target = focusableNodes.length ? focusableNodes[0] : panel;
      }
      if (typeof target.focus === "function") {
        target.focus();
      }
    },

    _handlePointerDown: function (event) {
      var target = event.target;
      var openPanels = this._openOrder.slice().reverse();
      for (var i = 0; i < openPanels.length; i++) {
        var descriptor = this._panels[openPanels[i]];
        if (!descriptor || !descriptor.closeOnOutsideClick || !this.isOpen(descriptor.id)) continue;
        if (isOrContains(descriptor.element, target)) return;
        if (this._isTriggerTarget(descriptor, target)) return;
        this.close(descriptor.id, { restoreFocus: false });
        return;
      }
    },

    _handleKeydown: function (event) {
      var descriptor = this._getTopDialog();
      if (!descriptor) return;
      if (event.key === "Escape") {
        if (!descriptor.closeOnEscape) return;
        event.preventDefault();
        this.close(descriptor.id);
        return;
      }
      if (event.key !== "Tab" || !descriptor.trapFocus) return;
      this._trapFocus(descriptor, event);
    },

    _trapFocus: function (descriptor, event) {
      var panel = descriptor.element;
      var focusableNodes = getFocusableNodes(panel);
      if (!focusableNodes.length) {
        event.preventDefault();
        if (typeof panel.focus === "function") {
          panel.focus();
        }
        return;
      }
      var first = focusableNodes[0];
      var last = focusableNodes[focusableNodes.length - 1];
      var active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    },

    _getTopDialog: function () {
      for (var i = this._openOrder.length - 1; i >= 0; i--) {
        var descriptor = this._panels[this._openOrder[i]];
        if (!descriptor || !descriptor.isDialog) continue;
        if (this.isOpen(descriptor.id)) return descriptor;
      }
      return null;
    },

    _resolveTriggerNodes: function (descriptor) {
      var nodes = [];
      var selectors = toArray(descriptor.triggerSelector);
      for (var i = 0; i < selectors.length; i++) {
        var selector = selectors[i];
        if (!selector || typeof selector !== "string") continue;
        var matched = document.querySelectorAll(selector);
        for (var j = 0; j < matched.length; j++) {
          nodes.push(matched[j]);
        }
      }
      if (descriptor.lastTrigger) {
        nodes.push(descriptor.lastTrigger);
      }
      return nodes;
    },

    _syncTriggerAria: function (descriptor, expanded) {
      var nodes = this._resolveTriggerNodes(descriptor);
      var processed = [];
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node || processed.indexOf(node) >= 0) continue;
        processed.push(node);
        node.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    },

    _isTriggerTarget: function (descriptor, target) {
      var nodes = this._resolveTriggerNodes(descriptor);
      for (var i = 0; i < nodes.length; i++) {
        if (isOrContains(nodes[i], target)) {
          return true;
        }
      }
      return false;
    },

    _ensureInOpenOrder: function (id) {
      this._removeFromOpenOrder(id);
      this._openOrder.push(id);
    },

    _removeFromOpenOrder: function (id) {
      this._openOrder = this._openOrder.filter(function (openId) {
        return openId !== id;
      });
    },
  };

  root.DSQPanelController = PanelController;
})(typeof globalThis !== "undefined" ? globalThis : window);
