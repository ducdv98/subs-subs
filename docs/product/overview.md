# Product Overview — Dual-Subtitle YouTube Extension

## Idea

Chrome extension that displays two subtitle/caption tracks simultaneously on
YouTube videos — the video's native/default track plus a second track in
another language, stacked below it. Purpose: language learning (English
especially) via dual-language subtitles, instead of YouTube's native
single-track-at-a-time captions.

## MVP Decisions (grilled, not yet implemented)

| Area | Decision |
| --- | --- |
| Subtitle source | YouTube's own timedtext auto-translate endpoint (undocumented API). Free, broad coverage, no backend needed. |
| Language selection | Global setting in extension popup: only Secondary Language is user-configurable (translate target). Primary Track is never a language choice — it always mirrors whatever YouTube's player has active. No per-video override in MVP. See `CONTEXT.md` for term definitions. |
| Layout | Inject 2nd line stacked directly below YouTube's native CC overlay, inside the player. Works in fullscreen. |
| Sync mechanism | Independent cue lookup per track, both driven off `video.currentTime`. No cross-track cue alignment/re-bucketing. |
| No captions available | Fail silently — no UI, no badge, nothing shown. |
| Native CC toggle | Extension force-enables YouTube's native CC when dual-sub mode is on, guaranteeing both lines always show together. |
| On/off control | Browser toolbar icon click toggles dual-sub mode globally; persists across videos until toggled again. |
| Styling | Fixed style matching native CC look (dimmer to distinguish 2nd line). No style customization UI in MVP. |
| Browser scope | Chrome only, Manifest V3. No Firefox/Edge-specific work in MVP. |
| ToS/legal risk | Undocumented timedtext endpoint use accepted as risk; revisit if YouTube blocks/breaks it. Official Data API captions.download not viable (requires OAuth + owner permission). |

## Edge-Case Behaviors (grilled)

| Scenario | Behavior |
| --- | --- |
| Video's Primary Track has no matching manual/ASR track in a language the user expected | Not applicable — Primary Track always mirrors YouTube's own active selection, never a fixed language expectation. |
| Video has multiple manual caption tracks, no single obvious default | Primary Track = whatever YouTube's player currently has selected (uploader default / viewer's YouTube lang pref). Extension does not run its own priority logic. |
| Primary Track's language equals the user's Secondary Language setting | Secondary Track is suppressed entirely (no duplicate line); video falls back to native single-sub display. |
| User manually switches YouTube's CC track mid-video while Dual-Sub Mode is on | Extension watches the active caption track; on change, re-derives Secondary Track via a fresh translate fetch from the new Primary Track. Keeps the "Primary Track = whatever YouTube shows" invariant true at all times. |

## Explicitly Out of Scope (MVP)

- Per-video language picker
- Custom caption renderer (replacing YouTube's overlay entirely)
- Style customization settings
- Firefox/Edge dedicated support
- Self-hosted/external MT API

## Status

Idea grilled and settled 2026-07-16. Not yet built — no story packets or
architecture created yet. Next phase: slice into story packets
(`docs/stories/`) and record an ADR in `docs/decisions/` if this affects the
existing harness scope.
