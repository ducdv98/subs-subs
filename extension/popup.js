import { parseSettings } from "./lib/settings.js";
import { SECONDARY_LANGUAGES, isKnownSecondaryLanguage } from "./lib/languages.js";

const toggle = document.getElementById("dualSubMode");
const select = document.getElementById("secondaryLanguage");
const langCode = document.getElementById("secondaryLanguageCode");

function populateLanguages(selectedCode) {
  const known = isKnownSecondaryLanguage(selectedCode);
  if (!known) {
    console.warn(
      "[DualSubs]",
      `stored secondaryLanguage "${selectedCode}" is not a recognized code — pick a language below to fix it`,
    );
  }
  const languages = known
    ? SECONDARY_LANGUAGES
    : [...SECONDARY_LANGUAGES, { code: selectedCode, name: `${selectedCode} (unrecognized)` }];

  select.replaceChildren(
    ...languages.map(({ code, name }) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      return option;
    }),
  );
  select.value = selectedCode;
  langCode.textContent = selectedCode.toUpperCase();
}

chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]).then((raw) => {
  const settings = parseSettings(raw);
  toggle.checked = settings.dualSubMode;
  populateLanguages(settings.secondaryLanguage);
});

toggle.addEventListener("change", async () => {
  const nextValue = toggle.checked;
  console.log("[DualSubs]", "popup toggle changed", { to: nextValue });
  await chrome.storage.local.set({ dualSubMode: nextValue });
});

select.addEventListener("change", () => {
  console.log("[DualSubs]", "secondaryLanguage set", select.value);
  langCode.textContent = select.value.toUpperCase();
  chrome.storage.local.set({ secondaryLanguage: select.value });
});
