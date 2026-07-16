export const SECONDARY_LANGUAGES = [
  { code: "ar", name: "Arabic" },
  { code: "de", name: "German" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "zh-Hans", name: "Chinese (Simplified)" },
  { code: "zh-Hant", name: "Chinese (Traditional)" },
];

export function isKnownSecondaryLanguage(code) {
  return SECONDARY_LANGUAGES.some((lang) => lang.code === code);
}
