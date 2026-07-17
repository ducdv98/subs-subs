export interface Settings {
  dualSubMode: boolean;
  secondaryLanguage: string;
  secondaryLineColor: string;
  secondaryLineSize: number;
  secondaryLinePosition: number;
  secondaryLineOpacity: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dualSubMode: false,
  secondaryLanguage: "en",
  secondaryLineColor: "#ffffff",
  secondaryLineSize: 1.0,
  secondaryLinePosition: 8,
  secondaryLineOpacity: 75,
};

// Style settings only affect how the already-fetched Secondary line is
// rendered — changing them must bypass the full session restart that
// dualSubMode/secondaryLanguage trigger (docs/decisions/0009).
export const STYLE_SETTING_KEYS = [
  "secondaryLineColor",
  "secondaryLineSize",
  "secondaryLinePosition",
  "secondaryLineOpacity",
] as const;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const SECONDARY_LINE_SIZE_RANGE = { min: 0.5, max: 2.5 };
export const SECONDARY_LINE_POSITION_RANGE = { min: 0, max: 40 };
export const SECONDARY_LINE_OPACITY_RANGE = { min: 0, max: 100 };

function parseClampedNumber(
  value: unknown,
  fallback: number,
  range: { min: number; max: number },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(range.max, Math.max(range.min, value));
}

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
    secondaryLineColor:
      typeof candidate.secondaryLineColor === "string" &&
      HEX_COLOR_RE.test(candidate.secondaryLineColor)
        ? candidate.secondaryLineColor
        : DEFAULT_SETTINGS.secondaryLineColor,
    secondaryLineSize: parseClampedNumber(
      candidate.secondaryLineSize,
      DEFAULT_SETTINGS.secondaryLineSize,
      SECONDARY_LINE_SIZE_RANGE,
    ),
    secondaryLinePosition: parseClampedNumber(
      candidate.secondaryLinePosition,
      DEFAULT_SETTINGS.secondaryLinePosition,
      SECONDARY_LINE_POSITION_RANGE,
    ),
    secondaryLineOpacity: parseClampedNumber(
      candidate.secondaryLineOpacity,
      DEFAULT_SETTINGS.secondaryLineOpacity,
      SECONDARY_LINE_OPACITY_RANGE,
    ),
  };
}

export function toggleDualSubMode(current: boolean): boolean {
  return !current;
}
