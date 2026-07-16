# US-004 Re-derive on manual track switch

## Status

planned

## Lane

normal

## Product Contract

When the user manually changes YouTube's own CC track mid-video while
Dual-Sub Mode is on, the extension detects the change, treats the new
track as Primary Track, and re-fetches/re-renders Secondary Track to
match — keeping the "Primary Track = whatever YouTube shows" invariant
true at all times. See `CONTEXT.md` (Primary Track) and SPEC.md.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`

## Acceptance Criteria

- Manually switching YouTube's CC track mid-video (via YouTube's own CC
  menu) while Dual-Sub Mode is on triggers a fresh Secondary Track fetch
  sourced from the new Primary Track's language code.
- The rendered Secondary line updates to the new pairing without a full
  page reload.
- If the new Primary Track's language equals the Secondary Language
  setting, the Secondary line is suppressed (reuses US-001 suppression
  signal), matching US-003 behavior for the initial-load case.

## Design Notes

- Commands: none new.
- Queries: watch YouTube player's active caption track for changes after
  initial load (US-003 only reads it once at load).
- API: reuses US-003's timedtext auto-translate fetch, re-triggered.
- Tables: none.
- Domain rules: reuses US-001's track-switch-triggers-fetch signal.
- UI surfaces: same injected element from US-003, updated in place.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-004 --unit 0 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Covered by US-001's track-switch signal test |
| Integration | Not applicable at this ticket |
| E2E | Manual/automated: switch CC track mid-video, assert Secondary line updates |
| Platform | Not applicable |
| Release | |

## Harness Delta

None anticipated beyond what US-003 establishes for E2E pattern.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
