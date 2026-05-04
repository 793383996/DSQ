import type {
  BlueprintSnapshot,
  CalculationOutput,
  GlobalSettings,
  MachineSettingsSnapshot,
  ProjectSnapshot,
  SeoSnapshot,
  SingleMakeEntry,
  RequirementEntry,
  SpeedSettingsSnapshot,
} from "./dsq";

interface LegacyAppViewModel {
  items0?: unknown[];
  xqs?: RequirementEntry[];
  items?: unknown[];
  items2?: unknown[];
  total?: unknown[];
  ig_names?: string[];
  totalEnergy?: string | number;
  totalSpace?: string | number;
  totalAcc?: string | number;
  quoteIncludes?: Record<string, string>;
  xps_editor_index?: number;
  items_editor_index?: number;
  $nextTick?: (callback: () => void) => void;
  [key: string]: unknown;
}

interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

interface LegacyRecipeComponent {
  name: string;
  itemId?: string;
  n?: number;
  [key: string]: unknown;
}

interface LegacyMachineOption {
  id?: string;
  name?: string;
  iconName?: string;
  speed?: number;
  [key: string]: unknown;
}

interface LegacyRecipeRecord {
  id?: number;
  name?: string;
  itemId?: string;
  machineTypeId?: string;
  mName?: string;
  noExtra?: boolean | null;
  n?: number;
  t?: number;
  s: LegacyRecipeComponent[];
  q: LegacyRecipeComponent[];
  m: LegacyMachineOption[];
  [key: string]: unknown;
}

declare global {
  interface Window {
    __DSQLegacyBootstrapPromise?: Promise<void>;
    __DSQQuoteIncludeState?: Record<string, string>;
    DSQI18n?: {
      getLocale?: () => string;
      t?: (key: string, params?: Record<string, unknown> | null, fallback?: string) => string;
      updateSeoState?: (snapshot: SeoSnapshot) => void;
      refresh?: () => void;
    };
    DSQCommandBridge?: LegacyCommandBridge;
    version?: string;
    projects?: ProjectSnapshot[];
    settings?: MachineSettingsSnapshot;
    global_settings?: Partial<GlobalSettings>;
    settings_time?: SpeedSettingsSnapshot;
    settings_pf?: Record<string, unknown>;
    currentCalculationResult?: CalculationOutput | null;
    xqs?: RequirementEntry[];
    singleMake?: SingleMakeEntry[];
    ig_names?: string[];
    pointLength?: number;
    manualGzSpeed?: boolean;
    defaultAccType?: string;
    defaultAccValue?: string;
    isDataLoaded?: boolean;
    icons?: Record<string, string>;
    data?: LegacyRecipeRecord[];
    energyData?: Record<string, number>;
    spaceData?: Record<string, number>;
    recipeIndexByProduct?: Record<string, number[]>;
    recipeIndexByMaterial?: Record<string, number[]>;
    currentItem?: {
      name?: string;
      [key: string]: unknown;
    } | null;
    app?: LegacyAppViewModel | null;
    buildCalculationResult?: () => CalculationOutput;
    buildBlueprintSnapshot?: (requirements: RequirementEntry[], productionLines: unknown[]) => BlueprintSnapshot | null;
    update_all?: () => void;
    scheduleUpdateAll?: (reason?: string) => void;
    flushScheduledUpdateAll?: (reason?: string) => void;
    f_add?: () => void;
    f_add3?: (name: string) => void;
    f_reset?: () => void;
    f_save?: () => void;
    f_ig?: (target: unknown) => void;
    f_ig_acc?: () => void;
    f_reset_ig?: () => void;
    f_remove_ig?: (name: string) => void;
    generateBlueprint?: () => void;
    saveSetting?: () => void;
    saveSettingTime?: () => void;
    saveGlobalSettings?: () => void;
    saveSettingPf?: () => void;
    saveSettingProjects?: () => void;
  }
}

export {};
