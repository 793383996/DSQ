import { createPinia } from "pinia";
import { createApp } from "vue";

import { initializeLegacyCommandBridge } from "../legacy-adapters/legacy-command-bridge";
import { syncLegacyRuntimeSnapshot } from "../legacy-adapters/legacy-state";
import { createDsqI18n } from "../services/i18n";
import { bootstrapLegacyRuntime } from "../services/legacy-runtime";
import { loadPersistedState, migrateLegacyStorage, savePersistedState } from "../services/persistence";
import { useAppStore } from "../stores/app";
import { useUiStore } from "../stores/ui";
import AppShell from "./AppShell.vue";

let bootstrapPromise: Promise<void> | null = null;

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

export async function bootstrapDsqApp(): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  let appStore: ReturnType<typeof useAppStore> | null = null;

  bootstrapPromise = (async () => {
    const pinia = createPinia();
    const i18n = createDsqI18n();
    const app = createApp(AppShell);
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
    savePersistedState({
      locale: snapshot.locale,
      legacyStorage: migrateLegacyStorage(window.version || ""),
      updatedAt: new Date().toISOString(),
    });
  })().catch(error => {
    appStore?.markError(error);
    console.error("bootstrapDsqApp: failed to initialize the Vue 3 bridge runtime.", error);
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
