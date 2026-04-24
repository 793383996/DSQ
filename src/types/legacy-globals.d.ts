import type { CalculationOutput, GlobalSettings, ProjectSnapshot, RequirementEntry } from "./dsq";

declare global {
  interface Window {
    __DSQLegacyBootstrapPromise?: Promise<void>;
    DSQI18n?: {
      getLocale?: () => string;
      t?: (key: string, params?: Record<string, unknown> | null, fallback?: string) => string;
    };
    version?: string;
    projects?: ProjectSnapshot[];
    global_settings?: Partial<GlobalSettings>;
    currentCalculationResult?: CalculationOutput | null;
    xqs?: RequirementEntry[];
    isDataLoaded?: boolean;
    currentItem?: {
      name?: string;
      [key: string]: unknown;
    } | null;
  }
}

export {};
