const LEGACY_SCRIPTS = [
  "./Scripts/error-monitor.js",
  "./Scripts/i18n.js",
  "./Scripts/dom.legacy.js",
  "./Scripts/vue.min.js",
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

export async function bootstrapLegacyRuntime(): Promise<void> {
  if (window.__DSQLegacyBootstrapPromise) {
    return window.__DSQLegacyBootstrapPromise;
  }
  window.__DSQLegacyBootstrapPromise = (async () => {
    for (const src of LEGACY_SCRIPTS) {
      await loadLegacyScript(src);
    }
  })();
  return window.__DSQLegacyBootstrapPromise;
}
