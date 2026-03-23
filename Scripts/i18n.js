(function () {
  const STORAGE_KEY = "dsq_locale";
  const DEFAULT_LOCALE = "zh-CN";
  const SUPPORTED_LOCALES = new Set(["zh-CN", "en-US"]);
  const SITE_ORIGIN = "https://dsq.vercel.app";
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

  function getLocaleFromQuery() {
    try {
      const queryLocale = new URL(window.location.href).searchParams.get("lang");
      return queryLocale ? normalizeLocale(queryLocale) : null;
    } catch {
      return null;
    }
  }

  function getInitialLocale() {
    const fromQuery = getLocaleFromQuery();
    if (fromQuery) {
      return fromQuery;
    }

    const stored = safeGetLocalStorage(STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }

    if (typeof navigator !== "undefined" && navigator.language) {
      return normalizeLocale(navigator.language);
    }
    return DEFAULT_LOCALE;
  }

  function getSeoUrl(locale) {
    return `${SITE_ORIGIN}/?lang=${locale}`;
  }

  function updateLocaleQuery(locale) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", locale);
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next);
    } catch {
      // ignore URL sync failures
    }
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

    const descriptionText = textOf(dictionary, "meta.description");
    const description = document.querySelector('meta[name="description"]');
    if (description && descriptionText) {
      description.setAttribute("content", descriptionText);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && descriptionText) {
      ogDescription.setAttribute("content", descriptionText);
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && descriptionText) {
      twitterDescription.setAttribute("content", descriptionText);
    }

    const canonical = document.getElementById("canonicalLink");
    if (canonical) {
      canonical.setAttribute("href", getSeoUrl(currentLocale));
    }

    const ogUrl = document.getElementById("metaOgUrl");
    if (ogUrl) {
      ogUrl.setAttribute("content", getSeoUrl(currentLocale));
    }

    const ogLocale = document.getElementById("metaOgLocale");
    if (ogLocale) {
      ogLocale.setAttribute("content", currentLocale === "zh-CN" ? "zh_CN" : "en_US");
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
    const syncQuery = options.syncQuery !== false;
    const dictionary = await loadDictionary(normalized).catch(async () => {
      return loadDictionary(DEFAULT_LOCALE);
    });

    currentLocale = normalized;
    if (persist) {
      safeSetLocalStorage(STORAGE_KEY, normalized);
    }
    if (syncQuery) {
      updateLocaleQuery(normalized);
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
        setLocale(event.target.value, { persist: true, syncQuery: true }).catch(error => {
          console.warn("i18n: failed to switch locale.", error);
        });
      });
    }

    setLocale(getInitialLocale(), { persist: true, syncQuery: true }).catch(error => {
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
