import type {
  CalculationOutput,
  GlobalSettings,
  MachineSettingsSnapshot,
  ProjectSnapshot,
  RequirementEntry,
  SpeedSettingsSnapshot,
} from "./dsq";

declare global {
  interface Window {
    __DSQLegacyBootstrapPromise?: Promise<void>;
    DSQI18n?: {
      getLocale?: () => string;
      t?: (key: string, params?: Record<string, unknown> | null, fallback?: string) => string;
    };
    version?: string;
    projects?: ProjectSnapshot[];
    settings?: MachineSettingsSnapshot;
    global_settings?: Partial<GlobalSettings>;
    settings_time?: SpeedSettingsSnapshot;
    settings_pf?: Record<string, unknown>;
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
