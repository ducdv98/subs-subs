import { describe, expect, it } from "vitest";
import {
  computeRenderDecision,
  derivePrimaryTrackChange,
  type Cue,
} from "../../../app/domain/subtitle-engine/subtitle-engine";

const primaryCues: Cue[] = [
  { startTime: 0, endTime: 2, text: "Hello" },
  { startTime: 2, endTime: 4, text: "World" },
  { startTime: 5, endTime: 7, text: "Gap after this" },
];

const secondaryCues: Cue[] = [
  { startTime: 0, endTime: 2.5, text: "Bonjour" },
  { startTime: 2.5, endTime: 4, text: "Monde" },
];

describe("computeRenderDecision", () => {
  it("returns active cue text for both tracks mid-cue", () => {
    const decision = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 1,
    });

    expect(decision).toEqual({
      primaryText: "Hello",
      secondaryText: "Bonjour",
      suppressed: false,
    });
  });

  it("returns null cue text at a gap between cues", () => {
    const decision = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 4.5,
    });

    expect(decision.primaryText).toBeNull();
    expect(decision.secondaryText).toBeNull();
  });

  it("treats cue start as inclusive and cue end as exclusive at boundaries", () => {
    const atStart = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 2,
    });
    expect(atStart.primaryText).toBe("World");

    const justBeforeEnd = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 1.999,
    });
    expect(justBeforeEnd.primaryText).toBe("Hello");
  });

  it("suppresses secondary track when primary language equals secondary language", () => {
    const decision = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "fr",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 1,
    });

    expect(decision).toEqual({
      primaryText: "Hello",
      secondaryText: null,
      suppressed: true,
    });
  });

  it("returns null secondary text when secondary cues are not yet available", () => {
    const decision = computeRenderDecision({
      dualSubModeEnabled: true,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues: null,
      currentTime: 1,
    });

    expect(decision.primaryText).toBe("Hello");
    expect(decision.secondaryText).toBeNull();
    expect(decision.suppressed).toBe(false);
  });

  it("returns no visible text for either track when Dual-Sub Mode is off", () => {
    const decision = computeRenderDecision({
      dualSubModeEnabled: false,
      primaryLanguageCode: "en",
      secondaryLanguage: "fr",
      primaryCues,
      secondaryCues,
      currentTime: 1,
    });

    expect(decision).toEqual({
      primaryText: null,
      secondaryText: null,
      suppressed: false,
    });
  });
});

describe("derivePrimaryTrackChange", () => {
  it("requires a new Secondary Track fetch sourced from the new Primary Track language", () => {
    const result = derivePrimaryTrackChange({
      primaryLanguageCode: "de",
      secondaryLanguage: "fr",
    });

    expect(result).toEqual({
      fetchRequired: true,
      sourceLanguageCode: "de",
    });
  });

  it("does not require a fetch when the new Primary Track language matches the Secondary Language", () => {
    const result = derivePrimaryTrackChange({
      primaryLanguageCode: "fr",
      secondaryLanguage: "fr",
    });

    expect(result).toEqual({
      fetchRequired: false,
      sourceLanguageCode: "fr",
    });
  });
});
