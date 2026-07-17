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
    ).toEqual({ ...DEFAULT_SETTINGS, dualSubMode: true, secondaryLanguage: "fr" });
  });

  it("falls back to default for a field with the wrong type", () => {
    expect(
      parseSettings({ dualSubMode: "yes", secondaryLanguage: "fr" }),
    ).toEqual({ ...DEFAULT_SETTINGS, secondaryLanguage: "fr" });
  });

  it("falls back to defaults entirely for non-object input", () => {
    expect(parseSettings("not an object")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps well-formed style settings", () => {
    expect(
      parseSettings({
        secondaryLineColor: "#ff00aa",
        secondaryLineSize: 1.8,
        secondaryLinePosition: 20,
        secondaryLineOpacity: 40,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      secondaryLineColor: "#ff00aa",
      secondaryLineSize: 1.8,
      secondaryLinePosition: 20,
      secondaryLineOpacity: 40,
    });
  });

  it("falls back to default color for a malformed hex string", () => {
    expect(parseSettings({ secondaryLineColor: "not-a-color" }).secondaryLineColor).toBe(
      DEFAULT_SETTINGS.secondaryLineColor,
    );
    expect(parseSettings({ secondaryLineColor: "#fff" }).secondaryLineColor).toBe(
      DEFAULT_SETTINGS.secondaryLineColor,
    );
  });

  it("falls back to default for non-numeric style fields", () => {
    expect(parseSettings({ secondaryLineSize: "big" }).secondaryLineSize).toBe(
      DEFAULT_SETTINGS.secondaryLineSize,
    );
    expect(parseSettings({ secondaryLinePosition: NaN }).secondaryLinePosition).toBe(
      DEFAULT_SETTINGS.secondaryLinePosition,
    );
    expect(parseSettings({ secondaryLineOpacity: null }).secondaryLineOpacity).toBe(
      DEFAULT_SETTINGS.secondaryLineOpacity,
    );
  });

  it("clamps out-of-range numeric style fields", () => {
    expect(parseSettings({ secondaryLineSize: 99 }).secondaryLineSize).toBe(2.5);
    expect(parseSettings({ secondaryLineSize: -1 }).secondaryLineSize).toBe(0.5);
    expect(parseSettings({ secondaryLinePosition: 100 }).secondaryLinePosition).toBe(40);
    expect(parseSettings({ secondaryLinePosition: -5 }).secondaryLinePosition).toBe(0);
    expect(parseSettings({ secondaryLineOpacity: 150 }).secondaryLineOpacity).toBe(100);
    expect(parseSettings({ secondaryLineOpacity: -10 }).secondaryLineOpacity).toBe(0);
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
