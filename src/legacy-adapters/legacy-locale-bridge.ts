import type { Pinia } from "pinia";

import { syncI18nLocale, type DsqI18nInstance } from "../services/i18n";
import { migrateLegacyStorage, savePersistedState } from "../services/persistence";
import { useUiStore } from "../stores/ui";
import { normalizeLocale, type LocaleCode } from "../types/dsq";

export const LEGACY_LOCALE_CHANGED_EVENT = "dsq:locale-changed";

let removeLocaleBridgeListener: (() => void) | null = null;

function resolveLegacyLocale(event?: Event): LocaleCode {
  const detail = event instanceof CustomEvent ? (event.detail as { locale?: unknown } | null) : null;
  return normalizeLocale(detail?.locale ?? window.DSQI18n?.getLocale?.(), "zh-CN");
}

function persistLocale(locale: LocaleCode): void {
  savePersistedState({
    locale,
    legacyStorage: migrateLegacyStorage(window.version || ""),
    updatedAt: new Date().toISOString(),
  });
}

export function bindLegacyLocaleBridge(pinia: Pinia, i18n: DsqI18nInstance): () => void {
  removeLocaleBridgeListener?.();

  const uiStore = useUiStore(pinia);
  const syncLocale = (event?: Event) => {
    const locale = resolveLegacyLocale(event);
    uiStore.setLocale(locale);
    syncI18nLocale(i18n, locale);
    persistLocale(locale);
  };

  const handleLocaleChanged = (event: Event) => {
    syncLocale(event);
  };

  syncLocale();
  window.addEventListener(LEGACY_LOCALE_CHANGED_EVENT, handleLocaleChanged);

  removeLocaleBridgeListener = () => {
    window.removeEventListener(LEGACY_LOCALE_CHANGED_EVENT, handleLocaleChanged);
    removeLocaleBridgeListener = null;
  };

  return removeLocaleBridgeListener;
}
