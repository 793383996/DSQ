const LEGACY_SCRIPTS = [
  "./Scripts/error-monitor.js",
  "./Scripts/i18n.js",
  "./Scripts/dom.legacy.js",
  "./Scripts/cocoMessage.js",
  "./Scripts/calc-core.js",
  "./Scripts/data.state.js",
  "./Scripts/domain.dictionary.js",
  "./Scripts/app.services.js",
  "./Scripts/data.storage.js",
  "./Scripts/data.js",
  "./Scripts/data.recipe-init.js",
  "./Scripts/data.recipe.js",
  "./Scripts/data.recipe-ui.js",
  "./Scripts/data.blueprint.js",
  "./Scripts/ui.panel-controller.js",
  "./Scripts/data.ui-bindings.js",
  "./Scripts/data.bootstrap.js",
  "./Scripts/index.events.js",
] as const;

export const LEGACY_RUNTIME_READY_EVENT = "dsq:legacy-runtime-ready";
export const LEGACY_RUNTIME_READY_TIMEOUT_MS = 15000;

interface LegacyRuntimeReadyDetail {
  isDataLoaded: boolean;
  hasApp: boolean;
  hasResult: boolean;
}

function resolveAbsoluteScriptUrl(src: string): string {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

function isLegacyScriptLoaded(src: string): boolean {
  const target = resolveAbsoluteScriptUrl(src);
  const scripts = document.getElementsByTagName("script");
  for (let index = 0; index < scripts.length; index += 1) {
    const script = scripts[index];
    if (!script.src) {
      continue;
    }
    if (resolveAbsoluteScriptUrl(script.src) !== target) {
      continue;
    }
    return true;
  }
  return false;
}

function loadLegacyScript(src: string): Promise<void> {
  if (isLegacyScriptLoaded(src)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.defer = false;
    script.setAttribute("data-legacy-runtime", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`load_script_failed:${src}`));
    document.head.appendChild(script);
  });
}

function readLegacyRuntimeReadyDetail(detail?: Partial<LegacyRuntimeReadyDetail> | null): LegacyRuntimeReadyDetail {
  return {
    isDataLoaded: detail?.isDataLoaded === true || window.isDataLoaded === true,
    hasApp: detail?.hasApp === true || !!window.app,
    hasResult: detail?.hasResult === true || !!window.currentCalculationResult,
  };
}

function isLegacyRuntimeReady(detail?: Partial<LegacyRuntimeReadyDetail> | null): boolean {
  const normalizedDetail = readLegacyRuntimeReadyDetail(detail);
  return normalizedDetail.isDataLoaded && normalizedDetail.hasApp && normalizedDetail.hasResult;
}

export async function bootstrapLegacyRuntime(): Promise<void> {
  if (window.__DSQLegacyBootstrapPromise) {
    return window.__DSQLegacyBootstrapPromise;
  }

  window.__DSQLegacyBootstrapPromise = (async () => {
    if (isLegacyRuntimeReady()) {
      return;
    }

    let readyListener: EventListener | null = null;
    let readyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const readyPromise = new Promise<void>((resolve, reject) => {
      const handleReady = (event: Event) => {
        const detail = event instanceof CustomEvent ? (event.detail as Partial<LegacyRuntimeReadyDetail> | null) : null;
        if (!isLegacyRuntimeReady(detail)) {
          return;
        }
        cleanup();
        resolve();
      };

      const cleanup = () => {
        if (readyTimeoutHandle) {
          clearTimeout(readyTimeoutHandle);
          readyTimeoutHandle = null;
        }
        if (readyListener) {
          window.removeEventListener(LEGACY_RUNTIME_READY_EVENT, readyListener);
          readyListener = null;
        }
      };

      readyListener = handleReady;
      readyTimeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error("legacy_runtime_ready_timeout"));
      }, LEGACY_RUNTIME_READY_TIMEOUT_MS);
      window.addEventListener(LEGACY_RUNTIME_READY_EVENT, readyListener);

      if (isLegacyRuntimeReady()) {
        cleanup();
        resolve();
      }
    });

    for (const src of LEGACY_SCRIPTS) {
      await loadLegacyScript(src);
    }
    await readyPromise;
  })().catch(error => {
    delete window.__DSQLegacyBootstrapPromise;
    throw error;
  });

  return window.__DSQLegacyBootstrapPromise;
}
