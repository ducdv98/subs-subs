# US-005 Toolbar icon visual feedback

## Status

planned

## Lane

tiny

## Product Contract

Clicking the toolbar icon must show, on the icon itself, whether Dual-Sub
Mode is now on or off — without requiring the user to open the options
page to check. The icon's badge state must also be correct immediately
after browser startup / extension load, matching whatever was last
persisted, not just after the next click. See `CONTEXT.md` (Dual-Sub
Mode) and SPEC.md.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `docs/stories/epics/E01-dual-subtitles/US-002-extension-shell-settings-toggle.md`

## Acceptance Criteria

- Clicking the toolbar icon still toggles Dual-Sub Mode on/off (existing
  US-002 behavior, unchanged) and the icon's badge updates to reflect the
  new state immediately, with no popup/menu inserted in place of the
  toggle-on-click behavior.
- On browser startup (or extension reload), the badge reflects the
  persisted `dualSubMode` value before any click happens.
- Badge state stays correct if `dualSubMode` changes via any other
  storage write path, not only the toolbar click handler.

## Design Notes

- Commands: none new — reuses US-002's toolbar click → `chrome.storage`
  toggle.
- Queries: read `dualSubMode` to render badge state; no new domain
  queries.
- API: `chrome.action.setBadgeText` / `chrome.action.setBadgeBackgroundColor`
  in `background.js`, called (a) once on service worker startup and (b)
  from a `chrome.storage.onChanged` listener, so the badge is a pure
  reflection of storage rather than only updated inside the click
  handler.
- Tables: none.
- Domain rules: none new — reuses US-002's `dualSubMode` boolean and
  `parseSettings`/`toggleDualSubMode` from `app/domain/settings`.
- UI surfaces: toolbar icon badge only. No `default_popup` — adding one
  would change click-to-open instead of click-to-toggle, which
  contradicts US-002's existing acceptance criterion that a click
  toggles the mode directly. A dropdown menu surface is explicitly out
  of scope for this reason.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-005 --unit 0 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable — no new domain logic, reuses US-002's settings module |
| Integration | Not applicable at this ticket |
| E2E | Not applicable at this ticket |
| Platform | Manual load-unpacked smoke check: click icon, confirm badge flips; reload extension with mode already on, confirm badge shows on state before any click |
| Release | |

## Harness Delta

None anticipated.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
