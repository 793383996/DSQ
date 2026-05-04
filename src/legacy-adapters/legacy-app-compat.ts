type QuoteIncludeMap = Record<string, string>;
type NextTickHandler = (callback: () => void) => void;

interface LegacyAppCompatOptions {
  quoteIncludes: QuoteIncludeMap;
  nextTick?: NextTickHandler;
}

function normalizeQuoteIncludes(source: unknown): QuoteIncludeMap {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }
  const output: QuoteIncludeMap = {};
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === "string") {
      output[key] = value;
    }
  });
  return output;
}

function mergeQuoteIncludes(target: QuoteIncludeMap, source: QuoteIncludeMap): void {
  Object.entries(source).forEach(([key, value]) => {
    if (typeof target[key] !== "string" || target[key].length === 0) {
      target[key] = value;
    }
  });
}

function fallbackNextTick(callback: () => void): void {
  callback();
}

export function registerLegacyAppCompat(options: LegacyAppCompatOptions) {
  const existingApp = window.app && typeof window.app === "object" ? window.app : {};
  const quoteIncludes = options.quoteIncludes;

  mergeQuoteIncludes(quoteIncludes, normalizeQuoteIncludes(window.__DSQQuoteIncludeState));
  mergeQuoteIncludes(quoteIncludes, normalizeQuoteIncludes(existingApp.quoteIncludes));

  if (typeof quoteIncludes.updata !== "string") {
    quoteIncludes.updata = "";
  }
  if (typeof quoteIncludes.explanation !== "string") {
    quoteIncludes.explanation = "";
  }

  const nextTick =
    options.nextTick ??
    (typeof existingApp.$nextTick === "function" ? (existingApp.$nextTick as NextTickHandler) : fallbackNextTick);

  window.__DSQQuoteIncludeState = quoteIncludes;
  window.app = {
    ...existingApp,
    quoteIncludes,
    $nextTick: nextTick,
    xps_editor_index: typeof existingApp.xps_editor_index === "number" ? existingApp.xps_editor_index : -1,
    items_editor_index: typeof existingApp.items_editor_index === "number" ? existingApp.items_editor_index : -1,
  };

  return window.app;
}
