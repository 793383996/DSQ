type NextTickHandler = (callback: () => void) => void;

interface LegacyAppCompatOptions {
  nextTick?: NextTickHandler;
}

function fallbackNextTick(callback: () => void): void {
  callback();
}

export function registerLegacyAppCompat(options: LegacyAppCompatOptions = {}): () => void {
  const previousApp = window.app && typeof window.app === "object" ? window.app : null;
  const compatApp = previousApp ?? {};
  const previousNextTick = typeof compatApp.$nextTick === "function" ? compatApp.$nextTick : undefined;

  const nextTick =
    options.nextTick ??
    (typeof compatApp.$nextTick === "function" ? (compatApp.$nextTick as NextTickHandler) : fallbackNextTick);

  compatApp.$nextTick = nextTick;

  window.app = compatApp;

  return () => {
    if (window.app !== compatApp) {
      return;
    }
    if (previousNextTick) {
      compatApp.$nextTick = previousNextTick;
    } else {
      delete compatApp.$nextTick;
    }
    if (previousApp && typeof previousApp === "object") {
      window.app = compatApp;
      return;
    }
    Reflect.deleteProperty(window, "app");
  };
}
