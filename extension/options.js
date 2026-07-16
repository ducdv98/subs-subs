import { parseSettings } from "./lib/settings.js";
import { SECONDARY_LANGUAGES, isKnownSecondaryLanguage } from "./lib/languages.js";

const statusEl = document.getElementById("dualSubModeStatus");
const select = document.getElementById("secondaryLanguage");

function populateOptions(selectedCode) {
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
}

chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]).then((raw) => {
  const settings = parseSettings(raw);
  statusEl.textContent = settings.dualSubMode ? "on" : "off";
  populateOptions(settings.secondaryLanguage);
});

select.addEventListener("change", () => {
  console.log("[DualSubs]", "secondaryLanguage set", select.value);
  chrome.storage.local.set({ secondaryLanguage: select.value });
});
