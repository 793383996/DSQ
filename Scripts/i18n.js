(function () {
  const STORAGE_KEY = "dsq_locale";
  const DEFAULT_LOCALE = "zh-CN";
  const SUPPORTED_LOCALES = new Set(["zh-CN", "en-US"]);
  const SITE_ORIGIN = "https://dsqstar.xyz";
  const localeCache = {};
  let currentLocale = DEFAULT_LOCALE;
  let activeDictionary = {};
  let localeRequestVersion = 0;
  let activeLocaleController = null;
  const DEFAULT_SEO_STATE = Object.freeze({
    requirementCount: 0,
    primaryItemName: "",
    primaryRatePerMinute: null,
    totalLineCount: 0,
    totalEnergy: 0,
    totalSpace: 0,
  });
  let seoState = { ...DEFAULT_SEO_STATE };

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

  function getCanonicalPathname() {
    try {
      const pathname = new URL(window.location.href).pathname || "/";
      if (pathname === "/index.html") {
        return "/";
      }
      return pathname;
    } catch {
      return "/";
    }
  }

  function getSeoUrl(locale) {
    return `${SITE_ORIGIN}${getCanonicalPathname()}?lang=${locale}`;
  }

  function updateLocaleQuery(locale) {
    try {
      const url = new URL(window.location.href);
      if (url.pathname === "/index.html") {
        url.pathname = "/";
      }
      url.searchParams.set("lang", locale);
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next);
    } catch {
      // ignore URL sync failures
    }
  }

  function isAbortError(error) {
    var domAbortCode = typeof DOMException !== "undefined" ? DOMException.ABORT_ERR : 20;
    return !!error && (error.name === "AbortError" || error.code === domAbortCode);
  }

  async function loadDictionary(locale, signal) {
    if (localeCache[locale]) {
      return localeCache[locale];
    }
    const response = await fetch(`./locales/${locale}.json`, { signal: signal });
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

  function interpolate(template, params) {
    if (typeof template !== "string") {
      return "";
    }
    if (!params || typeof params !== "object") {
      return template;
    }
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => {
      if (!Object.prototype.hasOwnProperty.call(params, token)) {
        return match;
      }
      const value = params[token];
      return value == null ? "" : String(value);
    });
  }

  function t(key, params = null, fallback = "") {
    const localized = textOf(activeDictionary, key);
    if (localized) {
      return interpolate(localized, params);
    }
    const defaultLocalized = textOf(localeCache[DEFAULT_LOCALE], key);
    if (defaultLocalized) {
      return interpolate(defaultLocalized, params);
    }
    if (fallback) {
      return interpolate(fallback, params);
    }
    return key;
  }

  function applyDataAttributeTranslation(dictionary, datasetKey, attrName) {
    document.querySelectorAll(`[data-${datasetKey}]`).forEach(node => {
      const key = node.getAttribute(`data-${datasetKey}`);
      const translated = textOf(dictionary, key);
      if (!translated) {
        return;
      }
      if (attrName === "textContent") {
        node.textContent = translated;
        return;
      }
      if (attrName === "innerHTML") {
        node.innerHTML = translated;
        return;
      }
      node.setAttribute(attrName, translated);
    });
  }

  function applyLegalLinks() {
    const localizedPath = currentLocale === "en-US" ? "en-US" : "zh-CN";
    const map = [
      { id: "linkPrivacyPolicy", zh: "/legal/privacy.html", en: "/legal/privacy.en-US.html" },
      { id: "linkTermsOfService", zh: "/legal/terms.html", en: "/legal/terms.en-US.html" },
      { id: "linkCookiePolicy", zh: "/legal/cookies.html", en: "/legal/cookies.en-US.html" },
      { id: "linkSecurityPolicy", zh: "/legal/security.html", en: "/legal/security.en-US.html" },
    ];
    map.forEach(item => {
      const node = document.getElementById(item.id);
      if (!node) {
        return;
      }
      const baseHref = currentLocale === "en-US" ? item.en : item.zh;
      node.setAttribute("href", `${baseHref}?lang=${localizedPath}`);
    });
  }

  function applyBreadcrumbLinks() {
    const breadcrumbHome = document.getElementById("linkBreadcrumbHome");
    if (!breadcrumbHome) {
      return;
    }
    breadcrumbHome.setAttribute("href", getSeoUrl(currentLocale));
  }

  function setMetaContentById(id, content) {
    const node = document.getElementById(id);
    if (!node || typeof content !== "string" || !content) {
      return;
    }
    node.setAttribute("content", content);
  }

  function setJsonLdScript(id, payload) {
    const node = document.getElementById(id);
    if (!node) {
      return;
    }
    if (!payload || typeof payload !== "object") {
      node.textContent = "";
      return;
    }
    node.textContent = JSON.stringify(payload);
  }

  function formatLocalizedNumber(value, maxFractionDigits = 2) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return "";
    }
    const locale = currentLocale === "en-US" ? "en-US" : "zh-CN";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(numericValue);
  }

  function sanitizeSeoState(input) {
    const source = input && typeof input === "object" ? input : {};
    const primaryRate = Number(source.primaryRatePerMinute);
    const requirementCount = Math.max(0, Number(source.requirementCount) || 0);
    return {
      requirementCount,
      primaryItemName: typeof source.primaryItemName === "string" ? source.primaryItemName : "",
      primaryRatePerMinute: Number.isFinite(primaryRate) ? primaryRate : null,
      totalLineCount: Math.max(0, Number(source.totalLineCount) || 0),
      totalEnergy: Number(source.totalEnergy) || 0,
      totalSpace: Number(source.totalSpace) || 0,
    };
  }

  function resolveSeoParams(dictionary) {
    const itemFallback = textOf(dictionary, "meta.dynamic_item_fallback") || textOf(dictionary, "hero.title");
    const item = seoState.primaryItemName || itemFallback;
    return {
      item,
      rate: formatLocalizedNumber(seoState.primaryRatePerMinute, 3),
      count: String(Math.max(0, Number(seoState.requirementCount) || 0)),
      lines: formatLocalizedNumber(seoState.totalLineCount, 0) || "0",
      energy: formatLocalizedNumber(seoState.totalEnergy, 2) || "0",
      space: formatLocalizedNumber(seoState.totalSpace, 0) || "0",
    };
  }

  function resolveMetaTexts(dictionary) {
    const baseTitle = textOf(dictionary, "meta.title") || document.title;
    const baseDescription = textOf(dictionary, "meta.description");
    const params = resolveSeoParams(dictionary);
    const dynamicTitleTemplate = textOf(dictionary, "meta.dynamic_title");
    const dynamicDescriptionTemplate = textOf(dictionary, "meta.dynamic_description");
    const hasDemandState = Number(seoState.requirementCount) > 0 && params.item && params.rate;

    const title = hasDemandState && dynamicTitleTemplate ? interpolate(dynamicTitleTemplate, params) : baseTitle;
    const description =
      hasDemandState && dynamicDescriptionTemplate ? interpolate(dynamicDescriptionTemplate, params) : baseDescription;

    return {
      title: title || baseTitle,
      description: description || baseDescription,
    };
  }

  function buildWebApplicationSchema(dictionary, metaTexts) {
    return {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: textOf(dictionary, "meta.og_title") || metaTexts.title,
      description: metaTexts.description,
      url: getSeoUrl(currentLocale),
      inLanguage: currentLocale,
      applicationCategory: "GameApplication",
      operatingSystem: "Web Browser",
      image: `${SITE_ORIGIN}/og-image.png`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      author: {
        "@type": "Organization",
        name: "DSQ Calculator",
      },
    };
  }

  function buildBreadcrumbSchema(dictionary) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: textOf(dictionary, "seo.breadcrumb.home") || "Home",
          item: `${SITE_ORIGIN}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: textOf(dictionary, "seo.breadcrumb.current") || "Calculator",
          item: getSeoUrl(currentLocale),
        },
      ],
    };
  }

  function buildFaqSchema(dictionary) {
    const entities = [];
    for (let index = 1; index <= 3; index += 1) {
      const question = textOf(dictionary, `seo.faq.q${index}.question`);
      const answer = textOf(dictionary, `seo.faq.q${index}.answer`);
      if (!question || !answer) {
        continue;
      }
      entities.push({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      });
    }
    if (!entities.length) {
      return null;
    }
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: currentLocale,
      mainEntity: entities,
    };
  }

  function applySeoVerificationMeta() {
    const verificationConfig =
      window.__DSQ_SEO_VERIFICATION && typeof window.__DSQ_SEO_VERIFICATION === "object"
        ? window.__DSQ_SEO_VERIFICATION
        : null;
    if (!verificationConfig) {
      return;
    }
    const googleToken = typeof verificationConfig.google === "string" ? verificationConfig.google.trim() : "";
    const bingToken = typeof verificationConfig.bing === "string" ? verificationConfig.bing.trim() : "";
    if (googleToken) {
      setMetaContentById("metaGoogleSiteVerification", googleToken);
    }
    if (bingToken) {
      setMetaContentById("metaBingSiteVerification", bingToken);
    }
  }

  function applyMeta(dictionary) {
    const metaTexts = resolveMetaTexts(dictionary);
    if (metaTexts.title) {
      document.title = metaTexts.title;
    }

    const keywordsText = textOf(dictionary, "meta.keywords");
    const keywords = document.querySelector('meta[name="keywords"]');
    if (keywords && keywordsText) {
      keywords.setAttribute("content", keywordsText);
    }

    const descriptionNode =
      document.getElementById("metaDescription") || document.querySelector('meta[name="description"]');
    if (descriptionNode && metaTexts.description) {
      descriptionNode.setAttribute("content", metaTexts.description);
    }

    const ogTitleText = metaTexts.title || textOf(dictionary, "meta.og_title");
    const ogTitle = document.getElementById("metaOgTitle") || document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitleText) {
      ogTitle.setAttribute("content", ogTitleText);
    }

    const ogDescription =
      document.getElementById("metaOgDescription") || document.querySelector('meta[property="og:description"]');
    if (ogDescription && metaTexts.description) {
      ogDescription.setAttribute("content", metaTexts.description);
    }

    const ogSiteNameText = textOf(dictionary, "meta.og_site_name") || textOf(dictionary, "meta.og_title");
    const ogSiteName =
      document.getElementById("metaOgSiteName") || document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName && ogSiteNameText) {
      ogSiteName.setAttribute("content", ogSiteNameText);
    }

    const twitterTitle =
      document.getElementById("metaTwitterTitle") || document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && ogTitleText) {
      twitterTitle.setAttribute("content", ogTitleText);
    }

    const twitterDescription =
      document.getElementById("metaTwitterDescription") || document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && metaTexts.description) {
      twitterDescription.setAttribute("content", metaTexts.description);
    }

    const imageAlt = textOf(dictionary, "meta.og_image_alt");
    setMetaContentById("metaOgImageAlt", imageAlt);
    setMetaContentById("metaTwitterImageAlt", imageAlt);

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

    applySeoVerificationMeta();
    setJsonLdScript("schemaWebApplication", buildWebApplicationSchema(dictionary, metaTexts));
    setJsonLdScript("schemaBreadcrumbList", buildBreadcrumbSchema(dictionary));
    setJsonLdScript("schemaFAQPage", buildFaqSchema(dictionary));
  }

  function applyDomText(dictionary) {
    applyDataAttributeTranslation(dictionary, "i18n", "textContent");
    applyDataAttributeTranslation(dictionary, "i18n-html", "innerHTML");
    applyDataAttributeTranslation(dictionary, "i18n-placeholder", "placeholder");
    applyDataAttributeTranslation(dictionary, "i18n-aria-label", "aria-label");
    applyDataAttributeTranslation(dictionary, "i18n-title", "title");
    applyDataAttributeTranslation(dictionary, "i18n-alt", "alt");
    applyDataAttributeTranslation(dictionary, "i18n-label", "label");
    applyLegalLinks();
    applyBreadcrumbLinks();

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
    const requestVersion = ++localeRequestVersion;
    if (activeLocaleController) {
      activeLocaleController.abort();
    }
    activeLocaleController = typeof AbortController !== "undefined" ? new AbortController() : null;
    const signal = activeLocaleController ? activeLocaleController.signal : undefined;
    let dictionary;
    try {
      dictionary = await loadDictionary(normalized, signal);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      dictionary = await loadDictionary(DEFAULT_LOCALE, signal);
    }
    if (requestVersion !== localeRequestVersion) {
      return;
    }

    currentLocale = normalized;
    activeDictionary = dictionary;
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

  function updateSeoState(nextState) {
    seoState = sanitizeSeoState({
      ...seoState,
      ...(nextState && typeof nextState === "object" ? nextState : {}),
    });
    applyMeta(activeDictionary);
  }

  function getLocale() {
    return currentLocale;
  }

  function refresh() {
    applyMeta(activeDictionary);
    applyDomText(activeDictionary);
  }

  function init() {
    const localeSelector = document.getElementById("langSwitcher");
    if (localeSelector && !localeSelector.dataset.i18nBound) {
      localeSelector.dataset.i18nBound = "true";
      localeSelector.addEventListener("change", event => {
        setLocale(event.target.value, { persist: true, syncQuery: true }).catch(error => {
          if (isAbortError(error)) {
            return;
          }
          console.warn("i18n: failed to switch locale.", error);
        });
      });
    }

    setLocale(getInitialLocale(), { persist: true, syncQuery: true }).catch(error => {
      if (isAbortError(error)) {
        return;
      }
      console.warn("i18n: failed to initialize locale.", error);
    });
  }

  window.DSQI18n = {
    getLocale,
    setLocale,
    t,
    refresh,
    updateSeoState,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
