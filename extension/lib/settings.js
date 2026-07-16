export const DEFAULT_SETTINGS = {
    dualSubMode: false,
    secondaryLanguage: "en",
};
export function parseSettings(raw) {
    if (typeof raw !== "object" || raw === null) {
        return { ...DEFAULT_SETTINGS };
    }
    const candidate = raw;
    return {
        dualSubMode: typeof candidate.dualSubMode === "boolean"
            ? candidate.dualSubMode
            : DEFAULT_SETTINGS.dualSubMode,
        secondaryLanguage: typeof candidate.secondaryLanguage === "string"
            ? candidate.secondaryLanguage
            : DEFAULT_SETTINGS.secondaryLanguage,
    };
}
export function toggleDualSubMode(current) {
    return !current;
}
