(function (root) {
  function toArray(listLike) {
    return Array.prototype.slice.call(listLike || []);
  }

  function unique(elements) {
    var seen = new Set();
    var result = [];
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (!element || seen.has(element)) continue;
      seen.add(element);
      result.push(element);
    }
    return result;
  }

  function parseEqSelector(selector) {
    var match = selector.match(/^>\s*\.([a-zA-Z0-9_-]+):eq\((\d+)\)$/);
    if (!match) return null;
    return {
      className: match[1],
      index: Number.parseInt(match[2], 10) || 0,
    };
  }

  function parseHtml(input) {
    var template = document.createElement("template");
    template.innerHTML = input.trim();
    return toArray(template.content.childNodes);
  }

  function resolveElements(input) {
    if (!input) return [];
    if (input instanceof DomCollection) {
      return input.elements.slice();
    }
    if (typeof input === "string") {
      var trimmed = input.trim();
      if (!trimmed) return [];
      if (trimmed[0] === "<" && trimmed[trimmed.length - 1] === ">") {
        return parseHtml(trimmed);
      }
      return toArray(document.querySelectorAll(trimmed));
    }
    if (Array.isArray(input)) {
      return input.filter(Boolean);
    }
    if (input instanceof NodeList || input instanceof HTMLCollection) {
      return toArray(input);
    }
    if (input === window || input === document || input instanceof Element || input instanceof DocumentFragment) {
      return [input];
    }
    return [];
  }

  function getDisplayValue(element) {
    var computed = root.getComputedStyle ? root.getComputedStyle(element) : null;
    return computed ? computed.display : "";
  }

  function deepClone(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(deepClone);
    }
    var output = {};
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      output[key] = deepClone(value[key]);
    }
    return output;
  }

  function mergeDeep(target, source) {
    if (!source || typeof source !== "object") {
      return target;
    }
    var keys = Object.keys(source);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        mergeDeep(target[key], value);
        continue;
      }
      target[key] = deepClone(value);
    }
    return target;
  }

  function DomCollection(elements) {
    this.elements = unique(elements || []);
    this.length = this.elements.length;
    for (var i = 0; i < this.length; i++) {
      this[i] = this.elements[i];
    }
  }

  DomCollection.prototype.each = function (callback) {
    if (typeof callback !== "function") return this;
    for (var i = 0; i < this.elements.length; i++) {
      var element = this.elements[i];
      callback.call(element, i, element);
    }
    return this;
  };

  DomCollection.prototype.change = function (handler) {
    return this.on("change", handler);
  };

  DomCollection.prototype.click = function (handler) {
    return this.on("click", handler);
  };

  DomCollection.prototype.on = function (eventName, handler) {
    if (typeof handler !== "function") return this;
    return this.each(function () {
      this.addEventListener(eventName, handler);
    });
  };

  DomCollection.prototype.val = function (nextValue) {
    if (nextValue === undefined) {
      var first = this.elements[0];
      return first ? first.value : undefined;
    }
    return this.each(function () {
      this.value = nextValue;
    });
  };

  DomCollection.prototype.get = function (index) {
    return this.elements[index];
  };

  DomCollection.prototype.prop = function (name, nextValue) {
    if (nextValue === undefined) {
      var first = this.elements[0];
      return first ? first[name] : undefined;
    }
    return this.each(function () {
      this[name] = nextValue;
    });
  };

  DomCollection.prototype.attr = function (name, nextValue) {
    if (nextValue === undefined) {
      var first = this.elements[0];
      return first ? first.getAttribute(name) : undefined;
    }
    return this.each(function () {
      this.setAttribute(name, String(nextValue));
    });
  };

  DomCollection.prototype.removeAttr = function (name) {
    return this.each(function () {
      this.removeAttribute(name);
    });
  };

  DomCollection.prototype.data = function (name) {
    var first = this.elements[0];
    if (!first) return undefined;
    var direct = first.dataset ? first.dataset[name] : undefined;
    if (direct !== undefined) return direct;
    return first.getAttribute("data-" + name);
  };

  DomCollection.prototype.addClass = function (name) {
    return this.each(function () {
      this.classList.add(name);
    });
  };

  DomCollection.prototype.removeClass = function (name) {
    return this.each(function () {
      this.classList.remove(name);
    });
  };

  DomCollection.prototype.hasClass = function (name) {
    var first = this.elements[0];
    return !!(first && first.classList.contains(name));
  };

  DomCollection.prototype.show = function () {
    return this.each(function () {
      this.style.display = this.dataset && this.dataset.domLegacyDisplay ? this.dataset.domLegacyDisplay : "";
      if (this.hidden) {
        this.hidden = false;
      }
    });
  };

  DomCollection.prototype.hide = function () {
    return this.each(function () {
      if (this.dataset && !this.dataset.domLegacyDisplay) {
        this.dataset.domLegacyDisplay = getDisplayValue(this);
      }
      this.style.display = "none";
    });
  };

  DomCollection.prototype.is = function (selector) {
    var first = this.elements[0];
    if (!first || !selector) return false;
    if (selector === ":visible") {
      if (first.hidden) return false;
      var styles = root.getComputedStyle ? root.getComputedStyle(first) : null;
      return !!styles && styles.display !== "none" && styles.visibility !== "hidden" && styles.opacity !== "0";
    }
    if (typeof first.matches === "function") {
      return first.matches(selector);
    }
    return false;
  };

  DomCollection.prototype.parent = function () {
    var parents = [];
    this.each(function () {
      if (this.parentElement) {
        parents.push(this.parentElement);
      }
    });
    return new DomCollection(parents);
  };

  DomCollection.prototype.parents = function (selector) {
    var matched = [];
    this.each(function () {
      var node = this.parentElement;
      while (node) {
        if (!selector || node.matches(selector.replace(":first", ""))) {
          matched.push(node);
          if (selector && selector.indexOf(":first") !== -1) {
            break;
          }
        }
        node = node.parentElement;
      }
    });
    return new DomCollection(matched);
  };

  DomCollection.prototype.html = function (nextValue) {
    if (nextValue === undefined) {
      var first = this.elements[0];
      return first ? first.innerHTML : "";
    }
    return this.each(function () {
      this.innerHTML = nextValue;
    });
  };

  DomCollection.prototype.append = function (content) {
    return this.each(function () {
      if (typeof content === "string") {
        this.insertAdjacentHTML("beforeend", content);
        return;
      }
      var appendItems = resolveElements(content);
      for (var i = 0; i < appendItems.length; i++) {
        this.appendChild(appendItems[i]);
      }
    });
  };

  DomCollection.prototype.appendTo = function (target) {
    var targetElements = resolveElements(target);
    if (!targetElements.length) return this;
    var parent = targetElements[0];
    for (var i = 0; i < this.elements.length; i++) {
      parent.appendChild(this.elements[i]);
    }
    return this;
  };

  DomCollection.prototype.find = function (selector) {
    if (!selector) return new DomCollection([]);
    var found = [];
    var eqSelector = parseEqSelector(selector);
    this.each(function () {
      if (eqSelector) {
        var directChildren = toArray(this.children).filter(function (child) {
          return child.classList.contains(eqSelector.className);
        });
        if (directChildren[eqSelector.index]) {
          found.push(directChildren[eqSelector.index]);
        }
        return;
      }

      if (selector === ":text") {
        var textInput = this.querySelector('input[type="text"]');
        if (textInput) {
          found.push(textInput);
        }
        return;
      }

      var query = selector;
      if (selector.indexOf(">") === 0) {
        query = ":scope " + selector;
      }
      found = found.concat(toArray(this.querySelectorAll(query)));
    });
    return new DomCollection(found);
  };

  DomCollection.prototype.css = function (styles, value) {
    if (!styles) return this;
    if (typeof styles === "string") {
      return this.each(function () {
        this.style[styles] = value;
      });
    }
    var keys = Object.keys(styles);
    return this.each(function () {
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        this.style[key] = styles[key];
      }
    });
  };

  DomCollection.prototype.width = function (value) {
    if (value === undefined) {
      var first = this.elements[0];
      return first ? first.getBoundingClientRect().width : 0;
    }
    var finalValue = typeof value === "number" ? value + "px" : String(value);
    return this.each(function () {
      this.style.width = finalValue;
    });
  };

  DomCollection.prototype.remove = function () {
    return this.each(function () {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    });
  };

  function dom(input) {
    return new DomCollection(resolveElements(input));
  }

  dom.inArray = function (value, array) {
    if (!Array.isArray(array)) return -1;
    return array.indexOf(value);
  };

  dom.extend = function (deep, target) {
    var sources = [];
    var startIndex = 2;
    if (typeof deep !== "boolean") {
      sources = Array.prototype.slice.call(arguments, 1);
      target = deep || {};
      deep = false;
      startIndex = 1;
    } else {
      sources = Array.prototype.slice.call(arguments, startIndex);
      target = target || {};
    }

    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source || typeof source !== "object") continue;
      if (deep) {
        mergeDeep(target, source);
      } else {
        var keys = Object.keys(source);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          target[key] = source[key];
        }
      }
    }
    return target;
  };

  dom.deepClone = deepClone;

  root.DSQDom = dom;
})(typeof globalThis !== "undefined" ? globalThis : window);
