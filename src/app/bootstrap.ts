import { createPinia } from "pinia";
import { createApp, nextTick, type App as VueApp } from "vue";

import { registerLegacyAppCompat } from "../legacy-adapters/legacy-app-compat";
import { initializeLegacyCommandBridge } from "../legacy-adapters/legacy-command-bridge";
import { bindLegacyLocaleBridge } from "../legacy-adapters/legacy-locale-bridge";
import { bindLegacyPanelStateBridge } from "../legacy-adapters/legacy-panel-state-bridge";
import { bindLegacyQuoteIncludeBridge } from "../legacy-adapters/legacy-quote-include-bridge";
import { syncLegacyRuntimeSnapshot } from "../legacy-adapters/legacy-state";
import { createDsqI18n } from "../services/i18n";
import { bootstrapLegacyRuntime } from "../services/legacy-runtime";
import { loadPersistedState, migrateLegacyStorage, savePersistedState } from "../services/persistence";
import { useAppStore } from "../stores/app";
import { useUiStore } from "../stores/ui";
import AppShell from "./AppShell.vue";

let bootstrapPromise: Promise<void> | null = null;
let mountedApp: VueApp<Element> | null = null;
let runtimeDisposers: Array<() => void> = [];

function ensureMountHost(): HTMLDivElement {
  const existing = document.getElementById("dsq-vue3-root");
  if (existing instanceof HTMLDivElement) {
    return existing;
  }

  const host = document.createElement("div");
  host.id = "dsq-vue3-root";
  host.hidden = true;
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("data-runtime", "vue3-bootstrap");
  document.body.appendChild(host);
  return host;
}

function registerRuntimeDisposer(disposer: (() => void) | null | undefined): void {
  if (typeof disposer === "function") {
    runtimeDisposers.push(disposer);
  }
}

function cleanupRuntimeBindings(): void {
  const pendingDisposers = runtimeDisposers.slice().reverse();
  runtimeDisposers = [];
  pendingDisposers.forEach(disposer => {
    try {
      disposer();
    } catch (error) {
      console.warn("bootstrapDsqApp: failed to dispose a runtime binding.", error);
    }
  });
}

function teardownMountedApp(): void {
  cleanupRuntimeBindings();
  if (mountedApp) {
    mountedApp.unmount();
    mountedApp = null;
  }
  const host = document.getElementById("dsq-vue3-root");
  if (host instanceof HTMLDivElement) {
    host.innerHTML = "";
  }
}

export async function bootstrapDsqApp(): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  let appStore: ReturnType<typeof useAppStore> | null = null;

  bootstrapPromise = (async () => {
    teardownMountedApp();

    const pinia = createPinia();
    const i18n = createDsqI18n();
    const app = createApp(AppShell);
    mountedApp = app;
    app.use(pinia);
    app.use(i18n);

    appStore = useAppStore(pinia);
    const uiStore = useUiStore(pinia);
    const persistedState = loadPersistedState();

    appStore.markMounting();
    if (persistedState) {
      uiStore.setLocale(persistedState.locale);
    }

    initializeLegacyCommandBridge(pinia);
    uiStore.markCommandBridgeReady();

    app.mount(ensureMountHost());

    appStore.markLegacyLoading();
    await bootstrapLegacyRuntime();
    appStore.markLegacyReady();

    const snapshot = syncLegacyRuntimeSnapshot(pinia, { i18n });
    registerRuntimeDisposer(bindLegacyLocaleBridge(pinia, i18n));
    registerRuntimeDisposer(bindLegacyPanelStateBridge(pinia));
    registerRuntimeDisposer(bindLegacyQuoteIncludeBridge(pinia));
    registerRuntimeDisposer(
      registerLegacyAppCompat({
        nextTick(callback) {
          void nextTick(callback);
        },
      })
    );
    savePersistedState({
      locale: snapshot.locale,
      legacyStorage: migrateLegacyStorage(window.version || ""),
      updatedAt: new Date().toISOString(),
    });
  })().catch(error => {
    appStore?.markError(error);
    console.error("bootstrapDsqApp: failed to initialize the Vue 3 bridge runtime.", error);
    teardownMountedApp();
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
