# US-003 Live dual-caption rendering on YouTube

## Status

planned

## Lane

normal

## Product Contract

On a YouTube watch page with Dual-Sub Mode on, render the Secondary Track
line stacked below YouTube's native caption overlay, synced to playback,
sourced by translating whatever track YouTube's player currently has
active (Primary Track). Auto-enable native CC when Dual-Sub Mode turns on.
No-caption videos and same-language pairs render nothing extra. See
`docs/product/overview.md`, `CONTEXT.md`, and SPEC.md Implementation
Decisions.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`

## Acceptance Criteria

- On a video with captions and Dual-Sub Mode on, two lines are visible:
  YouTube's native caption and a translated line below it, both synced to
  playback.
- Turning on Dual-Sub Mode auto-enables YouTube's native CC if it was off.
- Dual line display continues working in fullscreen.
- A video with zero caption tracks (no manual, no ASR) shows no extra UI,
  no badge, no message.
- A video whose Primary Track language equals the Secondary Language
  setting shows no extra line (uses US-001's suppression signal).
- Toggling Dual-Sub Mode off removes the injected Secondary line.

## Design Notes

- Commands: none new beyond US-002's toggle, consumed here.
- Queries: read YouTube player's active caption track; fetch Secondary
  Track via YouTube's timedtext auto-translate endpoint.
- API: timedtext auto-translate request keyed by Primary Track's language
  code and the Secondary Language setting.
- Tables: none.
- Domain rules: uses US-001's Subtitle Engine for all render decisions;
  content script is a thin adapter — no cue-lookup or suppression logic
  duplicated here.
- UI surfaces: injected DOM element inside the YouTube player container,
  positioned below the native caption overlay.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-003 --unit 0 --integration 0 --e2e 1 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Covered by US-001; this ticket adds none beyond thin adapter wiring |
| Integration | Not applicable at this ticket |
| E2E | Manual/automated check against a real or fixture YouTube watch page; first ticket to establish this harness pattern per SPEC Testing Decisions |
| Platform | Manual smoke check: fullscreen, toggle on/off, no-caption video |
| Release | |

## Harness Delta

First ticket needing an E2E pattern against YouTube pages — expect to
propose a `test:e2e` command via `harness-cli backlog add` once the
approach is chosen.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
