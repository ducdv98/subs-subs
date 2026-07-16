function findActiveCueText(cues, currentTime) {
    const activeCue = cues.find((cue) => currentTime >= cue.startTime && currentTime < cue.endTime);
    return activeCue?.text ?? null;
}
export function computeRenderDecision(input) {
    if (!input.dualSubModeEnabled) {
        return { primaryText: null, secondaryText: null, suppressed: false };
    }
    const suppressed = input.primaryLanguageCode === input.secondaryLanguage;
    const primaryText = findActiveCueText(input.primaryCues, input.currentTime);
    const secondaryText = suppressed || input.secondaryCues === null
        ? null
        : findActiveCueText(input.secondaryCues, input.currentTime);
    return { primaryText, secondaryText, suppressed };
}
export function derivePrimaryTrackChange(input) {
    const fetchRequired = input.primaryLanguageCode !== input.secondaryLanguage;
    return {
        fetchRequired,
        sourceLanguageCode: input.primaryLanguageCode,
    };
}
