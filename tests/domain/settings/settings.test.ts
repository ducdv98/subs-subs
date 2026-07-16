import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  toggleDualSubMode,
} from "../../../app/domain/settings/settings";

describe("parseSettings", () => {
  it("returns defaults when given undefined", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when given an empty object", () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("returns stored values when well-formed", () => {
    expect(
      parseSettings({ dualSubMode: true, secondaryLanguage: "fr" }),
    ).toEqual({ dualSubMode: true, secondaryLanguage: "fr" });
  });

  it("falls back to default for a field with the wrong type", () => {
    expect(
      parseSettings({ dualSubMode: "yes", secondaryLanguage: "fr" }),
    ).toEqual({ dualSubMode: DEFAULT_SETTINGS.dualSubMode, secondaryLanguage: "fr" });
  });

  it("falls back to defaults entirely for non-object input", () => {
    expect(parseSettings("not an object")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("toggleDualSubMode", () => {
  it("flips false to true", () => {
    expect(toggleDualSubMode(false)).toBe(true);
  });

  it("flips true to false", () => {
    expect(toggleDualSubMode(true)).toBe(false);
  });
});
