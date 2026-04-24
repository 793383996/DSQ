export interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

function getLegacyCommand(commandName: string): ((...args: unknown[]) => unknown) | null {
  const candidate = (window as unknown as Record<string, unknown>)[commandName];
  return typeof candidate === "function" ? (candidate as (...args: unknown[]) => unknown) : null;
}

export function createLegacyCommandBridge(): LegacyCommandBridge {
  return {
    has(commandName: string): boolean {
      return getLegacyCommand(commandName) !== null;
    },
    invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined {
      const command = getLegacyCommand(commandName);
      if (!command) {
        return undefined;
      }
      return command(...args) as T;
    },
  };
}

let legacyCommandBridge: LegacyCommandBridge | null = null;

export function getLegacyCommandBridge(): LegacyCommandBridge {
  if (!legacyCommandBridge) {
    legacyCommandBridge = createLegacyCommandBridge();
  }
  return legacyCommandBridge;
}
