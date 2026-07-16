# US-002 Extension shell: settings + toggle

## Status

planned

## Lane

normal

## Product Contract

Provide an installable Chrome extension (Manifest V3) shell with a popup
settings surface (Secondary Language selector) and a toolbar icon that
toggles Dual-Sub Mode on/off, both persisted via `chrome.storage` across
videos and browser sessions. See `docs/product/overview.md` and
`CONTEXT.md`.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`

## Acceptance Criteria

- Extension loads unpacked in Chrome with a valid Manifest V3 manifest.
- Popup shows a Secondary Language selector; changing it persists the
  value via `chrome.storage`.
- Clicking the toolbar icon toggles Dual-Sub Mode on/off; state persists
  across browser restarts.
- No subtitle rendering logic in this ticket — settings and toggle only.

## Design Notes

- Commands: toolbar icon click toggles Dual-Sub Mode; popup selector
  change sets Secondary Language.
- Queries: read current Dual-Sub Mode and Secondary Language on popup
  open.
- API: `chrome.storage` schema for `dualSubMode: boolean` and
  `secondaryLanguage: string`.
- Tables: none.
- Domain rules: Secondary Language is the only user-configured language;
  no per-video override (SPEC Out of Scope).
- UI surfaces: browser toolbar icon, extension popup.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-002 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Storage read/write wrapper behavior, if any logic beyond direct `chrome.storage` calls |
| Integration | Not applicable at this ticket |
| E2E | Not applicable at this ticket |
| Platform | Manual load-unpacked smoke check in Chrome |
| Release | |

## Harness Delta

None anticipated.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
