export interface Settings {
  dualSubMode: boolean;
  secondaryLanguage: string;
}

export const DEFAULT_SETTINGS: Settings = {
  dualSubMode: false,
  secondaryLanguage: "en",
};

export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = raw as Record<string, unknown>;

  return {
    dualSubMode:
      typeof candidate.dualSubMode === "boolean"
        ? candidate.dualSubMode
        : DEFAULT_SETTINGS.dualSubMode,
    secondaryLanguage:
      typeof candidate.secondaryLanguage === "string"
        ? candidate.secondaryLanguage
        : DEFAULT_SETTINGS.secondaryLanguage,
  };
}

export function toggleDualSubMode(current: boolean): boolean {
  return !current;
}
