import { DEFAULT_SETTINGS, STYLE_SETTING_KEYS, parseSettings } from "./lib/settings.js";
import { SECONDARY_LANGUAGES, isKnownSecondaryLanguage } from "./lib/languages.js";

const toggle = document.getElementById("dualSubMode");
const select = document.getElementById("secondaryLanguage");
const langCode = document.getElementById("secondaryLanguageCode");
const colorInput = document.getElementById("secondaryLineColor");
const sizeInput = document.getElementById("secondaryLineSize");
const positionInput = document.getElementById("secondaryLinePosition");
const opacityInput = document.getElementById("secondaryLineOpacity");
const sizeValue = document.getElementById("secondaryLineSizeValue");
const positionValue = document.getElementById("secondaryLinePositionValue");
const opacityValue = document.getElementById("secondaryLineOpacityValue");
const resetButton = document.getElementById("resetStyle");

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

function applyStyleControls(settings) {
  colorInput.value = settings.secondaryLineColor;
  sizeInput.value = String(settings.secondaryLineSize);
  positionInput.value = String(settings.secondaryLinePosition);
  opacityInput.value = String(settings.secondaryLineOpacity);
  sizeValue.textContent = `${settings.secondaryLineSize.toFixed(1)}x`;
  positionValue.textContent = `${settings.secondaryLinePosition}%`;
  opacityValue.textContent = `${settings.secondaryLineOpacity}%`;
}

chrome.storage.local
  .get(["dualSubMode", "secondaryLanguage", ...STYLE_SETTING_KEYS])
  .then((raw) => {
    const settings = parseSettings(raw);
    toggle.checked = settings.dualSubMode;
    populateLanguages(settings.secondaryLanguage);
    applyStyleControls(settings);
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

colorInput.addEventListener("input", () => {
  chrome.storage.local.set({ secondaryLineColor: colorInput.value });
});

sizeInput.addEventListener("input", () => {
  const value = Number(sizeInput.value);
  sizeValue.textContent = `${value.toFixed(1)}x`;
  chrome.storage.local.set({ secondaryLineSize: value });
});

positionInput.addEventListener("input", () => {
  const value = Number(positionInput.value);
  positionValue.textContent = `${value}%`;
  chrome.storage.local.set({ secondaryLinePosition: value });
});

opacityInput.addEventListener("input", () => {
  const value = Number(opacityInput.value);
  opacityValue.textContent = `${value}%`;
  chrome.storage.local.set({ secondaryLineOpacity: value });
});

resetButton.addEventListener("click", () => {
  console.log("[DualSubs]", "resetting secondary line style to defaults");
  const defaults = Object.fromEntries(
    STYLE_SETTING_KEYS.map((key) => [key, DEFAULT_SETTINGS[key]]),
  );
  applyStyleControls(parseSettings(defaults));
  chrome.storage.local.set(defaults);
});
