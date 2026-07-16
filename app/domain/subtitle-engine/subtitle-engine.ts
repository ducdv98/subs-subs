export interface Cue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface RenderDecision {
  primaryText: string | null;
  secondaryText: string | null;
  suppressed: boolean;
}

export interface ComputeRenderDecisionInput {
  dualSubModeEnabled: boolean;
  primaryLanguageCode: string;
  secondaryLanguage: string;
  primaryCues: Cue[];
  secondaryCues: Cue[] | null;
  currentTime: number;
}

export interface SecondaryFetchRequirement {
  fetchRequired: boolean;
  sourceLanguageCode: string;
}

export interface DerivePrimaryTrackChangeInput {
  primaryLanguageCode: string;
  secondaryLanguage: string;
}

function findActiveCueText(cues: Cue[], currentTime: number): string | null {
  const activeCue = cues.find(
    (cue) => currentTime >= cue.startTime && currentTime < cue.endTime,
  );
  return activeCue?.text ?? null;
}

export function computeRenderDecision(
  input: ComputeRenderDecisionInput,
): RenderDecision {
  if (!input.dualSubModeEnabled) {
    return { primaryText: null, secondaryText: null, suppressed: false };
  }

  const suppressed = input.primaryLanguageCode === input.secondaryLanguage;
  const primaryText = findActiveCueText(input.primaryCues, input.currentTime);
  const secondaryText =
    suppressed || input.secondaryCues === null
      ? null
      : findActiveCueText(input.secondaryCues, input.currentTime);

  return { primaryText, secondaryText, suppressed };
}

export function derivePrimaryTrackChange(
  input: DerivePrimaryTrackChangeInput,
): SecondaryFetchRequirement {
  const fetchRequired = input.primaryLanguageCode !== input.secondaryLanguage;

  return {
    fetchRequired,
    sourceLanguageCode: input.primaryLanguageCode,
  };
}
