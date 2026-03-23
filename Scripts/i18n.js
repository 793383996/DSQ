(function () {
  const STORAGE_KEY = "dsq_locale";
  const DEFAULT_LOCALE = "zh-CN";
  const SUPPORTED_LOCALES = new Set(["zh-CN", "en-US"]);
  const localeCache = {};
  let currentLocale = DEFAULT_LOCALE;

  function safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage write errors
    }
  }

  function normalizeLocale(locale) {
    if (typeof locale !== "string") {
      return DEFAULT_LOCALE;
    }
    const trimmed = locale.trim();
    if (SUPPORTED_LOCALES.has(trimmed)) {
      return trimmed;
    }

    const lowered = trimmed.toLowerCase();
    if (lowered.startsWith("zh")) {
      return "zh-CN";
    }
    if (lowered.startsWith("en")) {
      return "en-US";
    }
    return DEFAULT_LOCALE;
  }

  function getInitialLocale() {
    const stored = safeGetLocalStorage(STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      return normalizeLocale(navigator.language);
    }
    return DEFAULT_LOCALE;
  }

  async function loadDictionary(locale) {
    if (localeCache[locale]) {
      return localeCache[locale];
    }
    const response = await fetch(`./locales/${locale}.json`, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`i18n failed to load locale "${locale}"`);
    }
    const dictionary = await response.json();
    localeCache[locale] = dictionary;
    return dictionary;
  }

  function textOf(dictionary, key) {
    if (!dictionary || typeof dictionary !== "object") {
      return "";
    }
    const value = dictionary[key];
    return typeof value === "string" ? value : "";
  }

  function applyMeta(dictionary) {
    const title = textOf(dictionary, "meta.title");
    if (title) {
      document.title = title;
    }
    const description = document.querySelector('meta[name="description"]');
    const descriptionText = textOf(dictionary, "meta.description");
    if (description && descriptionText) {
      description.setAttribute("content", descriptionText);
    }
  }

  function applyDomText(dictionary) {
    document.querySelectorAll("[data-i18n]").forEach(node => {
      const key = node.getAttribute("data-i18n");
      const translated = textOf(dictionary, key);
      if (translated) {
        node.textContent = translated;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
      const key = node.getAttribute("data-i18n-placeholder");
      const translated = textOf(dictionary, key);
      if (translated) {
        node.setAttribute("placeholder", translated);
      }
    });

    const localeSelector = document.getElementById("langSwitcher");
    if (localeSelector) {
      localeSelector.value = currentLocale;
    }

    document.documentElement.lang = currentLocale === "zh-CN" ? "zh-CN" : "en";
  }

  async function setLocale(locale, options = {}) {
    const normalized = normalizeLocale(locale);
    const persist = options.persist !== false;
    const dictionary = await loadDictionary(normalized).catch(async () => {
      const fallback = DEFAULT_LOCALE;
      return loadDictionary(fallback);
    });

    currentLocale = normalized;
    if (persist) {
      safeSetLocalStorage(STORAGE_KEY, normalized);
    }

    applyMeta(dictionary);
    applyDomText(dictionary);
    window.dispatchEvent(new CustomEvent("dsq:locale-changed", { detail: { locale: currentLocale } }));
  }

  function getLocale() {
    return currentLocale;
  }

  function init() {
    const localeSelector = document.getElementById("langSwitcher");
    if (localeSelector && !localeSelector.dataset.i18nBound) {
      localeSelector.dataset.i18nBound = "true";
      localeSelector.addEventListener("change", event => {
        setLocale(event.target.value, { persist: true }).catch(error => {
          console.warn("i18n: failed to switch locale.", error);
        });
      });
    }

    setLocale(getInitialLocale(), { persist: true }).catch(error => {
      console.warn("i18n: failed to initialize locale.", error);
    });
  }

  window.DSQI18n = {
    getLocale,
    setLocale,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
