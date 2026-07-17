# US-011 Secondary line style settings

## Status

done

## Lane

normal

## Product Contract

The user can configure the Secondary line's text color, size, vertical
position, and opacity from the popup. Settings are global (same
persistence pattern as Secondary Language), apply only to the Secondary
line (Primary Track stays YouTube's untouched native overlay), and take
effect on the active tab immediately without a full session restart. A
reset control restores all four to their defaults.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `docs/decisions/0009-style-settings-bypass-full-restart.md`
- `CONTEXT.md`

## Acceptance Criteria

- Popup gains four new controls below the Secondary Language row: a
  color picker (text color, default matches current dimmed white), a
  size slider (scale factor over the base 1.5vw, default 1.0x), a
  vertical-position slider (offset from bottom of player, default
  matches current 8%), and an opacity slider (0-100%, default 75%).
- Changing any of the four updates the Secondary line on an already-open
  YouTube tab immediately, without re-driving YouTube's CC auto-translate
  menu and without re-fetching Secondary Track cues.
- A "Reset to defaults" control in the popup restores all four to their
  defaults without affecting `dualSubMode` or `secondaryLanguage`.
- Settings persist across videos and browser sessions via
  `chrome.storage.local`, same as existing settings.
- Text stays full-width and horizontally centered; only vertical offset
  is adjustable (no horizontal or free 2D placement).

## Design Notes

- Commands: none new (settings writes go through the same
  `chrome.storage.local.set` path popup.js already uses).
- Queries: none new.
- API: none.
- Tables: none.
- Domain rules: none new in Subtitle Engine — purely a rendering concern
  in `content/index.js`'s `injectSecondaryLine`/`onTimeUpdate`.
- UI surfaces: `popup.html`/`popup.js` (four new controls + reset
  button), `extension/lib/settings.js` (extend `DEFAULT_SETTINGS` /
  `parseSettings` with the four new keys), `content/index.js` (split
  `storage.onChanged` handling per
  `docs/decisions/0009-style-settings-bypass-full-restart.md`: style-key
  changes restyle the live `secondaryLineEl` in place instead of calling
  `init()`).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-011 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | `parseSettings` defaults/validation for the four new keys |
| Integration | Not applicable at this ticket |
| E2E | Manual/automated: adjust each control, assert Secondary line restyles live with no CC-menu re-drive/re-fetch; reset button restores defaults |
| Platform | Not applicable |
| Release | |

## Harness Delta

None anticipated beyond what US-003/US-007 establish for E2E pattern.

## Evidence

- `app/domain/settings/settings.ts` (compiled to `extension/lib/settings.js`
  via `npm run build:extension`): `Settings`/`DEFAULT_SETTINGS` extended
  with `secondaryLineColor` (`#ffffff` default, validated as a 6-digit hex
  string), `secondaryLineSize` (`1.0` default, clamped `0.5-2.5`),
  `secondaryLinePosition` (`8` default, clamped `0-40`, percent from
  bottom), `secondaryLineOpacity` (`75` default, clamped `0-100`,
  percent). Added `STYLE_SETTING_KEYS` so both the popup's reset control
  and `content/index.js`'s storage listener share one definition of which
  keys are style-only.
- `extension/popup.html` / `extension/popup.js`: four new controls below
  the Secondary Language row (color picker, size/position/opacity
  sliders) plus a "Reset style to defaults" button that writes
  `DEFAULT_SETTINGS`' style subset without touching `dualSubMode` or
  `secondaryLanguage`.
- `extension/content/index.js`: `chrome.storage.onChanged` now branches —
  `dualSubMode`/`secondaryLanguage` changes still call `init()` (full
  restart); style-key changes call `restyleActiveSession()`, which
  re-reads settings and calls `applySecondaryLineStyle()` on the live
  `secondaryLineEl` in place (color→rgba via `hexToRgba`, size→`vw`
  font-size, position→`bottom%`) — no `init()`, no CC-menu re-drive, no
  cue re-fetch. Per `docs/decisions/0009-style-settings-bypass-full-restart.md`.
- `npm test` — full suite (26 tests) green, including new
  `parseSettings` cases for the four style keys (defaults, valid values
  kept, malformed hex/non-numeric fallback, out-of-range clamping).
- `npm run typecheck` — clean.
- `node --check` on all modified `.js` files — clean.
- E2E — ran against live `youtube.com` (video `jNQXAC9IVRw`, `en`/`en`,
  suppressed-case line still renders/restyles) via a Playwright-driven
  Chrome instance with the unpacked extension loaded
  (`--load-extension`), scratch script (not checked in, per the same
  no-checked-in-`test:e2e`-harness note as US-010's evidence):
  enabled Dual-Sub Mode, waited for the secondary line to inject
  (`color: rgba(255,255,255,0.75)`, `font-size: 1.5vw`, `bottom: 8%`
  matching defaults), then wrote all four style keys via
  `chrome.storage.local.set` from a second popup-page context. Console
  log confirmed the `"style storage changed"` branch fired (not
  `"storage changed"`/`init`), the live element's inline style updated to
  `color: rgba(255,0,0,0.3)`, `font-size: 3vw`, `bottom: 20%` within
  ~1s, and zero `"capturing secondary cues"` (CC-menu re-drive/re-fetch)
  log lines were emitted after the style change. `--e2e 1` recorded via
  `scripts/bin/harness-cli story update --id US-011 --unit 1
  --integration 0 --e2e 1 --platform 0`.
