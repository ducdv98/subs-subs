# US-007 Popup settings surface

## Status

implemented

## Lane

normal

## Product Contract

Clicking the toolbar icon opens a popup containing the Dual-Sub Mode
toggle and the Secondary Language picker. The full-tab options page is
retired. See `CONTEXT.md` (Dual-Sub Mode, Secondary Language) and
`docs/decisions/0008-popup-replaces-toolbar-toggle.md`.

## Relevant Product Docs

- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `docs/stories/epics/E01-dual-subtitles/US-002-extension-shell-settings-toggle.md`
- `docs/stories/epics/E01-dual-subtitles/US-005-toolbar-icon-visual-feedback.md`
- `docs/decisions/0008-popup-replaces-toolbar-toggle.md`

## Acceptance Criteria

- Clicking the toolbar icon (on an enabled tab, see US-009) opens a popup;
  it no longer toggles Dual-Sub Mode directly on click.
- Popup shows a toggle control for Dual-Sub Mode, initialized from current
  `chrome.storage` state, and writes back through the existing
  `parseSettings`/`toggleDualSubMode` domain functions.
- Popup shows the Secondary Language dropdown (existing `lib/languages.js`
  list), initialized from stored `secondaryLanguage`, writes back on
  change.
- Toolbar badge (US-005 behavior) is preserved and now driven solely by
  `chrome.storage.onChanged`, since the click handler no longer writes
  storage directly.
- `options.html`, `options.js`, and the `options_ui` manifest entry are
  removed; no dead links to them remain.

## Design Notes

- Commands: move toggle-write and language-write from `options.js` into
  new `popup.js`.
- Queries: read `dualSubMode`, `secondaryLanguage` from `chrome.storage`
  on popup open.
- API: `manifest.json` `action.default_popup` → `popup.html`; remove
  `options_ui`.
- Domain rules: reuse `parseSettings`/`toggleDualSubMode` from
  `lib/settings.js` unchanged.
- UI surfaces: new `popup.html` + `popup.js`, replacing `options.html` +
  `options.js` (delete both).

### Visual Design (tokens)

Popup redesigned from bare native controls to a dark-theme panel; these
tokens are the project's visual identity going forward and should be
reused by US-008's icon design (same dual-bar motif, same palette) rather
than re-derived:

- Color: `--bg #14161a`, `--surface #1c1f24`, `--surface-border #2a2e35`,
  `--text #f2f0ea`, `--text-muted #8b8f98`, `--accent #ffb020` (warm
  amber, "translation" affordance), `--accent-soft rgba(255,176,32,0.16)`.
- Type: system sans (`-apple-system, "Segoe UI", Roboto`) for labels/copy;
  `ui-monospace` for the language-code chip (subtitle/timecode feel).
- Signature element: the Dual-Sub Mode toggle is a custom switch whose
  thumb carries the same two-stacked-bar mark as the header wordmark and
  the planned toolbar icon (US-008) — one motif, three places.
- Motion: 0.18s ease transitions on toggle track/thumb; disabled under
  `prefers-reduced-motion: reduce`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-007 --unit 0 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable — no new domain logic, reuses `lib/settings.js` |
| Integration | Not applicable at this ticket |
| E2E | Not applicable at this ticket |
| Platform | Manual load-unpacked smoke check: click icon on a watch page, confirm popup opens with correct current state; toggle and change language, confirm storage updates and badge reflects toggle |
| Release | |

## Harness Delta

Adds `docs/decisions/0008-popup-replaces-toolbar-toggle.md`.

## Evidence

- `npx vitest run` — 15/15 passing (no domain logic touched).
- Playwright smoke check (load-unpacked, real Chromium via
  `chromium.launchPersistentContext` with `--load-extension`): popup
  opens with correct initial toggle/language state; toggling flips
  `chrome.storage.local.dualSubMode` and badge text; changing language
  updates `chrome.storage.local.secondaryLanguage` and the code chip.
  Re-run after the visual redesign, same assertions passing. Script and
  screenshots were scratch files, not committed.
