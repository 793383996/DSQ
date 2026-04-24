import { normalizeLocale, type PersistedAppState } from "../types/dsq";

const PERSISTED_STATE_KEY = "dsq:vue3:bootstrap";

const LEGACY_STORAGE_KEY_PREFIXES = [
  "machine_settings",
  "global_settings",
  "machine_settings_time",
  "machine_settings_pf",
  "settings_projects",
] as const;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadPersistedState(): PersistedAppState | null {
  if (!hasLocalStorage()) {
    return null;
  }
  const rawValue = window.localStorage.getItem(PERSISTED_STATE_KEY);
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
  if (!hasLocalStorage()) {
    return false;
  }
  try {
    window.localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function migrateLegacyStorage(version: string = window.version || ""): Record<string, string | null> {
  if (!hasLocalStorage()) {
    return {};
  }
  const snapshot: Record<string, string | null> = {};
  for (const prefix of LEGACY_STORAGE_KEY_PREFIXES) {
    const storageKey = `${prefix}${version}`;
    snapshot[storageKey] = window.localStorage.getItem(storageKey);
  }
  return snapshot;
}
