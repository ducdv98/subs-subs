# US-009 Gate icon to watch tabs

## Status

planned

## Lane

normal

## Product Contract

The toolbar icon (and its popup, see US-007) is only enabled on
`https://www.youtube.com/watch*` tabs, matching the scope where the
content script actually runs. On any other tab, the icon is disabled and
cannot be clicked.

## Relevant Product Docs

- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `docs/stories/epics/E01-dual-subtitles/US-007-popup-settings-surface.md`

## Acceptance Criteria

- On a tab whose URL matches `https://www.youtube.com/watch*`, the icon is
  enabled and clicking it opens the popup.
- On any other tab (including `youtube.com` non-watch pages, e.g. home or
  search), the icon is disabled (greyed out, unclickable).
- Icon enabled/disabled state updates as the user navigates or switches
  tabs, without requiring an extension reload.
- `isWatchUrl(url)` is a pure, unit-tested function in `lib/tabs.js`.

## Design Notes

- Commands: `chrome.action.enable(tabId)` / `chrome.action.disable(tabId)`
  called from `background.js` on `chrome.tabs.onUpdated` and
  `chrome.tabs.onActivated`.
- Queries: `isWatchUrl(url)` — pure string/URL check, no chrome APIs.
- Domain rules: new `lib/tabs.js` exporting `isWatchUrl(url)`, tested per
  the existing `lib/settings.js` pattern (`tests/domain/...`).
- UI surfaces: none new — affects existing toolbar icon only.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-009 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | `tests/domain/tabs/tabs.test.ts` — `isWatchUrl` true for `/watch*`, false for other youtube.com paths and other domains |
| Integration | Not applicable at this ticket |
| E2E | Not applicable at this ticket |
| Platform | Manual load-unpacked check: icon disabled on youtube.com home and non-youtube tabs, enabled on a watch page, updates live on tab switch/navigation |
| Release | |

## Harness Delta

None anticipated.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
