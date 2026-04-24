import "./Scripts/style.css";

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
];

function resolveAbsoluteScriptUrl(src) {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

function isLegacyScriptLoaded(src) {
  const target = resolveAbsoluteScriptUrl(src);
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i += 1) {
    const script = scripts[i];
    if (!script.src) continue;
    if (resolveAbsoluteScriptUrl(script.src) !== target) continue;
    return true;
  }
  return false;
}

function loadLegacyScript(src) {
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

async function bootstrapLegacyRuntime() {
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

bootstrapLegacyRuntime().catch(error => {
  console.error("main.js: failed to bootstrap legacy runtime.", error);
});
