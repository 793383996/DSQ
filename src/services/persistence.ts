import { normalizeLocale, type PersistedAppState } from "../types/dsq";
import { createBrowserStorageAdapter } from "./app-services";
import { LEGACY_STORAGE_KEY_PREFIXES } from "./legacy-storage";

const PERSISTED_STATE_KEY = "dsq:vue3:bootstrap";
const browserStorage = createBrowserStorageAdapter();

export function loadPersistedState(): PersistedAppState | null {
  if (!browserStorage.hasLocalStorage()) {
    return null;
  }
  const rawValue = browserStorage.getItem(PERSISTED_STATE_KEY);
  if (!rawValue) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedAppState>;
    return {
      locale: normalizeLocale(parsed.locale, "zh-CN"),
      legacyStorage: parsed.legacyStorage && typeof parsed.legacyStorage === "object" ? parsed.legacyStorage : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedAppState): boolean {
  if (!browserStorage.hasLocalStorage()) {
    return false;
  }
  return browserStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): boolean {
  if (!browserStorage.hasLocalStorage()) {
    return false;
  }
  return browserStorage.removeItem(PERSISTED_STATE_KEY);
}

export function migrateLegacyStorage(version: string = window.version || ""): Record<string, string | null> {
  if (!browserStorage.hasLocalStorage()) {
    return {};
  }
  const snapshot: Record<string, string | null> = {};
  for (const prefix of LEGACY_STORAGE_KEY_PREFIXES) {
    const storageKey = `${prefix}${version}`;
    snapshot[storageKey] = browserStorage.getItem(storageKey);
  }
  return snapshot;
}
