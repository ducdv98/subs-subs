# US-008 Extension icon asset

## Status

planned

## Lane

tiny

## Product Contract

The extension shows a real icon (16/32/48/128px) in the toolbar and
extensions page instead of Chrome's default puzzle-piece icon.

## Relevant Product Docs

- `docs/stories/epics/E01-dual-subtitles/SPEC.md`

## Acceptance Criteria

- Icon files exist at 16, 32, 48, and 128px, dark background with a
  two-stacked-bar (dual-subtitle) motif, white bars.
- `manifest.json` `icons` and `action.default_icon` reference the new
  files.
- Icon renders correctly in `chrome://extensions` and the toolbar at all
  listed sizes (no blur/clipping).

## Design Notes

- Commands: none — static asset only.
- UI surfaces: new `extension/icons/icon16.png`, `icon32.png`,
  `icon48.png`, `icon128.png` (or `.svg` source rendered to those sizes).
- Reuse the palette from US-007's "Visual Design (tokens)" section
  (`docs/stories/epics/E01-dual-subtitles/US-007-popup-settings-surface.md`)
  rather than re-deriving colors — same dark bg, same dual-bar motif.
  Open question carried from the original grilling session: bars were
  decided white-on-dark before the popup's amber accent existed; revisit
  whether the icon's bars should switch to `--accent #ffb020` for
  cross-surface consistency with the popup toggle, or stay white/neutral
  since the icon must also read correctly in browser light-toolbar theme.
  Decide this at implementation time, not before.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-008 --unit 0 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable — static asset |
| Integration | Not applicable |
| E2E | Not applicable |
| Platform | Manual load-unpacked check: icon visible and legible in toolbar and `chrome://extensions` |
| Release | |

## Harness Delta

None anticipated.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
