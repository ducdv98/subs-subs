# US-001 Subtitle Engine core logic

## Status

planned

## Lane

normal

## Product Contract

Provide the single pure, DOM-free and network-free module that decides what
to render for Primary Track and Secondary Track at any point in playback,
including the same-language suppression rule and the "new Primary Track
requires a new Secondary Track fetch" rule. See `docs/product/overview.md`
and `CONTEXT.md` for term definitions (Primary Track, Secondary Track,
Secondary Language, Dual-Sub Mode).

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`

## Acceptance Criteria

- Given Primary and Secondary cue lists and a `currentTime`, the module
  returns the correct active cue text for each track (or none, at cue
  boundaries/gaps).
- Given Primary Track's language code equal to the Secondary Language
  setting, the module returns a suppressed state (no Secondary Track
  content), and signals that no Secondary Track fetch should occur.
- Given a Primary Track change (track-switch event), the module signals
  that a new Secondary Track fetch is required, sourced from the new
  Primary Track's language code.
- Module has zero dependencies on DOM, `chrome.*` APIs, or network calls.

## Design Notes

- Commands: none (pure functions only).
- Queries: cue lookup by `currentTime` per track; suppression check by
  language-code comparison.
- API: exposes the "render decision" shape consumed by US-003's content
  script adapter.
- Tables: none.
- Domain rules: same-language suppression; track-switch triggers
  re-fetch requirement. See SPEC.md Implementation Decisions.
- UI surfaces: none — this ticket has no visible output.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-001 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Cue lookup, suppression, and track-switch-triggers-fetch cases per SPEC Testing Decisions |
| Integration | Not applicable — pure module |
| E2E | Not applicable at this ticket |
| Platform | Not applicable |
| Release | |

## Harness Delta

None anticipated. This is the first story of the epic; if fixture/test
conventions for pure modules need harness documentation, record friction
with `harness-cli backlog add`.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
