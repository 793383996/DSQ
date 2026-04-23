(function (root) {
  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  function deepClone(value) {
    if (!isObject(value)) {
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

  function safeParseJSON(raw, fallbackValue) {
    if (typeof raw !== "string" || raw.length === 0) {
      return fallbackValue;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return fallbackValue;
    }
  }

  function safeStringify(value, fallbackValue) {
    try {
      return JSON.stringify(value);
    } catch {
      return fallbackValue;
    }
  }

  function hasLocalStorage() {
    try {
      return !!root.localStorage;
    } catch {
      return false;
    }
  }

  function getLocalStorageItem(key) {
    if (!hasLocalStorage()) return null;
    try {
      return root.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setLocalStorageItem(key, value) {
    if (!hasLocalStorage()) return false;
    try {
      root.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeLocalStorageItem(key) {
    if (!hasLocalStorage()) return false;
    try {
      root.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function clearByPrefixes(prefixes) {
    if (!hasLocalStorage() || !Array.isArray(prefixes) || prefixes.length === 0) {
      return 0;
    }
    var keysToRemove = [];
    for (var i = 0; i < root.localStorage.length; i++) {
      var key = root.localStorage.key(i);
      if (!key) continue;
      for (var j = 0; j < prefixes.length; j++) {
        var prefix = prefixes[j];
        if (typeof prefix !== "string" || prefix.length === 0) continue;
        if (key.indexOf(prefix) === 0) {
          keysToRemove.push(key);
          break;
        }
      }
    }
    for (var m = 0; m < keysToRemove.length; m++) {
      removeLocalStorageItem(keysToRemove[m]);
    }
    return keysToRemove.length;
  }

  function createProjectSnapshot(project) {
    var source = project && isObject(project) ? project : {};
    return {
      name: typeof source.name === "string" ? source.name : "",
      singleMake: Array.isArray(source.singleMake) ? deepClone(source.singleMake) : [],
      ig_names: Array.isArray(source.ig_names) ? deepClone(source.ig_names) : [],
      value: Array.isArray(source.value) ? deepClone(source.value) : [],
      settings: isObject(source.settings) ? deepClone(source.settings) : {},
    };
  }

  function hydrateProjectForRuntime(project) {
    return createProjectSnapshot(project);
  }

  root.DSQServices = {
    deepClone: deepClone,
    safeParseJSON: safeParseJSON,
    safeStringify: safeStringify,
    storage: {
      hasLocalStorage: hasLocalStorage,
      getItem: getLocalStorageItem,
      setItem: setLocalStorageItem,
      removeItem: removeLocalStorageItem,
      clearByPrefixes: clearByPrefixes,
    },
    project: {
      createSnapshot: createProjectSnapshot,
      hydrateForRuntime: hydrateProjectForRuntime,
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
